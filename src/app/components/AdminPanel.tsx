import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { store } from '../store';
import {
  getAdminAuditLogsRequest,
  getAdminSummaryRequest,
  getAdminUsersRequest,
  type ApiAdminSummary,
  type ApiAuditLog,
  type ApiUser,
} from '../api';
import { Shield, Users, FileCode, TrendingUp, Activity, Lock, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function AdminPanel() {
  const navigate = useNavigate();
  const isAdmin = store.isAdmin();

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            Administrator privileges required.
          </p>

          <div className="bg-purple-50 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-purple-900 font-medium">
                  This area is reserved for system administrators.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const user = store.getCurrentUser();
  const allFiles = store.getAnalyzedFiles();
  const [summary, setSummary] = useState<ApiAdminSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<ApiAuditLog[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);

  useEffect(() => {
    void Promise.all([
      getAdminSummaryRequest(),
      getAdminAuditLogsRequest(),
      getAdminUsersRequest(),
    ]).then(([nextSummary, nextLogs, nextUsers]) => {
      setSummary(nextSummary);
      setAuditLogs(nextLogs);
      setUsers(nextUsers);
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-10 h-10" />
          <div>
            <h1 className="text-3xl font-bold">Administrator Panel</h1>
            <p className="text-white/90">Welcome, {user?.name}</p>
          </div>
        </div>
        <div className="bg-white/20 rounded-xl px-4 py-2 inline-block">
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Administrator
          </span>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary?.user_count ?? '—'}</div>
          <div className="text-sm text-gray-600">Total Users</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <FileCode className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary?.file_count ?? allFiles.length}</div>
          <div className="text-sm text-gray-600">Files Analyzed (System)</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">Active</div>
          <div className="text-sm text-gray-600">System Status</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {allFiles.reduce((sum, f) => sum + f.errorCount, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Errors Detected</div>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-600" />
          User Management
        </h3>
        <div className="space-y-3">
          {users.length === 0 ? (
            <p className="text-gray-600 text-center py-6">No users found.</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-600">{user.role === 'admin' ? 'Administrator' : 'Standard User'}</div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  Active
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Uploaded Files Log */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileCode className="w-6 h-6 text-green-600" />
          Uploaded File Logs
        </h3>
        {allFiles.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No files have been uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {allFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileCode className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{file.fileName}</div>
                    <div className="text-xs text-gray-600">
                      {file.language} • {file.uploadDate}
                    </div>
                  </div>
                </div>
                <span className={`text-sm px-2 py-1 rounded ${
                  file.errorCount === 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {file.errorCount} errors
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-6 h-6 text-purple-600" />
          Recent Audit Activity
        </h3>
        {auditLogs.length === 0 ? (
          <p className="text-gray-600 text-center py-6">No audit activity yet.</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">{log.action}</span>
                <span className="text-xs text-gray-500">{log.resource_type} {log.resource_id ?? ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Statistics */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          System Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50 rounded-xl">
            <div className="text-2xl font-bold text-purple-900">
              {allFiles.filter(f => f.language === 'Java').length}
            </div>
            <div className="text-sm text-purple-700">Java Files</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="text-2xl font-bold text-blue-900">
              {allFiles.filter(f => f.language === 'Python').length}
            </div>
            <div className="text-sm text-blue-700">Python Files</div>
          </div>
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="text-2xl font-bold text-green-900">
              {allFiles.filter(f => f.language === 'C#').length}
            </div>
            <div className="text-sm text-green-700">C# Files</div>
          </div>
        </div>
      </div>
    </div>
  );
}
