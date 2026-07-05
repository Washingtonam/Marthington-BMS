import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const industryOptions = [
  {
    value: "retail",
    title: "Business / Retail",
    description: "Manage sales, inventory, and POS",
    icon: "shopping-bag"
  },
  {
    value: "school",
    title: "School / Academy",
    description: "Track enrollment, tuition, and classes",
    icon: "graduation-cap"
  },
  {
    value: "hospital",
    title: "Hospital / Clinic",
    description: "Manage patients, records, and appointments",
    icon: "stethoscope"
  }
];

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    address: "",
    phone: "",
    industryType: "retail"
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState("");

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const referral = params.get("ref") || "";

    if (referral) {
      localStorage.setItem("bms_referral", referral);
      setRefCode(referral);
    } else {
      const savedReferral = localStorage.getItem("bms_referral") || "";
      setRefCode(savedReferral);
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    // 🔥 VALIDATION
    if (
      !form.name ||
      !form.email ||
      !form.password ||
      !form.businessName ||
      !form.address ||
      !form.phone
    ) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        referredBy: refCode || localStorage.getItem("bms_referral") || null
      };

      await register(payload);
      navigate("/");
    } catch (requestError) {
      setError(requestError.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-art register-art">
        <div className="mb-6">
          <img src="/logo-full.png" alt="Marthington" className="h-10 logo-badge" />
        </div>

        <div className="hero-content">
          <h1>Create the workspace your business will actually use.</h1>
          <p className="hero-sub">Your account becomes the owner account for this business.</p>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <img src="/logo-icon.png" className="auth-icon logo-left" alt="logo" />

          <div>
            <h2>Start your workspace</h2>
            <p>Business, owner, and workspace are created together.</p>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          {/* OWNER */}
          <label>
            Owner name
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Amina Bello"
              className="input-field"
            />
          </label>

          {/* BUSINESS */}
          <label>
            Business name
            <input
              name="businessName"
              value={form.businessName}
              onChange={handleChange}
              placeholder="Bello Stores"
              className="input-field"
            />
          </label>

          <label>
            Business address
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Abuja, Nigeria"
              className="input-field"
            />
          </label>

          <label>
            Phone number
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="08012345678"
              className="input-field"
            />
          </label>

          {/* ACCOUNT */}
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="owner@business.com"
              className="input-field"
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create a password"
              className="input-field"
            />
          </label>

          <div className="industry-grid">
            <label>
              Select your industry type
              <select
                name="industryType"
                value={form.industryType}
                onChange={handleChange}
                className="input-field industry-select"
              >
                {industryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>

            <p className="industry-description">
              {industryOptions.find((o) => o.value === form.industryType)?.description}
            </p>
          </div>

          <button className="primary-button" type="submit" disabled={loading}>
            <Icon
              className={loading ? "spin" : ""}
              name={loading ? "loader" : "arrow"}
            />
            <span>Create workspace</span>
          </button>

          <p className="auth-switch">
            Already registered? <Link to="/login">Log in</Link>
          </p>
        </form>
      </section>
    </main>
  );
};

export default Register;