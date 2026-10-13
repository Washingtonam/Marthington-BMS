import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import request from "../api/client.js";

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

const getExpiryLabel = (value, status) => {
  const days = daysUntil(value);
  if (status === "expired" || (days !== null && days < 0)) return "Expired";
  if (days === null) return "No expiry date";
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
};

const SubscriptionMetric = ({ label, value, detail, tone = "slate" }) => {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900"
  };

  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-65">{label}</p>
      <p className="mt-3 text-3xl font-extrabold">{value.toLocaleString()}</p>
      <p className="mt-2 text-xs opacity-70">{detail}</p>
    </div>
  );
};

const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [planFilter, search, statusFilter, subscriptions]);

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
      <div className="page-heading">
        <div>
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin · Finance</span>
          <h1 className="mt-2 text-4xl font-extrabold text-slate-900">Subscriptions</h1>
        </div>
        <div className="flex max-w-2xl items-center gap-4">
          <p className="text-sm text-slate-500">Monitor tenant plans, billing cycles, and upcoming renewals. Update plan state directly from the list.</p>
          <button
            type="button"
            onClick={loadSubscriptions}
            disabled={loading}
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SubscriptionMetric label="All tenants" value={stats.total} detail="Subscriptions on record" />
        <SubscriptionMetric label="Active Pro" value={stats.active} detail="Currently active plans" tone="emerald" />
        <SubscriptionMetric label="Expiring in 7 days" value={stats.expiringIn7Days} detail="Renewal attention needed" tone="rose" />
        <SubscriptionMetric label="Expiring in 30 days" value={stats.expiringIn30Days} detail="Upcoming active renewals" tone="amber" />
        <SubscriptionMetric label="Trials / expired" value={stats.trial + stats.expired} detail={`${stats.trial} on trial · ${stats.expired} expired`} />
      </div>

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

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
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
