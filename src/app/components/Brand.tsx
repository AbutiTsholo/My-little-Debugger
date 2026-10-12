import { useState } from "react";
import { useNavigate } from "react-router";
import { Bug } from "lucide-react";
export default function Brand({ home = true }: { home?: boolean }) {
  const navigate = useNavigate();
  const [about, setAbout] = useState(false);
  return (
    <div className="brand-wrap">
      <button
        type="button"
        className="brand"
        aria-label={
          home ? "My Little Debugger home" : "About My Little Debugger"
        }
        aria-expanded={home ? undefined : about}
        onClick={() => (home ? navigate("/dashboard") : setAbout(!about))}
      >
        <span className="brand-mark">
          <Bug size={24} />
        </span>
        <span>
          My Little
          <span className="brand-second">
            Debugger<span className="brand-dot">.</span>
          </span>
        </span>
      </button>
      {about && (
        <p className="brand-about">
          Meet Debug Buddy. Upload your code, understand the findings, and work
          through a fix together.
        </p>
      )}
    </div>
  );
}
