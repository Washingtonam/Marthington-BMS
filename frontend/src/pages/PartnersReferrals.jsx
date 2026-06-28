import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getAffiliateDashboard } from "../api/affiliates.js";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(value || 0);

const statusClasses = {
  Pro: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20",
  Free: "bg-slate-500/15 text-slate-300"
};

const PartnersReferrals = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    affiliate: {
      affiliateCode: user?.affiliateCode || "",
      totalReferrals: 0,
      totalLifetimeEarnings: 0,
      walletBalance: 0
    },
    referrals: []
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getAffiliateDashboard();
        setDashboardData(data || dashboardData);
      } catch (err) {
        console.error("Failed to load partner referrals", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.affiliateCode]);

  const referrals = dashboardData.referrals || [];
  const affiliateCode = dashboardData.affiliate?.affiliateCode || user?.affiliateCode || "";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Affiliate Referrals</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Registered businesses from your link</h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              Monitor every business referring under <span className="font-semibold text-white">{affiliateCode}</span>, including their plan, conversion state, and commission outcome.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/partners/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
            >
              Back to Dashboard
            </Link>
            <Link
              to="/affiliate-register"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Grow referrals
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
            <p className="text-sm text-slate-400">Wallet Balance</p>
            <p className="mt-4 text-3xl font-semibold text-white">{formatCurrency(dashboardData.affiliate?.walletBalance || 0)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
            <p className="text-sm text-slate-400">Total Referrals</p>
            <p className="mt-4 text-3xl font-semibold text-white">{dashboardData.affiliate?.totalReferrals || 0}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
            <p className="text-sm text-slate-400">Lifetime Earnings</p>
            <p className="mt-4 text-3xl font-semibold text-white">{formatCurrency(dashboardData.affiliate?.totalLifetimeEarnings || 0)}</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Referral Log</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Businesses registered with your affiliate code</h2>
            </div>
            <div className="rounded-2xl bg-slate-950/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
              Updated live
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-sm text-slate-400">
                Loading referral details...
              </div>
            ) : referrals.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/70 p-8 text-sm text-slate-400">
                No referrals tracked yet. Share your partner link and the registration page to get started.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="px-3 py-3 font-medium">Business</th>
                    <th className="px-3 py-3 font-medium">Owner</th>
                    <th className="px-3 py-3 font-medium">Industry</th>
                    <th className="px-3 py-3 font-medium">Plan</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Converted</th>
                    <th className="px-3 py-3 font-medium">Joined</th>
                    <th className="px-3 py-3 font-medium">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {referrals.map((entry) => (
                    <tr key={`${entry.businessId}-${entry.referredAt}`} className="text-slate-200">
                      <td className="px-3 py-4 font-semibold text-white">{entry.businessName}</td>
                      <td className="px-3 py-4">
                        <div>{entry.ownerName}</div>
                        <div className="text-xs text-slate-500">{entry.ownerEmail}</div>
                      </td>
                      <td className="px-3 py-4">{entry.industry}</td>
                      <td className="px-3 py-4">{entry.plan || "free"}</td>
                      <td className="px-3 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[entry.isPro ? "Pro" : "Free"]}`}>
                          {entry.isPro ? "Pro" : "Free"}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.converted ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                          {entry.converted ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-3 py-4">{entry.referredAt}</td>
                      <td className="px-3 py-4 font-semibold text-emerald-300">{formatCurrency(entry.commissionEarned || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnersReferrals;
