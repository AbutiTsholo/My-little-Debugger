import { useEffect, useState } from 'react';
import { Save, Sparkles, Moon, Sun, GraduationCap, Bell, UserCircle2 } from 'lucide-react';
import { updateCurrentUserProfileRequest, getCurrentUserRequest } from '../api';
import { store } from '../store';

export default function Settings() {
  const currentUser = store.getCurrentUser();
  const [profile, setProfile] = useState({
    name: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
  });
  const [settings, setSettings] = useState({
    avatarStyle: 'friendly',
    themeMode: 'light',
    learningMode: 'beginner',
    notifications: true
  });
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    void getCurrentUserRequest().then((user) => {
      setProfile({ name: user.name, email: user.email });
      store.updateCurrentUser({
        name: user.name,
        email: user.email,
        role: user.role === 'admin' ? 'Administrator' : 'Standard User',
      });
    }).catch(() => {
      // If the backend is unavailable, preserve the current local profile state.
    });
  }, []);

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const user = await updateCurrentUserProfileRequest(profile.name, profile.email);
      store.updateCurrentUser({
        name: user.name,
        email: user.email,
        role: user.role === 'admin' ? 'Administrator' : 'Standard User',
      });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch {
      setSaveState('idle');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">Customize your debugging experience</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-md space-y-6">
        <div>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UserCircle2 className="w-6 h-6 text-purple-600" />
            Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Name</span>
              <input
                value={profile.name}
                onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={profile.email}
                onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </label>
          </div>
        </div>
        {/* Avatar Personalization */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Avatar Personalization
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-purple-50 transition-all">
              <input
                type="radio"
                name="avatar"
                value="friendly"
                checked={settings.avatarStyle === 'friendly'}
                onChange={(e) => setSettings({ ...settings, avatarStyle: e.target.value })}
                className="w-4 h-4 text-purple-600"
              />
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Friendly Buddy</div>
                <div className="text-sm text-gray-600">Warm and encouraging</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-purple-50 transition-all">
              <input
                type="radio"
                name="avatar"
                value="professional"
                checked={settings.avatarStyle === 'professional'}
                onChange={(e) => setSettings({ ...settings, avatarStyle: e.target.value })}
                className="w-4 h-4 text-purple-600"
              />
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Professional Assistant</div>
                <div className="text-sm text-gray-600">Formal and precise</div>
              </div>
            </label>
          </div>
        </div>

        {/* Theme Mode */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            {settings.themeMode === 'light' ? (
              <Sun className="w-6 h-6 text-yellow-600" />
            ) : (
              <Moon className="w-6 h-6 text-purple-600" />
            )}
            Theme Mode
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSettings({ ...settings, themeMode: 'light' })}
              className={`p-4 border rounded-xl transition-all ${
                settings.themeMode === 'light'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <div className="font-medium text-gray-900">Light Mode</div>
            </button>

            <button
              onClick={() => setSettings({ ...settings, themeMode: 'dark' })}
              className={`p-4 border rounded-xl transition-all ${
                settings.themeMode === 'dark'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Moon className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="font-medium text-gray-900">Dark Mode</div>
            </button>
          </div>
        </div>

        {/* Learning Mode */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-green-600" />
            Learning Mode
          </h3>
          <select
            value={settings.learningMode}
            onChange={(e) => setSettings({ ...settings, learningMode: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="beginner">Beginner - Detailed explanations</option>
            <option value="intermediate">Intermediate - Balanced guidance</option>
            <option value="advanced">Advanced - Concise suggestions</option>
          </select>
          <p className="text-sm text-gray-600 mt-2">
            Controls how detailed the error explanations and suggestions will be
          </p>
        </div>

        {/* Notifications */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Notification Preferences
          </h3>
          <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
            <div>
              <div className="font-medium text-gray-900">Enable Notifications</div>
              <div className="text-sm text-gray-600">
                Get notified when analysis is complete
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
              className="w-5 h-5 text-purple-600 rounded"
            />
          </label>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          Save Settings
        </button>
      </div>
    </div>
  );
}
