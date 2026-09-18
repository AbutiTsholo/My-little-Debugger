from collections.abc import Generator
import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.db import Base, get_db
from backend.app import main
from backend.app.main import app


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