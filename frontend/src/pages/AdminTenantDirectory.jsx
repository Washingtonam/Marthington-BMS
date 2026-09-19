import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const tabs = ["all", "school", "hospital"];
const tierForIndustry = {
  retail: "Retail Pro Plan",
  school: "Premium Academic Plan",
  hospital: "Premium Health Plan"
};

const AdminTenantDirectory = () => {
  const navigate = useNavigate();
  const { startImpersonation } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await request("/admin/overview");
      setBusinesses(data.businesses || []);
    } catch (err) {
      alert(err.message || "Failed to load tenant directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleBusinesses = useMemo(
    () => activeTab === "all" ? businesses : businesses.filter((business) => business.industryType === activeTab),
    [activeTab, businesses]
  );

  const updatePlan = async (business, plan) => {
    if (!window.confirm(`Are you sure you want to ${plan === "pro" ? "upgrade" : "downgrade"} ${business.name}?`)) {
      return;
    }

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
      await load();
    } catch (err) {
      alert(err.message || "Failed to update subscription");
    } finally {
      setActionLoading("");
    }
  };

  const deleteBusiness = async (business) => {
    const confirmed = window.confirm(
      `This will permanently delete ${business.name} and all related data from the system. This action cannot be undone. Do you want to continue?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(business._id);
      await request(`/admin/business/${business._id}?permanent=true`, {
        method: "DELETE",
        body: JSON.stringify({ reason: "Admin permanent deletion" })
      });
      await load();
    } catch (err) {
      alert(err.message || "Failed to delete business");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <section className="page-stack max-w-7xl mx-auto">
      <div className="page-heading">
        <div>
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin</span>
          <h1 className="mt-2 text-4xl font-extrabold text-slate-900">Tenant Directory</h1>
        </div>
        <p className="max-w-2xl text-sm text-slate-500">
          Manage every business workspace, subscription state, and administrative access point.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider ${
              activeTab === tab ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-500"
            }`}
          >
            {tab === "all" ? "Businesses" : tab === "school" ? "Schools" : "Hospitals"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-5 py-4">Business</th>
              <th className="px-5 py-4">Owner</th>
              <th className="px-5 py-4">Industry</th>
              <th className="px-5 py-4">Plan</th>
              <th className="px-5 py-4">Metric</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading tenants...</td>
              </tr>
            ) : (
              visibleBusinesses.map((business) => {
                const isPro = business.subscription?.plan === "pro";
                const metric = business.industryType === "school"
                  ? `${business.studentCount || 0} students`
                  : business.industryType === "hospital"
                    ? `${business.activePatientCount || 0} patients`
                    : formatCurrency(business.totalSalesRecord || 0);

                return (
                  <tr key={business._id}>
                    <td className="px-5 py-4 font-bold text-slate-900">{business.name}</td>
                    <td className="px-5 py-4 text-slate-500">{business.ownerEmail || "-"}</td>
                    <td className="px-5 py-4 capitalize">{business.industryType || "retail"}</td>
                    <td className="px-5 py-4">{isPro ? "Pro" : "Free"}</td>
                    <td className="px-5 py-4">{metric}</td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/business/${business._id}`)}
                        className="mr-2 rounded-lg border border-slate-200 px-3 py-2 font-bold"
                      >
                        Audit
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          startImpersonation(business._id);
                          navigate("/app");
                        }}
                        className="mr-2 rounded-lg bg-slate-900 px-3 py-2 font-bold text-white"
                      >
                        Impersonate
                      </button>

                      <button
                        type="button"
                        disabled={!!actionLoading || deletingId === business._id}
                        onClick={() => updatePlan(business, isPro ? "free" : "pro")}
                        className="mr-2 rounded-lg border border-emerald-200 px-3 py-2 font-bold text-emerald-700 disabled:opacity-50"
                      >
                        {actionLoading === business._id ? "Saving..." : isPro ? "Downgrade" : "Upgrade"}
                      </button>

                      <button
                        type="button"
                        disabled={!!actionLoading || deletingId === business._id}
                        onClick={() => deleteBusiness(business)}
                        className="rounded-lg border border-red-200 px-3 py-2 font-bold text-red-700 disabled:opacity-50"
                      >
                        {deletingId === business._id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminTenantDirectory;
