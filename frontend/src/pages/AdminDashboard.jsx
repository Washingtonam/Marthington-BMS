import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

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

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await request("/admin/overview");
      setStats(data.stats || {});
      setBusinesses(data.businesses || []);
    } catch (err) {
      console.error(err);
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

  const enterBusiness = (businessId) => {
    startImpersonation(businessId);
    navigate("/app");
  };

  const viewBusiness = (businessId) => {
    navigate(`/admin/business/${businessId}`);
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Super Admin
          </span>
          <h1 className="mt-2 text-4xl font-semibold text-slate-900">
            Control Center
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-slate-500">
          Monitor global revenue, tenant adoption and activate industry-specific premium tiers.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3 mb-8">
        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl border border-slate-800">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Total Global Revenue</p>
          <p className="mt-4 text-3xl font-semibold">
            ${stats.totalRevenue?.toLocaleString() || "0"}
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Active subscriptions across retail, school and hospital tenants.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Total Registered Accounts</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">
            {stats.totalUsers?.toLocaleString() || "0"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Retail {stats.industryCounts?.retail || 0}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Schools {stats.industryCounts?.school || 0}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Hospitals {stats.industryCounts?.hospital || 0}
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Active Pro Subscriptions</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">
            {stats.activeSubscriptions?.toLocaleString() || "0"}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Paying tenants currently on active premium plans.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-xl border border-slate-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Tenant Directory</h2>
            <p className="text-sm text-slate-500">
              Filter by tenant segment and manage the right industry-specific upgrade flow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-[0.15em]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Admin / Contact</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Key Metric</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Loading directory...
                  </td>
                </tr>
              ) : visibleBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No businesses found for this segment.
                  </td>
                </tr>
              ) : (
                visibleBusinesses.map((biz) => {
                  const isPro = biz.subscription?.plan === "pro";
                  const contactEmail = biz.ownerEmail || "—";
                  const keyMetric =
                    biz.industryType === "school"
                      ? `${biz.studentCount || 0} students`
                      : biz.industryType === "hospital"
                      ? `${biz.activePatientCount || 0} patients`
                      : `$${biz.totalSalesRecord?.toLocaleString() || 0}`;

                  return (
                    <tr key={biz._id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-medium text-slate-900">{biz.name}</td>
                      <td className="px-4 py-4 text-slate-600">{contactEmail}</td>
                      <td className="px-4 py-4 capitalize text-slate-600">{biz.industryType || "retail"}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isPro ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {isPro ? "Pro" : "Free"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{keyMetric}</td>
                      <td className="px-4 py-4 space-x-2">
                        <button type="button" className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200" onClick={() => viewBusiness(biz._id)}>
                          View
                        </button>
                        <button type="button" className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200" onClick={() => enterBusiness(biz._id)}>
                          Login As
                        </button>
                        {isPro ? (
                          <button type="button" disabled={actionLoading === biz._id} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50" onClick={() => updatePlan(biz, "free")}>Downgrade to Free</button>
                        ) : (
                          <button type="button" disabled={actionLoading === biz._id} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50" onClick={() => updatePlan(biz, "pro")}>{upgradeLabels[biz.industryType || "retail"]}</button>
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
    </section>
  );
};

export default AdminDashboard;
