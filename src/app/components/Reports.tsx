import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { store } from '../store';
import { createReportRequest } from '../api';
import { FileDown, Save, ArrowLeft, FileText, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';

export default function Reports() {
  const navigate = useNavigate();
  const [currentFile, setCurrentFile] = useState(store.getCurrentFile());
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    void store.hydrateRemoteFiles().then(() => setCurrentFile(store.getCurrentFile()));
  }, []);

  const handleExportPDF = () => {
    window.print();
  };

  const handleSaveSession = async () => {
    if (!currentFile) return;
    try {
      await createReportRequest(
        currentFile.id,
        `Debugging Report - ${currentFile.fileName}`,
        JSON.stringify({
          filename: currentFile.fileName,
          language: currentFile.language,
          status: currentFile.status,
          errorCount: currentFile.errorCount,
          errors: currentFile.errors,
        }),
      );
      store.setCurrentFile(currentFile);
      setSaveMessage('Report saved successfully.');
    } catch {
      setSaveMessage('Unable to save report.');
    }
    window.setTimeout(() => setSaveMessage(''), 3000);
  };

  if (!currentFile) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Report Available</h3>
        <p className="text-gray-600 mb-6">
          Analyze a file first to generate a report.
        </p>
        <button
          onClick={() => navigate('/dashboard/upload')}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl"
        >
          Upload Code
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Debugging Report</h2>
        <p className="text-gray-600">Comprehensive analysis of {currentFile.fileName}</p>
        {saveMessage && <p className="mt-3 text-sm text-green-700">{saveMessage}</p>}
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-xl p-8 shadow-md space-y-6">
        {/* Summary Section */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-600" />
            Error Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-purple-900">{currentFile.fileName}</div>
              <div className="text-sm text-purple-700">File Name</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-900">{currentFile.language}</div>
              <div className="text-sm text-blue-700">Language</div>
            </div>
            <div className={`rounded-xl p-4 ${
              currentFile.errorCount === 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className={`text-2xl font-bold ${
                currentFile.errorCount === 0 ? 'text-green-900' : 'text-red-900'
              }`}>
                {currentFile.errorCount}
              </div>
              <div className={`text-sm ${
                currentFile.errorCount === 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                Error{currentFile.errorCount !== 1 ? 's' : ''} Found
              </div>
            </div>
          </div>
        </div>

        {/* File Details */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">File Details</h3>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Upload Date:</span>
              <span className="font-medium text-gray-900">{currentFile.uploadDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Programming Language:</span>
              <span className="font-medium text-gray-900">{currentFile.language}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${
                currentFile.errorCount === 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {currentFile.status}
              </span>
            </div>
          </div>
        </div>

        {/* Errors & Fixes */}
        {currentFile.errors.length > 0 ? (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              Detected Errors & Suggested Fixes
            </h3>
            <div className="space-y-4">
              {currentFile.errors.map((error, index) => (
                <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 p-4 border-l-4 border-red-500">
                    <div className="font-medium text-gray-900 mb-1">
                      Error #{index + 1} - Line {error.line}
                    </div>
                    <div className="text-red-700">{error.message}</div>
                  </div>
                  <div className="bg-green-50 p-4 border-l-4 border-green-500">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-green-900 mb-1">Suggested Fix:</div>
                        <div className="text-green-800">{error.suggestion}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <div className="font-bold text-green-900 mb-1">Excellent Work!</div>
                <div className="text-green-800">
                  No errors detected in your code. Keep up the great work!
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Suggestions */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Suggestions</h3>
          <div className="bg-blue-50 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                1
              </div>
              <p className="text-blue-900">
                Add comments to explain complex logic and improve code readability
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                2
              </div>
              <p className="text-blue-900">
                Use meaningful variable names that describe their purpose
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                3
              </div>
              <p className="text-blue-900">
                Consider adding error handling for edge cases
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all"
        >
          <FileDown className="w-5 h-5" />
          Export PDF
        </button>
        <button
          onClick={handleSaveSession}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
        >
          <Save className="w-5 h-5" />
          Save Session
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
