import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import request from "../api/client.js";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request("/admin/overview")
      .then((data) => setStats(data.stats || {}))
      .catch((err) => alert(err.message || "Failed to load admin overview"))
      .finally(() => setLoading(false));
  }, []);

  const affiliateSummary = stats?.affiliateSummary || {};
  const cards = [
    ["Businesses", stats?.totalBusinesses || 0, "/admin/tenants", "Manage workspaces and access"],
    ["Registered users", stats?.totalUsers || 0, "/admin/tenants", "Review the tenant directory"],
    ["Active subscriptions", stats?.activeSubscriptions || 0, "/admin/tenants", "Monitor plan activity"],
    ["Communications", "Open", "/admin/communications", "Manage scheduled reports"],
    ["Campaigns", "Open", "/admin/campaigns", "Draft and schedule outreach"],
    ["Affiliate partners", affiliateSummary.totalPartners || 0, "/admin/affiliate-network", "Manage partners and settlements"],
    ["Affiliate balance", `₦${Number(affiliateSummary.availableBalance || 0).toLocaleString()}`, "/admin/affiliate-network", "Available partner wallet balance"],
    ["Pending payouts", `₦${Number(affiliateSummary.pendingPayouts || 0).toLocaleString()}`, "/admin/payouts", "Withdrawal requests awaiting settlement"]
  ];

  return <section className="page-stack max-w-7xl mx-auto"><div className="page-heading"><div><span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin</span><h1 className="mt-2 text-4xl font-extrabold text-slate-900">Control Center</h1></div><p className="max-w-2xl text-sm text-slate-500">A high-level view of platform health and direct access to each administrative domain.</p></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value, href, description]) => <Link key={label} to={href} className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80 transition hover:-translate-y-0.5 hover:border-emerald-300"><p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{label}</p><p className="mt-4 text-3xl font-extrabold text-slate-900">{loading ? "..." : typeof value === "number" ? value.toLocaleString() : value}</p><p className="mt-3 text-xs font-medium text-slate-500">{description}</p><span className="mt-6 inline-block text-xs font-bold uppercase tracking-wider text-emerald-600">Open section</span></Link>)}</div><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Affiliate settlement snapshot</p><h2 className="mt-2 text-xl font-bold text-slate-900">Rate and money movement</h2></div><Link to="/admin/affiliate-network" className="text-sm font-bold text-emerald-600">Open affiliate operations</Link></div><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><p className="text-sm text-slate-500">Current rate</p><p className="mt-1 text-2xl font-bold text-slate-900">{loading ? "..." : `${affiliateSummary.currentRate || 0}%`}</p></div><div><p className="text-sm text-slate-500">Total earned</p><p className="mt-1 text-2xl font-bold text-slate-900">{loading ? "..." : `₦${Number(affiliateSummary.totalEarned || 0).toLocaleString()}`}</p></div><div><p className="text-sm text-slate-500">Paid out</p><p className="mt-1 text-2xl font-bold text-slate-900">{loading ? "..." : `₦${Number(affiliateSummary.paidPayouts || 0).toLocaleString()}`}</p></div></div></div></section>;
};

export default AdminDashboard;
