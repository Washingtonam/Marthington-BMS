import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const AffiliateRegister = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    bankName: "",
    accountNumber: "",
    accountName: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { registerAffiliate } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("Name, email and password are required.");
      return;
    }

    setLoading(true);

    try {
      await registerAffiliate(form);
      navigate("/partners/dashboard");
    } catch (requestError) {
      setError(requestError.message || "Partner registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Partner Signup</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">
              Join the Marthington partner network.
            </h1>
            <p className="mt-4 max-w-2xl text-slate-400">
              Create your affiliate account, get a unique referral link, and start earning commission on every business that subscribes.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm text-slate-300">
                Full name
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                  placeholder="Tunde Adebayo"
                />
              </label>

              <label className="block space-y-2 text-sm text-slate-300">
                Email address
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                  placeholder="tunde@example.com"
                />
              </label>
            </div>

            <label className="block space-y-2 text-sm text-slate-300">
              Password
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                placeholder="Create a secure password"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-2 text-sm text-slate-300">
                Bank name
                <input
                  name="bankName"
                  value={form.bankName}
                  onChange={handleChange}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                  placeholder="Access Bank"
                />
              </label>

              <label className="block space-y-2 text-sm text-slate-300">
                Account number
                <input
                  name="accountNumber"
                  value={form.accountNumber}
                  onChange={handleChange}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                  placeholder="0123456789"
                />
              </label>

              <label className="block space-y-2 text-sm text-slate-300">
                Account name
                <input
                  name="accountName"
                  value={form.accountName}
                  onChange={handleChange}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                  placeholder="Tunde Adebayo"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating partner account..." : "Become a Partner"}
            </button>

            <p className="text-center text-sm text-slate-500">
              Already have an affiliate account? <Link to="/login" className="text-emerald-300 hover:text-emerald-200">Log in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AffiliateRegister;
