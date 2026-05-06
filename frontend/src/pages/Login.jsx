import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";

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
      } else {
        navigate("/app", { replace: true });
      }

    } catch (requestError) {
      setError(requestError.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-art">

        <div className="mb-6">
          <img src="/logo-full.png" className="h-10" />
        </div>

        <div>
          <h1>Run inventory, sales, and teams from one calm workspace.</h1>
          <p>Sign in to continue managing your business operations.</p>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <Icon className="auth-icon" name="building" />

          <div>
            <h2>Welcome back</h2>
            <p>Use your owner or staff account.</p>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@business.com"
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Your password"
            />
          </label>

          <button className="primary-button" type="submit" disabled={loading}>
            <Icon
              className={loading ? "spin" : ""}
              name={loading ? "loader" : "arrow"}
            />
            <span>{loading ? "Logging in..." : "Log in"}</span>
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