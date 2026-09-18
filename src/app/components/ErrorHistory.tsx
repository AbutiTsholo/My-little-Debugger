import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { store } from '../store';
import { FileCode, Calendar, AlertCircle, CheckCircle, Eye } from 'lucide-react';

export default function ErrorHistory() {
  const navigate = useNavigate();
  const [files, setFiles] = useState(store.getAnalyzedFiles());

  useEffect(() => {
    void store.hydrateRemoteFiles().then(() => setFiles(store.getAnalyzedFiles()));
  }, []);

  const handleViewFile = (file: any) => {
    store.setCurrentFile(file);
    navigate('/dashboard/error-analysis');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error History</h2>
        <p className="text-gray-600">View all your past debugging sessions</p>
      </div>

      {files.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-md text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileCode className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No History Yet</h3>
          <p className="text-gray-600 mb-6">
            Upload and analyze your first file to start building your debugging history.
          </p>
          <button
            onClick={() => navigate('/dashboard/upload')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all"
          >
            Upload Code
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    file.errorCount === 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <FileCode className={`w-6 h-6 ${
                      file.errorCount === 0 ? 'text-green-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{file.fileName}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <FileCode className="w-4 h-4" />
                        {file.language}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {file.uploadDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 ${
                    file.errorCount === 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {file.errorCount === 0 ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Clean
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5" />
                        {file.errorCount} Error{file.errorCount > 1 ? 's' : ''}
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => handleViewFile(file)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all flex items-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    View Details
                  </button>
                </div>
              </div>

              {/* Error Preview */}
              {file.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <p className="text-sm text-red-900 font-medium mb-2">Error Summary:</p>
                  {file.errors.slice(0, 2).map((error: any, index: number) => (
                    <div key={index} className="text-sm text-red-800 mb-1">
                      • Line {error.line}: {error.message}
                    </div>
                  ))}
                  {file.errors.length > 2 && (
                    <p className="text-sm text-red-700 mt-2">
                      + {file.errors.length - 2} more error{file.errors.length - 2 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
