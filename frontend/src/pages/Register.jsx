import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import LocationFields from "../components/LocationFields.jsx";
import { trackAffiliateClick } from "../api/affiliates.js";
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
  const [businessLocation, setBusinessLocation] = useState({
    countryCode: "NG",
    state: "",
    localGovernment: "",
    city: "",
    nearestBusStop: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState("");

  const { register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const referral = new URLSearchParams(location.search).get("ref")
      || new URLSearchParams(window.location.search).get("ref")
      || "";

    if (referral) {
      localStorage.setItem("bms_referral", referral);
      setRefCode(referral);
      trackAffiliateClick(referral).catch(() => undefined);
    } else {
      const savedReferral = localStorage.getItem("bms_referral") || "";
      setRefCode(savedReferral);
    }
  }, [location.search]);

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
      !form.phone ||
      !businessLocation.state ||
      !businessLocation.city ||
      (businessLocation.countryCode === "NG" && !businessLocation.localGovernment)
    ) {
      setError("Complete all required fields, including your business country, state, local government area (for Nigeria), and city or town.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        addressCountryCode: businessLocation.countryCode,
        addressState: businessLocation.state,
        addressLocalGovernment: businessLocation.localGovernment,
        addressCity: businessLocation.city,
        referralCode: refCode.trim() || null
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
          <Link to="/" className="inline-flex min-h-10 items-center self-start rounded-lg px-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
            <span aria-hidden="true" className="mr-2">←</span> Back to home
          </Link>
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
            Business street address
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="House number and street"
              className="input-field"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <LocationFields
              value={businessLocation}
              onChange={setBusinessLocation}
              includeNearestBusStop={false}
              labelClassName="block space-y-2 text-sm text-slate-300"
              inputClassName="input-field"
            />
          </div>

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

          <label>
            Agent / Referral Code (Optional)
            <input
              name="referralCode"
              value={refCode}
              onChange={(event) => setRefCode(event.target.value)}
              placeholder="Enter an agent code if you have one"
              className="input-field"
              autoComplete="off"
              aria-describedby="referral-code-help"
            />
            <span id="referral-code-help" className="text-xs text-slate-400">
              Leave this blank if you were not referred by an agent.
            </span>
          </label>

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