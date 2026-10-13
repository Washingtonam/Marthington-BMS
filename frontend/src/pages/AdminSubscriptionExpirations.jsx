import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import request from "../api/client.js";
import SubscriptionEmailComposer from "../components/SubscriptionEmailComposer.jsx";

const formatDate = (value) => new Date(value).toLocaleString(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

const formatRemaining = (expiresAt, now) => {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
};

const AdminSubscriptionExpirations = () => {
  const { days: daysParam } = useParams();
  const days = Number(daysParam);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const validRange = days === 7 || days === 30;

  useEffect(() => {
    let active = true;
    request("/admin/subscriptions")
      .then((data) => {
        if (active) setSubscriptions(data.subscriptions || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Could not load upcoming subscription expirations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const expiringSubscriptions = useMemo(() => subscriptions
    .filter((item) => {
      const subscription = item.subscription || {};
      const expiry = subscription.expiresAt ? new Date(subscription.expiresAt).getTime() : null;
      return subscription.plan === "pro"
        && subscription.status === "active"
        && expiry !== null
        && expiry >= now
        && expiry <= now + days * 24 * 60 * 60 * 1000;
    })
    .sort((left, right) => new Date(left.subscription.expiresAt) - new Date(right.subscription.expiresAt)),
  [days, now, subscriptions]);

  if (!validRange) {
    return (
      <section className="mx-auto max-w-5xl rounded-3xl border border-amber-200 bg-amber-50 p-8">
        <h1 className="text-2xl font-bold text-slate-900">Invalid renewal window</h1>
        <p className="mt-2 text-sm text-slate-600">Choose a 7-day or 30-day subscription expiry list.</p>
        <Link to="/admin/subscriptions" className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Back to subscriptions</Link>
      </section>
    );
  }

  return (
    <section className="page-stack mx-auto max-w-7xl">
      <Link to="/admin/subscriptions" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-emerald-700">
        <span aria-hidden="true">←</span> Back to subscriptions
      </Link>

      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">Renewal watchlist</span>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Expiring in {days} days</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">Active Pro subscriptions reaching their expiry date within the next {days} days.</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-center backdrop-blur">
            <p className="text-4xl font-black tabular-nums">{loading ? "—" : expiringSubscriptions.length.toLocaleString()}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/75">tenants to review</p>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <SubscriptionEmailComposer
        subscriptions={expiringSubscriptions}
        initialAudience={`subscription_expiring_${days}`}
      />

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Tenants with upcoming renewals</h2>
            <p className="mt-1 text-xs text-slate-500">Select a business to open its full admin profile.</p>
          </div>
          {!loading && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">{expiringSubscriptions.length} matching</span>}
        </div>

        {loading ? (
          <p className="px-6 py-14 text-center text-sm text-slate-500">Loading upcoming expirations...</p>
        ) : expiringSubscriptions.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span aria-hidden="true" className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">✓</span>
            <p className="mt-4 font-bold text-slate-900">You’re all clear</p>
            <p className="mt-1 text-sm text-slate-500">No active Pro subscriptions expire within the next {days} days.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {expiringSubscriptions.map((item) => (
              <article key={item._id} className="flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <Link to={`/admin/business/${item._id}`} className="text-base font-extrabold text-slate-900 transition hover:text-emerald-700">{item.name}</Link>
                  <p className="mt-1 truncate text-sm text-slate-500">{item.ownerName || "Owner"}{item.ownerEmail ? ` · ${item.ownerEmail}` : ""}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 capitalize text-emerald-800">{item.subscription.billingCycle || "Pro plan"}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize text-slate-600">{item.industryType || "retail"}</span>
                    {item.subscription.tier && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{item.subscription.tier}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-5 rounded-2xl bg-amber-50 px-4 py-3 sm:min-w-64">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Expires</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{formatDate(item.subscription.expiresAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-black tabular-nums text-amber-800">{formatRemaining(item.subscription.expiresAt, now)}</p>
                    <Link to={`/admin/business/${item._id}`} className="mt-1 inline-block text-xs font-bold text-slate-600 hover:text-emerald-700">View business →</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminSubscriptionExpirations;
