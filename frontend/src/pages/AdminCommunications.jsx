import { useEffect, useMemo, useState } from "react";
import request from "../api/client.js";

const reportSections = [
  ["summary", "Financial summary"],
  ["sales", "Sales activity"],
  ["expenses", "Expenses"],
  ["inventory", "Inventory and low stock"],
  ["staff", "Staff performance"],
  ["paymentMethods", "Payment methods"]
];

const frequencies = [["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]];
const defaultSections = reportSections.map(([value]) => value);
const emptyForm = {
  recipientName: "", recipientEmail: "", businessId: "", reportType: "overview",
  frequencies: ["daily"], reportSections: defaultSections, sendTime: "18:00", timezone: "Africa/Lagos"
};

const formatReportType = (reportType) => reportType === "daily-analysis" ? "Daily analysis" : "Business overview";

const AdminCommunications = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [view, setView] = useState("all");
  const [sortBy, setSortBy] = useState("status");
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState("");
  const [emailHealth, setEmailHealth] = useState(null);

  const load = async () => {
    const [subscriptionData, businessesData] = await Promise.all([
      request("/admin/report-subscriptions"), request("/admin/businesses")
    ]);
    setSubscriptions(subscriptionData.subscriptions || []);
    setBusinesses(businessesData.businesses || []);
    request("/admin/email-health")
      .then(setEmailHealth)
      .catch((error) => setEmailHealth(error.body || { verified: false, email: { lastError: error.message || "Email health check failed" } }));
  };

  useEffect(() => { load().catch((error) => alert(error.message || "Failed to load communications")); }, []);

  const groupedRecipients = useMemo(() => {
    const groups = new Map();
    subscriptions.forEach((subscription) => {
      const key = `${subscription.recipientEmail}:${subscription.business?._id || subscription.business}`;
      if (!groups.has(key)) groups.set(key, { ...subscription, schedules: [] });
      groups.get(key).schedules.push(subscription);
    });
    return [...groups.values()]
      .filter((recipient) => view === "all" || (view === "disabled" ? !recipient.schedules.some((item) => item.status === "enabled") : recipient.schedules.some((item) => item.status === "enabled")))
      .sort((left, right) => {
        if (sortBy === "business") return (left.business?.name || "").localeCompare(right.business?.name || "");
        if (sortBy === "email") return left.recipientEmail.localeCompare(right.recipientEmail);
        if (sortBy === "lastSent") return new Date(right.schedules[0]?.lastSentAt || 0) - new Date(left.schedules[0]?.lastSentAt || 0);
        return Number(right.schedules.some((item) => item.status === "enabled")) - Number(left.schedules.some((item) => item.status === "enabled"));
      });
  }, [subscriptions, sortBy, view]);

  const handleBusinessChange = (businessId) => {
    const business = businesses.find((item) => item._id === businessId);
    setForm((current) => ({ ...current, businessId, recipientName: business?.ownerName || "", recipientEmail: business?.ownerEmail || "" }));
  };

  const toggleFormValue = (field, value) => setForm((current) => ({
    ...current,
    [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value]
  }));

  const openFrequency = (recipient, frequency) => {
    const schedule = recipient.schedules.find((item) => item.frequency === frequency);
    setForm({
      recipientName: recipient.recipientName || "",
      recipientEmail: recipient.recipientEmail || "",
      businessId: recipient.business?._id || recipient.business || "",
      reportType: recipient.reportType || "overview",
      frequencies: [frequency],
      reportSections: recipient.reportSections || defaultSections,
      sendTime: recipient.schedules[0]?.sendTime || "18:00",
      timezone: recipient.schedules[0]?.timezone || "Africa/Lagos"
    });
    setEditingId(schedule?._id || "");
    setIsFormOpen(true);
  };

  const create = async (event) => {
    event.preventDefault();
    if (!form.frequencies.length || !form.reportSections.length) {
      alert("Select at least one frequency and one report section.");
      return;
    }
    try {
      setSaving(true);
      const frequenciesToSave = editingId ? [form.frequencies[0]] : form.frequencies;
      const saved = await Promise.all(frequenciesToSave.map(async (frequency) => {
        const payload = { ...form, frequency };
        const response = await request(editingId ? `/admin/report-subscriptions/${editingId}` : "/admin/report-subscriptions", {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(payload)
        });
        return response.subscription;
      }));
      setSubscriptions((current) => editingId
        ? current.map((item) => item._id === editingId ? saved[0] : item)
        : [...saved, ...current.filter((item) => !saved.some((created) => created._id === item._id))]);
      setForm(emptyForm);
      setEditingId("");
      setIsFormOpen(false);
    } catch (error) {
      alert(error.message || "Failed to add recipient. Check whether one of these schedules already exists.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (subscription) => {
    if (!subscription._id) {
      openFrequency({ ...subscription, schedules: [subscription] }, subscription.frequency);
      return;
    }
    const nextStatus = subscription.status === "enabled" ? "admin_disabled" : "enabled";
    if (!window.confirm(`${nextStatus === "enabled" ? "Enable" : "Disable"} ${subscription.frequency} reports for ${subscription.recipientEmail}?`)) return;
    try {
      const response = await request(`/admin/report-subscriptions/${subscription._id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      setSubscriptions((current) => current.map((item) => item._id === subscription._id ? response.subscription : item));
    } catch (error) { alert(error.message || "Failed to update recipient"); }
  };

  const sendTest = async (subscription) => {
    if (!window.confirm(`Send the ${subscription.frequency} report now to ${subscription.recipientEmail}?`)) return;
    try {
      setTestingId(subscription._id);
      await request(`/admin/report-subscriptions/${subscription._id}/test`, { method: "POST" });
      alert("Report sent.");
    } catch (error) { alert(error.message || "Failed to send test report"); }
    finally { setTestingId(""); }
  };

  const remove = async (subscription) => {
    if (!subscription._id) {
      if (!window.confirm(`Hide ${subscription.recipientEmail || "this automatic recipient"} from Communications? You can add a schedule again later.`)) return;
      try {
        await request("/admin/report-subscriptions", { method: "POST", body: JSON.stringify({
          recipientEmail: subscription.recipientEmail,
          recipientName: subscription.recipientName,
          businessId: subscription.business?._id || subscription.business,
          reportType: subscription.reportType,
          reportSections: subscription.reportSections,
          frequency: subscription.frequency,
          sendTime: subscription.sendTime,
          timezone: subscription.timezone,
          status: "admin_disabled",
          isRemoved: true
        }) });
        setSubscriptions((current) => current.filter((item) => item.business?._id !== subscription.business?._id));
      } catch (error) { alert(error.message || "Failed to remove recipient"); }
      return;
    }
    if (!window.confirm(`Remove ${subscription.recipientEmail} from Communications? This can be restored only by adding a schedule again.`)) return;
    try {
      await request(`/admin/report-subscriptions/${subscription._id}`, { method: "DELETE" });
      setSubscriptions((current) => current.filter((item) => item._id !== subscription._id));
    } catch (error) { alert(error.message || "Failed to remove recipient"); }
  };

  return <section className="page-stack mx-auto max-w-7xl">
    <div className="page-heading items-start">
      <div><span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin</span><h1 className="mt-2 text-4xl font-extrabold text-slate-900">Communications</h1></div>
      <div className="flex flex-col items-start gap-3 sm:items-end"><p className="max-w-2xl text-sm text-slate-500">Choose report contents and turn daily, weekly, or monthly delivery on for each recipient.</p><button type="button" onClick={() => setIsFormOpen(true)} className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold uppercase tracking-wide text-white">Add report recipient</button></div>
    </div>
    <div className={`rounded-2xl border px-5 py-4 text-sm ${emailHealth === null ? "border-slate-200 bg-slate-50 text-slate-700" : emailHealth.verified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><strong>{emailHealth === null ? "Checking email delivery" : emailHealth.verified ? "Email delivery ready" : "Email delivery needs attention"}</strong><p className="mt-1 text-xs">{emailHealth === null ? "Verifying the configured email provider..." : emailHealth.verified ? `${emailHealth.email?.provider === "resend-api" ? "Resend API" : "SMTP"} is connected.` : emailHealth.email?.lastError || "Check email provider settings on the deployed backend."}</p></div>
    <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-4"><div><h2 className="text-xl font-bold text-slate-900">Report recipients</h2><p className="mt-1 text-xs text-slate-400">Every business email appears here automatically. Changes require confirmation.</p></div><div className="flex flex-wrap gap-2"><select value={view} onChange={(event) => setView(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><option value="all">All recipients</option><option value="enabled">Enabled only</option><option value="disabled">Disabled only</option></select><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><option value="status">Sort by status</option><option value="business">Sort by business</option><option value="email">Sort by email</option><option value="lastSent">Sort by last sent</option></select></div></div>
      <table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Recipient</th><th className="px-5 py-4">Business</th><th className="px-5 py-4">Report content</th><th className="px-5 py-4">Frequency</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Controls</th></tr></thead><tbody className="divide-y divide-slate-100 text-xs">
        {groupedRecipients.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No report recipients configured.</td></tr> : groupedRecipients.map((recipient) => <tr key={`${recipient.recipientEmail}:${recipient.business?._id || recipient.business}`}>
          <td className="px-5 py-4"><strong>{recipient.recipientName || "Unnamed"}</strong><p className="text-slate-400">{recipient.recipientEmail}</p></td><td className="px-5 py-4">{recipient.business?.name || "-"}</td>
          <td className="px-5 py-4">{formatReportType(recipient.reportType)}<p className="mt-1 text-slate-400">{(recipient.reportSections || defaultSections).map((section) => reportSections.find(([value]) => value === section)?.[1]).filter(Boolean).join(", ")}</p></td>
          <td className="px-5 py-4"><div className="flex flex-wrap gap-1">{frequencies.map(([value, label]) => { const schedule = recipient.schedules.find((item) => item.frequency === value); return <button key={value} type="button" onClick={() => openFrequency(recipient, value)} className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${schedule?.status === "enabled" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-400"}`}>{label}</button>; })}</div><p className="mt-2 text-slate-400">{recipient.schedules[0]?.sendTime} · {recipient.schedules[0]?.timezone}</p></td>
          <td className="px-5 py-4 capitalize">{recipient.schedules.some((item) => item.status === "enabled") ? "enabled" : "disabled"}</td><td className="space-x-2 px-5 py-4 text-right">{recipient.schedules.map((schedule) => <span key={schedule._id || schedule.frequency} className="inline-flex gap-1"><button type="button" onClick={() => sendTest(schedule)} disabled={!schedule._id || testingId === schedule._id} className="rounded-lg border border-emerald-200 px-3 py-2 font-bold text-emerald-700 disabled:opacity-50">{testingId === schedule._id ? "Sending..." : `Send ${schedule.frequency}`}</button><button type="button" onClick={() => toggle(schedule)} className="rounded-lg border border-slate-200 px-3 py-2 font-bold">{schedule.status === "enabled" ? "Disable" : "Enable"}</button><button type="button" onClick={() => remove(schedule)} className="rounded-lg border border-rose-200 px-3 py-2 font-bold text-rose-700">Delete</button></span>)}</td>
        </tr>)}
      </tbody></table>
    </div>
    {isFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="recipient-modal-title"><form onSubmit={create} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
      <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-4"><div><h2 id="recipient-modal-title" className="text-xl font-bold text-slate-900">{editingId ? "Edit report schedule" : "Add report recipient"}</h2><p className="mt-1 text-xs text-slate-400">Choose schedules and report sections before saving.</p></div><button type="button" onClick={() => { setIsFormOpen(false); setEditingId(""); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Close</button></div>
      <div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-bold text-slate-500">Business<select required value={form.businessId} onChange={(event) => handleBusinessChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Select business</option>{businesses.map((business) => <option key={business._id} value={business._id}>{business.name}</option>)}</select></label><label className="text-xs font-bold text-slate-500">Recipient name<input required value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-xs font-bold text-slate-500">Recipient email<input required type="email" value={form.recipientEmail} onChange={(event) => setForm({ ...form, recipientEmail: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-xs font-bold text-slate-500">Report content<select value={form.reportType} onChange={(event) => setForm({ ...form, reportType: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="overview">Business overview</option><option value="daily-analysis">Daily report analysis</option></select></label></div>
      <fieldset className="mt-5"><legend className="text-xs font-bold text-slate-500">Delivery frequency</legend><div className="mt-2 flex flex-wrap gap-2">{frequencies.map(([value, label]) => <button key={value} type="button" onClick={() => toggleFormValue("frequencies", value)} className={`rounded-xl border px-4 py-2 text-xs font-bold ${form.frequencies.includes(value) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>{label}</button>)}</div></fieldset>
      <fieldset className="mt-5"><legend className="text-xs font-bold text-slate-500">Report contents</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{reportSections.map(([value, label]) => <label key={value} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-xs text-slate-700"><input type="checkbox" checked={form.reportSections.includes(value)} onChange={() => toggleFormValue("reportSections", value)} />{label}</label>)}</div></fieldset>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-xs font-bold text-slate-500">Send time<input type="time" required value={form.sendTime} onChange={(event) => setForm({ ...form, sendTime: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-xs font-bold text-slate-500">Timezone<select value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="Africa/Lagos">Africa/Lagos</option><option value="UTC">UTC</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option></select></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold uppercase text-white disabled:opacity-50">{saving ? "Saving..." : "Save schedules"}</button></div>
    </form></div>}
  </section>;
};

export default AdminCommunications;