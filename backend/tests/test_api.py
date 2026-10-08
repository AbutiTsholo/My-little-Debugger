from collections.abc import Generator
import logging
import time
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.ai import DeterministicAssistantProvider, OpenAIAssistantProvider
from backend.app.db import Base, get_db
from backend.app import main
from backend.app.main import app
from backend.app.models import AnalysisRun, ErrorFindingModel


TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


def override_get_db() -> Generator[Session, None, None]:
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    Base.metadata.create_all(bind=TEST_ENGINE)
    monkeypatch.setattr(main, "SessionLocal", TestSessionLocal)
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=TEST_ENGINE)


def register(client: TestClient) -> tuple[dict, dict[str, str]]:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Test User", "email": "test@example.com", "password": "secret123"},
    )
    body = response.json()
    headers = {"Authorization": f"Bearer {body['access_token']}"}
    return body, headers


def upload_java_file(client: TestClient, headers: dict[str, str], content: str) -> dict:
    project = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Chat context project"},
    ).json()
    return client.post(
        f"/api/v1/projects/{project['id']}/files",
        headers=headers,
        json={"filename": "Main.java", "language": "Java", "content": content},
    ).json()


def add_analysis_run(file_id: int, run_status: str, finding: tuple[int, str, str] | None = None) -> None:
    db = TestSessionLocal()
    try:
        run = AnalysisRun(file_id=file_id, status=run_status, result_summary=run_status)
        db.add(run)
        db.flush()
        if finding:
            line, message, suggestion = finding
            db.add(ErrorFindingModel(
                run_id=run.id,
                line=line,
                message=message,
                suggestion=suggestion,
                severity="error",
            ))
        db.commit()
    finally:
        db.close()


def test_cors_headers_for_frontend_origin(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Frontend User", "email": "frontend@example.com", "password": "secret123"},
        headers={"Origin": "http://localhost:5173"},
    )

    assert response.status_code == 201
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_auth_and_protected_project_flow(client: TestClient) -> None:
    body, headers = register(client)

    assert body["user"]["email"] == "test@example.com"
    assert client.get("/api/v1/auth/me", headers=headers).json()["email"] == "test@example.com"
    assert client.get("/api/v1/projects").status_code == 401

    project_response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Test Project"},
    )

    assert project_response.status_code == 201
    assert project_response.json()["name"] == "Test Project"

    project_id = project_response.json()["id"]
    updated = client.patch(
        f"/api/v1/projects/{project_id}",
        headers=headers,
        json={"name": "Renamed Project"},
    )
    assert updated.status_code == 200
    assert client.get(f"/api/v1/projects/{project_id}", headers=headers).json()["name"] == "Renamed Project"


def test_auth_lifecycle_extensions(client: TestClient) -> None:
    _, headers = register(client)

    logout = client.post("/api/v1/auth/logout", headers=headers)
    assert logout.status_code == 200
    assert logout.json()["message"] == "Logged out successfully"

    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200

    role = client.get("/api/v1/users/me/role", headers=headers)
    assert role.status_code == 200
    assert role.json()["role"] == "user"

    profile = client.patch(
        "/api/v1/users/me/profile",
        headers=headers,
        json={"name": "Updated Name", "email": "updated@example.com"},
    )
    assert profile.status_code == 200
    assert profile.json()["name"] == "Updated Name"
    assert profile.json()["email"] == "updated@example.com"

    refreshed = client.get("/api/v1/auth/me", headers=headers)
    assert refreshed.status_code == 200
    assert refreshed.json()["name"] == "Updated Name"
    assert refreshed.json()["email"] == "updated@example.com"


def test_admin_user_list(client: TestClient) -> None:
    body, headers = register(client)
    admin_response = client.post(
        "/api/v1/auth/login",
        json={"email": "202304366@spu.ac.za", "password": "Spu@123"},
    )
    admin_body = admin_response.json()
    admin_headers = {"Authorization": f"Bearer {admin_body['access_token']}"}

    users = client.get("/api/v1/admin/users", headers=admin_headers)
    assert users.status_code == 200
    assert len(users.json()) >= 2
    assert any(user["email"] == body["user"]["email"] for user in users.json())


