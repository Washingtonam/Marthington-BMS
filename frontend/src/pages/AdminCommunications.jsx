import { useEffect, useState } from "react";
import request from "../api/client.js";

const emptyForm = {
  recipientName: "",
  recipientEmail: "",
  businessId: "",
  reportType: "overview",
  frequency: "daily",
  sendTime: "18:00",
  timezone: "Africa/Lagos"
};

const AdminCommunications = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState("");
  const [emailHealth, setEmailHealth] = useState(null);

  const load = async () => {
    const [subscriptionData, businessesData] = await Promise.all([
      request("/admin/report-subscriptions"),
      request("/admin/businesses")
    ]);
    setSubscriptions(subscriptionData.subscriptions || []);
    setBusinesses(businessesData.businesses || []);

    request("/admin/email-health")
      .then((health) => setEmailHealth(health))
      .catch((error) => setEmailHealth(error.body || { verified: false, email: { lastError: error.message || "Email health check failed" } }));
  };

  useEffect(() => {
    load().catch((err) => alert(err.message || "Failed to load communications"));
  }, []);

  const handleBusinessChange = (businessId) => {
    const business = businesses.find((item) => item._id === businessId);
    setForm((current) => ({
      ...current,
      businessId,
      recipientName: business?.ownerName || "",
      recipientEmail: business?.ownerEmail || ""
    }));
  };

  const create = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const response = await request("/admin/report-subscriptions", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setSubscriptions((current) => [response.subscription, ...current]);
      setForm(emptyForm);
    } catch (err) {
      alert(err.message || "Failed to add recipient");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (subscription) => {
    const nextStatus = subscription.status === "enabled" ? "admin_disabled" : "enabled";
    if (!window.confirm(`Are you sure you want to ${nextStatus === "enabled" ? "enable" : "disable"} reports for ${subscription.recipientEmail}?`)) return;
    try {
      const response = await request(`/admin/report-subscriptions/${subscription._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      setSubscriptions((current) => current.map((item) => item._id === subscription._id ? response.subscription : item));
    } catch (err) {
      alert(err.message || "Failed to update recipient");
    }
  };

  const sendTest = async (subscription) => {
    if (!window.confirm(`Send a test ${subscription.frequency} report to ${subscription.recipientEmail}?`)) return;
    try {
      setTestingId(subscription._id);
      await request(`/admin/report-subscriptions/${subscription._id}/test`, { method: "POST" });
      alert("Test report sent.");
    } catch (err) {
      alert(err.message || "Failed to send test report");
    } finally {
      setTestingId("");
    }
  };

  return (
    <section className="page-stack max-w-7xl mx-auto">
      <div className="page-heading"><div><span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin</span><h1 className="mt-2 text-4xl font-extrabold text-slate-900">Communications</h1></div><p className="max-w-2xl text-sm text-slate-500">Configure daily, weekly, or monthly business reports and test delivery before enabling them.</p></div>
      <div className={`rounded-2xl border px-5 py-4 text-sm ${emailHealth === null ? "border-slate-200 bg-slate-50 text-slate-700" : emailHealth.verified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><strong>{emailHealth === null ? "Checking email delivery" : emailHealth.verified ? "Email delivery ready" : "Email delivery needs attention"}</strong><p className="mt-1 text-xs">{emailHealth === null ? "Verifying the configured email provider..." : emailHealth.verified ? `SMTP is connected through ${emailHealth.email?.host || "the configured provider"}.` : emailHealth.email?.lastError || "Check SMTP settings on the deployed backend."}</p></div>

      <form onSubmit={create} className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80">
        <div className="mb-6 border-b border-slate-100 pb-4"><h2 className="text-xl font-bold text-slate-900">Add Report Recipient</h2><p className="mt-1 text-xs text-slate-400">Selecting a business fills the owner details. You can edit either field before saving.</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-bold text-slate-500">Business<select required value={form.businessId} onChange={(event) => handleBusinessChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Select business</option>{businesses.map((business) => <option key={business._id} value={business._id}>{business.name}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-500">Recipient name<input required value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
          <label className="text-xs font-bold text-slate-500">Recipient email<input required type="email" value={form.recipientEmail} onChange={(event) => setForm({ ...form, recipientEmail: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
          <label className="text-xs font-bold text-slate-500">Report content<select value={form.reportType} onChange={(event) => setForm({ ...form, reportType: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="overview">Business overview</option><option value="daily-analysis">Daily sales analysis</option></select></label>
          <label className="text-xs font-bold text-slate-500">Frequency<select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="daily">Daily</option><option value="weekly">Weekly (Friday)</option><option value="monthly">Monthly (last day)</option></select></label>
          <label className="text-xs font-bold text-slate-500">Send time<input type="time" required value={form.sendTime} onChange={(event) => setForm({ ...form, sendTime: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
          <label className="text-xs font-bold text-slate-500">Timezone<select value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="Africa/Lagos">Africa/Lagos</option><option value="UTC">UTC</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option></select></label>
          <button type="submit" disabled={saving} className="self-end rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold uppercase text-white disabled:opacity-50">{saving ? "Saving..." : "Save Schedule"}</button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80"><div className="mb-5 border-b border-slate-100 pb-4"><h2 className="text-xl font-bold text-slate-900">Report Registry</h2><p className="mt-1 text-xs text-slate-400">Each schedule sends a summary of the selected business: revenue, expenses, profit, sales activity, and report-specific details.</p></div><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Recipient</th><th className="px-5 py-4">Business</th><th className="px-5 py-4">Report</th><th className="px-5 py-4">Schedule</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Controls</th></tr></thead><tbody className="divide-y divide-slate-100 text-xs">{subscriptions.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No report schedules configured.</td></tr> : subscriptions.map((subscription) => <tr key={subscription._id}><td className="px-5 py-4"><strong>{subscription.recipientName || "Unnamed"}</strong><p className="text-slate-400">{subscription.recipientEmail}</p></td><td className="px-5 py-4">{subscription.business?.name || "-"}</td><td className="px-5 py-4">{subscription.reportType === "daily-analysis" ? "Daily analysis" : "Business overview"}</td><td className="px-5 py-4 capitalize">{subscription.frequency} at {subscription.sendTime}<p className="text-slate-400">{subscription.timezone}</p></td><td className="px-5 py-4 capitalize">{subscription.status.replace("_", " ")}</td><td className="space-x-2 px-5 py-4 text-right"><button type="button" onClick={() => sendTest(subscription)} disabled={testingId === subscription._id} className="rounded-lg border border-emerald-200 px-3 py-2 font-bold text-emerald-700 disabled:opacity-50">{testingId === subscription._id ? "Sending..." : "Test report"}</button><button type="button" onClick={() => toggle(subscription)} className="rounded-lg border border-slate-200 px-3 py-2 font-bold">{subscription.status === "enabled" ? "Disable" : "Enable"}</button></td></tr>)}</tbody></table></div>
    </section>
  );
};

export default AdminCommunications;
