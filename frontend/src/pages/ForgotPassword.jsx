import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api/auth.js";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const response = await requestPasswordReset(email.trim());
      setMessage(response.message);
    } catch (requestError) {
      setError(requestError.message || "Could not request a password reset.");
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
          <h1>Get back to running your business.</h1>
          <p>We’ll send a secure link to reset your password.</p>
        </div>
      </section>
      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <img src="/logo-icon.png" className="auth-icon logo-small" alt="" />
          <div>
            <h2>Forgot your password?</h2>
            <p>Enter the email address associated with your account.</p>
          </div>
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</div> : null}
          <label className="field">
            Email
            <input
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@business.com"
              className="input-field"
              autoComplete="email"
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Sending reset link..." : "Send reset link"}
          </button>
          <p className="auth-switch">
            Remembered it? <Link to="/login">Back to login</Link>
          </p>
        </form>
      </section>
    </main>
  );
};

export default ForgotPassword;
