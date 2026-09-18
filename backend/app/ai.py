from dataclasses import dataclass

from openai import OpenAI

from .config import settings


@dataclass(frozen=True)
class ChatContext:
    filename: str | None = None
    language: str | None = None
    finding_count: int = 0


@dataclass(frozen=True)
class ChatTurn:
    role: str
    message: str


class AssistantProvider:
    def respond(
        self,
        message: str,
        context: ChatContext | None = None,
        history: list[ChatTurn] | None = None,
        explanation_mode: str = "beginner",
    ) -> str:
        raise NotImplementedError


class DeterministicAssistantProvider(AssistantProvider):
    responses = {
        "Explain Error": "Review the highlighted line first, then compare its syntax with the surrounding statements.",
        "Fix This": "Apply the suggested fix to the highlighted line, save the file, and run the analysis again.",
        "Optimize Code": "Start by extracting repeated logic, naming values clearly, and handling input edge cases.",
        "Why Did This Fail?": "The analysis found a syntax issue that prevents the program from being parsed correctly.",
    }

    def respond(
        self,
        message: str,
        context: ChatContext | None = None,
        history: list[ChatTurn] | None = None,
        explanation_mode: str = "beginner",
    ) -> str:
        base_message = self.responses.get(message, f"I can help investigate: {message}")
        if explanation_mode == "advanced":
            base_message = f"Concise: {base_message}"
        elif explanation_mode == "intermediate":
            base_message = f"Reason: {base_message}"
        else:
            base_message = f"Step-by-step: {base_message}"
        if context is None or context.filename is None:
            return base_message

        issue_label = "issue" if context.finding_count == 1 else "issues"
        return (
            f"I reviewed {context.filename}. The latest analysis found "
            f"{context.finding_count} {issue_label}. {base_message}"
        )


class OpenAIAssistantProvider(AssistantProvider):
    def __init__(self) -> None:
        client_kwargs = {"api_key": settings.ai_api_key}
        if settings.ai_base_url:
            client_kwargs["base_url"] = settings.ai_base_url
        self.client = OpenAI(**client_kwargs)

    def respond(
        self,
        message: str,
        context: ChatContext | None = None,
        history: list[ChatTurn] | None = None,
        explanation_mode: str = "beginner",
    ) -> str:
        context_text = "No file context was supplied."
        if context and context.filename:
            context_text = (
                f"Active file: {context.filename} ({context.language}). "
                f"Latest analysis findings: {context.finding_count}."
            )
        conversation = [
            {"role": turn.role, "content": turn.message}
            for turn in (history or [])[-10:]
            if turn.role in {"user", "assistant"}
        ]
        conversation.append({"role": "user", "content": message})
        response = self.client.chat.completions.create(
            model=settings.ai_model,
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": f"You are Debug Buddy, a code debugging assistant using {explanation_mode} explanation depth. "
                    "Never invent findings; distinguish clearly between known analysis results and suggestions.",
                },
                {"role": "system", "content": context_text},
                *conversation,
            ],
        )
        return response.choices[0].message.content or "I could not generate a response."


def get_assistant_provider() -> AssistantProvider:
    if settings.ai_provider.lower() in {"openai", "azure", "openai-compatible"} and settings.ai_api_key:
        return OpenAIAssistantProvider()
    return DeterministicAssistantProvider()
