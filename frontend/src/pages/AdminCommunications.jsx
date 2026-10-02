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
const weekdays = [[0, "Sunday"], [1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"]];
const statusFilters = [
  ["all", "All"],
  ["enabled", "Active"],
  ["disabled", "Paused"]
];
const defaultSections = reportSections.map(([value]) => value);
const emptyForm = {
  recipientName: "", recipientEmail: "", businessId: "", reportType: "overview",
  frequencies: ["daily"], reportSections: defaultSections, sendTimes: { daily: "18:00", weekly: "18:00", monthly: "18:00" }, weeklyDay: 1, monthlyDay: "last", timezone: "Africa/Lagos"
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
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState("");
  const [historyRecipient, setHistoryRecipient] = useState(null);

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

  const getRecipientKey = (recipient) => `${recipient.recipientEmail}:${recipient.business?._id || recipient.business || "unknown"}`;

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

  const filteredRecipients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return groupedRecipients;
    return groupedRecipients.filter((recipient) => {
      const haystack = [
        recipient.recipientName,
        recipient.recipientEmail,
        recipient.business?.name,
        formatReportType(recipient.reportType),
        (recipient.reportSections || defaultSections).map((section) => reportSections.find(([value]) => value === section)?.[1]).filter(Boolean).join(" "),
        recipient.schedules.map((schedule) => schedule.frequency).join(" "),
        recipient.schedules.some((schedule) => schedule.status === "enabled") ? "enabled" : "disabled"
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [groupedRecipients, search]);

  const selectedRecipients = filteredRecipients.filter((recipient) => selectedIds.includes(getRecipientKey(recipient)));

  const toggleSelection = (recipient) => {
    const key = getRecipientKey(recipient);
    setSelectedIds((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const applyBulkAction = async (action) => {
    if (!selectedRecipients.length) return;
    const items = selectedRecipients.flatMap((recipient) => recipient.schedules.length ? recipient.schedules : [recipient]);
    for (const item of items) {
      if (action === "enable" && item.status !== "enabled") {
        await toggle(item);
      }
      if (action === "disable" && item.status === "enabled") {
        await toggle(item);
      }
      if (action === "delete") {
        await remove(item);
      }
    }
    setSelectedIds([]);
    setMenuOpenId("");
  };

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
      sendTimes: Object.fromEntries(["daily", "weekly", "monthly"].map((value) => [value, recipient.schedules.find((item) => item.frequency === value)?.sendTime || "18:00"])),
      weeklyDay: schedule?.weeklyDay ?? 1,
      monthlyDay: schedule?.monthlyDay ?? "last",
      timezone: recipient.schedules[0]?.timezone || "Africa/Lagos"
    });
    setEditingId(schedule?._id || "");
    setIsFormOpen(true);
  };

  const updateLocalSchedule = (recipient, frequency, schedule) => {
    const recipientKey = getRecipientKey(recipient);
    setSubscriptions((current) => {
      const next = current.filter((item) => getRecipientKey(item) !== recipientKey || item.frequency !== frequency);
      return schedule ? [...next, schedule] : next;
    });
  };

  const setFrequencyEnabled = async (recipient, frequency, enabled) => {
    const schedule = recipient.schedules.find((item) => item.frequency === frequency);
    try {
      setSaving(true);
      if (enabled) {
        const response = schedule?._id
          ? await request(`/admin/report-subscriptions/${schedule._id}`, { method: "PATCH", body: JSON.stringify({ status: "enabled" }) })
          : await request("/admin/report-subscriptions", { method: "POST", body: JSON.stringify({
            recipientName: recipient.recipientName,
            recipientEmail: recipient.recipientEmail,
            businessId: recipient.business?._id || recipient.business,
            reportType: recipient.reportType || "overview",
            reportSections: recipient.reportSections || defaultSections,
            frequency,
            sendTime: recipient.schedules.find((item) => item.frequency === frequency)?.sendTime || "18:00",
            weeklyDay: recipient.schedules[0]?.weeklyDay ?? 1,
            monthlyDay: recipient.schedules[0]?.monthlyDay ?? "last",
            timezone: recipient.schedules[0]?.timezone || "Africa/Lagos",
            status: "enabled"
          }) });
        updateLocalSchedule(recipient, frequency, response.subscription);
      } else if (schedule?._id) {
        const response = await request(`/admin/report-subscriptions/${schedule._id}`, { method: "PATCH", body: JSON.stringify({ status: "admin_disabled" }) });
        updateLocalSchedule(recipient, frequency, response.subscription);
      } else if (recipient.isAutomatic && frequency === "daily") {
        await request("/admin/report-subscriptions", { method: "POST", body: JSON.stringify({
          recipientName: recipient.recipientName,
          recipientEmail: recipient.recipientEmail,
          businessId: recipient.business?._id || recipient.business,
          reportType: recipient.reportType || "overview",
          reportSections: recipient.reportSections || defaultSections,
          frequency,
          sendTime: recipient.schedules.find((item) => item.frequency === frequency)?.sendTime || "18:00",
          weeklyDay: recipient.schedules[0]?.weeklyDay ?? 1,
          monthlyDay: recipient.schedules[0]?.monthlyDay ?? "last",
          timezone: recipient.schedules[0]?.timezone || "Africa/Lagos",
          status: "admin_disabled",
          isRemoved: true
        }) });
        setSubscriptions((current) => current.filter((item) => getRecipientKey(item) !== getRecipientKey(recipient)));
      }
    } catch (error) {
      alert(error.message || "Failed to update report frequency");
    } finally {
      setSaving(false);
    }
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
        const payload = { ...form, sendTime: form.sendTimes[frequency], frequency };
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

  const openHistory = async (recipient) => {
    setHistoryRecipient({ ...recipient, schedules: recipient.schedules.map((schedule) => ({ ...schedule, deliveries: null })) });
    const schedules = await Promise.all(recipient.schedules.map(async (schedule) => {
      if (!schedule._id) return { ...schedule, deliveries: [] };
      try {
        const response = await request(`/admin/report-subscriptions/${schedule._id}/history`);
        return { ...schedule, deliveries: response.deliveries || [] };
      } catch (error) {
        return { ...schedule, deliveries: [], historyError: error.message || "Could not load delivery history" };
      }
    }));
    setHistoryRecipient({ ...recipient, schedules });
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

  const removeRecipient = async (recipient) => {
    if (!window.confirm(`Remove all report schedules for ${recipient.recipientEmail}? This can be restored by checking a frequency again.`)) return;
    try {
      setSaving(true);
      const schedules = recipient.schedules.filter((item) => item._id);
      if (schedules.length) {
        await Promise.all(schedules.map((schedule) => request(`/admin/report-subscriptions/${schedule._id}`, { method: "DELETE" })));
      } else {
        await request("/admin/report-subscriptions", { method: "POST", body: JSON.stringify({
          recipientEmail: recipient.recipientEmail,
          recipientName: recipient.recipientName,
          businessId: recipient.business?._id || recipient.business,
          reportType: recipient.reportType || "overview",
          reportSections: recipient.reportSections || defaultSections,
          frequency: "daily",
          status: "admin_disabled",
          isRemoved: true
        }) });
      }
      setSubscriptions((current) => current.filter((item) => getRecipientKey(item) !== getRecipientKey(recipient)));
    } catch (error) {
      alert(error.message || "Failed to remove recipient");
    } finally {
      setSaving(false);
    }
  };

  return <section className="page-stack mx-auto max-w-7xl">
    <div className="page-heading items-start">
      <div><span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin</span><h1 className="mt-2 text-4xl font-extrabold text-slate-900">Communications</h1></div>
      <div className="flex flex-col items-start gap-3 sm:items-end"><p className="max-w-2xl text-sm text-slate-500">Choose report contents and turn daily, weekly, or monthly delivery on for each recipient.</p><button type="button" onClick={() => setIsFormOpen(true)} className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold uppercase tracking-wide text-white">Add report recipient</button></div>
    </div>

    <div className={`rounded-2xl border px-5 py-4 text-sm ${emailHealth === null ? "border-slate-200 bg-slate-50 text-slate-700" : emailHealth.verified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] ${emailHealth === null ? "border-slate-200 bg-white text-slate-600" : emailHealth.verified ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-amber-200 bg-amber-100 text-amber-700"}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${emailHealth === null ? "bg-slate-400" : emailHealth.verified ? "bg-emerald-500" : "bg-amber-500"} shadow-[0_0_0_3px_rgba(255,255,255,0.8)]`}></span>
            {emailHealth === null ? "Checking email" : emailHealth.verified ? "Resend API connected" : "Email delivery needs attention"}
          </span>
        </div>
        <p className="text-xs text-slate-500">{emailHealth === null ? "Verifying the configured email provider..." : emailHealth.verified ? `${emailHealth.email?.provider === "resend-api" ? "Resend API" : "SMTP"} is connected.` : emailHealth.email?.lastError || "Check email provider settings on the deployed backend."}</p>
      </div>
    </div>

    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl">
      <div className="border-b border-slate-100 bg-slate-50/60 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <label className="relative block">
                <span className="sr-only">Search recipients</span>
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">⌕</span>
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or business" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-emerald-400" />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusFilters.map(([value, label]) => <button key={value} type="button" onClick={() => setView(value)} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${view === value ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>{label}</button>)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><option value="status">Sort by status</option><option value="business">Sort by business</option><option value="email">Sort by email</option><option value="lastSent">Sort by last sent</option></select>
            <button type="button" onClick={() => setIsFormOpen(true)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">Add recipient</button>
          </div>
        </div>

        {selectedRecipients.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">{selectedRecipients.length} selected</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => applyBulkAction("enable")} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Enable</button>
            <button type="button" onClick={() => applyBulkAction("disable")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700">Disable</button>
            <button type="button" onClick={() => applyBulkAction("delete")} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-rose-700">Delete</button>
          </div>
        </div>}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-5 py-4"><input type="checkbox" checked={filteredRecipients.length > 0 && filteredRecipients.every((recipient) => selectedIds.includes(getRecipientKey(recipient)))} onChange={() => {
                const keys = filteredRecipients.map((recipient) => getRecipientKey(recipient));
                const allSelected = keys.every((key) => selectedIds.includes(key));
                setSelectedIds((current) => allSelected ? current.filter((key) => !keys.includes(key)) : [...new Set([...current, ...keys])]);
              }} className="h-4 w-4 rounded border-slate-300 text-emerald-600" aria-label="Toggle all recipients" /></th>
              <th className="px-5 py-4">Recipient</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Frequency</th>
              <th className="px-5 py-4">Last sent</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-xs">
            {filteredRecipients.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No report recipients configured.</td></tr> : filteredRecipients.map((recipient) => {
              const primarySchedule = recipient.schedules.find((item) => item.status === "enabled") || recipient.schedules[0];
              const isPro = recipient.business?.isPro === true || (recipient.business?.plan === "pro" && recipient.business?.subscription?.status === "active");
              const isEnabled = recipient.schedules.some((item) => item.status === "enabled") || (recipient.isAutomatic && isPro && recipient.business?.reportNotificationsEnabled !== false);
              const recipientKeyValue = getRecipientKey(recipient);
              return <tr key={recipientKeyValue} className="align-top transition hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <input type="checkbox" checked={selectedIds.includes(recipientKeyValue)} onChange={() => toggleSelection(recipient)} className="h-4 w-4 rounded border-slate-300 text-emerald-600" aria-label={`Select ${recipient.recipientEmail}`} />
                </td>
                <td className="px-5 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">{(recipient.recipientName || recipient.recipientEmail || "U").slice(0, 2).toUpperCase()}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-semibold text-slate-800">{recipient.recipientName || "Unnamed"}</strong>
                          <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${isEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>{isEnabled ? "Live" : "Paused"}</span>
                        </div>
                        <span className="mt-0.5 block text-slate-500">{recipient.recipientEmail}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-1">{recipient.business?.name || "General"}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{formatReportType(recipient.reportType)}</span>
                      <span className={`rounded-full px-2 py-1 font-bold ${isPro ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{isPro ? "Pro" : "Free"}</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${isEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                    {isEnabled ? "Active" : "Paused"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="space-y-2">
                    {frequencies.map(([value, label]) => {
                      const schedule = recipient.schedules.find((item) => item.frequency === value);
                      return <label key={value} className="flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold text-slate-700">
                        <input type="checkbox" checked={schedule?.status === "enabled" || (!schedule && recipient.isAutomatic && isPro && value === "daily")} onChange={(event) => setFrequencyEnabled(recipient, value, event.target.checked)} disabled={saving} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
                        {label}
                      </label>;
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">{primarySchedule?.sendTime || "18:00"} · {primarySchedule?.timezone || "Africa/Lagos"}</p>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-slate-700">{primarySchedule?.lastSentAt ? new Date(primarySchedule.lastSentAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Never sent"}</span>
                    <button type="button" onClick={() => openHistory(recipient)} className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">History</button>
                  </div>
                </td>
                <td className="relative px-5 py-4 text-right">
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setMenuOpenId(menuOpenId === recipientKeyValue ? "" : recipientKeyValue)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">⋮</button>
                  </div>
                  {menuOpenId === recipientKeyValue && <div className="absolute right-5 top-14 z-20 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    <button type="button" onClick={() => { setMenuOpenId(""); sendTest(primarySchedule); }} disabled={!primarySchedule?._id || testingId === primarySchedule?._id} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{testingId === primarySchedule?._id ? "Sending..." : "Send test"}</button>
                    <button type="button" onClick={() => { setMenuOpenId(""); toggle(primarySchedule); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">{primarySchedule?.status === "enabled" ? "Pause delivery" : "Resume delivery"}</button>
                    <button type="button" onClick={() => { setMenuOpenId(""); openFrequency(recipient, primarySchedule?.frequency || "daily"); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Edit schedule</button>
                    <button type="button" onClick={() => { setMenuOpenId(""); removeRecipient(recipient); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50">Delete</button>
                  </div>}
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>

    {historyRecipient && <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/30" role="dialog" aria-modal="true" aria-labelledby="history-drawer-title">
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Delivery history</p>
            <h3 id="history-drawer-title" className="mt-2 text-xl font-bold text-slate-900">{historyRecipient.recipientName || historyRecipient.recipientEmail}</h3>
          </div>
          <button type="button" onClick={() => setHistoryRecipient(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Close</button>
        </div>

        <div className="space-y-3">
          {historyRecipient.schedules.length === 0 ? <p className="text-sm text-slate-500">No delivery activity recorded yet.</p> : historyRecipient.schedules.map((schedule) => <div key={schedule._id || schedule.frequency} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{schedule.frequency}</span>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${schedule.status === "enabled" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>{schedule.status === "enabled" ? "On" : "Paused"}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">{schedule.sendTime || "18:00"} · {schedule.timezone || "Africa/Lagos"}</p>
            {schedule.frequency === "weekly" && <p className="mt-1 text-xs text-slate-500">Every {weekdays.find(([value]) => value === (schedule.weeklyDay ?? 1))?.[1] || "Monday"}</p>}
            {schedule.frequency === "monthly" && <p className="mt-1 text-xs text-slate-500">Every {schedule.monthlyDay === "first" ? "first day of the month" : schedule.monthlyDay === "last" ? "last day of the month" : `${schedule.monthlyDay || 1}${Number(schedule.monthlyDay) % 100 >= 11 && Number(schedule.monthlyDay) % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][Number(schedule.monthlyDay) % 10] || "th")} day of the month`}</p>}
            <p className="mt-2 text-xs text-slate-500">Last sent: {schedule.lastSentAt ? new Date(schedule.lastSentAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "No email sent yet"}</p>
            {schedule.lastError && <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">Latest error: {schedule.lastError}</p>}
            <p className="mt-2 text-xs text-slate-500">Report sections: {(schedule.reportSections || defaultSections).map((section) => reportSections.find(([value]) => value === section)?.[1]).filter(Boolean).join(", ") || "Overview"}</p>
            {schedule.historyError && <p className="mt-2 text-xs text-rose-600">{schedule.historyError}</p>}
            {schedule.deliveries && <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">{schedule.deliveries.length === 0 ? <p className="text-xs text-slate-400">No attempts recorded.</p> : schedule.deliveries.slice(0, 5).map((delivery) => <div key={delivery._id} className="flex items-start justify-between gap-3 text-xs"><span className={delivery.status === "sent" ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>{delivery.status === "sent" ? "Sent" : "Failed"}{delivery.errorMessage ? `: ${delivery.errorMessage}` : ""}</span><span className="shrink-0 text-slate-400">{new Date(delivery.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</span></div>)}</div>}
          </div>)}
        </div>
      </aside>
    </div>}

    {isFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="recipient-modal-title"><form onSubmit={create} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
      <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-4"><div><h2 id="recipient-modal-title" className="text-xl font-bold text-slate-900">{editingId ? "Edit report schedule" : "Add report recipient"}</h2><p className="mt-1 text-xs text-slate-400">Choose schedules and report sections before saving.</p></div><button type="button" onClick={() => { setIsFormOpen(false); setEditingId(""); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Close</button></div>
      <div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-bold text-slate-500">Business<select required value={form.businessId} onChange={(event) => handleBusinessChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Select business</option>{businesses.map((business) => <option key={business._id} value={business._id}>{business.name}</option>)}</select></label><label className="text-xs font-bold text-slate-500">Recipient name<input required value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-xs font-bold text-slate-500">Recipient email<input required type="email" value={form.recipientEmail} onChange={(event) => setForm({ ...form, recipientEmail: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-xs font-bold text-slate-500">Report content<select value={form.reportType} onChange={(event) => setForm({ ...form, reportType: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="overview">Business overview</option><option value="daily-analysis">Daily report analysis</option></select></label></div>
      <fieldset className="mt-5"><legend className="text-xs font-bold text-slate-500">Delivery frequency</legend><div className="mt-2 flex flex-wrap gap-2">{frequencies.map(([value, label]) => <button key={value} type="button" onClick={() => toggleFormValue("frequencies", value)} className={`rounded-xl border px-4 py-2 text-xs font-bold ${form.frequencies.includes(value) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>{label}</button>)}</div></fieldset>
      <fieldset className="mt-5"><legend className="text-xs font-bold text-slate-500">Report contents</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{reportSections.map(([value, label]) => <label key={value} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-xs text-slate-700"><input type="checkbox" checked={form.reportSections.includes(value)} onChange={() => toggleFormValue("reportSections", value)} />{label}</label>)}</div></fieldset>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{form.frequencies.map((frequency) => <label key={frequency} className="text-xs font-bold text-slate-500">{frequency[0].toUpperCase() + frequency.slice(1)} send time<input type="time" required value={form.sendTimes[frequency]} onChange={(event) => setForm({ ...form, sendTimes: { ...form.sendTimes, [frequency]: event.target.value } })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>)}<label className="text-xs font-bold text-slate-500">Timezone<select value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="Africa/Lagos">Africa/Lagos</option><option value="UTC">UTC</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option></select></label></div>
      {form.frequencies.includes("weekly") && <label className="mt-4 block text-xs font-bold text-slate-500">Weekly day<select value={form.weeklyDay} onChange={(event) => setForm({ ...form, weeklyDay: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5">{weekdays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      {form.frequencies.includes("monthly") && <label className="mt-4 block text-xs font-bold text-slate-500">Monthly day<select value={form.monthlyDay} onChange={(event) => setForm({ ...form, monthlyDay: event.target.value === "first" || event.target.value === "last" ? event.target.value : Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="first">First day of the month</option><option value="last">Last day of the month</option>{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}</option>)}</select></label>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold uppercase text-white disabled:opacity-50">{saving ? "Saving..." : "Save schedules"}</button></div>
    </form></div>}
  </section>;
};

export default AdminCommunications;