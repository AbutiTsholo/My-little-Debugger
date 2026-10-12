import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
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
  X,
  Moon,
  Sun,
  ChevronRight,
  Plus,
} from "lucide-react";
import Buddy from "./Buddy";
import Brand from "./Brand";
import { store } from "../store";
export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(store.getCurrentUser());
  const [prefs, setPrefs] = useState(store.getSettings());
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= 1000,
  );
  const [logout, setLogout] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => {
      setUser(store.getCurrentUser());
      setPrefs(store.getSettings());
    };
    const expired = () => {
      void store.logout();
      navigate("/login", { replace: true });
    };
    window.addEventListener("debugging-app-user-updated", sync);
    window.addEventListener("debugging-app-preferences-updated", sync);
    window.addEventListener("debugging-app-auth-expired", expired);
    return () => {
      window.removeEventListener("debugging-app-user-updated", sync);
      window.removeEventListener("debugging-app-preferences-updated", sync);
      window.removeEventListener("debugging-app-auth-expired", expired);
    };
  }, [navigate]);
  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);
  useEffect(() => {
    if (window.innerWidth < 1000) setSidebarOpen(false);
  }, [location.pathname]);
  const menu = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Upload, label: "Upload Code", path: "/dashboard/upload" },
    { icon: Sparkles, label: "Chat Assistant", path: "/dashboard/chat" },
    { icon: History, label: "Error History", path: "/dashboard/history" },
    { icon: FileText, label: "Reports", path: "/dashboard/reports" },
  ];
  const current =
    menu.find((i) => i.path === location.pathname)?.label ||
    (location.pathname.endsWith("settings")
      ? "Settings"
      : location.pathname.endsWith("admin")
        ? "Administration"
        : "Code workspace");
  async function theme() {
    try {
      await store.setSettings({
        ...prefs,
        themeMode: prefs.themeMode === "dark" ? "light" : "dark",
      });
      setError("");
    } catch {
      setError("Could not save your theme. Please try again.");
    }
  }
  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="nav-scrim no-print"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`app-sidebar no-print ${sidebarOpen ? "is-open" : ""}`}
        style={{ visibility: sidebarOpen ? "visible" : "hidden" }}
      >
        <Brand />
        <button
          className="button sidebar-new"
          onClick={() => navigate("/dashboard/upload")}
        >
          <Plus size={16} />
          New analysis
        </button>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {menu.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
              aria-current={
                location.pathname === item.path ? "page" : undefined
              }
              onClick={() => navigate(item.path)}
            >
              <item.icon size={18} />
              {item.label}
              {location.pathname === item.path && (
                <span className="nav-indicator" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="sidebar-note">
            A little guidance.
            <br />
            <strong>A lot more understanding.</strong>
          </p>
          {user?.role === "Administrator" && (
            <button
              className="nav-item"
              onClick={() => navigate("/dashboard/admin")}
            >
              <Shield size={18} />
              Admin Panel
            </button>
          )}
          <button
            className={`nav-item ${current === "Settings" ? "active" : ""}`}
            onClick={() => navigate("/dashboard/settings")}
          >
            <Settings size={18} />
            Settings
          </button>
          <div className="account-row">
            <button
              className="account-profile"
              onClick={() => navigate("/dashboard/settings")}
              aria-label="Open your profile"
            >
              <span className="account-avatar">
                {user?.name?.slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong>{user?.name}</strong>
                <small>{user?.role}</small>
              </span>
            </button>
            <button
              className="icon-button"
              aria-label="Logout"
              onClick={() => setLogout(true)}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-header no-print">
          <div className="header-left">
            <button
              className="icon-button"
              aria-label="Toggle navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={19} />
            </button>
            <span className="breadcrumb-parent">Workspace</span>
            <ChevronRight size={14} />
            <strong>{current}</strong>
          </div>
          <div className="header-tools">
            <button className="button secondary header-logout" onClick={() => setLogout(true)}><LogOut size={16} /> Log out</button>
            <span className="local-badge">
              <span />
              Local workspace
            </span>
            <button
              className="icon-button"
              aria-label={
                prefs.themeMode === "dark"
                  ? "Use light theme"
                  : "Use dark theme"
              }
              onClick={() => void theme()}
            >
              {prefs.themeMode === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
          </div>
        </header>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <main className="app-main">
          <Outlet />
          <Buddy />
        </main>
      </div>
      {logout && (
        <div
          className="modal-overlay"
          onKeyDown={(e) => {
            if (e.key === "Escape") setLogout(false);
          }}
        >
          <section
            className="panel logout-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <button
              autoFocus
              className="icon-button modal-close"
              aria-label="Cancel logout"
              onClick={() => setLogout(false)}
            >
              <X size={18} />
            </button>
            <h2 id="logout-title">See you next time.</h2>
            <p className="muted">
              Your saved work will be here when you return.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                className="button secondary"
                onClick={() => setLogout(false)}
              >
                Stay here
              </button>
              <button
                className="button"
                onClick={() =>
                  void store
                    .logout()
                    .then(() => navigate("/login", { replace: true }))
                }
              >
                Logout
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
