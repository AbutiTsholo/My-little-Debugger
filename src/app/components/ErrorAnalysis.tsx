import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { store } from '../store';
import { getAnalysisSummaryRequest, type ApiAnalysisSummary } from '../api';
import { MessageCircle, FileDown, History, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';

export default function ErrorAnalysis() {
  const navigate = useNavigate();
  const [currentFile, setCurrentFile] = useState(store.getCurrentFile());
  const [analysisSummary, setAnalysisSummary] = useState<ApiAnalysisSummary | null>(null);

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
        <p className="text-gray-600">No file selected. Please upload a file first.</p>
        <button
          onClick={() => navigate('/dashboard/upload')}
          className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl"
        >
          Upload Code
        </button>
      </div>
    );
  }

  const codeLines = currentFile.code.split('\n');
  const errorLines = new Set(currentFile.errors.map(e => e.line));
  const analysisStatus = (analysisSummary?.status ?? currentFile.status).toLowerCase();
  const isAnalysisInProgress = ['pending', 'running', 'uploaded'].includes(analysisStatus);
  const hasCompletedAnalysis = analysisStatus === 'completed'
    || ['clean', 'errors found'].includes(currentFile.status.toLowerCase());

  return (
    <div className="space-y-6">
      {/* File Header */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{currentFile.fileName}</h2>
            <p className="text-gray-600">{currentFile.language} • {currentFile.uploadDate}</p>
            {analysisSummary && (
              <p className="text-sm text-gray-500 mt-1">
                Analysis status: {analysisSummary.status}
              </p>
            )}
          </div>
          <div className={`px-4 py-2 rounded-xl font-medium ${
            isAnalysisInProgress
              ? 'bg-amber-100 text-amber-800'
              : currentFile.errorCount === 0 && hasCompletedAnalysis
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
          }`}>
            {isAnalysisInProgress ? (
              <span>Analysis in Progress</span>
            ) : currentFile.errorCount === 0 && hasCompletedAnalysis ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                No Errors Found
              </span>
            ) : currentFile.errorCount > 0 ? (
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {currentFile.errorCount} Error{currentFile.errorCount > 1 ? 's' : ''} Found
              </span>
            ) : (
              <span>Analysis Not Complete</span>
            )}
          </div>
        </div>

        {analysisSummary?.summary && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
            <span className="font-medium">Analysis summary:</span> {analysisSummary.summary}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/dashboard/chat')}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all flex items-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Ask Debug Buddy
          </button>
          <button
            onClick={() => navigate('/dashboard/reports')}
            className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all flex items-center gap-2"
          >
            <FileDown className="w-5 h-5" />
            Save Report
          </button>
          <button
            onClick={() => navigate('/dashboard/history')}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <History className="w-5 h-5" />
            View History
          </button>
        </div>
      </div>

      {/* Code Display */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="font-bold text-gray-900 mb-4">Source Code</h3>
        <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-sm">
            {codeLines.map((line, index) => (
              <div
                key={index}
                className={`${
                  errorLines.has(index + 1) ? 'bg-red-900/30 border-l-4 border-red-500 pl-2' : ''
                }`}
              >
                <span className="text-gray-500 select-none mr-4">{index + 1}</span>
                <span className="text-gray-100">{line}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* Error Explanations */}
      {currentFile.errors.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900">Error Details & Suggestions</h3>
          {currentFile.errors.map((error, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-md border-l-4 border-red-500">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-medium text-gray-900 mb-1">Line {error.line}</div>
                  <div className="text-red-700">{error.message}</div>
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-green-900 mb-1">Suggested Fix</div>
                    <div className="text-green-800 text-sm">{error.suggestion}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success Message */}
      {currentFile.errorCount === 0 && hasCompletedAnalysis && (
        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <div className="font-bold text-green-900 mb-1">Great work!</div>
              <div className="text-green-800">
                Your code looks clean! No syntax errors detected.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
