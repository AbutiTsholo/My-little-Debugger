import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { store } from "../store";
import ChatAssistant from "./ChatAssistant";
import { getAnalysisSummaryRequest, type ApiAnalysisSummary } from "../api";
import {
  MessageCircle,
  X,
  FileDown,
  History,
  CheckCircle,
  AlertTriangle,
  Info,
  Lightbulb,
} from "lucide-react";
import {
  findingSeverityPresentation,
  type FindingSeverity,
} from "../findingSeverity";

export default function ErrorAnalysis() {
  const navigate = useNavigate();
  const [buddyOpen, setBuddyOpen] = useState(false);
  const [buddyMinimized, setBuddyMinimized] = useState(false);
  const [buddyLoaded, setBuddyLoaded] = useState(false);
  const [currentFile, setCurrentFile] = useState(store.getCurrentFile());
  const [analysisSummary, setAnalysisSummary] =
    useState<ApiAnalysisSummary | null>(null);

  useEffect(() => {
    void store.hydrateRemoteFiles().then(async () => {
      const nextFile = store.getCurrentFile();
      setCurrentFile(nextFile);
      if (!nextFile) return;

      try {
        setAnalysisSummary(await getAnalysisSummaryRequest(nextFile.id));
      } catch {
        setAnalysisSummary(null);
      }
    });
  }, []);

  if (!currentFile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          No file selected. Please upload a file first.
        </p>
        <button
          onClick={() => navigate("/dashboard/upload")}
          className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl"
        >
          Upload Code
        </button>
      </div>
    );
  }

  const codeLines = currentFile.code.split("\n");
  const lineSeverities = new Map<number, FindingSeverity>();
  for (const finding of currentFile.errors) {
    const previous = lineSeverities.get(finding.line);
    if (
      !previous ||
      (previous === "info" && finding.severity !== "info") ||
      (previous === "warning" && finding.severity === "error")
    ) {
      lineSeverities.set(finding.line, finding.severity);
    }
  }
  const { errors, warnings, informational, total } = currentFile.findingCounts;
  const summarySeverity: FindingSeverity =
    errors > 0 ? "error" : warnings > 0 ? "warning" : "info";
  const summaryPresentation = findingSeverityPresentation[summarySeverity];
  const analysisStatus = (
    analysisSummary?.status ?? currentFile.status
  ).toLowerCase();
  const isAnalysisInProgress = ["pending", "running", "uploaded"].includes(
    analysisStatus,
  );
  const hasCompletedAnalysis =
    analysisStatus === "completed" ||
    ["clean", "errors found", "findings found"].includes(
      currentFile.status.toLowerCase(),
    );

  return (
    <div className="space-y-6">
      {/* File Header */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentFile.fileName}
            </h2>
            <p className="text-gray-600">
              {currentFile.language} • {currentFile.uploadDate}
            </p>
            {analysisSummary && (
              <p className="text-sm text-gray-500 mt-1">
                Analysis status: {analysisSummary.status}
              </p>
            )}
          </div>
          <div
            className={`px-4 py-2 rounded-xl font-medium ${
              isAnalysisInProgress
                ? "bg-amber-100 text-amber-800"
                : total === 0 && hasCompletedAnalysis
                  ? "bg-green-100 text-green-700"
                  : summaryPresentation.badge
            }`}
          >
            {isAnalysisInProgress ? (
              <span>Analysis in Progress</span>
            ) : total === 0 && hasCompletedAnalysis ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Analysis Clean
              </span>
            ) : total > 0 ? (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {errors > 0 && (
                  <span>
                    {errors} error{errors === 1 ? "" : "s"}
                  </span>
                )}
                {warnings > 0 && (
                  <span>
                    {warnings} warning{warnings === 1 ? "" : "s"}
                  </span>
                )}
                {informational > 0 && (
                  <span>{informational} informational</span>
                )}
                <span className="font-normal">({total} total findings)</span>
              </span>
            ) : (
              <span>Analysis Not Complete</span>
            )}
          </div>
        </div>

        {analysisSummary?.summary && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
            <span className="font-medium">Analysis summary:</span>{" "}
            {analysisSummary.summary}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            id="analysis-buddy-toggle"
            aria-expanded={buddyOpen}
            aria-controls="analysis-buddy-panel"
            onClick={() => { setBuddyLoaded(true); setBuddyOpen(!buddyOpen); setBuddyMinimized(false); }}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all flex items-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            {buddyOpen ? "Hide Debug Buddy" : "Ask Debug Buddy"}
          </button>
          <button
            onClick={() => navigate("/dashboard/reports")}
            className="button secondary"
          >
            <FileDown className="w-5 h-5" />
            Save Report
          </button>
          <button
            onClick={() => navigate("/dashboard/history")}
            className="button secondary"
          >
            <History className="w-5 h-5" />
            View History
          </button>
        </div>
      </div>

      <div className={`code-chat-workspace analysis-workspace ${buddyOpen ? "buddy-open" : "buddy-closed"}`}>
        <div className="code-workspace-main">
          {/* Code Display */}
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="font-bold text-gray-900 mb-4">Source Code</h3>
            <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-sm">
                {codeLines.map((line, index) => (
                  <div
                    key={index}
                    className={`${
                      lineSeverities.has(index + 1)
                        ? `border-l-4 pl-2 ${findingSeverityPresentation[lineSeverities.get(index + 1)!].highlight}`
                        : ""
                    }`}
                  >
                    <span className="text-gray-500 select-none mr-4">
                      {index + 1}
                    </span>
                    <span className="text-gray-100">{line}</span>
                  </div>
                ))}
              </pre>
            </div>
          </div>

          {/* Error Explanations */}
          {currentFile.errors.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">
                Findings & Suggestions
              </h3>
              {currentFile.errors.map((error, index) => {
                const presentation =
                  findingSeverityPresentation[error.severity];
                const FindingIcon =
                  error.severity === "info" ? Info : AlertTriangle;
                return (
                  <div
                    key={index}
                    className={`bg-white rounded-xl p-6 shadow-md border-l-4 ${presentation.border}`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <FindingIcon
                        className={`w-6 h-6 ${presentation.icon} flex-shrink-0 mt-1`}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            Line {error.line}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${presentation.badge}`}
                          >
                            {presentation.label}
                          </span>
                        </div>
                        <div className={presentation.message}>
                          {error.message}
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-6 h-6 text-green-600 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-green-900 mb-1">
                            Suggested Fix
                          </div>
                          <div className="text-green-800 text-sm">
                            {error.suggestion}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Success Message */}
          {total === 0 && hasCompletedAnalysis && (
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <div className="font-bold text-green-900 mb-1">
                    Great work!
                  </div>
                  <div className="text-green-800">
                    No findings were detected by these checks. Test the code in
                    your IDE as well.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <aside id="analysis-buddy-panel" className="workspace-assistant analysis-buddy-panel" hidden={!buddyOpen} aria-label="Debug Buddy panel">
          <div className="analysis-buddy-toolbar">
            <strong>Debug Buddy</strong>
            <div className="analysis-buddy-actions">
              <button className="text-button" aria-expanded={!buddyMinimized} aria-controls="analysis-buddy-content" onClick={() => setBuddyMinimized(!buddyMinimized)}>{buddyMinimized ? "Expand" : "Minimise"}</button>
              <button className="text-button" aria-label="Close Debug Buddy panel" onClick={() => {
                setBuddyOpen(false);
                document.getElementById("analysis-buddy-toggle")?.focus();
              }}><X size={15} /> Close</button>
            </div>
          </div>
          <div id="analysis-buddy-content" className="analysis-buddy-content" hidden={buddyMinimized} tabIndex={0} aria-label="Scrollable Debug Buddy content">
            {buddyLoaded && <ChatAssistant key={currentFile.id} embedded />}
          </div>
        </aside>
      </div>
    </div>
  );
}
