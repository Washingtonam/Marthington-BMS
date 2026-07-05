import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // 🔥 SMART REDIRECT IF ALREADY LOGGED IN
  if (isAuthenticated) {
    if (user?.role === "super_admin") {
      return <Navigate to="/admin" replace />;
    }
    if (user?.role === "affiliate") {
      return <Navigate to="/partners/dashboard" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const session = await login(form);

      // 🔥 ROLE-BASED REDIRECT (THIS IS THE FIX)
      if (session.user.role === "super_admin") {
        navigate("/admin", { replace: true });
      } else if (session.user.role === "affiliate") {
        navigate("/partners/dashboard", { replace: true });
      } else {
        navigate("/app", { replace: true });
      }

    } catch (requestError) {
      const contact = requestError?.body?.adminContact;
      if (contact) {
        setError(`${requestError.message} — Contact ${contact.name}: ${contact.email}${contact.phone ? ` (${contact.phone})` : ""}`);
      } else {
        setError(requestError.message || "Login failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-art hero-graphic">
        <div className="hero-top">
          <img src="/logo-full.png" className="h-10 logo-badge" />
        </div>

        <div className="hero-content">
          <h1>Run inventory, sales, and teams from one calm workspace.</h1>
          <p>Sign in to continue managing your business operations.</p>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <img src="/logo-icon.png" className="auth-icon logo-small" />

          <div>
            <h2 className="welcome">Welcome back</h2>
            <p className="welcome-sub">Use your owner or staff account.</p>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <label className="field">
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@business.com"
              className="input-field"
            />
          </label>

          <label className="field relative">
            Password
            <div className="input-with-icon">
              <input
                name="password"
                type={form.showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="Your password"
                className="input-field pr-10"
              />
              <button type="button" className="password-toggle" onClick={() => setForm(f => ({ ...f, showPassword: !f.showPassword }))} aria-label="Toggle password visibility">
                {form.showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </label>

          <button className={`primary-button ${loading ? 'loading' : ''}`} type="submit" disabled={loading}>
            <span className="btn-content">
              <svg className="btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="btn-label">{loading ? "Logging in..." : "Log in"}</span>
            </span>
            {loading && <span className="btn-loader" aria-hidden="true" />}
          </button>

          <p className="auth-switch">
            New business? <Link to="/register">Create workspace</Link>
          </p>
        </form>
      </section>
    </main>
  );
};

export default Login;