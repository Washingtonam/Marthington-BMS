import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import request from "../api/client.js";
import SubscriptionEmailComposer from "../components/SubscriptionEmailComposer.jsx";

const EMPTY_STATS = {
  total: 0,
  active: 0,
  trial: 0,
  expired: 0,
  expiringIn7Days: 0,
  expiringIn30Days: 0
};

const formatDate = (value) => value
  ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  : "Not scheduled";

const daysUntil = (value) => {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

const formatCountdown = (value, now) => {
  const remaining = Math.max(0, new Date(value).getTime() - now);
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
  return { days, hours, minutes, seconds };
};

const getExpiryLabel = (value, status) => {
  const days = daysUntil(value);
  if (status === "expired" || (days !== null && days < 0)) return "Expired";
  if (days === null) return "No expiry date";
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
};

const SubscriptionMetric = ({ label, value, detail, tone = "slate", href, onClick }) => {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900"
  };

  const card = (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-65">{label}</p>
      <p className="mt-3 text-3xl font-extrabold">{Number(value || 0).toLocaleString()}</p>
      <p className="mt-2 text-xs opacity-70">{detail}</p>
      {(href || onClick) && <p className="mt-4 text-xs font-bold text-emerald-700">View tenants <span aria-hidden="true">→</span></p>}
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} aria-label={`${label}: ${Number(value || 0)} tenants. View list and email`} className={`group text-left ${tones[tone]} rounded-2xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500`}>
      {card}
    </button>
  ) : href ? (
    <Link to={href} aria-label={`${label}: ${Number(value || 0)} tenants. View list`} className={`group rounded-2xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${tones[tone]}`}>
      {card}
    </Link>
  ) : (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>{card}</div>
  );
};

