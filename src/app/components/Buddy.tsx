import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, GraduationCap } from "lucide-react";
import { store } from "../store";

export default function Buddy() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(store.getSettings());
  useEffect(() => {
    const sync = () => setPrefs(store.getSettings());
    window.addEventListener("debugging-app-preferences-updated", sync);
    return () =>
      window.removeEventListener("debugging-app-preferences-updated", sync);
  }, []);
  const Icon = prefs.avatarStyle === "professional" ? GraduationCap : Sparkles;
  return (
    <aside className="buddy no-print" aria-label="Debug Buddy avatar">
      {open && (
        <div className="buddy-card">
          <strong>Debug Buddy</strong>
          <p className="muted">A little help with your next line of code.</p>
          <button
            className="text-button"
            onClick={() => navigate("/dashboard/chat")}
          >
            Open chat →
          </button>
        </div>
      )}
      <button
        className="buddy-face"
        aria-label={open ? "Minimize Debug Buddy" : "Activate Debug Buddy"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon size={27} />
      </button>
    </aside>
  );
}
