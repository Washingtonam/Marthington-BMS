import { useEffect, useState } from "react";
import request from "../api/client.js";

const AdminBillingSettings = () => {
  const [pricing, setPricing] = useState({
    monthly: { ngn: 15000, usd: 15 },
    yearly: { ngn: 150000, usd: 150 }
  });

  const [form, setForm] = useState({
    monthlyNgn: 15000,
    monthlyUsd: 15,
    yearlyNgn: 150000,
    yearlyUsd: 150
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState("");
  const [notificationType, setNotificationType] = useState("success");
  const [adminContact, setAdminContact] = useState({ name: "Support", email: "support@marthington.com", phone: "" });
  const [savingContact, setSavingContact] = useState(false);

  // Load current pricing
  useEffect(() => {
    const loadPricing = async () => {
      try {
        setLoading(true);
        const data = await request("/billing/pricing");
        const pricingData = data?.data;

        if (pricingData?.monthly && pricingData?.yearly) {
          setPricing(pricingData);
          setForm({
            monthlyNgn: pricingData.monthly.ngn || 15000,
            monthlyUsd: pricingData.monthly.usd || 15,
            yearlyNgn: pricingData.yearly.ngn || 150000,
            yearlyUsd: pricingData.yearly.usd || 150
          });
        }
      } catch (err) {
        console.error("Failed to load pricing:", err);
        setNotificationType("error");
        setNotification("Failed to load current pricing");
      } finally {
        setLoading(false);
      }
    };

    loadPricing();

    // load admin contact
    (async () => {
      try {
        const settingsRes = await request("/admin/affiliate-settings");
        const settings = settingsRes?.settings || {};
        if (settings.adminContact) setAdminContact(settings.adminContact);
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: parseInt(value) || 0
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setNotification("");

      await request("/billing/pricing", {
        method: "PUT",
        body: JSON.stringify({
          "prices.monthly.ngn": form.monthlyNgn,
          "prices.monthly.usd": form.monthlyUsd,
          "prices.yearly.ngn": form.yearlyNgn,
          "prices.yearly.usd": form.yearlyUsd
        })
      });

      setNotificationType("success");
      setNotification("✅ Global subscription prices updated successfully!");

      // Auto-hide notification after 4 seconds
      setTimeout(() => setNotification(""), 4000);
    } catch (err) {
      setNotificationType("error");
      setNotification(`❌ Error updating prices: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setAdminContact((p) => ({ ...p, [name]: value }));
  };

  const handleContactSave = async (e) => {
    e.preventDefault();
    try {
      setSavingContact(true);
      await request("/admin/settings/admin-contact", {
        method: "PUT",
        body: JSON.stringify(adminContact)
      });
      setNotificationType("success");
      setNotification("Admin contact updated");
      setTimeout(() => setNotification(""), 4000);
    } catch (err) {
      setNotificationType("error");
      setNotification(err.message || "Failed to update admin contact");
    } finally {
      setSavingContact(false);
    }
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Super Admin
          </span>
          <h1 className="mt-2 text-4xl font-semibold text-slate-900">
            Billing Settings
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-slate-500">
          Manage global subscription pricing for all tenants. Changes apply immediately.
        </p>
      </div>

      {/* NOTIFICATION */}
      {notification && (
        <div
          className={`rounded-2xl p-4 mb-6 ${
            notificationType === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <p className="font-semibold text-sm">{notification}</p>
        </div>
      )}

      {/* PRICING FORM */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* MONTHLY */}
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-200">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Monthly Plan</h2>
            <p className="text-sm text-slate-500 mt-2">
              Set the monthly subscription pricing for all tenants.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Monthly Price (NGN) ₦
              </label>
              <input
                type="number"
                name="monthlyNgn"
                value={form.monthlyNgn}
                onChange={handleInputChange}
                disabled={loading || saving}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="15000"
              />
              <p className="text-xs text-slate-500 mt-1">
                Current: ₦{pricing.monthly.ngn?.toLocaleString() || "—"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Monthly Price (USD) $
              </label>
              <input
                type="number"
                name="monthlyUsd"
                value={form.monthlyUsd}
                onChange={handleInputChange}
                disabled={loading || saving}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="15"
              />
              <p className="text-xs text-slate-500 mt-1">
                Current: ${pricing.monthly.usd?.toLocaleString() || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* YEARLY */}
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-200">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Yearly Plan</h2>
            <p className="text-sm text-slate-500 mt-2">
              Set the yearly subscription pricing for all tenants.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Yearly Price (NGN) ₦
              </label>
              <input
                type="number"
                name="yearlyNgn"
                value={form.yearlyNgn}
                onChange={handleInputChange}
                disabled={loading || saving}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="150000"
              />
              <p className="text-xs text-slate-500 mt-1">
                Current: ₦{pricing.yearly.ngn?.toLocaleString() || "—"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Yearly Price (USD) $
              </label>
              <input
                type="number"
                name="yearlyUsd"
                value={form.yearlyUsd}
                onChange={handleInputChange}
                disabled={loading || saving}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="150"
              />
              <p className="text-xs text-slate-500 mt-1">
                Current: ${pricing.yearly.usd?.toLocaleString() || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PRICING SUMMARY */}
      <div className="mt-8 rounded-3xl bg-slate-50 p-8 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Pricing Summary</h3>
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 font-semibold">Monthly (NGN)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              ₦{form.monthlyNgn?.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-slate-500 font-semibold">Monthly (USD)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              ${form.monthlyUsd?.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-slate-500 font-semibold">Yearly (NGN)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              ₦{form.yearlyNgn?.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-slate-500 font-semibold">Yearly (USD)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              ${form.yearlyUsd?.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ADMIN CONTACT */}
      <div className="mt-8 rounded-3xl bg-white p-8 shadow-xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4">System Admin Contact</h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
            <input
              name="name"
              value={adminContact.name}
              onChange={handleContactChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
            <input
              name="email"
              value={adminContact.email}
              onChange={handleContactChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
            <input
              name="phone"
              value={adminContact.phone}
              onChange={handleContactChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="mt-6">
          <button onClick={handleContactSave} disabled={savingContact} className="primary-button">
            {savingContact ? "Saving..." : "Update Admin Contact"}
          </button>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={handleSubmit}
          disabled={loading || saving}
          className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "💾 Save Pricing"}
        </button>
        <button
          onClick={() => {
            setForm({
              monthlyNgn: pricing.monthly.ngn || 15000,
              monthlyUsd: pricing.monthly.usd || 15,
              yearlyNgn: pricing.yearly.ngn || 150000,
              yearlyUsd: pricing.yearly.usd || 150
            });
            setNotification("");
          }}
          disabled={loading || saving}
          className="px-8 py-3 bg-slate-200 text-slate-900 font-bold rounded-lg hover:bg-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      {/* INFO BOX */}
      <div className="mt-8 rounded-3xl bg-blue-50 p-6 border border-blue-200">
        <h4 className="font-bold text-blue-900 text-sm">ℹ️ How This Works</h4>
        <ul className="text-sm text-blue-800 mt-3 space-y-1 list-disc list-inside">
          <li>All changes are applied globally to the pricing database immediately upon save.</li>
          <li>New tenants signing up will see the updated rates on the landing and registration pages.</li>
          <li>Existing subscriptions are unaffected—they maintain their original plan terms.</li>
          <li>Changes are reflected in the frontend pricing display within seconds.</li>
        </ul>
      </div>
    </section>
  );
};

export default AdminBillingSettings;
