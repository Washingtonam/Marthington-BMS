import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency } from "../utils/formatters.js";


const tabs = [
  { id: "all", label: "All Businesses" },
  { id: "school", label: "Schools" },
  { id: "hospital", label: "Hospitals" }
];

const upgradeLabels = {
  retail: "Upgrade to Pro",
  school: "Upgrade to School Pro",
  hospital: "Upgrade to Health Pro"
};

const tierForIndustry = {
  retail: "Retail Pro Plan",
  school: "Premium Academic Plan",
  hospital: "Premium Health Plan"
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { startImpersonation } = useAuth();

  // Navigation View State
  const [viewMode, setViewMode] = useState("tenants"); // 'tenants' | 'affiliates'

  // Global Dashboard Statistics State
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    industryCounts: { retail: 0, school: 0, hospital: 0 },
    totalBusinesses: 0
  });
  const [businesses, setBusinesses] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  // Affiliate Network Specific State
  const [affiliates, setAffiliates] = useState([]);
  const [globalRate, setGlobalRate] = useState(20);
  const [affiliateStats, setAffiliateStats] = useState({
    totalPartners: 0,
    pendingPayouts: 0,
    totalPaidCommissions: 0
  });
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      // Fetch both Tenant Overview and Affiliate data simultaneously
      const [overviewData, affiliateData] = await Promise.all([
        request("/admin/overview"),
        request("/admin/affiliates").catch(() => ({ affiliates: [], globalRate: 20, stats: {} }))
      ]);

      setStats(overviewData.stats || {});
      setBusinesses(overviewData.businesses || []);

      if (affiliateData) {
        setAffiliates(affiliateData.affiliates || []);
        setGlobalRate(affiliateData.globalRate || 20);
        setAffiliateStats(affiliateData.stats || {
          totalPartners: affiliateData.affiliates?.length || 0,
          pendingPayouts: affiliateData.affiliates?.reduce((acc, curr) => acc + (curr.walletBalance || 0), 0) || 0,
          totalPaidCommissions: affiliateData.affiliates?.reduce((acc, curr) => acc + (curr.totalEarned || 0), 0) || 0
        });
      }
    } catch (err) {
      console.error("Failed to load administration data assets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const visibleBusinesses = useMemo(() => {
    if (activeTab === "all") return businesses;
    return businesses.filter((biz) => biz.industryType === activeTab);
  }, [activeTab, businesses]);

  const updatePlan = async (business, plan) => {
    try {
      setActionLoading(business._id);
      await request(`/admin/business/${business._id}/subscription`, {
        method: "PUT",
        body: JSON.stringify({
          plan,
          billingCycle: "monthly",
          industryType: business.industryType,
          tier: tierForIndustry[business.industryType] || "Premium Plan"
        })
      });
      await loadDashboard();
    } catch (err) {
      alert(err.message || "Failed to update plan");
    } finally {
      setActionLoading("");
    }
  };

  // Dynamic Commission Configuration Update Handler
  const handleUpdateGlobalRate = async () => {
    try {
      setIsUpdatingRate(true);
      await request("/admin/affiliate-settings", {
        method: "PUT",
        body: JSON.stringify({ globalAffiliateRate: Number(globalRate) })
      });
      alert("Global partner commission configuration updated successfully.");
    } catch (err) {
      alert(err.message || "Failed to alter system commission structures.");
    } finally {
      setIsUpdatingRate(false);
    }
  };

  // Process Affiliate Balance Settlement Handler
  const handleApprovePayout = async (affiliateId) => {
    if (!window.confirm("Confirm bank ledger verification statement to clear this affiliate balance settlement?")) return;
    try {
      setActionLoading(affiliateId);
      await request(`/admin/affiliates/${affiliateId}/payout`, {
        method: "POST"
      });
      await loadDashboard();
      alert("Payout cleared and logged successfully.");
    } catch (err) {
      alert(err.message || "Payout settlement transaction failed.");
    } finally {
      setActionLoading("");
    }
  };

  const enterBusiness = (businessId) => {
    startImpersonation(businessId);
    navigate("/app");
  };

  const viewBusiness = (businessId) => {
    navigate(`/admin/business/${businessId}`);
  };

  return (
    <section className="page-stack max-w-7xl mx-auto px-6 py-8">
      
      {/* GLOBAL SYSTEM HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6 mb-8">
        <div>
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">
            Super Admin
          </span>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">
            Control Center
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl leading-relaxed">
            Monitor global revenue parameters, audit multi-tenant ecosystem adoption arrays, and manipulate structural affiliate commissions.
          </p>
        </div>

        {/* CONTROLLER SECTION SUB-NAV TOGGLE */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner mt-4 md:mt-0">
          <button
            type="button"
            onClick={() => setViewMode("tenants")}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              viewMode === "tenants" ? "bg-white text-slate-900 shadow-sm border border-slate-200/40" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Tenant Directory
          </button>
          <button
            type="button"
            onClick={() => setViewMode("affiliates")}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              viewMode === "affiliates" ? "bg-white text-slate-900 shadow-sm border border-slate-200/40" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Affiliate Network
          </button>
        </div>
      </div>

      {/* RENDER MODE A: TENANT DIRECTORY (MIRRORS image_190ab8.png) */}
      {viewMode === "tenants" && (
        <>
          {/* TENANT METRICS MATRIX */}
          <div className="grid gap-4 xl:grid-cols-3 mb-8">
            <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl border border-slate-800">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Total Global Revenue</p>
              <p className="mt-4 text-3xl font-bold tracking-tight">
                ₦{stats.totalRevenue?.toLocaleString() || "0"}
              </p>
              <p className="mt-3 text-xs text-slate-400 leading-relaxed font-medium">
                Aggregated subscription streams generated via verified Flutterwave and legacy payment processing gateways.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 text-slate-400">Total Registered Accounts</p>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                {stats.totalUsers?.toLocaleString() || "0"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Retail {stats.industryCounts?.retail || 0}
                </span>
                <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Schools {stats.industryCounts?.school || 0}
                </span>
                <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Hospitals {stats.industryCounts?.hospital || 0}
                </span>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 text-slate-400">Active Pro Subscriptions</p>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                {stats.activeSubscriptions?.toLocaleString() || "0"}
              </p>
              <p className="mt-3 text-xs font-medium text-slate-400 leading-relaxed text-slate-400">
                Premium multi-tenant system workspaces running under full paid verification conditions.
              </p>
            </div>
          </div>

          {/* TENANT TABLE DIRECTORY CARD */}
          <div className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Tenant Directory Registry</h2>
                <p className="text-xs font-medium text-slate-400 mt-1">
                  Filter global business operating instances and manually configure privilege variables.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      activeTab === tab.id ? "bg-slate-950 text-white shadow-sm" : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold border-b border-slate-200/60">
                  <tr>
                    <th className="px-5 py-4">Business Parameters</th>
                    <th className="px-5 py-4">Administrative Identity</th>
                    <th className="px-5 py-4">Industry Sector</th>
                    <th className="px-5 py-4">Privilege Status</th>
                    <th className="px-5 py-4">Quantified Metric</th>
                    <th className="px-5 py-4 text-right">System Configuration Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading master index...</td>
                    </tr>
                  ) : visibleBusinesses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400">No organizational instances localized in this query range.</td>
                    </tr>
                  ) : (
                    visibleBusinesses.map((biz) => {
                      const isPro = biz.subscription?.plan === "pro";
                      const keyMetric =
                        biz.industryType === "school"
                          ? `${biz.studentCount || 0} students`
                          : biz.industryType === "hospital"
                          ? `${biz.activePatientCount || 0} patients`
                          : formatCurrency(biz.totalSalesRecord || 0);

                      return (
                        <tr key={biz._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-900">{biz.name}</td>
                          <td className="px-5 py-4 text-slate-500">{biz.ownerEmail || "—"}</td>
                          <td className="px-5 py-4 capitalize font-semibold text-slate-500">{biz.industryType || "retail"}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isPro ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-500"}`}>
                              {isPro ? "PRO MODE" : "FREE SUITE"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-600 font-semibold">{keyMetric}</td>
                          <td className="px-5 py-4 space-x-1.5 text-right whitespace-nowrap">
                            <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-50 transition" onClick={() => viewBusiness(biz._id)}>
                              Audit
                            </button>
                            <button type="button" className="rounded-lg border border-slate-200 bg-slate-900 text-white px-3 py-1.5 font-bold hover:bg-slate-800 transition shadow-sm" onClick={() => enterBusiness(biz._id)}>
                              Impersonate
                            </button>
                            {isPro ? (
                              <button type="button" disabled={!!actionLoading} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 font-bold text-red-600 hover:bg-red-100 transition disabled:opacity-40" onClick={() => updatePlan(biz, "free")}>
                                {actionLoading === biz._id ? "Processing..." : "Downgrade"}
                              </button>
                            ) : (
                              <button type="button" disabled={!!actionLoading} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-600 hover:bg-emerald-100 transition disabled:opacity-40" onClick={() => updatePlan(biz, "pro")}>
                                {actionLoading === biz._id ? "Processing..." : upgradeLabels[biz.industryType || "retail"]}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* RENDER MODE B: AFFILIATE NETWORK MANAGEMENT SUITE */}
      {viewMode === "affiliates" && (
        <>
          {/* PARTNER TELEMETRY SUMMARY METRICS */}
          <div className="grid gap-4 xl:grid-cols-3 mb-8">
            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Total Approved Partners</p>
              <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
                {affiliateStats.totalPartners?.toLocaleString() || "0"}
              </p>
              <p className="mt-3 text-xs font-medium text-slate-400">Registered partner handles active in promotional loops.</p>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Pending Ledger Balances</p>
              <p className="mt-4 text-3xl font-extrabold tracking-tight text-amber-600">
                ₦{affiliateStats.pendingPayouts?.toLocaleString() || "0"}
              </p>
              <p className="mt-3 text-xs font-medium text-slate-400">Withdrawable revenue assets accumulated inside partner wallets.</p>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Commissions Cleared (Lifetime)</p>
              <p className="mt-4 text-3xl font-extrabold tracking-tight text-emerald-600">
                ₦{affiliateStats.totalPaidCommissions?.toLocaleString() || "0"}
              </p>
              <p className="mt-3 text-xs font-medium text-slate-400">Total historical settlement capital channeled to referral agents.</p>
            </div>
          </div>

          {/* DYNAMIC COMMISSION ADJUSTMENT CORE CARD */}
          <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h3 className="text-lg font-bold tracking-tight text-slate-900">Dynamic Commission Settings</h3>
              <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                Alter the baseline operational revenue-share index on the fly. Modifying this tracking parameter instantly recalibrates transaction processing configurations across all active payment gateways.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center shadow-inner">
                <input
                  type="number"
                  value={globalRate}
                  onChange={(e) => setGlobalRate(Number(e.target.value))}
                  className="w-16 bg-transparent text-sm font-extrabold text-slate-900 focus:outline-none"
                  min="0"
                  max="100"
                />
                <span className="text-sm font-bold text-slate-400 ml-1">%</span>
              </div>
              <button
                type="button"
                disabled={isUpdatingRate}
                onClick={handleUpdateGlobalRate}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 shadow-sm hover:shadow transition disabled:opacity-50 whitespace-nowrap"
              >
                {isUpdatingRate ? "Syncing..." : "Update Rate"}
              </button>
            </div>
          </div>

          {/* MASTER AFFILIATES REGISTRY TABLE */}
          <div className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80">
            <div className="mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Affiliate Network Ledger</h2>
              <p className="text-xs font-medium text-slate-400 mt-1">
                Audit wallet parameters, tracking codes, and settle pending bank withdrawals securely.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold border-b border-slate-200/60">
                  <tr>
                    <th className="px-5 py-4">Partner Identity</th>
                    <th className="px-5 py-4">Tracking Code</th>
                    <th className="px-5 py-4">Wallet Balance</th>
                    <th className="px-5 py-4">Total Earned (Lifetime)</th>
                    <th className="px-5 py-4">Registered Bank Data</th>
                    <th className="px-5 py-4 text-right">Settlement Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400">Parsing network ledger...</td>
                    </tr>
                  ) : affiliates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400">No partner documents found in system index arrays.</td>
                    </tr>
                  ) : (
                    affiliates.map((partner) => (
                      <tr key={partner._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">{partner.name}</p>
                          <p className="text-slate-400 text-[11px] font-medium mt-0.5">{partner.email}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-800 text-[11px] font-bold">
                            {partner.affiliateCode || "UNASSIGNED"}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-amber-600">
                          ₦{partner.walletBalance?.toLocaleString() || "0"}
                        </td>
                        <td className="px-5 py-4 font-bold text-emerald-600">
                          ₦{partner.totalEarned?.toLocaleString() || "0"}
                        </td>
                        <td className="px-5 py-4 text-slate-500 font-medium max-w-xs truncate">
                          {partner.paymentDetails?.accountNumber ? (
                            <div>
                              <p className="text-slate-800 font-semibold">{partner.paymentDetails.accountName}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {partner.paymentDetails.bankName} — {partner.paymentDetails.accountNumber}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic">No settlement metadata saved</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={actionLoading === partner._id || !(partner.walletBalance > 0)}
                            onClick={() => handleApprovePayout(partner._id)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {actionLoading === partner._id ? "Clearing..." : "Settle Balance"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </section>
  );
};

export default AdminDashboard;
