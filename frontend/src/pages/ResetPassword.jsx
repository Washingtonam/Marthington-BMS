import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth.js";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await resetPassword({ token, newPassword: password });
      setMessage(response.message);
    } catch (requestError) {
      setError(requestError.message || "Could not reset the password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-art hero-graphic">
        <div className="hero-top">
          <img src="/logo-full.png" alt="Marthington" className="h-10 logo-badge" />
        </div>
        <div className="hero-content">
          <h1>Choose a new password.</h1>
          <p>Your password reset link is valid for 30 minutes.</p>
        </div>
      </section>
      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <img src="/logo-icon.png" className="auth-icon logo-small" alt="" />
          <div>
            <h2>Reset your password</h2>
            <p>Choose a new password with at least 8 characters.</p>
          </div>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</div> : null}
          {!token ? (
            <p className="form-error" role="alert">
              This password reset link is invalid or has expired.{" "}
              <Link to="/forgot-password">Request another link</Link>
            </p>
          ) : !message ? (
            <>
              <label className="field">
                New password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input-field"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label className="field">
                Confirm new password
                <input
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="input-field"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? "Updating password..." : "Update password"}
              </button>
            </>
          ) : null}
          <p className="auth-switch">
            <Link to="/login">Back to login</Link>
          </p>
        </form>
      </section>
    </main>
  );
};

export default ResetPassword;
