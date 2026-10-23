import { useEffect, useMemo, useState } from "react";
import { FiArrowUpRight, FiFileText, FiMail, FiMessageCircle, FiSend, FiTrash2 } from "react-icons/fi";
import TenantMessageModal from "../components/TenantMessageModal.jsx";
import AdminBusinessChatInbox from "../components/AdminBusinessChatInbox.jsx";
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
  recipientName: "", recipientEmail: "", recipientPhone: "", whatsappOptInConfirmed: false, businessId: "", reportType: "overview", channel: "email",
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
  const [messageDeliveries, setMessageDeliveries] = useState([]);
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState("");
  const [historyRecipient, setHistoryRecipient] = useState(null);
  const [contactRecipients, setContactRecipients] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    const [subscriptionData, businessesData, messageData, draftData] = await Promise.all([
      request("/admin/report-subscriptions"),
      request("/admin/businesses"),
      request("/admin/communications/messages"),
      request("/admin/communications/drafts")
    ]);
    setSubscriptions(subscriptionData.subscriptions || []);
    setBusinesses(businessesData.businesses || []);
    setMessageDeliveries(messageData.deliveries || []);
    setSavedDrafts(draftData.drafts || []);
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
  const pageCount = Math.max(1, Math.ceil(filteredRecipients.length / pageSize));
  const pageRecipients = filteredRecipients.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const openContactDraft = (recipientList) => {
    setContactRecipients(recipientList.map((recipient) => {
      const businessId = recipient.business?._id || recipient.business || recipient.businessId || recipient._id;
      const business = businesses.find((item) => item._id === businessId)
        || (typeof recipient.business === "object" ? recipient.business : null)
        || recipient;
      const recipientEmail = recipient.recipientEmail || business.ownerEmail || "";
      const recipientName = recipient.recipientName || business.ownerName || "";
      return {
        ...business,
        _id: businessId || getRecipientKey(recipient),
        businessId,
        name: business.name || recipient.business?.name,
        ownerName: recipientName,
        ownerEmail: recipientEmail,
        recipientName,
        recipientEmail,
        whatsappPhone: business.whatsappPhone || business.ownerPhone || business.businessPhone,
        ownerPhone: business.ownerPhone,
        businessPhone: business.businessPhone
      };
    }));
  };

  const scrollToRecipients = () => document.getElementById("report-recipient-registry")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const sendDirectMessage = async ({ recipients, channel, subject, message, whatsappOptInConfirmed }) => {
    const response = await request("/admin/communications/messages", {
      method: "POST",
      body: JSON.stringify({
        businessIds: recipients.map((recipient) => recipient.businessId).filter(Boolean),
        channel,
        subject,
        message,
        whatsappOptInConfirmed
      })
    });
    setMessageDeliveries((current) => [...(response.deliveries || []), ...current].slice(0, 100));
    return response;
  };

  const saveCommunicationDraft = async (draft) => {
    const isUpdate = Boolean(draft._id);
    const response = await request(
      isUpdate ? `/admin/communications/drafts/${draft._id}` : "/admin/communications/drafts",
      {
        method: isUpdate ? "PATCH" : "POST",
        body: JSON.stringify(draft)
      }
    );
    setSavedDrafts((current) => [
      response.draft,
      ...current.filter((item) => item._id !== response.draft._id)
    ].slice(0, 100));
    return response.draft;
  };

  const deleteCommunicationDraft = async (draft) => {
    if (!window.confirm(`Delete the saved message "${draft.name}"?`)) return;
    try {
      await request(`/admin/communications/drafts/${draft._id}`, { method: "DELETE" });
      setSavedDrafts((current) => current.filter((item) => item._id !== draft._id));
    } catch (error) {
      alert(error.message || "Failed to delete saved message");
    }
  };

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
    setForm((current) => ({
      ...current,
      businessId,
      recipientName: business?.ownerName || "",
      recipientEmail: business?.ownerEmail || "",
      recipientPhone: business?.whatsappPhone || business?.ownerPhone || business?.businessPhone || ""
    }));
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
      recipientPhone: schedule?.recipientPhone || recipient.recipientPhone || businesses.find((item) => item._id === (recipient.business?._id || recipient.business))?.whatsappPhone || "",
      whatsappOptInConfirmed: recipient.whatsappOptInConfirmed || false,
      businessId: recipient.business?._id || recipient.business || "",
      reportType: recipient.reportType || "overview",
      channel: schedule?.channel || recipient.channel || "email",
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
    const destination = subscription.channel === "whatsapp"
      ? subscription.recipientPhone
      : subscription.channel === "both"
        ? `${subscription.recipientEmail} and ${subscription.recipientPhone}`
        : subscription.recipientEmail;
    if (!window.confirm(`Send the ${subscription.frequency} report now to ${destination}?`)) return;
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

  const enabledScheduleCount = subscriptions.filter((subscription) => subscription.status === "enabled").length;
  const activeRecipientCount = groupedRecipients.filter((recipient) => recipient.schedules.some((schedule) => schedule.status === "enabled")).length;
  const successfulDirectCount = messageDeliveries.filter((delivery) => delivery.status === "sent").length;

  return <section className="page-stack mx-auto max-w-7xl">
    <header className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
      <div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-10 lg:py-9">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Super Admin · Control center</span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Communications</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Message the right business, manage report schedules, and follow up on chats—all from one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setIsFormOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 shadow-lg transition hover:bg-emerald-50"><FiFileText /> Add report recipient</button>
          <button type="button" onClick={scrollToRecipients} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"><FiSend /> Draft a message</button>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-white/10 bg-white/[0.04] sm:grid-cols-4">
        {[
          ["Businesses", businesses.length, "Available to contact"],
          ["Active recipients", activeRecipientCount, "With live reports"],
          ["Live schedules", enabledScheduleCount, "Across all frequencies"],
          ["Messages sent", successfulDirectCount, "Recent direct messages"]
        ].map(([label, value, hint]) => <div key={label} className="border-b border-r border-white/10 px-5 py-4 last:border-r-0 sm:border-b-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <div className="mt-1 flex items-baseline gap-2"><strong className="text-2xl font-black text-white">{value}</strong><span className="hidden text-[10px] text-slate-400 sm:inline">{hint}</span></div>
        </div>)}
      </div>
    </header>

    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${emailHealth === null ? "border-slate-200 bg-white text-slate-700" : emailHealth.verified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] ${emailHealth === null ? "bg-slate-100 text-slate-600" : emailHealth.verified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          <span className={`h-2 w-2 rounded-full ${emailHealth === null ? "bg-slate-400" : emailHealth.verified ? "bg-emerald-500" : "bg-amber-500"}`} />
          {emailHealth === null ? "Checking email" : emailHealth.verified ? `${emailHealth.email?.provider === "resend-api" ? "Resend API" : "Email"} connected` : "Email needs attention"}
        </span>
        <span className="hidden text-xs text-slate-500 sm:inline">{emailHealth === null ? "Checking delivery provider…" : emailHealth.verified ? "Scheduled reports and direct messages are ready." : emailHealth.email?.lastError || "Check email provider settings on the deployed backend."}</span>
      </div>
      <a href="#report-recipient-registry" onClick={(event) => { event.preventDefault(); scrollToRecipients(); }} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline">Manage recipients <FiArrowUpRight /></a>
    </div>

    <section className="grid gap-4 lg:grid-cols-2" aria-label="Communications tools">
      <article className="group relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-7">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-sky-100/70 transition group-hover:scale-110" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-700 text-white shadow-md"><FiMessageCircle size={22} /></span><span className="rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-800">{messageDeliveries.length} recent</span></div>
          <h2 className="mt-5 text-xl font-black text-slate-900">Direct messages</h2>
          <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">Draft an email or WhatsApp message to selected business owners. Track what was sent and see delivery issues.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={scrollToRecipients} className="inline-flex items-center gap-2 rounded-xl bg-sky-800 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-sky-900"><FiMail /> Choose recipients &amp; draft <FiArrowUpRight /></button>
            <span className="text-xs font-medium text-slate-500">{businesses.length} businesses available</span>
          </div>
        </div>
      </article>
      <article className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-7">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-emerald-100/70 transition group-hover:scale-110" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md"><FiFileText size={22} /></span><span className="rounded-full border border-emerald-100 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">{enabledScheduleCount} live schedules</span></div>
          <h2 className="mt-5 text-xl font-black text-slate-900">Automated business reports</h2>
          <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">Set up daily, weekly, or monthly business reports by email, WhatsApp, or both. Review delivery history and adjust schedules anytime.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setIsFormOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-800"><FiFileText /> Add report recipient <FiArrowUpRight /></button>
            <span className="text-xs font-medium text-slate-500">{activeRecipientCount} active recipients</span>
          </div>
        </div>
      </article>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="message-activity-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div><h2 id="message-activity-title" className="text-sm font-extrabold text-slate-900">Recent direct messages</h2><p className="mt-1 text-xs text-slate-500">Email and WhatsApp sends to business owners.</p></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{messageDeliveries.length} recent</span>
      </div>
      {messageDeliveries.length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">No direct messages sent yet. Choose recipients below to draft or send one.</p> : <ul className="divide-y divide-slate-100">
        {messageDeliveries.slice(0, 4).map((delivery) => <li key={delivery._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{delivery.business?.name || "Business"} <span className="font-normal text-slate-500">· {delivery.recipientName || "Owner"}</span></p><p className="mt-0.5 truncate text-xs text-slate-500">{delivery.subject || delivery.message}</p></div>
          <div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">{delivery.channel || "email"}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${delivery.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{delivery.status}</span><span className="whitespace-nowrap text-[10px] text-slate-400">{new Date(delivery.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</span></div>
          {delivery.errorMessage && <p className="w-full text-xs text-rose-700">{delivery.errorMessage}</p>}
        </li>)}
      </ul>}
    </section>

    <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm" aria-labelledby="saved-messages-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-sky-50/70 px-5 py-4">
        <div><h2 id="saved-messages-title" className="text-sm font-extrabold text-slate-900">Saved messages</h2><p className="mt-1 text-xs text-slate-600">Reusable message text, channel, and email subject. Open any business composer to load one.</p></div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-800">{savedDrafts.length} saved</span>
      </div>
      {savedDrafts.length === 0 ? <div className="px-5 py-5 text-sm text-slate-500">No saved messages yet. Draft a message for a business and save it for future follow-ups.</div> : <ul className="divide-y divide-slate-100">
        {savedDrafts.slice(0, 6).map((draft) => <li key={draft._id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-800">{draft.name}</strong><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{draft.channel}</span></div><p className="mt-1 truncate text-xs text-slate-500">{draft.channel === "email" && draft.subject ? `${draft.subject} · ` : ""}{draft.message}</p><p className="mt-1 text-[10px] text-slate-400">Updated {new Date(draft.updatedAt).toLocaleDateString()}</p></div>
          <button type="button" onClick={() => deleteCommunicationDraft(draft)} aria-label={`Delete ${draft.name}`} className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"><FiTrash2 size={14} /></button>
        </li>)}
      </ul>}
    </section>

    <AdminBusinessChatInbox />

    <div id="report-recipient-registry" className="scroll-mt-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl">
      <div className="border-b border-slate-100 bg-slate-50/60 p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-700">Manage &amp; contact</p><h2 className="mt-1 text-xl font-black text-slate-900">Report recipients</h2><p className="mt-1 text-xs text-slate-500">Choose a business owner to draft an email or WhatsApp, or manage their automated reports.</p></div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">{filteredRecipients.length} recipients</span>
        </div>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <label className="relative block">
                <span className="sr-only">Search recipients</span>
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">⌕</span>
                <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by name, email, or business" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-emerald-400" />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusFilters.map(([value, label]) => <button key={value} type="button" onClick={() => { setView(value); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${view === value ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>{label}</button>)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><option value="status">Sort by status</option><option value="business">Sort by business</option><option value="email">Sort by email</option><option value="lastSent">Sort by last sent</option></select>
            <button type="button" onClick={() => setIsFormOpen(true)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-800"><span className="mr-1.5">+</span> Add report recipient</button>
          </div>
        </div>

        {selectedRecipients.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">{selectedRecipients.length} selected</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => applyBulkAction("enable")} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Enable</button>
            <button type="button" onClick={() => applyBulkAction("disable")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-700">Disable</button>
            <button type="button" onClick={() => applyBulkAction("delete")} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-rose-700">Delete</button>
            <button type="button" onClick={() => openContactDraft(selectedRecipients)} className="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm hover:bg-emerald-800"><FiSend className="mr-1 inline" /> Draft email / WhatsApp</button>
            <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-600">Clear selection</button>
          </div>
        </div>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={pageRecipients.length > 0 && pageRecipients.every((recipient) => selectedIds.includes(getRecipientKey(recipient)))} onChange={() => {
          const keys = pageRecipients.map((recipient) => getRecipientKey(recipient));
          const allSelected = keys.every((key) => selectedIds.includes(key));
          setSelectedIds((current) => allSelected ? current.filter((key) => !keys.includes(key)) : [...new Set([...current, ...keys])]);
        }} className="h-4 w-4 rounded border-slate-300 text-emerald-600" aria-label="Toggle all recipients" /> Select page</label>
        <p className="text-xs text-slate-500">Email and WhatsApp drafts are one click away on each business card.</p>
      </div>

      {filteredRecipients.length === 0 ? <div className="px-5 py-14 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><FiMail size={22} /></span><h3 className="mt-4 text-sm font-bold text-slate-800">No report recipients found</h3><p className="mt-1 text-xs text-slate-500">Try another search or add a recipient to start scheduling reports.</p><button type="button" onClick={() => setIsFormOpen(true)} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white">Add report recipient</button></div> : <div className="grid gap-4 bg-slate-50/70 p-4 sm:p-5 xl:grid-cols-2">
        {pageRecipients.map((recipient) => {
          const primarySchedule = recipient.schedules.find((item) => item.status === "enabled") || recipient.schedules[0];
          const isPro = recipient.business?.isPro === true || (recipient.business?.plan === "pro" && recipient.business?.subscription?.status === "active");
          const isEnabled = recipient.schedules.some((item) => item.status === "enabled") || (recipient.isAutomatic && isPro && recipient.business?.reportNotificationsEnabled !== false);
          const recipientKeyValue = getRecipientKey(recipient);
          const lastSentAt = primarySchedule?.lastSentAt;
          return <article key={recipientKeyValue} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <label className="flex min-w-0 items-start gap-3">
                <input type="checkbox" checked={selectedIds.includes(recipientKeyValue)} onChange={() => toggleSelection(recipient)} className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600" aria-label={`Select ${recipient.recipientEmail}`} />
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xs font-black text-emerald-800">{(recipient.recipientName || recipient.recipientEmail || "U").slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2"><strong className="text-sm font-extrabold text-slate-900">{recipient.recipientName || "Unnamed recipient"}</strong><span className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${isEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>{isEnabled ? "Active" : "Paused"}</span></span>
                  <span className="mt-1 block truncate text-xs text-slate-500">{recipient.recipientEmail || "No email address"}</span>
                  <span className="mt-1 block truncate text-xs font-semibold text-slate-700">{recipient.business?.name || "General business"}</span>
                </span>
              </label>
              <div className="relative shrink-0">
                <button type="button" aria-label={`More actions for ${recipient.recipientName || recipient.recipientEmail}`} onClick={() => setMenuOpenId(menuOpenId === recipientKeyValue ? "" : recipientKeyValue)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-lg text-slate-600 transition hover:bg-slate-50">⋮</button>
                {menuOpenId === recipientKeyValue && <div className="absolute right-0 top-10 z-20 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <button type="button" onClick={() => { setMenuOpenId(""); sendTest(primarySchedule); }} disabled={!primarySchedule?._id || testingId === primarySchedule?._id} className="flex w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{testingId === primarySchedule?._id ? "Sending..." : "Send test report"}</button>
                  <button type="button" onClick={() => { setMenuOpenId(""); toggle(primarySchedule); }} className="flex w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">{primarySchedule?.status === "enabled" ? "Pause delivery" : "Resume delivery"}</button>
                  <button type="button" onClick={() => { setMenuOpenId(""); openFrequency(recipient, primarySchedule?.frequency || "daily"); }} className="flex w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Edit report schedule</button>
                  <button type="button" onClick={() => { setMenuOpenId(""); removeRecipient(recipient); }} className="flex w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50">Remove recipient</button>
                </div>}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">{formatReportType(recipient.reportType)}</span>
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-800">{(recipient.channel || "email").replace("both", "Email + WhatsApp")}</span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isPro ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}`}>{isPro ? "Pro" : "Free"}</span>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Report frequency</p><p className="text-[10px] text-slate-500">{primarySchedule?.sendTime || "18:00"} · {primarySchedule?.timezone || "Africa/Lagos"}</p></div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {frequencies.map(([value, label]) => {
                  const schedule = recipient.schedules.find((item) => item.frequency === value);
                  return <label key={value} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input type="checkbox" checked={schedule?.status === "enabled" || (!schedule && recipient.isAutomatic && isPro && value === "daily")} onChange={(event) => setFrequencyEnabled(recipient, value, event.target.checked)} disabled={saving} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
                    {label}
                  </label>;
                })}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2.5 text-[11px]"><span className="text-slate-500">Last sent: <strong className="text-slate-700">{lastSentAt ? new Date(lastSentAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Never"}</strong></span><button type="button" onClick={() => openHistory(recipient)} className="font-extrabold text-emerald-800 hover:underline">View history</button></div>
            </div>

            <button type="button" onClick={() => openContactDraft([recipient])} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"><FiSend size={16} /> Draft Email / WhatsApp</button>
          </article>;
        })}
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
        <label className="flex items-center gap-2">Rows per page
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
            {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <span>{filteredRecipients.length === 0 ? "0 recipients" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredRecipients.length)} of ${filteredRecipients.length} recipients`}</span>
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold disabled:opacity-40">Previous</button>
          <span>Page {Math.min(page, pageCount)} of {pageCount}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>

    {contactRecipients && <TenantMessageModal recipients={contactRecipients} onClose={() => setContactRecipients(null)} onSendDirect={sendDirectMessage} onSaveDraft={saveCommunicationDraft} savedDrafts={savedDrafts} title={contactRecipients.length > 1 ? `Message ${contactRecipients.length} selected tenants` : `Message ${contactRecipients[0]?.name || contactRecipients[0]?.ownerName || "tenant"}`} />}
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
            <p className="mt-2 text-xs text-slate-500">Last sent: {schedule.lastSentAt ? new Date(schedule.lastSentAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "No report sent yet"} · {(schedule.channel || "email").replace("both", "Email + WhatsApp")}</p>
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
      <div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-bold text-slate-500">Business<select required value={form.businessId} onChange={(event) => handleBusinessChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Select business</option>{businesses.map((business) => <option key={business._id} value={business._id}>{business.name}</option>)}</select></label><label className="text-xs font-bold text-slate-500">Recipient name<input required value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-xs font-bold text-slate-500">Delivery channel<select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="both">Email and WhatsApp</option></select></label>{["email", "both"].includes(form.channel) && <label className="text-xs font-bold text-slate-500">Recipient email<input required type="email" value={form.recipientEmail} onChange={(event) => setForm({ ...form, recipientEmail: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>}{["whatsapp", "both"].includes(form.channel) && <><label className="text-xs font-bold text-slate-500">WhatsApp number<input required value={form.recipientPhone} onChange={(event) => setForm({ ...form, recipientPhone: event.target.value })} placeholder="e.g. 2348012345678" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-900 md:col-span-2"><input type="checkbox" required checked={form.whatsappOptInConfirmed} onChange={(event) => setForm({ ...form, whatsappOptInConfirmed: event.target.checked })} className="mt-0.5 h-4 w-4 rounded border-amber-300 text-emerald-600" />I confirm this recipient has explicitly opted in to receive scheduled business reports on WhatsApp.</label></>}<label className="text-xs font-bold text-slate-500">Report content<select value={form.reportType} onChange={(event) => setForm({ ...form, reportType: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="overview">Business overview</option><option value="daily-analysis">Daily report analysis</option></select></label></div>
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