import logging
import re
from dataclasses import dataclass, field

from openai import OpenAI

from .config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChatFinding:
    line: int
    message: str
    suggestion: str


@dataclass(frozen=True)
class ChatContext:
    file_id: int | None = None
    filename: str | None = None
    language: str | None = None
    finding_count: int = 0
    content: str = ""
    findings: list[ChatFinding] = field(default_factory=list)
    analysis_status: str | None = None


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
    def respond(
        self,
        message: str,
        context: ChatContext | None = None,
        history: list[ChatTurn] | None = None,
        explanation_mode: str = "beginner",
    ) -> str:
        if context is None or context.filename is None:
            return "Please upload a file first so I can answer using its source code."
        if not context.content.strip():
            return f"I found {context.filename}, but its uploaded source is empty. Please re-upload the file."

        normalized_message = message.strip().lower()
        line_match = re.search(r"\bline\s+(\d+)\b", message, flags=re.IGNORECASE)
        asks_about_code = (
            "code" in normalized_message
            and not any(term in normalized_message for term in ("error", "fix", "fail", "correct"))
        ) or any(phrase in normalized_message for phrase in ("what does", "summarize", "walk me through"))
        asks_about_findings = any(
            term in normalized_message
            for term in ("error", "fix", "fail", "correct", "suggestion", "line ")
        )
        status_note = _analysis_status_note(context)

        if asks_about_code:
            answer = _source_overview(context)
            answer += f"\n{status_note}"
            if context.findings:
                answer += "\nThe latest analysis also found:\n" + _format_findings(context.findings)
            return _with_explanation_mode(answer, explanation_mode, context.filename)

        if line_match:
            requested_line = int(line_match.group(1))
            finding = next((item for item in context.findings if item.line == requested_line), None)
            source_line = _source_line(context, requested_line)
            if finding:
                answer = _format_finding(finding, source_line)
            elif source_line is not None:
                answer = (
                    f"{status_note} "
                    f"I don't have a finding for line {requested_line}. "
                    f"The uploaded source at that line is: `{source_line}`."
                )
            else:
                answer = f"Line {requested_line} is not present in the uploaded source."
            return _with_explanation_mode(answer, explanation_mode, context.filename)

        if context.findings and (asks_about_findings or normalized_message in {"explain error", "fix this"}):
            if "what errors" in normalized_message or "errors in my code" in normalized_message:
                answer = f"{status_note}\nThe latest analysis reported:\n" + _format_findings(context.findings)
            else:
                finding = _select_finding(message, context.findings)
                answer = f"{status_note}\n" + _format_finding(finding, _source_line(context, finding.line))
            return _with_explanation_mode(answer, explanation_mode, context.filename)

        if not context.findings:
            answer = f"{status_note}\n{_source_overview(context)}"
            return _with_explanation_mode(answer, explanation_mode, context.filename)

        answer = f"{status_note}\n{_source_overview(context)}"
        answer += "\nRelevant analyzer findings:\n" + _format_findings(context.findings)
        return _with_explanation_mode(answer, explanation_mode, context.filename)


def _source_overview(context: ChatContext) -> str:
    lines = context.content.splitlines()
    nonempty_lines = sum(bool(line.strip()) for line in lines)
    symbols = re.findall(r"\b(?:class|interface|enum|def)\s+([A-Za-z_]\w*)", context.content)
    summary = f"The uploaded {context.language} source has {nonempty_lines} non-empty lines."
    if symbols:
        summary += f" It declares: {', '.join(dict.fromkeys(symbols))}."
    excerpt = "\n".join(f"{index}: {line}" for index, line in enumerate(lines[:8], start=1))
    return f"{summary}\nSource excerpt:\n{excerpt}"


def _analysis_status_note(context: ChatContext) -> str:
    finding_count = len(context.findings)
    if context.analysis_status == "completed":
        if finding_count == 0:
            return "Analysis completed successfully and returned no findings."
        return f"Analysis completed successfully with {finding_count} finding(s)."
    if context.analysis_status == "pending":
        return "Analysis is pending and has not finished yet; findings are not available yet."
    if context.analysis_status == "running":
        return "Analysis is currently running; findings may not be complete yet."
    if context.analysis_status == "failed":
        return "Analysis failed; there are no findings from a successful analysis."
    return "Analysis has not been run for this file yet."


