import { Outlet, useLocation, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Upload,
  History,
  FileText,
  Settings,
  LogOut,
  Shield,
  Sparkles,
  GraduationCap,
  Menu,
  X
} from 'lucide-react';
import { store } from '../store';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(() => store.getCurrentUser());
  const [avatarStyle, setAvatarStyle] = useState(() => store.getSettings().avatarStyle);
  const isAdmin = user?.role === 'Administrator';

  useEffect(() => {
    const syncUser = () => {
      setUser(store.getCurrentUser());
      setAvatarStyle(store.getSettings().avatarStyle);
    };
    window.addEventListener('debugging-app-user-updated', syncUser);
    window.addEventListener('debugging-app-preferences-updated', syncUser);
    return () => {
      window.removeEventListener('debugging-app-user-updated', syncUser);
      window.removeEventListener('debugging-app-preferences-updated', syncUser);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const handleAuthExpired = () => {
      store.logout();
      navigate('/login', { replace: true });
    };

    window.addEventListener('debugging-app-auth-expired', handleAuthExpired);
    return () => window.removeEventListener('debugging-app-auth-expired', handleAuthExpired);
  }, [navigate]);

  const handleLogout = async () => {
    await store.logout();
    navigate('/login', { replace: true });
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Upload, label: 'Upload Code', path: '/dashboard/upload' },
    { icon: History, label: 'Error History', path: '/dashboard/history' },
    { icon: FileText, label: 'Reports', path: '/dashboard/reports' },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
  ];

  if (isAdmin) {
    menuItems.splice(5, 0, { icon: Shield, label: 'Admin Panel', path: '/dashboard/admin' });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gradient-to-b from-purple-600 to-pink-600 transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-6 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              {avatarStyle === 'professional'
                ? <GraduationCap className="w-6 h-6 text-white" />
                : <Sparkles className="w-6 h-6 text-white" />}
            </div>
            <div className="text-white">
              <div className="font-bold">{user?.name}</div>
              <div className="text-xs text-white/80 flex items-center gap-1">
                {isAdmin && <Shield className="w-3 h-3" />}
                {user?.role}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive =
              item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-white/15 text-white shadow-inner ring-1 ring-white/20'
                    : 'text-white hover:bg-white/10'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={() => setShowLogoutModal(true)}
          className="m-4 flex items-center gap-3 px-4 py-3 text-white rounded-xl hover:bg-white/10 transition-all border border-white/20"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm p-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h2 className="text-xl font-bold text-gray-900">My Little Debugger</h2>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>

      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Logout</h3>

            <div className="bg-purple-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <p className="text-purple-900">See you next time!</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl hover:shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
