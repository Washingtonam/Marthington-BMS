import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getAffiliateDashboard, requestPayout } from "../api/affiliates.js";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(value || 0);

const statusClasses = {
  Paid: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20",
  Pending: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20"
};

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    affiliate: {
      affiliateCode: user?.affiliateCode || "",
      walletBalance: 0,
      totalEarned: 0,
      totalConversions: 0,
      totalReferrals: 0,
      totalLifetimeEarnings: 0
    },
    referrals: [],
    conversions: []
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const data = await getAffiliateDashboard();
        setDashboardData(data || {
          affiliate: {
            affiliateCode: user?.affiliateCode || "",
            walletBalance: 0,
            totalEarned: 0,
            totalConversions: 0,
            totalReferrals: 0,
            totalLifetimeEarnings: 0
          },
          referrals: [],
          conversions: []
        });
      } catch (error) {
        console.error("Failed to load affiliate dashboard", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user?.affiliateCode]);

  const affiliateCode = dashboardData.affiliate?.affiliateCode || user?.affiliateCode || "";
  const referralLink = `https://marthington.vercel.app/register?ref=${affiliateCode}`;

  const metrics = [
    {
      label: "Available Wallet Balance",
      value: formatCurrency(dashboardData.affiliate?.walletBalance || 0),
      action: "Request Payout"
    },
    {
      label: "Total Lifetime Earnings",
      value: formatCurrency(dashboardData.affiliate?.totalLifetimeEarnings || dashboardData.affiliate?.totalEarned || 0),
      action: "View History"
    },
    {
      label: "Total Referrals Registered",
      value: String(dashboardData.affiliate?.totalReferrals || 0),
      action: "See Referrals"
    }
  ];

  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState("");

  const conversions = (dashboardData.conversions || []).map((entry) => ({
    businessName: entry.businessName,
    industry: entry.industry,
    joinedAt: entry.joinedAt,
    status: entry.status,
    commission: formatCurrency(entry.commission || 0),
    amountPaid: formatCurrency(entry.amountPaid || 0),
    rateApplied: `${entry.rateApplied || 0}%`
  }));

  const referrals = (dashboardData.referrals || []).map((entry) => ({
    businessName: entry.businessName,
    ownerName: entry.ownerName,
    ownerEmail: entry.ownerEmail,
    industry: entry.industry,
    plan: entry.plan,
    subscriptionStatus: entry.subscriptionStatus,
    isPro: entry.isPro,
    converted: entry.converted,
    commissionEarned: formatCurrency(entry.commissionEarned || 0),
    referredAt: entry.referredAt,
    transactionDate: entry.transactionDate
  }));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("Unable to copy link", error);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Affiliate Partner Portal
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Welcome back, {user?.name || "Partner"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                  Track your referrals, grow your network, and monitor every successful business conversion in one place.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                Partner Code
              </p>
              <p className="mt-1 text-lg font-semibold text-white">{affiliateCode}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5 shadow-lg shadow-black/20 backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">{metric.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-2 text-lg text-slate-300">
                  {index === 0 ? "💳" : index === 1 ? "📈" : "🤝"}
                </div>
              </div>

              <button
                type="button"
                className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm font-medium transition ${
                  index === 0
                    ? "bg-emerald-500 text-white hover:bg-emerald-400"
                    : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
                onClick={() => {
                  if (index === 0) {
                    setPayoutModalOpen(true);
                  } else if (index === 2) {
                    navigate("/partners/referrals");
                  }
                }}
              >
                {metric.action}
              </button>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Referral Tool</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Share your unique partner link</h2>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500">
              Partner Link
            </p>
            <div className="break-all font-medium text-slate-100">{referralLink}</div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Live Conversions</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Recent business referrals</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Updated live
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">
                Loading affiliate activity...
              </div>
            ) : referrals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">
                No referrals yet. Share your partner link to start earning.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="px-3 py-3 font-medium">Business Name</th>
                    <th className="px-3 py-3 font-medium">Owner</th>
                    <th className="px-3 py-3 font-medium">Industry</th>
                    <th className="px-3 py-3 font-medium">Plan</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Converted</th>
                    <th className="px-3 py-3 font-medium">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {referrals.map((entry) => (
                    <tr key={`${entry.businessName}-${entry.referredAt}`} className="text-slate-200">
                      <td className="whitespace-nowrap px-3 py-4 font-medium text-white">
                        {entry.businessName}
                      </td>
                      <td className="px-3 py-4">
                        <div>{entry.ownerName}</div>
                        <div className="text-xs text-slate-400">{entry.ownerEmail}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">{entry.industry}</td>
                      <td className="whitespace-nowrap px-3 py-4">{entry.plan || "free"}</td>
                      <td className="whitespace-nowrap px-3 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${entry.isPro ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20" : "bg-slate-500/15 text-slate-300"}`}>
                          {entry.isPro ? "Pro" : "Free"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${entry.converted ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                          {entry.converted ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 font-semibold text-emerald-300">
                        {entry.commissionEarned}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Earnings History</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Commission payouts and conversion details</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Latest first
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">
                Loading earnings history...
              </div>
            ) : conversions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">
                No credited commissions yet. Once referrals convert, the activity will appear here.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="px-3 py-3 font-medium">Business</th>
                    <th className="px-3 py-3 font-medium">Industry</th>
                    <th className="px-3 py-3 font-medium">Amount Paid</th>
                    <th className="px-3 py-3 font-medium">Commission</th>
                    <th className="px-3 py-3 font-medium">Rate</th>
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {conversions.map((entry) => (
                    <tr key={`${entry.businessName}-${entry.joinedAt}-${entry.commission}`} className="text-slate-200">
                      <td className="whitespace-nowrap px-3 py-4 font-medium text-white">{entry.businessName}</td>
                      <td className="px-3 py-4">{entry.industry}</td>
                      <td className="px-3 py-4">{entry.amountPaid}</td>
                      <td className="px-3 py-4">{entry.commission}</td>
                      <td className="px-3 py-4">{entry.rateApplied}</td>
                      <td className="px-3 py-4">{entry.joinedAt}</td>
                      <td className="px-3 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[entry.status] || "bg-slate-500/15 text-slate-300"}`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Payout Modal */}
      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPayoutModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 text-slate-900">
            <h3 className="text-lg font-semibold">Request Payout</h3>
            <p className="text-sm text-slate-500 mt-1">Enter the amount you want to withdraw from your wallet.</p>

            <div className="mt-4">
              <label className="block text-sm text-slate-700">Amount (NGN)</label>
              <input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="mt-2 w-full rounded-lg border p-3"
                placeholder="e.g. 5000"
              />
            </div>

            {payoutMessage && <div className="mt-3 text-sm text-rose-600">{payoutMessage}</div>}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm"
                onClick={() => setPayoutModalOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={payoutLoading}
                onClick={async () => {
                  setPayoutLoading(true);
                  setPayoutMessage("");
                  try {
                    const amt = Number(payoutAmount);
                    if (!amt || amt <= 0) {
                      setPayoutMessage("Enter a valid amount.");
                      setPayoutLoading(false);
                      return;
                    }

                    const resp = await requestPayout({ amount: amt });
                    setPayoutMessage(resp.message || "Payout requested.");
                    setPayoutModalOpen(false);
                    // Refresh dashboard
                    setLoading(true);
                    const data = await getAffiliateDashboard();
                    setDashboardData(data || dashboardData);
                    setLoading(false);
                  } catch (err) {
                    setPayoutMessage(err.message || "Failed to request payout.");
                    setPayoutLoading(false);
                  }
                }}
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
              >
                {payoutLoading ? "Requesting..." : "Request Payout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerDashboard;
