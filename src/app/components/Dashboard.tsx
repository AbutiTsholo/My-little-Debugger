import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { store } from '../store';
import { Upload, History, FileText, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = store.getCurrentUser();
  const isAdmin = store.isAdmin();
  const [files, setFiles] = useState(store.getAnalyzedFiles());
  const recentFiles = files.slice(0, 3);

  useEffect(() => {
    void store.hydrateRemoteFiles().then(() => setFiles(store.getAnalyzedFiles()));
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name}! {isAdmin && '👑'}
        </h1>
        <p className="text-white/90">
          Ready to debug some code? Let's make your programming journey smoother.
        </p>
      </div>

      {recentFiles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50 px-5 py-4 text-sm text-purple-800">
          No debugging sessions yet. Upload a file to get started and build your analysis history.
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{recentFiles.length}</div>
          <div className="text-sm text-gray-600">Files Analyzed</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {recentFiles.filter(f => f.errorCount === 0).length}
          </div>
          <div className="text-sm text-gray-600">Error-Free Files</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {recentFiles.reduce((sum, f) => sum + f.errorCount, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Errors Fixed</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/dashboard/upload')}
          className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all text-left group"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Upload Code</h3>
          <p className="text-sm text-gray-600">Upload and analyze your Python, Java, or C# files</p>
        </button>

        <button
          onClick={() => navigate('/dashboard/history')}
          className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all text-left group"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <History className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Error History</h3>
          <p className="text-sm text-gray-600">View your past debugging sessions</p>
        </button>

        <button
          onClick={() => navigate('/dashboard/reports')}
          className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all text-left group"
        >
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Generate Report</h3>
          <p className="text-sm text-gray-600">Create detailed debugging reports</p>
        </button>
      </div>

      {/* Recent Sessions */}
      {recentFiles.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="font-bold text-gray-900 mb-4">Recent Debugging Sessions</h3>
          <div className="space-y-3">
            {recentFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => {
                  store.setCurrentFile(file);
                  navigate('/dashboard/error-analysis');
                }}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    file.errorCount === 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <FileText className={`w-5 h-5 ${
                      file.errorCount === 0 ? 'text-green-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{file.fileName}</div>
                    <div className="text-sm text-gray-600">
                      {file.language} • {file.errorCount} errors
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">{file.uploadDate}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