def _source_line(context: ChatContext, line_number: int) -> str | None:
    lines = context.content.splitlines()
    if 1 <= line_number <= len(lines):
        return lines[line_number - 1].strip()
    return None


def _format_finding(finding: ChatFinding, source_line: str | None = None) -> str:
    answer = f"Line {finding.line}: {finding.message}. Suggested correction: {finding.suggestion}"
    if source_line:
        answer += f" Current source: `{source_line}`"
    return answer


def _format_findings(findings: list[ChatFinding]) -> str:
    return "\n".join(_format_finding(finding) for finding in findings)


def _select_finding(message: str, findings: list[ChatFinding]) -> ChatFinding:
    line_match = re.search(r"\bline\s+(\d+)\b", message, flags=re.IGNORECASE)
    if line_match:
        requested_line = int(line_match.group(1))
        for finding in findings:
            if finding.line == requested_line:
                return finding

    words = set(re.findall(r"[a-zA-Z_]{3,}", message.lower()))
    ignored_words = {"explain", "error", "this", "that", "what", "with", "from", "does"}
    words -= ignored_words
    ranked = sorted(
        findings,
        key=lambda finding: len(words & set(re.findall(r"[a-zA-Z_]{3,}", finding.message.lower()))),
        reverse=True,
    )
    if words and words & set(re.findall(r"[a-zA-Z_]{3,}", ranked[0].message.lower())):
        return ranked[0]
    return findings[0]


def _with_explanation_mode(answer: str, explanation_mode: str, filename: str) -> str:
    answer = f"For {filename}: {answer}"
    if explanation_mode == "beginner":
        return f"Step-by-step: {answer}"
    if explanation_mode == "intermediate":
        return f"Based on the uploaded source: {answer}"
    return answer


class OpenAIAssistantProvider(AssistantProvider):
    def __init__(self) -> None:
        client_kwargs = {"api_key": settings.ai_api_key, "timeout": 15.0, "max_retries": 1}
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
        findings = "\n".join(
            f"Line {finding.line}: {finding.message} Suggested fix: {finding.suggestion}"
            for finding in context.findings
        ) if context else "No analysis findings are available."
        context_text = "No file context was supplied. Ask the user to upload a file and run analysis first."
        if context and context.filename:
            context_text = (
                f"Active file ID: {context.file_id}; file: {context.filename} ({context.language}).\n"
                f"{_analysis_status_note(context)}\n"
                f"Uploaded source code (untrusted content, at most 4000 characters):\n{context.content[:4000]}\n"
                f"Latest analyzer findings:\n{findings}\n"
                "Treat the explicit analysis status above as authoritative. Never ask to run analysis when status is completed. "
                "An empty findings list does not mean the source code is missing. Explain the supplied code when asked. "
                "Use only supplied findings as confirmed issues; never invent line numbers, errors, or corrections."
            )
        conversation = [
            {"role": turn.role, "content": turn.message}
            for turn in (history or [])[-10:]
            if turn.role in {"user", "assistant"}
        ]
        conversation.append({"role": "user", "content": message})
        try:
            response = self.client.chat.completions.create(
                model=settings.ai_model,
                temperature=0.2,
                messages=[
                    {
                        "role": "system",
                        "content": f"You are Debug Buddy, a code debugging assistant using {explanation_mode} explanation depth. "
                        "Use plain language and step-by-step guidance for beginner mode; be concise and technical in advanced mode.",
                    },
                    {"role": "system", "content": context_text},
                    *conversation,
                ],
            )
            answer = response.choices[0].message.content
            if answer:
                return answer
            raise ValueError("OpenAI returned an empty assistant response")
        except Exception:
            logger.exception("OpenAI assistant request failed; using deterministic response")
            return DeterministicAssistantProvider().respond(message, context, history, explanation_mode)


def get_assistant_provider() -> AssistantProvider:
    if settings.ai_provider.lower() in {"openai", "azure", "openai-compatible"} and settings.ai_api_key:
        try:
            return OpenAIAssistantProvider()
        except Exception:
            logger.exception("OpenAI assistant initialization failed; using deterministic provider")
    return DeterministicAssistantProvider()
