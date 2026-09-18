import { useEffect, useMemo, useState } from "react";
import request from "../api/client.js";

const defaultForm = {
  name: "",
  subject: "",
  previewText: "",
  bodyHtml: "",
  footerText: "Marthington BMS | Business management, made clearer.",
  footerAddress: "",
  audienceType: "all_users",
  businessId: "",
  scheduledFor: ""
};

const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [audienceCount, setAudienceCount] = useState(0);
  const [form, setForm] = useState(defaultForm);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [campaignData, overview] = await Promise.all([
      request("/admin/email-campaigns"),
      request("/admin/overview")
    ]);
    setCampaigns(campaignData.campaigns || []);
    setBusinesses(overview.businesses || []);
  };

  useEffect(() => {
    load().catch((err) => alert(err.message || "Failed to load campaigns"));
  }, []);

  const updateAudienceCount = async (nextForm) => {
    if (nextForm.audienceType === "business_users" && !nextForm.businessId) {
      setAudienceCount(0);
      return;
    }
    const params = new URLSearchParams({ audienceType: nextForm.audienceType });
    if (nextForm.businessId) params.set("businessId", nextForm.businessId);
    try {
      const result = await request(`/admin/email-campaigns/audience-count?${params.toString()}`);
      setAudienceCount(result.count || 0);
    } catch {
      setAudienceCount(0);
    }
  };

  const change = (field, value) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    if (field === "audienceType" || field === "businessId") updateAudienceCount(nextForm);
  };

  const save = async (event) => {
    event.preventDefault();
    if (form.scheduledFor && !window.confirm(`Are you sure you want to schedule this campaign for ${new Date(form.scheduledFor).toLocaleString()}?`)) return;
    try {
      setSaving(true);
      const result = await request("/admin/email-campaigns", {
        method: "POST",
        body: JSON.stringify({ ...form, businessId: form.businessId || null })
      });
      setCampaigns((current) => [result.campaign, ...current]);
      setForm(defaultForm);
      setAudienceCount(0);
    } catch (err) {
      alert(err.message || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (campaign) => {
    if (!window.confirm(`Are you sure you want to cancel ${campaign.name}?`)) return;
    try {
      const result = await request(`/admin/email-campaigns/${campaign._id}/cancel`, { method: "POST" });
      setCampaigns((current) => current.map((item) => item._id === campaign._id ? result.campaign : item));
    } catch (err) {
      alert(err.message || "Failed to cancel campaign");
    }
  };

  const sendTest = async (campaign) => {
    const email = window.prompt("Send a test email to:");
    if (!email || !window.confirm(`Are you sure you want to send a test email to ${email}?`)) return;
    try {
      await request(`/admin/email-campaigns/${campaign._id}/test`, {
        method: "POST",
        body: JSON.stringify({ email })
      });
      alert("Test email sent.");
    } catch (err) {
      alert(err.message || "Failed to send test email");
    }
  };

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  }, [calendarMonth]);

  const campaignsForDay = (day) => campaigns.filter((campaign) => {
    if (!day || !campaign.scheduledFor) return false;
    const date = new Date(campaign.scheduledFor);
    return date.getFullYear() === calendarMonth.getFullYear() && date.getMonth() === calendarMonth.getMonth() && date.getDate() === day;
  });

  return (
    <section className="page-stack max-w-7xl mx-auto">
      <div className="page-heading"><div><span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin</span><h1 className="mt-2 text-4xl font-extrabold text-slate-900">Campaigns</h1></div><p className="max-w-2xl text-sm text-slate-500">Draft, preview, schedule, test, and monitor platform-wide outreach.</p></div>

      <div className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900">Campaign Calendar</h2><p className="text-xs text-slate-400">Scheduled outreach for {calendarMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}.</p></div><div className="flex gap-2"><button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Previous</button><button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Next</button></div></div>
        <div className="mt-5 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="bg-slate-50 px-2 py-3 text-center text-[10px] font-bold uppercase text-slate-400">{day}</div>)}{calendarDays.map((day, index) => <div key={`${day || "empty"}-${index}`} className="min-h-24 bg-white p-2"><span className="text-xs font-bold text-slate-500">{day || ""}</span>{campaignsForDay(day).map((campaign) => <div key={campaign._id} className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{campaign.name}</div>)}</div>)}</div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={save} className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80"><h2 className="text-xl font-bold text-slate-900">Compose Outreach Email</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-xs font-bold text-slate-500">Campaign name<input required value={form.name} onChange={(event) => change("name", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-xs font-bold text-slate-500">Subject<input required value={form.subject} onChange={(event) => change("subject", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label></div><label className="mt-4 block text-xs font-bold text-slate-500">Preview text<input value={form.previewText} onChange={(event) => change("previewText", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="mt-4 block text-xs font-bold text-slate-500">Message body<textarea required rows={8} value={form.bodyHtml} onChange={(event) => change("bodyHtml", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-xs font-bold text-slate-500">Footer message<textarea rows={3} value={form.footerText} onChange={(event) => change("footerText", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-xs font-bold text-slate-500">Footer address<textarea rows={3} value={form.footerAddress} onChange={(event) => change("footerAddress", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label></div><div className="mt-4 grid gap-4 md:grid-cols-3"><label className="text-xs font-bold text-slate-500">Audience<select value={form.audienceType} onChange={(event) => change("audienceType", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="all_users">All platform users</option><option value="owners">Business owners</option><option value="staff">Staff</option><option value="affiliates">Affiliates</option><option value="business_users">Selected business</option></select></label><label className="text-xs font-bold text-slate-500">Business<select disabled={form.audienceType !== "business_users"} required={form.audienceType === "business_users"} value={form.businessId} onChange={(event) => change("businessId", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">{form.audienceType === "business_users" ? "Select business" : "Not required"}</option>{businesses.map((business) => <option key={business._id} value={business._id}>{business.name}</option>)}</select></label><label className="text-xs font-bold text-slate-500">Schedule<input type="datetime-local" value={form.scheduledFor} onChange={(event) => change("scheduledFor", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label></div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5"><span className="text-xs font-semibold text-slate-500">Estimated recipients: <strong className="text-slate-900">{audienceCount}</strong></span><button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold uppercase text-white disabled:opacity-50">{saving ? "Saving..." : form.scheduledFor ? "Schedule Campaign" : "Save Draft"}</button></div></form>
        <aside className="rounded-3xl bg-slate-50 p-6 border border-slate-200"><h2 className="text-xl font-bold text-slate-900">Live Preview</h2><article className="mt-5 overflow-hidden rounded-2xl bg-white border border-slate-200"><div className="border-b border-slate-100 px-5 py-4"><strong className="text-emerald-600">Marthington BMS</strong><h3 className="mt-2 text-lg font-bold">{form.subject || "Your email subject"}</h3><p className="text-xs text-slate-400">{form.previewText || "Preview text"}</p></div><div className="min-h-48 px-5 py-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{form.bodyHtml || "Your message preview"}</div><footer className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500">{form.footerText}<br />{form.footerAddress}<br /><span className="text-slate-400">Unsubscribe from promotional emails</span></footer></article></aside>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80"><h2 className="text-xl font-bold text-slate-900">Campaign Registry</h2><table className="mt-5 min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Campaign</th><th className="px-5 py-4">Audience</th><th className="px-5 py-4">Schedule</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Control</th></tr></thead><tbody className="divide-y divide-slate-100 text-xs">{campaigns.map((campaign) => <tr key={campaign._id}><td className="px-5 py-4"><strong>{campaign.name}</strong><p className="text-slate-400">{campaign.subject}</p></td><td className="px-5 py-4 capitalize">{campaign.audienceType.replace("_", " ")}</td><td className="px-5 py-4">{campaign.scheduledFor ? new Date(campaign.scheduledFor).toLocaleString() : "Not scheduled"}</td><td className="px-5 py-4 capitalize">{campaign.status}</td><td className="space-x-2 px-5 py-4 text-right">{["draft", "scheduled"].includes(campaign.status) && <><button type="button" onClick={() => sendTest(campaign)} className="rounded-lg border border-emerald-200 px-3 py-2 font-bold text-emerald-700">Test email</button><button type="button" onClick={() => cancel(campaign)} className="rounded-lg border border-red-200 px-3 py-2 font-bold text-red-600">Cancel</button></>}</td></tr>)}</tbody></table></div>
    </section>
  );
};

export default AdminCampaigns;