def test_analysis_completes_in_background_without_queue(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _, headers = register(client)
    monkeypatch.setattr(main.settings, "use_queue", False)
    monkeypatch.setattr(main, "enqueue_analysis", lambda _run_id: pytest.fail("queue must not be used"))
    file_record = upload_java_file(client, headers, "class Main {\n  int value = 10\n}\n")

    job = client.post(f"/api/v1/analysis/run?file_id={file_record['id']}", headers=headers)
    completed = client.get(f"/api/v1/analysis/jobs/{job.json()['id']}", headers=headers)

    assert job.status_code == 200
    assert completed.json()["status"] == "completed"
    assert client.get(f"/api/v1/files/{file_record['id']}/errors", headers=headers).json()["error_count"] == 1


def test_chat_response_references_actual_finding_line(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _, headers = register(client)
    monkeypatch.setattr(main, "get_assistant_provider", DeterministicAssistantProvider)
    file_record = upload_java_file(
        client,
        headers,
        "class Main {\n  void run() {\n    int one = 1;\n    int two = 2;\n    int three = 3;\n    int four = 4;\n    int value = 10\n  }\n}\n",
    )
    client.post(f"/api/v1/analysis/run?file_id={file_record['id']}", headers=headers)

    response = client.post(
        "/api/v1/chat/messages",
        headers=headers,
        json={"message": "Explain Error", "file_id": file_record["id"]},
    )

    assert response.status_code == 200
    assert "Line 7" in response.json()["message"]
    assert "int value = 10;" in response.json()["message"]
    assert "Analysis completed successfully" in response.json()["message"]
    assert "run analysis" not in response.json()["message"].lower()


def test_chat_explains_code_after_completed_analysis_with_zero_findings(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _, headers = register(client)
    monkeypatch.setattr(main.settings, "use_queue", False)
    monkeypatch.setattr(main, "get_assistant_provider", DeterministicAssistantProvider)
    file_record = upload_java_file(client, headers, "class CleanExample {\n  int value = 42;\n}\n")
    client.post(f"/api/v1/analysis/run?file_id={file_record['id']}", headers=headers)

    response = client.post(
        "/api/v1/chat/messages",
        headers=headers,
        json={"message": "Explain my code.", "file_id": file_record["id"]},
    )

    assert response.status_code == 200
    assert "Analysis completed successfully and returned no findings" in response.json()["message"]
    assert "CleanExample" in response.json()["message"]
    assert "run analysis" not in response.json()["message"].lower()


@pytest.mark.parametrize(
    ("analysis_status", "expected_text"),
    [
        ("pending", "analysis is pending"),
        ("running", "analysis is currently running"),
        ("failed", "analysis failed"),
    ],
)
def test_chat_reports_actual_pending_running_or_failed_status(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    analysis_status: str,
    expected_text: str,
) -> None:
    _, headers = register(client)
    monkeypatch.setattr(main, "get_assistant_provider", DeterministicAssistantProvider)
    file_record = upload_java_file(client, headers, "class StatusMarker {\n  int value = 7;\n}\n")
    add_analysis_run(file_record["id"], analysis_status)

    response = client.post(
        "/api/v1/chat/messages",
        headers=headers,
        json={"message": "What errors are in my code?", "file_id": file_record["id"]},
    )

    assert response.status_code == 200
    assert expected_text in response.json()["message"].lower()
    assert "StatusMarker" in response.json()["message"]


def test_stateless_chat_uses_uploaded_source_without_findings(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _, headers = register(client)
    monkeypatch.setattr(main, "get_assistant_provider", DeterministicAssistantProvider)
    source = "class SourceOnlyMarker {\n  int answer = 42;\n}\n"
    file_record = upload_java_file(client, headers, source)

    response = client.post(
        "/api/v1/chat/messages",
        headers=headers,
        json={"message": "Explain my code.", "file_id": file_record["id"]},
    )

    assert response.status_code == 200
    assert "SourceOnlyMarker" in response.json()["message"]
    assert "int answer = 42;" in response.json()["message"]


def test_chat_sessions_keep_file_context_for_followups_and_file_switches(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _, headers = register(client)
    monkeypatch.setattr(main, "get_assistant_provider", DeterministicAssistantProvider)
    first_file = upload_java_file(client, headers, "class FirstFileMarker {\n  int first = 1;\n}\n")
    second_file = upload_java_file(client, headers, "class SecondFileMarker {\n  int second = 2;\n}\n")
    first_session = client.post(
        "/api/v1/chat/sessions",
        headers=headers,
        json={"title": "First file", "file_id": first_file["id"]},
    ).json()
    second_session = client.post(
        "/api/v1/chat/sessions",
        headers=headers,
        json={"title": "Second file", "file_id": second_file["id"]},
    ).json()

    first_reply = client.post(
        f"/api/v1/chat/sessions/{first_session['id']}/messages",
        headers=headers,
        json={"message": "Explain my code."},
    )
    follow_up = client.post(
        f"/api/v1/chat/sessions/{first_session['id']}/messages",
        headers=headers,
        json={"message": "What does this code do?"},
    )
    switched_file_reply = client.post(
        f"/api/v1/chat/sessions/{second_session['id']}/messages",
        headers=headers,
        json={"message": "Explain my code."},
    )

    assert first_reply.status_code == follow_up.status_code == switched_file_reply.status_code == 201
    assert "FirstFileMarker" in first_reply.json()["message"]
    assert "FirstFileMarker" in follow_up.json()["message"]
    assert "SecondFileMarker" in switched_file_reply.json()["message"]
    assert "SecondFileMarker" not in follow_up.json()["message"]


def test_openai_failure_logs_and_returns_deterministic_fallback(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    _, headers = register(client)
    file_record = upload_java_file(
        client,
        headers,
        "class Main {\n  void run() {\n    int one = 1;\n    int two = 2;\n    int three = 3;\n    int four = 4;\n    int value = 10\n  }\n}\n",
    )
    client.post(f"/api/v1/analysis/run?file_id={file_record['id']}", headers=headers)
    provider = OpenAIAssistantProvider.__new__(OpenAIAssistantProvider)

    captured_messages: list[dict[str, str]] = []

    def fail_openai_call(**kwargs):
        captured_messages.extend(kwargs["messages"])
        raise RuntimeError("invalid API key")

    provider.client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=fail_openai_call)),
    )
    monkeypatch.setattr(main, "get_assistant_provider", lambda: provider)

    with caplog.at_level(logging.ERROR, logger="backend.app.ai"):
        response = client.post(
            "/api/v1/chat/messages",
            headers=headers,
            json={"message": "Explain Error", "file_id": file_record["id"]},
        )

    assert response.status_code == 200
    assert "Line 7" in response.json()["message"]
    assert "int value = 10;" in response.json()["message"]
    assert "int value = 10" in response.json()["message"]
    assert any(f"Active file ID: {file_record['id']}" in item["content"] for item in captured_messages)
    assert any("int value = 10" in item["content"] for item in captured_messages)
    assert any("OpenAI assistant request failed" in record.message for record in caplog.records)


def test_persistent_chat_session_flow(client: TestClient) -> None:
    _, headers = register(client)
    session = client.post(
        "/api/v1/chat/sessions",
        headers=headers,
        json={"title": "Java debugging", "file_id": None},
    )

    assert session.status_code == 201
    session_body = session.json()
    assert session_body["title"] == "Java debugging"

    message = client.post(
        f"/api/v1/chat/sessions/{session_body['id']}/messages",
        headers=headers,
        json={"message": "Explain this error"},
    )
    assert message.status_code == 201
    assert message.json()["role"] == "assistant"

    messages = client.get(
        f"/api/v1/chat/sessions/{session_body['id']}/messages",
        headers=headers,
    )
    assert messages.status_code == 200
    assert [item["role"] for item in messages.json()] == ["user", "assistant"]
    assert messages.json()[0]["message"] == "Explain this error"

    sessions = client.get("/api/v1/chat/sessions", headers=headers)
    assert sessions.status_code == 200
    assert sessions.json()[0]["id"] == session_body["id"]


def test_upload_analysis_and_chat_flow(client: TestClient) -> None:
    _, headers = register(client)
    project = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Analysis Project"},
    ).json()
    file_record = client.post(
        f"/api/v1/projects/{project['id']}/files",
        headers=headers,
        json={
            "filename": "Main.java",
            "language": "Java",
            "content": "class Main {\n  int value = 1\n}",
        },
    ).json()

    job = client.post(
        f"/api/v1/analysis/run?file_id={file_record['id']}",
        headers=headers,
    )
    job_body = job.json()
    assert job_body["status"] == "pending"
    completed_job = job_body
    for _ in range(20):
        completed_job = client.get(
            f"/api/v1/analysis/jobs/{job_body['id']}",
            headers=headers,
        ).json()
        if completed_job["status"] == "completed":
            break
        time.sleep(0.01)

    result = client.get(f"/api/v1/files/{file_record['id']}/errors", headers=headers)
    summary = client.get(f"/api/v1/files/{file_record['id']}/error-summary", headers=headers)
    chat = client.post(
        "/api/v1/chat/messages",
        headers=headers,
        json={"message": "Explain Error", "file_id": file_record["id"]},
    )

    assert job.status_code == 200
    assert completed_job["status"] == "completed"
    assert result.status_code == 200
    assert result.json()["error_count"] == 1
    assert result.json()["errors"][0]["line"] == 2
    assert summary.status_code == 200
    assert summary.json() == {
        "file_id": file_record["id"],
        "language": "Java",
        "status": "completed",
        "error_count": 1,
        "summary": "Detected 1 issues",
    }
    assert chat.status_code == 200
    assert chat.json()["role"] == "assistant"
    assert "Main.java" in chat.json()["message"]

    report = client.post(
        "/api/v1/reports",
        headers=headers,
        json={"file_id": file_record["id"], "title": "Main report", "content": "{}"},
    )
    assert report.status_code == 201
    report_body = report.json()
    assert client.get("/api/v1/reports", headers=headers).json()[0]["title"] == "Main report"
    assert client.get(f"/api/v1/reports/{report_body['id']}", headers=headers).status_code == 200
    exported = client.get(f"/api/v1/reports/{report_body['id']}/export", headers=headers)
    assert exported.status_code == 200
    assert exported.headers["content-disposition"].endswith(f'report-{report_body["id"]}.json"')

    file_details = client.get(f"/api/v1/files/{file_record['id']}", headers=headers)
    assert file_details.status_code == 200
    assert file_details.json()["content"].startswith("class Main")
    assert client.delete(f"/api/v1/files/{file_record['id']}", headers=headers).status_code == 204
    assert client.get(f"/api/v1/files/{file_record['id']}", headers=headers).status_code == 404