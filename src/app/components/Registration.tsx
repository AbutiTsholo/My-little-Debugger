import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Brand from "./Brand";
import { store } from "../store";

export default function Registration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (store.getCurrentUser()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formData.fullName.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedConfirm = formData.confirmPassword.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword || !trimmedConfirm) {
      setError("Please fill in all fields before continuing.");
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setError("Passwords do not match. Please check both fields.");
      return;
    }

    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    const success = await store.register(
      trimmedName,
      trimmedEmail,
      trimmedPassword,
    );
    if (!success) {
      setIsSubmitting(false);
      setError("Unable to create the account. Please try again.");
      return;
    }
    setError("");
    setTimeout(() => {
      navigate("/auth-success");
    }, 200);
  };

  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Brand home={false} />
        <div className="auth-story-copy">
          <span className="page-eyebrow">YOUR FRIENDLY CODING COMPANION</span>
          <h2>
            A little stuck?
            <br />
            <em>Let’s figure it out.</em>
          </h2>
          <p>
            Understand the error. Find your next step.
            <br />
            Build the confidence to keep going.
          </p>
          <div className="auth-code-preview">
            <span className="code-window-label">a_little_progress.py</span>
            <pre>
              <span className="code-purple">def</span>
              {
                ' next_step():\n    learn_something()\n    try_again()\n    return "a little better"'
              }
            </pre>
            <span className="code-preview-note">
              Every programmer starts somewhere.
            </span>
          </div>
        </div>
        <p className="auth-credit">MY LITTLE DEBUGGER · ONE LINE AT A TIME</p>
      </aside>
      <div className="auth-form-area">
        <div className="auth-form-card">
          <div className="text-center mb-8">
            <div className="auth-mobile-brand">
              <Brand home={false} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Little Debugger
            </h1>
            <p className="text-gray-600">
              Your friendly AI debugging companion
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <p className="mb-4 text-xs text-gray-500">
            Passwords must be at least 6 characters long.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  if (error) setError("");
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label
                htmlFor="registerEmail"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                id="registerEmail"
                type="email"
                required
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (error) setError("");
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="registerPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="registerPassword"
                type="password"
                required
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (error) setError("");
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  if (error) setError("");
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating account..." : "Register"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-purple-600 font-medium hover:underline"
              >
                Login here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
