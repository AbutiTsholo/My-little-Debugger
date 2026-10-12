import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Brand from "./Brand";
import { store } from "../store";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
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

    const trimmedEmail = formData.email.trim();
    const trimmedPassword = formData.password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter both your email and password.");
      return;
    }

    setIsSubmitting(true);
    const success = await store.login(trimmedEmail, trimmedPassword);

    if (success) {
      setError("");
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 200);
      return;
    }

    setIsSubmitting(false);
    setError("Unable to sign in. Check your credentials and try again.");
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
              Welcome Back
            </h1>
            <p className="text-gray-600">Login to continue debugging</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="loginEmail"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                id="loginEmail"
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
                htmlFor="loginPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="loginPassword"
                type="password"
                required
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (error) setError("");
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/")}
                className="text-purple-600 font-medium hover:underline"
              >
                Register here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
