import { useEffect, useState } from "react";
import request from "../api/client.js";

const AdminAffiliateNetwork = () => {
  const [data, setData] = useState({ affiliates: [], globalRate: 20, stats: {} });
  const [rate, setRate] = useState(20);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  const load = async () => {
    try { const response = await request("/admin/affiliates"); setData(response); setRate(response.globalRate || 20); } catch (err) { alert(err.message || "Failed to load affiliate network"); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const updateRate = async () => {
    if (!window.confirm("Are you sure you want to change the global affiliate commission rate?")) return;
    try { setActionLoading("rate"); await request("/admin/affiliate-settings", { method: "PUT", body: JSON.stringify({ globalAffiliateRate: Number(rate) }) }); alert("Commission rate updated."); } catch (err) { alert(err.message || "Failed to update rate"); } finally { setActionLoading(""); }
  };
  const settle = async (affiliate) => {
    if (!window.confirm(`Are you sure you want to settle ${affiliate.name}'s balance?`)) return;
    try { setActionLoading(affiliate._id); await request(`/admin/affiliates/${affiliate._id}/payout`, { method: "POST" }); await load(); } catch (err) { alert(err.message || "Failed to settle balance"); } finally { setActionLoading(""); }
  };

  return <section className="page-stack max-w-7xl mx-auto"><div className="page-heading"><div><span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin</span><h1 className="mt-2 text-4xl font-extrabold text-slate-900">Affiliate Network</h1></div><p className="max-w-2xl text-sm text-slate-500">Manage partners, commission configuration, wallets, and settlements.</p></div><div className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Global Commission Rate</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{data.stats?.totalPartners || 0} partners</p></div><div className="flex items-end gap-3"><label className="text-xs font-bold text-slate-500">Rate (%)<input type="number" min="0" max="100" value={rate} onChange={(event) => setRate(event.target.value)} className="mt-2 block w-24 rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900" /></label><button type="button" disabled={actionLoading === "rate"} onClick={updateRate} className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold uppercase text-white disabled:opacity-50">Update Rate</button></div></div><div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">Partner</th><th className="px-5 py-4">Code</th><th className="px-5 py-4">Balance</th><th className="px-5 py-4">Lifetime Earned</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100 text-xs">{loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Loading partners...</td></tr> : data.affiliates.map((affiliate) => <tr key={affiliate._id}><td className="px-5 py-4"><strong>{affiliate.name}</strong><p className="text-slate-400">{affiliate.email}</p></td><td className="px-5 py-4 font-mono">{affiliate.affiliateCode || "-"}</td><td className="px-5 py-4 font-bold text-amber-600">₦{Number(affiliate.walletBalance || 0).toLocaleString()}</td><td className="px-5 py-4 font-bold text-emerald-600">₦{Number(affiliate.totalEarned || 0).toLocaleString()}</td><td className="px-5 py-4 text-right"><button type="button" disabled={actionLoading === affiliate._id || !(affiliate.walletBalance > 0)} onClick={() => settle(affiliate)} className="rounded-lg border border-emerald-200 px-3 py-2 font-bold text-emerald-700 disabled:opacity-40">{actionLoading === affiliate._id ? "Settling..." : "Settle Balance"}</button></td></tr>)}</tbody></table></div></section>;
};

export default AdminAffiliateNetwork;
