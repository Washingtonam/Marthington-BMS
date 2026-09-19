import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAffiliateDashboard } from "../api/affiliates.js";

const currency = (value) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(value || 0));

const PartnerDashboardHome = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getAffiliateDashboard().then(setData).catch((err) => setError(err.message || "Unable to load partner dashboard"));
  }, []);

  const affiliate = data?.affiliate || {};
  const code = affiliate.affiliateCode || "";
  const link = `${import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin}/register?ref=${code}`;
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const conversionRate = Number(affiliate.conversionRate || 0);
  const cards = [
    ["Available balance", currency(affiliate.available ?? affiliate.walletBalance), "text-emerald-300"],
    ["Lifetime earnings", currency(affiliate.earned ?? affiliate.totalEarned), "text-sky-300"],
    ["Registered referrals", affiliate.totalReferrals || 0, "text-white"],
    ["Clicks tracked", affiliate.totalClicks || 0, "text-violet-300"],
    ["Pending withdrawal", currency(affiliate.pending), "text-amber-300"],
    ["Conversion rate", `${conversionRate}%`, "text-cyan-300"]
  ];

  return <section className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">Overview</p><h1 className="mt-2 text-3xl font-semibold text-white">Partner dashboard</h1><p className="mt-2 text-sm text-slate-400">Your referrals, earnings, and payout activity in one place.</p></div>
      <div className="text-sm text-slate-400">Current rate <span className="font-semibold text-emerald-300">{affiliate.currentRate || 0}%</span></div>
    </div>
    {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, color]) => <div key={label} className="rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-xl"><p className="text-sm text-slate-400">{label}</p><p className={`mt-3 text-2xl font-semibold ${color}`}>{value}</p></div>)}
    </div>
    <section className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">Referral link</p><h2 className="mt-2 text-xl font-semibold text-white">Share your partner link</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={copy} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950">{copied ? "Copied" : "Copy link"}</button><a className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white" href={`https://wa.me/?text=${encodeURIComponent(`Join Marthington BMS: ${link}`)}`} target="_blank" rel="noreferrer">WhatsApp</a><a className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white" href={`mailto:?subject=Join Marthington BMS&body=${encodeURIComponent(link)}`}>Email</a></div></div>
      <div className="mt-4 break-all rounded-2xl border border-white/10 bg-slate-950/60 p-4 font-mono text-sm text-slate-200">{link}</div>
    </section>
    <section className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Commission policy</p><h2 className="mt-2 text-xl font-semibold text-white">Rate applies to future qualifying payments</h2></div><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">{affiliate.currentRate || 0}% current rate</span></div><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Each earning keeps the rate used when it was credited. Review exact rates and payment amounts in your earnings history.</p></section>
    <div className="grid gap-4 md:grid-cols-3"><Link to="/partners/conversions" className="rounded-2xl border border-white/10 bg-slate-900 p-5 hover:border-emerald-400/40"><p className="text-sm text-slate-400">Live conversions</p><p className="mt-2 font-semibold text-white">Review referred businesses →</p></Link><Link to="/partners/withdrawals" className="rounded-2xl border border-white/10 bg-slate-900 p-5 hover:border-emerald-400/40"><p className="text-sm text-slate-400">Withdrawals</p><p className="mt-2 font-semibold text-white">Track payout status →</p></Link><Link to="/partners/link-history" className="rounded-2xl border border-white/10 bg-slate-900 p-5 hover:border-emerald-400/40"><p className="text-sm text-slate-400">Link history</p><p className="mt-2 font-semibold text-white">Review referral activity →</p></Link></div>
  </section>;
};

export default PartnerDashboardHome;
