// Simple state management for the prototype
import {
  ApiRequestError,
  clearAuthToken,
  getAnalysisResultRequest,
  listFilesRequest,
  listProjectsRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
  setAuthToken,
  hasAuthToken,
} from './api';

type UserRole = 'Administrator' | 'Standard User';

interface User {
  email: string;
  name: string;
  role: UserRole;
}

interface AnalyzedFile {
  id: string;
  fileName: string;
  language: string;
  uploadDate: string;
  errorCount: number;
  status: string;
  code: string;
  errors: Array<{
    line: number;
    message: string;
    suggestion: string;
  }>;
}

interface StoredAppState {
  currentUser: User | null;
  analyzedFiles: AnalyzedFile[];
  currentFile: AnalyzedFile | null;
}

class AppStore {
  private currentUser: User | null = null;
  private analyzedFiles: AnalyzedFile[] = [];
  private currentFile: AnalyzedFile | null = null;
  private readonly storageKey = 'my-little-debugger-store-v1';

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<StoredAppState>;
      this.currentUser = hasAuthToken() ? parsed.currentUser ?? null : null;
      this.analyzedFiles = parsed.analyzedFiles ?? [];
      this.currentFile = parsed.currentFile ?? null;
    } catch {
      this.currentUser = null;
      this.analyzedFiles = [];
      this.currentFile = null;
    }
  }

  private persist(): void {
    const payload: StoredAppState = {
      currentUser: this.currentUser,
      analyzedFiles: this.analyzedFiles,
      currentFile: this.currentFile,
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch {
      // no-op: localStorage may be unavailable in some contexts
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      return false;
    }

    try {
      const apiUser = await loginRequest(normalizedEmail, normalizedPassword);
      setAuthToken(apiUser.access_token);
      this.currentUser = {
        email: apiUser.user.email,
        name: apiUser.user.name,
        role: apiUser.user.role === 'admin' ? 'Administrator' : 'Standard User',
      };
      this.persist();
      return true;
    } catch (error) {
      if (error instanceof ApiRequestError) return false;
      return false;
    }
  }

  async register(name: string, email: string, password: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const accountName = (name || 'User').trim();

    if (!normalizedEmail || !password) return false;

    try {
      const apiUser = await registerRequest(accountName, normalizedEmail, password);
      setAuthToken(apiUser.access_token);
      this.currentUser = {
        email: apiUser.user.email,
        name: apiUser.user.name,
        role: apiUser.user.role === 'admin' ? 'Administrator' : 'Standard User',
      };
      this.persist();
      return true;
    } catch (error) {
      if (error instanceof ApiRequestError) return false;
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await logoutRequest();
    } catch {
      // Ignore backend logout errors and still clear the local session.
    }

    clearAuthToken();
    this.currentUser = null;
    this.persist();
  }

  updateCurrentUser(user: Partial<User>): void {
    if (!this.currentUser) return;
    this.currentUser = {
      ...this.currentUser,
      ...user,
    };
    this.persist();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'Administrator';
  }

  addAnalyzedFile(file: AnalyzedFile): void {
    this.analyzedFiles.unshift(file);
    this.currentFile = file;
    this.persist();
  }

  getAnalyzedFiles(): AnalyzedFile[] {
    return this.analyzedFiles;
  }

  getCurrentFile(): AnalyzedFile | null {
    return this.currentFile;
  }

  setCurrentFile(file: AnalyzedFile): void {
    this.currentFile = file;
    this.persist();
  }

  async hydrateRemoteFiles(): Promise<void> {
    try {
      const projects = await listProjectsRequest();
      const remoteFiles = (await Promise.all(projects.map((project) => listFilesRequest(project.id)))).flat();
      const files = await Promise.all(remoteFiles.map(async (file) => {
        try {
          const result = await getAnalysisResultRequest(file.id.toString());
          return {
            id: file.id.toString(),
            fileName: file.filename,
            language: file.language,
            uploadDate: 'Stored session',
            errorCount: result.error_count,
            status: result.status === 'completed' ? (result.error_count ? 'Errors Found' : 'Clean') : file.status,
            code: file.content,
            errors: result.errors,
          };
        } catch {
          return {
            id: file.id.toString(),
            fileName: file.filename,
            language: file.language,
            uploadDate: 'Stored session',
            errorCount: 0,
            status: file.status,
            code: file.content,
            errors: [],
          };
        }
      }));

      this.analyzedFiles = files;
      this.currentFile = this.currentFile
        ? files.find((file) => file.id === this.currentFile?.id) ?? this.currentFile
        : files[0] ?? null;
      this.persist();
    } catch {
      // Preserve local state when the API is unavailable during development.
    }
  }

  updateCurrentFile(update: Partial<AnalyzedFile>): void {
    if (!this.currentFile) return;
    this.currentFile = { ...this.currentFile, ...update };
    this.analyzedFiles = this.analyzedFiles.map((file) =>
      file.id === this.currentFile?.id ? this.currentFile : file,
    );
    this.persist();
  }
}

export const store = new AppStore();
