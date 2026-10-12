import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowUpRight,
  ArrowRight,
  FileCode2,
  CheckCircle2,
  ScanLine,
  Sparkles,
  Upload,
  History,
} from "lucide-react";
import { store } from "../store";
export default function Dashboard() {
  const navigate = useNavigate();
  const user = store.getCurrentUser();
  const [files, setFiles] = useState(store.getAnalyzedFiles());
  useEffect(() => {
    void store
      .hydrateRemoteFiles()
      .then(() => setFiles(store.getAnalyzedFiles()));
  }, []);
  const scanned = files.filter((f) =>
    ["Clean", "Errors Found", "Findings Found"].includes(f.status),
  );
  return (
    <div className="dashboard-page">
      <div className="page-eyebrow">
        <span className="accent-dot" />
        YOUR DEBUGGING WORKSPACE
      </div>
      <section className="welcome-section">
        <div>
          <h1>
            Good code starts with
            <br />
            <em>a little understanding.</em>
          </h1>
          <p>
            Welcome back, {user?.name?.split(" ")[0]}. Let’s work through it,
            one line at a time.
          </p>
        </div>
        <button
          className="button"
          onClick={() => navigate("/dashboard/upload")}
        >
          <PlusIcon />
          New analysis
        </button>
      </section>
      <div className="dashboard-actions">
        <button
          className="action-feature"
          onClick={() => navigate("/dashboard/upload")}
        >
          <div className="action-icon">
            <Upload size={23} />
          </div>
          <ArrowUpRight className="action-arrow" size={20} />
          <h2>Bring your code.</h2>
          <p>
            Upload a Python, Java, or C# file.
            <br />
            We’ll help you find the next step.
          </p>
          <span className="action-link">
            Start debugging <ArrowRight size={16} />
          </span>
          <span className="language-tags">
            <span>Python</span>
            <span>Java</span>
            <span>C#</span>
          </span>
        </button>
        <button
          className="action-feature action-chat"
          onClick={() => navigate("/dashboard/chat")}
        >
          <div className="action-icon">
            <Sparkles size={23} />
          </div>
          <ArrowUpRight className="action-arrow" size={20} />
          <h2>Talk it through.</h2>
          <p>
            Ask Debug Buddy for an explanation,
            <br />a code review, or ideas for your next test.
          </p>
          <span className="action-link">
            Open a conversation <ArrowRight size={16} />
          </span>
          <span className="quiet-caption">
            Your questions. A little more clarity.
          </span>
        </button>
      </div>
      <section className="stats-strip" aria-label="Your analysis statistics">
        {[
          { icon: FileCode2, label: "Files analyzed", value: scanned.length },
          {
            icon: CheckCircle2,
            label: "Scans with no findings",
            value: scanned.filter((f) => f.status === "Clean").length,
          },
          {
            icon: ScanLine,
            label: "Findings detected",
            value: scanned.reduce((sum, f) => sum + f.findingCounts.total, 0),
          },
        ].map((s) => (
          <div className="stat" key={s.label}>
            <s.icon size={18} />
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </section>
      <section className="recent-section">
        <div className="section-heading">
          <div>
            <h2>Pick up where you left off</h2>
            <p className="muted">Your latest files and findings.</p>
          </div>
          <button
            className="text-button"
            onClick={() => navigate("/dashboard/history")}
          >
            View history <ArrowRight size={15} />
          </button>
        </div>
        {!files.length ? (
          <div className="empty-state">
            <History size={27} />
            <h3>A fresh start.</h3>
            <p>Your recent work will appear here after your first upload.</p>
            <button
              className="text-button"
              onClick={() => navigate("/dashboard/upload")}
            >
              Upload your first file <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <div className="recent-list">
            {files.slice(0, 5).map((f) => (
              <button
                key={f.id}
                className="recent-row"
                onClick={() => {
                  store.setCurrentFile(f);
                  navigate("/dashboard/error-analysis");
                }}
              >
                <span className="file-icon">
                  <FileCode2 size={20} />
                </span>
                <span className="recent-file">
                  <strong>{f.fileName}</strong>
                  <small>
                    {f.language} · {f.uploadDate}
                  </small>
                </span>
                <span
                  className={`status-pill ${f.findingCounts.total ? "has-findings" : ""}`}
                >
                  {f.findingCounts.total
                    ? `${f.findingCounts.total} finding${f.findingCounts.total === 1 ? "" : "s"}`
                    : f.status === "Clean"
                      ? "No findings"
                      : f.status}
                </span>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
function PlusIcon() {
  return (
    <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>
      +
    </span>
  );
}
