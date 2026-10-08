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
export type ExplanationMode = 'beginner' | 'intermediate' | 'advanced';

export interface UserPreferences {
  avatarStyle: 'friendly' | 'professional';
  themeMode: 'light' | 'dark';
  learningMode: ExplanationMode;
  notifications: boolean;
}

interface User {
  id: number;
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

interface LegacyStoredAppState extends Partial<StoredAppState> {
  avatarStyle?: UserPreferences['avatarStyle'];
  themeMode?: UserPreferences['themeMode'];
  learningMode?: ExplanationMode;
  notifications?: boolean;
}

class AppStore {
  private currentUser: User | null = null;
  private analyzedFiles: AnalyzedFile[] = [];
  private currentFile: AnalyzedFile | null = null;
  private avatarStyle: UserPreferences['avatarStyle'] = 'friendly';
  private themeMode: UserPreferences['themeMode'] = 'light';
  private learningMode: ExplanationMode = 'beginner';
  private notifications = true;
  private readonly storageKey = 'my-little-debugger-store-v1';
  private readonly settingsStoragePrefix = 'my-little-debugger-settings-v1:';

  constructor() {
    this.hydrate();
    this.applyThemeMode();
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as LegacyStoredAppState;
      this.currentUser = hasAuthToken() ? parsed.currentUser ?? null : null;
      this.analyzedFiles = parsed.analyzedFiles ?? [];
      this.currentFile = parsed.currentFile ?? null;
      if (this.currentUser) this.loadUserPreferences(this.currentUser, parsed);
      else this.resetUserPreferences();
    } catch {
      this.currentUser = null;
      this.analyzedFiles = [];
      this.currentFile = null;
      this.avatarStyle = 'friendly';
      this.themeMode = 'light';
      this.learningMode = 'beginner';
      this.notifications = true;
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
        id: apiUser.user.id,
        email: apiUser.user.email,
        name: apiUser.user.name,
        role: apiUser.user.role === 'admin' ? 'Administrator' : 'Standard User',
      };
      this.loadUserPreferences(this.currentUser);
      this.applyThemeMode();
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
        id: apiUser.user.id,
        email: apiUser.user.email,
        name: apiUser.user.name,
        role: apiUser.user.role === 'admin' ? 'Administrator' : 'Standard User',
      };
      this.loadUserPreferences(this.currentUser);
      this.applyThemeMode();
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
    this.resetUserPreferences();
    this.applyThemeMode();
    this.persist();
  }

  updateCurrentUser(user: Partial<User>): void {
    if (!this.currentUser) return;
    this.currentUser = {
      ...this.currentUser,
      ...user,
    };
    this.persist();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('debugging-app-user-updated'));
  }

  getSettings(): UserPreferences {
    return {
      avatarStyle: this.avatarStyle,
      themeMode: this.themeMode,
      learningMode: this.learningMode,
      notifications: this.notifications,
    };
  }

  setSettings(settings: UserPreferences): void {
    this.persistUserPreferences(settings);
    this.avatarStyle = settings.avatarStyle;
    this.themeMode = settings.themeMode;
    this.learningMode = settings.learningMode;
    this.notifications = settings.notifications;
    this.applyThemeMode();
    this.persist();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('debugging-app-preferences-updated'));
  }

  getExplanationMode(): ExplanationMode {
    return this.learningMode;
  }

  setExplanationMode(mode: ExplanationMode): void {
    this.setSettings({ ...this.getSettings(), learningMode: mode });
  }

  private settingsKey(user: User): string {
    const identity = user.id
      ? `id-${user.id}`
      : `email-${encodeURIComponent(user.email.trim().toLowerCase())}`;
    return `${this.settingsStoragePrefix}${identity}`;
  }

  private loadUserPreferences(user: User, legacy?: LegacyStoredAppState): void {
    this.resetUserPreferences();
    try {
      const identityKey = this.settingsKey(user);
      const legacyEmailKey = `${this.settingsStoragePrefix}email-${encodeURIComponent(user.email.trim().toLowerCase())}`;
      const stored = localStorage.getItem(identityKey)
        ?? (identityKey !== legacyEmailKey ? localStorage.getItem(legacyEmailKey) : null);
      if (stored) {
        this.applyUserPreferences(JSON.parse(stored) as Partial<UserPreferences>);
        if (identityKey !== legacyEmailKey && !localStorage.getItem(identityKey)) {
          this.persistUserPreferences(this.getSettings());
          localStorage.removeItem(legacyEmailKey);
        }
        return;
      }

      const legacyOwner = legacy?.currentUser?.email?.trim().toLowerCase();
      if (legacyOwner && legacyOwner === user.email.trim().toLowerCase()) {
        this.applyUserPreferences(legacy);
        this.persistUserPreferences(this.getSettings());
      }
    } catch {
      this.resetUserPreferences();
    }
  }

  private applyUserPreferences(preferences: Partial<UserPreferences>): void {
    this.avatarStyle = preferences.avatarStyle === 'professional' ? 'professional' : 'friendly';
    this.themeMode = preferences.themeMode === 'dark' ? 'dark' : 'light';
    this.learningMode = ['intermediate', 'advanced'].includes(preferences.learningMode ?? '')
      ? preferences.learningMode as ExplanationMode
      : 'beginner';
    this.notifications = typeof preferences.notifications === 'boolean' ? preferences.notifications : true;
  }

  private resetUserPreferences(): void {
    this.avatarStyle = 'friendly';
    this.themeMode = 'light';
    this.learningMode = 'beginner';
    this.notifications = true;
  }

  private persistUserPreferences(settings: UserPreferences): void {
    if (!this.currentUser) throw new Error('Log in before saving user settings.');
    try {
      localStorage.setItem(this.settingsKey(this.currentUser), JSON.stringify(settings));
    } catch {
      throw new Error('Unable to save settings in this browser. Check local storage availability and try again.');
    }
  }

  private applyThemeMode(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', this.themeMode === 'dark');
    }
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

  async refreshCurrentFileAnalysis(fileId: string): Promise<void> {
    const file = this.currentFile;
    if (!file || file.id !== fileId) return;

    const result = await getAnalysisResultRequest(fileId);
    if (result.file_id !== Number(fileId) || this.currentFile?.id !== fileId) return;

    this.updateCurrentFile({
      errorCount: result.error_count,
      status: result.status === 'completed'
        ? result.error_count === 0 ? 'Clean' : 'Errors Found'
        : result.status,
      errors: result.errors,
    });
  }
}

export const store = new AppStore();
