from backend.app.ai import ChatContext, ChatFinding, DeterministicAssistantProvider


def test_deterministic_assistant_respects_explanation_mode_and_context() -> None:
    provider = DeterministicAssistantProvider()
    context = ChatContext(
        file_id=19,
        filename="Main.java",
        language="Java",
        finding_count=1,
        content="class Main {\n  int value = 1\n}",
        findings=[ChatFinding(
            line=2,
            message="Missing semicolon or statement terminator.",
            suggestion="Add a semicolon: `int value = 1;`",
        )],
    )

    beginner = provider.respond("Explain Error", context, explanation_mode="beginner")
    advanced = provider.respond("Explain Error", context, explanation_mode="advanced")

    assert "Main.java" in beginner
    assert "Line 2" in beginner
    assert "int value = 1;" in beginner
    assert "Step-by-step" in beginner
    assert "Main.java" in advanced
    assert "Line 2" in advanced
    assert "int value = 1;" in advanced
    assert beginner != advanced


def test_deterministic_assistant_explains_uploaded_source_without_findings() -> None:
    provider = DeterministicAssistantProvider()
    context = ChatContext(
        file_id=23,
        filename="Study.java",
        language="Java",
        content="class Study {\n  int answer = 42;\n}",
        analysis_status="completed",
    )

    answer = provider.respond("Explain my code.", context)

    assert "Study.java" in answer
    assert "class Study" in answer
    assert "int answer = 42;" in answer
    assert "completed successfully and returned no findings" in answer
    assert "upload a file" not in answer.lower()


def test_deterministic_assistant_reports_pending_running_and_failed_statuses() -> None:
    provider = DeterministicAssistantProvider()
    source = "class StatusExample {\n  int value = 1;\n}"

    for status, expected in (
        ("pending", "analysis is pending"),
        ("running", "analysis is currently running"),
        ("failed", "analysis failed"),
    ):
        context = ChatContext(
            file_id=24,
            filename="StatusExample.java",
            language="Java",
            content=source,
            analysis_status=status,
        )

        answer = provider.respond("Explain my code.", context)

        assert expected in answer.lower()
        assert "class StatusExample" in answer


def test_deterministic_assistant_requests_upload_without_file_context() -> None:
    answer = DeterministicAssistantProvider().respond("Explain my code.")

    assert "upload a file" in answer.lower()
