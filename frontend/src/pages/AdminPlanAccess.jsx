import { useEffect, useState } from "react";
import { getPlanAccessSettings, updatePlanAccessSettings } from "../api/admin.js";

const DEFAULT_PLAN_ACCESS = {
  free: {
    products: 20,
    staff: 1,
    posProducts: 500,
    features: {
      invoices: false,
      logoUpload: false,
      customReceiptThemes: false
    }
  },
  pro: {
    products: null,
    staff: null,
    posProducts: null,
    features: {
      invoices: true,
      logoUpload: true,
      customReceiptThemes: true
    }
  }
};

const LIMITS = [
  { key: "products", label: "Products", description: "Maximum products a business can create or import." },
  { key: "staff", label: "Staff accounts", description: "Maximum non-owner staff accounts." },
  { key: "posProducts", label: "Products shown in POS", description: "Maximum matching products returned to the point-of-sale screen at once." }
];

const FEATURES = [
  { key: "invoices", label: "Create invoices", description: "Allow the business to create new customer and supplier invoices." },
  { key: "logoUpload", label: "Upload a business logo", description: "Allow changing the business logo using an uploaded image." },
  { key: "customReceiptThemes", label: "Use custom receipt themes", description: "Allow receipt themes other than the standard Modern theme." }
];

const copyPlanAccess = (value) => JSON.parse(JSON.stringify(value));
const formatLimit = (value) => value === null ? "Unlimited" : Number(value).toLocaleString();

const AdminPlanAccess = () => {
  const [planAccess, setPlanAccess] = useState(copyPlanAccess(DEFAULT_PLAN_ACCESS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    getPlanAccessSettings()
      .then((data) => {
        if (active && data?.planAccess) {
          setPlanAccess((current) => ({
            free: { ...current.free, ...data.planAccess.free, features: { ...current.free.features, ...data.planAccess.free?.features } },
            pro: { ...current.pro, ...data.planAccess.pro, features: { ...current.pro.features, ...data.planAccess.pro?.features } }
          }));
        }
      })
      .catch((loadError) => {
        if (active) {
          setLoadFailed(true);
          setError(loadError.message || "Could not load plan settings.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const updateLimit = (plan, key, value) => {
    setPlanAccess((current) => ({
      ...current,
      [plan]: { ...current[plan], [key]: value }
    }));
  };

  const updateFeature = (plan, key, enabled) => {
    setPlanAccess((current) => ({
      ...current,
      [plan]: {
        ...current[plan],
        features: { ...current[plan].features, [key]: enabled }
      }
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await updatePlanAccessSettings(planAccess);
      setPlanAccess(result.planAccess);
      setSuccess("Plan access settings saved. Changes take effect immediately.");
    } catch (saveError) {
      setError(saveError.message || "Could not save plan settings.");
    } finally {
      setSaving(false);
    }
  };

  const renderLimitControl = (plan, limit) => {
    const value = planAccess[plan][limit.key];
    const inputId = `${plan}-${limit.key}`;
    return (
      <div key={limit.key} className="rounded-xl border border-slate-200 p-4">
        <label htmlFor={inputId} className="block text-sm font-semibold text-slate-800">{limit.label}</label>
        <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{limit.description}</p>
        <div className="mt-3 flex items-center gap-3">
          <input
            id={inputId}
            type="number"
            min="1"
            max={limit.key === "posProducts" ? "5000" : undefined}
            value={value ?? ""}
            disabled={loading || saving || loadFailed || value === null}
            onChange={(event) => {
              const nextValue = Number.parseInt(event.target.value, 10);
              if (Number.isInteger(nextValue) && nextValue > 0) updateLimit(plan, limit.key, nextValue);
            }}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
          />
          {limit.key === "posProducts" && <span className="text-xs text-slate-500">Max 5,000 per POS request</span>}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={value === null}
            disabled={loading || saving || loadFailed}
            onChange={(event) => updateLimit(
              plan,
              limit.key,
              event.target.checked
                ? null
                : plan === "free"
                  ? (limit.key === "staff" ? 1 : limit.key === "posProducts" ? 500 : 20)
                  : (limit.key === "staff" ? 10 : limit.key === "posProducts" ? 500 : 100)
            )}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
          />
          Unlimited
        </label>
      </div>
    );
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span className="text-sm uppercase tracking-[0.3em] text-slate-500">Super Admin</span>
          <h1 className="mt-2 text-4xl font-semibold text-slate-900">Free &amp; Pro Modes</h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          Compare and manage what each subscription mode allows. Limits apply to each business, and feature access is enforced by the server.
        </p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Starter access</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Free mode</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {formatLimit(planAccess.free.products)} products
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The no-cost mode includes core product and POS use with its own configurable limits and feature access.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>• {formatLimit(planAccess.free.products)} products, {formatLimit(planAccess.free.staff)} staff accounts, and {formatLimit(planAccess.free.posProducts)} products shown in POS.</li>
            <li>• Enabled features: {FEATURES.filter((feature) => planAccess.free.features[feature.key]).map((feature) => feature.label.toLowerCase()).join(", ") || "none"}.</li>
          </ul>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Full access</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Pro mode</h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {formatLimit(planAccess.pro.products)} products
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Pro mode has its own configurable limits and feature access. Unlimited POS results are bounded by the system maximum of 5,000 per request.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>• {formatLimit(planAccess.pro.products)} products, {formatLimit(planAccess.pro.staff)} staff accounts, and {formatLimit(planAccess.pro.posProducts)} products shown in POS.</li>
            <li>• Enabled features: {FEATURES.filter((feature) => planAccess.pro.features[feature.key]).map((feature) => feature.label.toLowerCase()).join(", ") || "none"}.</li>
          </ul>
        </article>
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          {["free", "pro"].map((plan) => (
            <section key={plan} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold capitalize text-slate-900">{plan} limits</h2>
              <p className="mt-1 text-sm text-slate-500">Set a whole-number maximum or choose Unlimited.</p>
              <div className="mt-5 grid gap-3">{LIMITS.map((limit) => renderLimitControl(plan, limit))}</div>
            </section>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Feature access</h2>
            <p className="mt-1 text-sm text-slate-500">Choose which modes can use each existing Pro feature.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {FEATURES.map((feature) => (
              <div key={feature.key} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{feature.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{feature.description}</p>
                </div>
                {["free", "pro"].map((plan) => (
                  <label key={plan} className="flex min-w-24 items-center gap-2 text-sm capitalize text-slate-700">
                    <input
                      type="checkbox"
                      checked={planAccess[plan].features[feature.key]}
                      disabled={loading || saving || loadFailed}
                      onChange={(event) => updateFeature(plan, feature.key, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    />
                    {plan}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center">
          <p>Saving changes affects all businesses on the selected mode immediately. Existing data is not deleted if a cap is lowered.</p>
          <button type="submit" disabled={loading || saving || loadFailed} className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Saving..." : "Save mode settings"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default AdminPlanAccess;
