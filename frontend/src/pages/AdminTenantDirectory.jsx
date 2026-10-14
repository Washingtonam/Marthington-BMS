import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import TenantMessageModal from "../components/TenantMessageModal.jsx";
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
  const [search, setSearch] = useState("");
  const [contactBusinessId, setContactBusinessId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    () => businesses.filter((business) => {
      const matchesTab = activeTab === "all" || business.industryType === activeTab;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || [
        business.name,
        business.ownerName,
        business.ownerEmail,
        business.ownerPhone,
        business.businessPhone,
        business.industryType
      ].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesTab && matchesSearch;
    }),
    [activeTab, businesses, search]
  );
  const contactBusiness = businesses.find((business) => business._id === contactBusinessId);
  const selectedBusinesses = visibleBusinesses.filter((business) => selectedIds.includes(business._id));
  const pageCount = Math.max(1, Math.ceil(visibleBusinesses.length / pageSize));
  const pageBusinesses = visibleBusinesses.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const openContactDraft = (business) => {
    setContactBusinessId(business._id);
  };

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
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider ${
              activeTab === tab ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-500"
            }`}
          >
            {tab === "all" ? "Businesses" : tab === "school" ? "Schools" : "Hospitals"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => navigate("/admin/subscriptions")}
          className="ml-auto rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
        >
          Manage subscriptions →
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Find and contact a tenant</h2>
          <p className="mt-1 text-xs text-slate-500">Search by business, owner, email, or phone. Message drafts open in your email or WhatsApp app.</p>
        </div>
        <input
          type="search"
          aria-label="Search tenants"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder="Search tenants..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm sm:max-w-xs"
        />
      </div>

      {selectedBusinesses.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="text-xs font-bold text-emerald-800">{selectedBusinesses.length} tenant{selectedBusinesses.length === 1 ? "" : "s"} selected</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setContactBusinessId("bulk")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">Draft email / WhatsApp</button>
            <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800">Clear selection</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-5 py-4"><input type="checkbox" aria-label="Select tenants on this page" checked={pageBusinesses.length > 0 && pageBusinesses.every((business) => selectedIds.includes(business._id))} onChange={() => {
                const pageIds = pageBusinesses.map((business) => business._id);
                const allSelected = pageIds.every((id) => selectedIds.includes(id));
                setSelectedIds((current) => allSelected ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])]);
              }} className="h-4 w-4 rounded border-slate-300 text-emerald-600" /></th>
              <th className="px-5 py-4">Business</th>
              <th className="px-5 py-4">Owner &amp; contact</th>
              <th className="px-5 py-4">Industry</th>
              <th className="px-5 py-4">Plan</th>
              <th className="px-5 py-4">Subscription</th>
              <th className="px-5 py-4">Metric</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-400">Loading tenants...</td>
              </tr>
            ) : pageBusinesses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-400">No tenants found.</td>
              </tr>
            ) : (
              pageBusinesses.map((business) => {
                const isPro = business.subscription?.plan === "pro";
                const contactPhones = [
                  business.whatsappPhone,
                  business.ownerPhone,
                  business.businessPhone
                ].flatMap((value) => String(value || "").split(/[;,|/\n]+/))
                  .map((value) => value.trim())
                  .filter((value, index, values) => value && values.indexOf(value) === index);
                const metric = business.industryType === "school"
                  ? `${business.studentCount || 0} students`
                  : business.industryType === "hospital"
                    ? `${business.activePatientCount || 0} patients`
                    : formatCurrency(business.totalSalesRecord || 0);

                return (
                  <tr key={business._id}>
                    <td className="px-5 py-4"><input type="checkbox" checked={selectedIds.includes(business._id)} onChange={() => setSelectedIds((current) => current.includes(business._id) ? current.filter((id) => id !== business._id) : [...current, business._id])} aria-label={`Select ${business.name}`} className="h-4 w-4 rounded border-slate-300 text-emerald-600" /></td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{business.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{business.status || "active"}</p>
                    </td>
                    <td className="min-w-56 px-5 py-4 text-slate-500">
                      <p className="font-semibold text-slate-800">{business.ownerName || "Business owner"}</p>
                      {business.ownerEmail ? <p className="mt-1">{business.ownerEmail}</p> : <p className="mt-1">No email address</p>}
                      {contactPhones.length
                        ? <div className="mt-1 space-y-0.5">{contactPhones.map((phone) => <p key={phone}>{phone}</p>)}</div>
                        : <p className="mt-1">No phone number</p>}
                      <button type="button" onClick={() => openContactDraft(business)} className="mt-2 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50">Draft email / WhatsApp</button>
                    </td>
                    <td className="px-5 py-4 capitalize">{business.industryType || "retail"}</td>
                    <td className="px-5 py-4">{isPro ? "Pro" : "Free"}</td>
                    <td className="min-w-36 px-5 py-4">
                      <p className="capitalize text-slate-800">{business.subscription?.status || "trial"}</p>
                      {business.subscription?.billingCycle && <p className="mt-1 text-[11px] capitalize text-slate-500">{business.subscription.billingCycle}</p>}
                      {business.subscription?.expiresAt && <p className="mt-1 text-[11px] text-slate-500">Until {new Date(business.subscription.expiresAt).toLocaleDateString()}</p>}
                    </td>
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
                        Access Account
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
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-500">
        <label className="flex items-center gap-2">Rows per page
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
            {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <span>{visibleBusinesses.length === 0 ? "0 tenants" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, visibleBusinesses.length)} of ${visibleBusinesses.length} tenants`}</span>
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold disabled:opacity-40">Previous</button>
          <span>Page {Math.min(page, pageCount)} of {pageCount}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold disabled:opacity-40">Next</button>
        </div>
      </div>
      {contactBusinessId && (contactBusiness || contactBusinessId === "bulk") && (
        <TenantMessageModal
          recipients={contactBusinessId === "bulk" ? selectedBusinesses : [contactBusiness]}
          onClose={() => setContactBusinessId("")}
          title={contactBusinessId === "bulk" ? `Draft a message to ${selectedBusinesses.length} selected tenants` : `Draft a message to ${contactBusiness.name}`}
        />
      )}
    </section>
  );
};

export default AdminTenantDirectory;
