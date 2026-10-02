import { useEffect, useMemo, useState } from "react";
import { getAffiliateDashboard } from "../api/affiliates.js";

const PartnerLinkHistory = () => {
  const [data, setData] = useState({ referrals: [], affiliate: {} });
  const [query, setQuery] = useState("");
  useEffect(() => { getAffiliateDashboard().then(setData); }, []);
  const affiliate = data.affiliate || {};
  const referrals = useMemo(() => (data.referrals || []).filter((item) => `${item.businessName} ${item.ownerName} ${item.referredAt}`.toLowerCase().includes(query.toLowerCase())), [data.referrals, query]);
  const totalClicks = Number(affiliate.totalClicks || 0);
  const totalConversions = Number(affiliate.totalConversions || 0);
  const conversionRate = Number(affiliate.conversionRate || 0);

  return <section className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">Link history</p><h1 className="mt-2 text-3xl font-semibold text-white">Referral activity history</h1><p className="mt-2 text-sm text-slate-400">A searchable record of businesses registered through your partner link, plus click-through analytics.</p></div>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Clicks</p><p className="mt-3 text-3xl font-semibold text-white">{totalClicks}</p></div>
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Conversions</p><p className="mt-3 text-3xl font-semibold text-emerald-300">{totalConversions}</p></div>
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rate</p><p className="mt-3 text-3xl font-semibold text-sky-300">{conversionRate}%</p></div>
    </div>
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-4"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search referral history" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400" /></div><div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-900"><table className="min-w-full text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Business</th><th className="px-5 py-4">Owner</th><th className="px-5 py-4">Registered</th><th className="px-5 py-4">Subscription</th><th className="px-5 py-4">Outcome</th></tr></thead><tbody className="divide-y divide-white/10">{referrals.length === 0 ? <tr><td colSpan="5" className="px-5 py-8 text-slate-400">No referral activity found.</td></tr> : referrals.map((item) => <tr key={item.businessId} className="text-slate-200"><td className="px-5 py-4 font-semibold text-white">{item.businessName}<p className="text-xs text-slate-500">{item.industry}</p></td><td className="px-5 py-4">{item.ownerName}<p className="text-xs text-slate-500">{item.ownerEmail}</p></td><td className="px-5 py-4 text-slate-400">{item.referredAt}</td><td className="px-5 py-4">{item.isPro ? "Pro" : "Free"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${item.converted ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{item.converted ? "Converted" : "Registered"}</span></td></tr>)}</tbody></table></div></section>;
};
export default PartnerLinkHistory;
