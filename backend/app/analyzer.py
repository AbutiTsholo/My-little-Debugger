import ast
from dataclasses import dataclass


@dataclass(frozen=True)
class Finding:
    line: int
    message: str
    suggestion: str
    severity: str
    rule: str


def analyze_source(source: str, language: str) -> list[Finding]:
    normalized_language = language.strip().lower()

    if normalized_language == "python":
        return _analyze_python(source)
    if normalized_language in {"java", "c#"}:
        return _analyze_jvm_style(source)
    return []


def _analyze_python(source: str) -> list[Finding]:
    try:
        tree = ast.parse(source)
    except SyntaxError as error:
        return [
            Finding(
                line=error.lineno or 1,
                message="Invalid Python syntax.",
                suggestion="Fix the syntax error reported on this line.",
                severity="error",
                rule="python.syntax",
            )
        ]

    return [
        Finding(
            line=handler.lineno,
            message="Bare except catches every exception.",
            suggestion="Catch a specific exception type instead of using a bare except.",
            severity="warning",
            rule="python.bare-except",
        )
        for handler in ast.walk(tree)
        if isinstance(handler, ast.ExceptHandler) and handler.type is None
    ]


def _analyze_jvm_style(source: str) -> list[Finding]:
    findings: list[Finding] = []
    opening_braces: list[int] = []
    for line_number, line in enumerate(source.splitlines(), start=1):
        stripped_line = line.strip()
        is_statement = bool(stripped_line) and not stripped_line.endswith((";", "{", "}"))
        if is_statement:
            findings.append(
                Finding(
                    line=line_number,
                    message="Missing semicolon or statement terminator.",
                    suggestion="Add the required terminator at the end of the line.",
                    severity="error",
                    rule="jvm.missing-terminator",
                )
            )

        for brace in _braces_outside_quotes(line):
            if brace == "{":
                opening_braces.append(line_number)
            elif opening_braces:
                opening_braces.pop()
            else:
                findings.append(
                    Finding(
                        line=line_number,
                        message="Unmatched closing brace.",
                        suggestion="Remove the extra closing brace or add its matching opening brace.",
                        severity="error",
                        rule="jvm.unmatched-brace",
                    )
                )

    findings.extend(
        Finding(
            line=line_number,
            message="Unmatched opening brace.",
            suggestion="Add a closing brace for the block opened on this line.",
            severity="error",
            rule="jvm.unmatched-brace",
        )
        for line_number in opening_braces
    )
    return findings


def _braces_outside_quotes(line: str) -> list[str]:
    braces: list[str] = []
    quote: str | None = None
    escaped = False
    for character in line:
        if escaped:
            escaped = False
            continue
        if character == "\\" and quote is not None:
            escaped = True
            continue
        if character in {"'", '"'}:
            quote = None if quote == character else character if quote is None else quote
            continue
        if quote is None and character in "{}":
            braces.append(character)
    return braces
