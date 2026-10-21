import React, { useState } from "react";
import { Link, useNavigate, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { FiEye, FiEyeOff } from 'react-icons/fi';

const getRoleRedirectPath = (role, requestedPath) => {
  const rolePaths = {
    super_admin: { prefix: "/admin", fallback: "/admin" },
    affiliate: { prefix: "/partners", fallback: "/partners/dashboard" },
    default: { prefix: "/app", fallback: "/app" }
  };
  const { prefix, fallback } = rolePaths[role] || rolePaths.default;
  const isAllowedPath = requestedPath === prefix || requestedPath.startsWith(`${prefix}/`);

  return isAllowedPath && requestedPath !== "/login" ? requestedPath : fallback;
};

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = new URLSearchParams(location.search).get("next") || "/app";

  // 🔥 SMART REDIRECT IF ALREADY LOGGED IN
  if (isAuthenticated) {
    return <Navigate to={getRoleRedirectPath(user?.role, redirectPath)} replace />;
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

      navigate(getRoleRedirectPath(session.user?.role, redirectPath), { replace: true });

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
          <Link to="/" className="inline-flex min-h-10 items-center self-start rounded-lg px-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
            <span aria-hidden="true" className="mr-2">←</span> Back to home
          </Link>
          <img src="/logo-icon.png" className="auth-icon logo-small" />

          <div>
            <h2 className="welcome">Welcome back</h2>
            <p className="welcome-sub">
              {import.meta.env.VITE_AFFILIATE_DEMO_MODE === "true"
                ? "Local video demo: sign in with the demo account email and any non-empty password."
                : "Use your owner or staff account."}
            </p>
          </div>

          {import.meta.env.VITE_AFFILIATE_DEMO_MODE === "true" && (
            <div className="form-error" role="status">
              Demo mode is browser-only. No password is saved, and no real commission or payout actions are sent.
              <Link to="/affiliate-register" className="ml-1 underline">Create the local demo account</Link>
            </div>
          )}

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

          <p className="-mt-3 text-right text-sm">
            <Link className="font-semibold text-emerald-700 hover:underline" to="/forgot-password">
              Forgot password?
            </Link>
          </p>

          <button className={`primary-button ${loading ? 'loading' : ''}`} type="submit" disabled={loading}>
            <span className="btn-content">
              <svg className="btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="btn-label">{loading ? "Logging in..." : "Log in"}</span>
            </span>
            {loading && (
              <svg className="btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
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