const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: ApiUser;
}

export interface ApiProject {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
}

export interface ApiFile {
  id: number;
  project_id: number;
  filename: string;
  language: string;
  status: string;
  storage_path: string;
  content: string;
}

export interface ApiAnalysisJob {
  id: number;
  file_id: number;
  status: string;
  result_summary?: string;
}

export interface ApiAnalysisResult {
  file_id: number;
  language: string;
  error_count: number;
  status: string;
  errors: Array<{ line: number; message: string; suggestion: string; severity: string }>;
}

export interface ApiAnalysisSummary {
  file_id: number;
  language: string;
  status: string;
  error_count: number;
  summary?: string;
}

export interface ApiChatMessage {
  id: number;
  role: string;
  message: string;
}

export interface ApiChatSession {
  id: number;
  title: string;
  file_id?: number;
}

export interface ApiChatSessionMessage extends ApiChatMessage {
  session_id: number;
}

export interface ApiReport {
  id: number;
  user_id: number;
  file_id: number;
  title: string;
  content: string;
}

export interface ApiAdminSummary {
  user_count: number;
  project_count: number;
  file_count: number;
}

export interface ApiAuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type: string;
  resource_id?: number;
  details?: string;
}

interface ApiError {
  detail?: string;
}

class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const tokenStorageKey = 'my-little-debugger-access-token';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(tokenStorageKey);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent('debugging-app-auth-expired'));
    }
    const error = (await response.json().catch(() => ({}))) as ApiError;
    throw new ApiRequestError(error.detail || 'The API request failed.', response.status);
  }

  return response.json() as Promise<T>;
}

export function loginRequest(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function registerRequest(name: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function listProjectsRequest(): Promise<ApiProject[]> {
  return request<ApiProject[]>('/api/v1/projects');
}

export function createProjectRequest(name: string): Promise<ApiProject> {
  return request<ApiProject>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function listFilesRequest(projectId: number): Promise<ApiFile[]> {
  return request<ApiFile[]>(`/api/v1/projects/${projectId}/files`);
}

export function uploadFileRequest(
  projectId: number,
  filename: string,
  language: string,
  content: string,
): Promise<ApiFile> {
  return request<ApiFile>(`/api/v1/projects/${projectId}/files`, {
    method: 'POST',
    body: JSON.stringify({ filename, language, content }),
  });
}

export function runAnalysisRequest(fileId: string): Promise<ApiAnalysisJob> {
  return request<ApiAnalysisJob>(`/api/v1/analysis/run?file_id=${encodeURIComponent(fileId)}`, {
    method: 'POST',
  });
}

export function getAnalysisJobRequest(jobId: number): Promise<ApiAnalysisJob> {
  return request<ApiAnalysisJob>(`/api/v1/analysis/jobs/${jobId}`);
}

export function getAnalysisResultRequest(fileId: string): Promise<ApiAnalysisResult> {
  return request<ApiAnalysisResult>(`/api/v1/files/${encodeURIComponent(fileId)}/errors`);
}

export function getAnalysisSummaryRequest(fileId: string): Promise<ApiAnalysisSummary> {
  return request<ApiAnalysisSummary>(`/api/v1/files/${encodeURIComponent(fileId)}/error-summary`);
}

export function sendChatMessageRequest(
  message: string,
  fileId?: string,
  explanationMode: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
): Promise<ApiChatMessage> {
  return request<ApiChatMessage>('/api/v1/chat/messages', {
    method: 'POST',
    body: JSON.stringify({
      message,
      file_id: fileId ? Number(fileId) : undefined,
      explanation_mode: explanationMode,
    }),
  });
}

export function createChatSessionRequest(title: string, fileId?: string): Promise<ApiChatSession> {
  return request<ApiChatSession>('/api/v1/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, file_id: fileId ? Number(fileId) : undefined }),
  });
}

export function getChatSessionsRequest(): Promise<ApiChatSession[]> {
  return request<ApiChatSession[]>('/api/v1/chat/sessions');
}

export function getChatMessagesRequest(sessionId: number): Promise<ApiChatSessionMessage[]> {
  return request<ApiChatSessionMessage[]>(`/api/v1/chat/sessions/${sessionId}/messages`);
}

export function sendChatSessionMessageRequest(
  sessionId: number,
  message: string,
  explanationMode: 'beginner' | 'intermediate' | 'advanced',
): Promise<ApiChatSessionMessage> {
  return request<ApiChatSessionMessage>(`/api/v1/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, explanation_mode: explanationMode }),
  });
}

export function createReportRequest(fileId: string, title: string, content: string): Promise<ApiReport> {
  return request<ApiReport>('/api/v1/reports', {
    method: 'POST',
    body: JSON.stringify({ file_id: Number(fileId), title, content }),
  });
}

export function getCurrentUserRequest(): Promise<ApiUser> {
  return request<ApiUser>('/api/v1/auth/me');
}

export function updateCurrentUserProfileRequest(name: string, email: string): Promise<ApiUser> {
  return request<ApiUser>('/api/v1/users/me/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name, email }),
  });
}

export function logoutRequest(): Promise<{ message: string }> {
  return request<{ message: string }>('/api/v1/auth/logout', {
    method: 'POST',
  });
}

export function getAdminUsersRequest(): Promise<ApiUser[]> {
  return request<ApiUser[]>('/api/v1/admin/users');
}

export function getAdminSummaryRequest(): Promise<ApiAdminSummary> {
  return request<ApiAdminSummary>('/api/v1/admin/summary');
}

export function getAdminAuditLogsRequest(): Promise<ApiAuditLog[]> {
  return request<ApiAuditLog[]>('/api/v1/admin/audit-logs');
}

export function setAuthToken(token: string): void {
  localStorage.setItem(tokenStorageKey, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(tokenStorageKey);
}

export function hasAuthToken(): boolean {
  return Boolean(localStorage.getItem(tokenStorageKey));
}

export { ApiRequestError };