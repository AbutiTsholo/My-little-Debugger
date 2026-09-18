from backend.app.ai import ChatContext, DeterministicAssistantProvider


def test_deterministic_assistant_respects_explanation_mode_and_context() -> None:
    provider = DeterministicAssistantProvider()
    context = ChatContext(filename="Main.java", language="Java", finding_count=2)

    beginner = provider.respond("Explain Error", context, explanation_mode="beginner")
    advanced = provider.respond("Explain Error", context, explanation_mode="advanced")

    assert "Main.java" in beginner
    assert "2 issues" in beginner
    assert "Step-by-step" in beginner
    assert "Main.java" in advanced
    assert "2 issues" in advanced
    assert "Concise:" in advanced
    assert beginner != advanced
