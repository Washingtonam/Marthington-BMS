import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import request from "../api/client.js";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [wildThoughts, setWildThoughts] = useState([]);
  const [wildThoughtTotal, setWildThoughtTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [thoughtsLoading, setThoughtsLoading] = useState(true);
  const [thoughtsError, setThoughtsError] = useState("");

  useEffect(() => {
    request("/admin/overview")
      .then((data) => setStats(data.stats || {}))
      .catch((err) => alert(err.message || "Failed to load admin overview"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    request("/admin/wild-thoughts?limit=3")
      .then((data) => {
        setWildThoughts(data.thoughts || []);
        setWildThoughtTotal(data.total || 0);
      })
      .catch((err) => setThoughtsError(err.message || "Could not load Wild Thoughts"))
      .finally(() => setThoughtsLoading(false));
  }, []);

  const affiliateSummary = stats?.affiliateSummary || {};
  const cards = [
    ["Shop management", "Open", "/admin/shop", "Manage shop products, images, listings, and orders"],
    ["Businesses", stats?.totalBusinesses || 0, "/admin/tenants", "Manage workspaces and access"],
    ["Registered users", stats?.totalUsers || 0, "/admin/tenants", "Review the tenant directory"],
    ["Active subscriptions", stats?.activeSubscriptions || 0, "/admin/tenants", "Monitor plan activity"],
    ["Communications", "Open", "/admin/communications", "Manage scheduled reports"],
    ["Campaigns", "Open", "/admin/campaigns", "Draft and schedule outreach"],
    ["Wild Thoughts", thoughtsLoading ? "..." : wildThoughtTotal, "/admin/wild-thoughts", "Capture, organize, and update ideas across your ventures"],
    ["Affiliate partners", affiliateSummary.totalPartners || 0, "/admin/affiliate-network", "Manage partners and settlements"],
    ["Affiliate balance", `₦${Number(affiliateSummary.availableBalance || 0).toLocaleString()}`, "/admin/affiliate-network", "Available partner wallet balance"],
    ["Pending payouts", `₦${Number(affiliateSummary.pendingPayouts || 0).toLocaleString()}`, "/admin/payouts", "Withdrawal requests awaiting settlement"]
  ];

  return (
    <section className="page-stack mx-auto max-w-7xl">
      <div className="page-heading">
        <div><span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin</span><h1 className="mt-2 text-4xl font-extrabold text-slate-900">Control Center</h1></div>
        <p className="max-w-2xl text-sm text-slate-500">A high-level view of platform health and direct access to each administrative domain.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value, href, description]) => (
          <Link key={label} to={href} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl transition hover:-translate-y-0.5 hover:border-emerald-300">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{label}</p>
            <p className="mt-4 text-3xl font-extrabold text-slate-900">{label === "Wild Thoughts" ? value : loading ? "..." : typeof value === "number" ? value.toLocaleString() : value}</p>
            <p className="mt-3 text-xs font-medium text-slate-500">{description}</p>
            <span className="mt-6 inline-block text-xs font-bold uppercase tracking-wider text-emerald-600">Open section</span>
          </Link>
        ))}
      </div>

      <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">Idea capture</p>
            <h2 className="mt-2 text-xl font-extrabold text-slate-900">Wild Thoughts</h2>
            <p className="mt-1 text-sm text-slate-600">Your venture ideas, ready to revisit and update.</p>
          </div>
          <Link to="/admin/wild-thoughts" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Capture or update a thought</Link>
        </div>
        {thoughtsError ? <p role="alert" className="mt-4 text-sm text-rose-700">{thoughtsError}</p> : thoughtsLoading ? <p role="status" className="mt-4 text-sm text-slate-500">Loading your latest thoughts…</p> : wildThoughts.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-white/80 p-4 text-sm text-slate-500">No thoughts captured yet. Add your first idea to start building your venture library.</p> : (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {wildThoughts.map((thought) => (
              <Link key={thought._id} to="/admin/wild-thoughts" className="rounded-2xl border border-emerald-100 bg-white p-4 transition hover:border-emerald-300">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">{thought.venture}</p>
                <p className="mt-1 font-bold text-slate-900">{thought.title}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{thought.thought}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Affiliate settlement snapshot</p><h2 className="mt-2 text-xl font-bold text-slate-900">Rate and money movement</h2></div><Link to="/admin/affiliate-network" className="text-sm font-bold text-emerald-600">Open affiliate operations</Link></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div><p className="text-sm text-slate-500">Current rate</p><p className="mt-1 text-2xl font-bold text-slate-900">{loading ? "..." : `${affiliateSummary.currentRate || 0}%`}</p></div>
          <div><p className="text-sm text-slate-500">Total earned</p><p className="mt-1 text-2xl font-bold text-slate-900">{loading ? "..." : `₦${Number(affiliateSummary.totalEarned || 0).toLocaleString()}`}</p></div>
          <div><p className="text-sm text-slate-500">Paid out</p><p className="mt-1 text-2xl font-bold text-slate-900">{loading ? "..." : `₦${Number(affiliateSummary.paidPayouts || 0).toLocaleString()}`}</p></div>
        </div>
      </div>
    </section>
  );
};

export default AdminDashboard;