const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [emailAudience, setEmailAudience] = useState("subscription_all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [clock, setClock] = useState(Date.now());

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request("/admin/subscriptions");
      setSubscriptions(data.subscriptions || []);
      setStats({ ...EMPTY_STATS, ...data.stats });
      setDrafts({});
    } catch (loadError) {
      setError(loadError.message || "Could not load subscriptions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nextExpiry = useMemo(() => subscriptions
    .filter((item) => item.subscription?.plan === "pro"
      && item.subscription?.status === "active"
      && item.subscription?.expiresAt
      && new Date(item.subscription.expiresAt).getTime() > clock)
    .sort((left, right) => new Date(left.subscription.expiresAt) - new Date(right.subscription.expiresAt))[0] || null,
  [clock, subscriptions]);
  const countdown = nextExpiry ? formatCountdown(nextExpiry.subscription.expiresAt, clock) : null;

  const visibleSubscriptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return subscriptions.filter((item) => {
      const subscription = item.subscription || {};
      const matchesSearch = !normalizedSearch || [
        item.name,
        item.ownerName,
        item.ownerEmail,
        item.industryType
      ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === "all" || subscription.status === statusFilter;
      const matchesPlan = planFilter === "all" || subscription.plan === planFilter;
      const expiry = subscription.expiresAt ? new Date(subscription.expiresAt).getTime() : null;
      const matchesQuickFilter = quickFilter === "all"
        || (quickFilter === "active_pro" && subscription.plan === "pro" && subscription.status === "active")
        || (quickFilter === "trial" && subscription.status === "trial")
        || (quickFilter === "expired" && subscription.status === "expired")
        || (quickFilter === "expiring_7" && subscription.plan === "pro" && subscription.status === "active" && expiry >= clock && expiry <= clock + 7 * 24 * 60 * 60 * 1000)
        || (quickFilter === "expiring_30" && subscription.plan === "pro" && subscription.status === "active" && expiry >= clock && expiry <= clock + 30 * 24 * 60 * 60 * 1000);
      return matchesSearch && matchesStatus && matchesPlan && matchesQuickFilter;
    });
  }, [clock, planFilter, quickFilter, search, statusFilter, subscriptions]);

  const selectAudience = (audienceType, filter) => {
    setEmailAudience(audienceType);
    setQuickFilter(filter);
    setPlanFilter("all");
    setStatusFilter("all");
    document.getElementById("subscription-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const editDraft = (item, key, value) => {
    const current = drafts[item._id] || {
      plan: item.subscription?.plan || "free",
      status: item.subscription?.status || "trial",
      billingCycle: item.subscription?.billingCycle || "monthly"
    };
    setDrafts((existing) => ({ ...existing, [item._id]: { ...current, [key]: value } }));
    setSuccess("");
  };

  const saveSubscription = async (item) => {
    const draft = drafts[item._id];
    if (!draft) return;

    setSavingId(item._id);
    setError("");
    setSuccess("");
    try {
      await request(`/admin/business/${item._id}/subscription`, {
        method: "PUT",
        body: JSON.stringify({
          plan: draft.plan,
          billingCycle: draft.plan === "pro" ? draft.billingCycle : null,
          status: draft.status
        })
      });
      setSuccess(`Subscription for ${item.name} was updated.`);
      await loadSubscriptions();
    } catch (saveError) {
      setError(saveError.message || `Could not update ${item.name}'s subscription.`);
    } finally {
      setSavingId("");
    }
  };

  return (
    <section className="page-stack mx-auto max-w-7xl">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-1/3 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Super Admin · Finance
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Subscriptions</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">A live view of tenant plans, renewal dates, and billing health. Keep every workspace on track.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/admin/tenants" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">Tenant directory</Link>
            <button
              type="button"
              onClick={loadSubscriptions}
              disabled={loading}
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow transition hover:bg-emerald-50 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </div>
        <div className="relative mt-8 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Portfolio</p><p className="mt-1 text-xl font-bold">{stats.total.toLocaleString()} <span className="text-sm font-medium text-slate-400">tenants</span></p></div>
          <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Renewal watch</p><p className="mt-1 text-xl font-bold">{stats.expiringIn30Days.toLocaleString()} <span className="text-sm font-medium text-slate-400">due this month</span></p></div>
          <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active plans</p><p className="mt-1 text-xl font-bold">{stats.active.toLocaleString()} <span className="text-sm font-medium text-slate-400">Pro workspaces</span></p></div>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Next renewal</p>
              <h2 className="mt-2 text-xl font-extrabold text-slate-900">{nextExpiry ? nextExpiry.name : "No upcoming renewals"}</h2>
              {nextExpiry && <p className="mt-1 text-sm text-slate-500">{nextExpiry.ownerEmail || "Tenant"} · {formatDate(nextExpiry.subscription.expiresAt)}</p>}
            </div>
            <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{nextExpiry?.subscription.billingCycle || "—"}</span>
          </div>
          {countdown ? (
            <div className="mt-5 flex flex-wrap gap-2" aria-label="Countdown to next renewal">
              {[["Days", countdown.days], ["Hours", countdown.hours], ["Minutes", countdown.minutes], ["Seconds", countdown.seconds]].map(([unit, value]) => (
                <div key={unit} className="min-w-[68px] rounded-xl bg-slate-950 px-3 py-3 text-center text-white">
                  <p className="text-2xl font-black tabular-nums">{String(value).padStart(2, "0")}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">{unit}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">When an active plan has an expiry date, the live countdown will appear here.</p>}
        </div>
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Renewal planning</p>
            <h2 className="mt-2 text-xl font-extrabold text-slate-900">Stay ahead of expirations</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Open the upcoming lists to review each tenant, reach out to owners, and see their full business profile.</p>
          </div>
          <p className="mt-5 text-xs font-semibold text-emerald-800">Counts and countdown refresh whenever the subscriptions are reloaded.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <SubscriptionMetric label="All tenants" value={stats.total} detail="View all businesses and owners" onClick={() => selectAudience("subscription_all", "all")} />
        <SubscriptionMetric label="Active Pro" value={stats.active} detail="Review and contact active plans" tone="emerald" onClick={() => selectAudience("subscription_active_pro", "active_pro")} />
        <SubscriptionMetric label="Expiring in 7 days" value={stats.expiringIn7Days} detail="Open tenants needing attention" tone="rose" href="/admin/subscriptions/expiring/7" />
        <SubscriptionMetric label="Expiring in 30 days" value={stats.expiringIn30Days} detail="Open upcoming renewal list" tone="amber" href="/admin/subscriptions/expiring/30" />
        <SubscriptionMetric label="Trials" value={stats.trial} detail="Help trial tenants choose a plan" tone="amber" onClick={() => selectAudience("subscription_trial", "trial")} />
        <SubscriptionMetric label="Expired" value={stats.expired} detail="Contact owners about reactivation" tone="rose" onClick={() => selectAudience("subscription_expired", "expired")} />
      </div>

      <SubscriptionEmailComposer subscriptions={subscriptions} initialAudience={emailAudience} />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
        <input
          type="search"
          aria-label="Search tenants"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tenant, owner, or industry"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />
        <select aria-label="Filter by plan" value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
          <option value="all">All plans</option>
          <option value="pro">Pro</option>
          <option value="free">Free</option>
        </select>
        <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
          <option value="all">All states</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div id="subscription-list" className="scroll-mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1150px] w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-5 py-4">Tenant / owner</th>
              <th className="px-5 py-4">Plan</th>
              <th className="px-5 py-4">State</th>
              <th className="px-5 py-4">Billing cycle</th>
              <th className="px-5 py-4">Started</th>
              <th className="px-5 py-4">Next expiry</th>
              <th className="px-5 py-4">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Loading tenant subscriptions...</td></tr>
            ) : visibleSubscriptions.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">{subscriptions.length ? "No subscriptions match these filters." : "No tenant subscriptions found."}</td></tr>
            ) : visibleSubscriptions.map((item) => {
              const subscription = item.subscription || {};
              const draft = drafts[item._id] || {
                plan: subscription.plan || "free",
                status: subscription.status || "trial",
                billingCycle: subscription.billingCycle || "monthly"
              };
              const changed = draft.plan !== (subscription.plan || "free")
                || draft.status !== (subscription.status || "trial")
                || (draft.plan === "pro" && draft.billingCycle !== (subscription.billingCycle || "monthly"));
              const expiryLabel = getExpiryLabel(subscription.expiresAt, subscription.status);
              const expiring = expiryLabel.includes("day") || expiryLabel === "Expires today";

              return (
                <tr key={item._id} className="align-top">
                  <td className="px-5 py-4">
                    <Link to={`/admin/business/${item._id}`} className="font-bold text-slate-900 hover:text-emerald-700">{item.name}</Link>
                    <p className="mt-1 text-xs text-slate-500">{item.ownerName || item.ownerEmail || "No owner details"}{item.ownerName && item.ownerEmail ? ` · ${item.ownerEmail}` : ""}</p>
                    <p className="mt-1 text-[11px] capitalize text-slate-400">{item.industryType || "retail"} · tenant {item.businessStatus || "active"}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${subscription.plan === "pro" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{subscription.plan === "pro" ? (subscription.tier || "Pro") : "Free"}</span>
                  </td>
                  <td className="px-5 py-4 capitalize text-slate-700">{subscription.status || "trial"}</td>
                  <td className="px-5 py-4 capitalize text-slate-600">{subscription.billingCycle || "—"}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-slate-600">{formatDate(subscription.startedAt)}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className={expiring ? "font-bold text-amber-700" : "text-slate-700"}>{formatDate(subscription.expiresAt)}</p>
                    <p className={`mt-1 text-xs ${expiring ? "text-amber-700" : subscription.status === "expired" ? "text-rose-600" : "text-slate-400"}`}>{expiryLabel}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <select aria-label={`Plan for ${item.name}`} value={draft.plan} onChange={(event) => {
                        const plan = event.target.value;
                        const nextStatus = plan === "free" ? "expired" : "active";
                        setDrafts((current) => ({
                          ...current,
                          [item._id]: { ...draft, plan, status: nextStatus }
                        }));
                        setSuccess("");
                      }} className="rounded-lg border border-slate-200 px-2 py-2 text-xs">
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                      </select>
                      {draft.plan === "pro" && (
                        <select aria-label={`Billing cycle for ${item.name}`} value={draft.billingCycle} onChange={(event) => editDraft(item, "billingCycle", event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs">
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      )}
                      <select aria-label={`State for ${item.name}`} value={draft.status} onChange={(event) => editDraft(item, "status", event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs">
                        <option value="active" disabled={draft.plan === "free"}>Active</option>
                        <option value="trial">Trial</option>
                        <option value="expired">Expired</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => saveSubscription(item)}
                        disabled={!changed || savingId === item._id || !!savingId}
                        className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {savingId === item._id ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminSubscriptions;
