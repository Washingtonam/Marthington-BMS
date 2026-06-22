import { useState } from "react";
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

  const { register } = useAuth();
  const navigate = useNavigate();

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
      await register(form);
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
          <img
            src="/logo-full.png"
            alt="Marthington"
            className="h-10"
          />
        </div>

        <div>
          <h1>Create the workspace your business will actually use.</h1>
          <p>Your account becomes the owner account for this business.</p>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <Icon className="auth-icon" name="building" />

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
            />
          </label>

          <label>
            Business address
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Abuja, Nigeria"
            />
          </label>

          <label>
            Phone number
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="08012345678"
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
            />
          </label>

          <div className="industry-grid">
            <p className="mb-3 font-semibold text-sm text-slate-600">
              Select your industry type
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {industryOptions.map((option) => {
                const isSelected =
                  form.industryType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        industryType: option.value
                      }))
                    }
                    className={`industry-card ${
                      isSelected ? "industry-card-selected" : ""
                    }`}
                  >
                    <div className="industry-card-icon">
                      <Icon name={option.icon} />
                    </div>
                    <div>
                      <h3>{option.title}</h3>
                      <p>{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
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