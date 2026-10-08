import pytest

from backend.app.analyzer import Finding, analyze_source


def test_python_syntax_error_returns_line_finding() -> None:
    findings = analyze_source("def broken(:\n    return 1\n", "Python")

    assert findings == [
        Finding(
            line=1,
            message="Invalid Python syntax.",
            suggestion="Fix the syntax error reported on this line.",
            severity="error",
            rule="python.syntax",
        )
    ]


def test_python_bare_except_returns_warning() -> None:
    findings = analyze_source("try:\n    run_task()\nexcept:\n    recover()\n", "Python")

    assert findings == [
        Finding(
            line=3,
            message="Bare except catches every exception.",
            suggestion="Catch a specific exception type instead of using a bare except.",
            severity="warning",
            rule="python.bare-except",
        )
    ]


def test_java_missing_semicolon_returns_finding() -> None:
    findings = analyze_source("class Main {\n  int value = 1\n}\n", "Java")

    assert findings == [
        Finding(
            line=2,
            message="Missing semicolon or statement terminator.",
            suggestion="Add a semicolon: `int value = 1;`",
            severity="error",
            rule="jvm.missing-terminator",
        )
    ]


def test_jvm_analyzer_ignores_comments_annotations_and_multiline_statements() -> None:
    source = """// comment without a terminator
/* block comment
 * continuation of comment
 */
@Override
public void run() {
  int value =
      calculate(
          2,
          3
      );
}
"""

    assert analyze_source(source, "Java") == []


def test_csharp_unmatched_opening_brace_returns_finding() -> None:
    findings = analyze_source("class Main {\n  int value = 1;\n", "C#")

    assert findings == [
        Finding(
            line=1,
            message="Unmatched opening brace.",
            suggestion="Add a closing brace for the block opened on this line.",
            severity="error",
            rule="jvm.unmatched-brace",
        )
    ]


def test_java_unmatched_closing_brace_returns_finding() -> None:
    findings = analyze_source("class Main {\n}\n}\n", "Java")

    assert findings == [
        Finding(
            line=3,
            message="Unmatched closing brace.",
            suggestion="Remove the extra closing brace or add its matching opening brace.",
            severity="error",
            rule="jvm.unmatched-brace",
        )
    ]


@pytest.mark.parametrize("language", ["Python", "Java", "C#", "Ruby"])
def test_clean_or_unsupported_source_has_no_findings(language: str) -> None:
    source = "print('ok')\n" if language == "Python" else "class Main {\n  int value = 1;\n}\n"

    assert analyze_source(source, language) == []
