import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import request from "../api/client.js";
import TenantMessageModal from "../components/TenantMessageModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const tabs = ["all", "retail", "school", "hospital"];
const statusFilters = ["all", "active", "trial", "expired"];
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");
  const [contactBusinessId, setContactBusinessId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openMenuId, setOpenMenuId] = useState("");

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
      const subscriptionStatus = business.subscription?.status || "trial";
      const matchesStatus = statusFilter === "all" || subscriptionStatus === statusFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || [
        business.name,
        business.ownerName,
        business.ownerEmail,
        business.ownerPhone,
        business.businessPhone,
        business.whatsappPhone,
        business.industryType
      ].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesTab && matchesStatus && matchesSearch;
    }),
    [activeTab, businesses, search, statusFilter]
  );
  const contactBusiness = businesses.find((business) => business._id === contactBusinessId);
  const selectedBusinesses = visibleBusinesses.filter((business) => selectedIds.includes(business._id));
  const pageCount = Math.max(1, Math.ceil(visibleBusinesses.length / pageSize));
  const pageBusinesses = visibleBusinesses.slice((page - 1) * pageSize, page * pageSize);
  const summary = {
    total: businesses.length,
    active: businesses.filter((business) => (business.subscription?.status || "trial") === "active").length,
    trial: businesses.filter((business) => (business.subscription?.status || "trial") === "trial").length,
    expired: businesses.filter((business) => (business.subscription?.status || "trial") === "expired").length
  };

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const openContactDraft = (business) => setContactBusinessId(business._id);

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
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/70 p-6 shadow-sm sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Super Admin
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Tenant directory</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Find a workspace, check its subscription, or contact its owner. Use the row actions for account management.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/subscriptions")}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-800"
        >
          Manage subscriptions <span aria-hidden="true">↗</span>
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: "all", label: "Total tenants", value: summary.total, detail: "All business workspaces", tone: "slate" },
          { key: "active", label: "Active plans", value: summary.active, detail: "Currently subscribed", tone: "emerald" },
          { key: "trial", label: "On trial", value: summary.trial, detail: "Trial subscriptions", tone: "sky" },
          { key: "expired", label: "Expired plans", value: summary.expired, detail: "May need follow-up", tone: "amber" }
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => { setStatusFilter(item.key); setPage(1); }}
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              statusFilter === item.key ? "border-emerald-300 ring-2 ring-emerald-100" : "border-slate-200"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-500">{item.label}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${item.tone === "emerald" ? "bg-emerald-500" : item.tone === "sky" ? "bg-sky-500" : item.tone === "amber" ? "bg-amber-500" : "bg-slate-400"}`} />
            </span>
            <span className="mt-2 block text-2xl font-black tracking-tight text-slate-950">{loading ? "—" : item.value.toLocaleString()}</span>
            <span className="mt-1 block text-[11px] text-slate-500">{item.detail}</span>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Business workspaces</h2>
              <p className="mt-1 text-xs text-slate-500">Search by business, owner, email, or phone number.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block sm:min-w-72">
                <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">⌕</span>
                <input
                  type="search"
                  aria-label="Search tenants"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                  placeholder="Search tenants..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="sr-only" htmlFor="tenant-industry-filter">Filter by industry</label>
              <select
                id="tenant-industry-filter"
                aria-label="Filter by industry"
                value={activeTab}
                onChange={(event) => { setActiveTab(event.target.value); setPage(1); }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                {tabs.map((tab) => <option key={tab} value={tab}>{tab === "all" ? "All industries" : tab === "school" ? "Schools" : tab === "hospital" ? "Hospitals" : "Retail"}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Subscription status filters">
            {statusFilters.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => { setStatusFilter(status); setPage(1); }}
                aria-pressed={statusFilter === status}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition ${
                  statusFilter === status
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {status === "all" ? "All plans" : status}
              </button>
            ))}
            <span className="ml-auto text-xs font-medium text-slate-400">{visibleBusinesses.length} result{visibleBusinesses.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        {selectedBusinesses.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/80 px-4 py-3 sm:px-5">
            <span className="text-xs font-bold text-emerald-900">{selectedBusinesses.length} tenant{selectedBusinesses.length === 1 ? "" : "s"} selected</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setContactBusinessId("bulk")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">Draft email / WhatsApp</button>
              <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50">Clear selection</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-[560px] w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="w-12 px-4 py-3.5">
                  <input type="checkbox" aria-label="Select tenants on this page" checked={pageBusinesses.length > 0 && pageBusinesses.every((business) => selectedIds.includes(business._id))} onChange={() => {
                    const pageIds = pageBusinesses.map((business) => business._id);
                    const allSelected = pageIds.every((id) => selectedIds.includes(id));
                    setSelectedIds((current) => allSelected ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])]);
                  }} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                </th>
                <th className="px-4 py-3.5">Tenant</th>
                <th className="px-4 py-3.5">Subscription</th>
                <th className="w-36 px-4 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-14 text-center text-sm text-slate-500">Loading tenant workspaces...</td></tr>
              ) : pageBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-14 text-center">
                    <p className="font-bold text-slate-800">No tenants match these filters</p>
                    <p className="mt-1 text-xs text-slate-500">Try changing the search or selecting a different plan status.</p>
                    <button type="button" onClick={() => { setSearch(""); setActiveTab("all"); setStatusFilter("all"); setPage(1); }} className="mt-3 text-xs font-bold text-emerald-700 hover:underline">Clear filters</button>
                  </td>
                </tr>
              ) : pageBusinesses.map((business) => {
                const isPro = business.subscription?.plan === "pro";
                const subscriptionStatus = business.subscription?.status || "trial";
                const businessStatus = business.status || "active";
                const isBusy = !!actionLoading || deletingId === business._id;

                return (
                  <tr key={business._id} className="align-middle transition hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selectedIds.includes(business._id)} onChange={() => setSelectedIds((current) => current.includes(business._id) ? current.filter((id) => id !== business._id) : [...current, business._id])} aria-label={`Select ${business.name}`} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-52 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-black uppercase text-emerald-800 ring-1 ring-emerald-100">{String(business.name || "?").slice(0, 1)}</span>
                        <div className="min-w-0">
                          <Link to={`/admin/business/${business._id}`} className="block truncate font-bold text-slate-900 hover:text-emerald-700">{business.name}</Link>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{business.ownerName || "Business owner"}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold capitalize text-slate-600">{business.industryType || "retail"}</span>
                            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold capitalize ${businessStatus === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{businessStatus}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-lg px-2 py-1 text-xs font-extrabold ${isPro ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-700"}`}>{isPro ? "Pro" : "Free"}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold capitalize ${subscriptionStatus === "active" ? "bg-emerald-50 text-emerald-700" : subscriptionStatus === "expired" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{subscriptionStatus}</span>
                      </div>
                      <p className="mt-2 text-xs capitalize text-slate-500">{business.subscription?.billingCycle || "No billing cycle"}</p>
                      {business.subscription?.expiresAt && <p className="mt-1 text-[11px] text-slate-400">Until {new Date(business.subscription.expiresAt).toLocaleDateString()}</p>}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="relative inline-block text-left">
                          <button type="button" aria-label={`Actions for ${business.name}`} aria-haspopup="menu" aria-expanded={openMenuId === business._id} onClick={() => setOpenMenuId((current) => current === business._id ? "" : business._id)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Actions <span aria-hidden="true">⌄</span></button>
                          {openMenuId === business._id && <div role="menu" aria-label={`Actions for ${business.name}`} className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl">
                            <button type="button" role="menuitem" onClick={() => { setOpenMenuId(""); openContactDraft(business); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50">Contact owner</button>
                            <button type="button" role="menuitem" onClick={() => { setOpenMenuId(""); startImpersonation(business._id); navigate("/app"); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">Access account</button>
                            <button type="button" role="menuitem" disabled={isBusy} onClick={() => { setOpenMenuId(""); updatePlan(business, isPro ? "free" : "pro"); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{actionLoading === business._id ? "Saving..." : isPro ? "Downgrade plan" : "Upgrade plan"}</button>
                            <button type="button" role="menuitem" disabled={isBusy} onClick={() => { setOpenMenuId(""); deleteBusiness(business); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{deletingId === business._id ? "Deleting..." : "Delete tenant"}</button>
                          </div>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <label className="flex flex-wrap items-center gap-2">Rows per page
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
              {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <span>{visibleBusinesses.length === 0 ? "0 tenants" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, visibleBusinesses.length)} of ${visibleBusinesses.length} tenants`}</span>
          </label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Previous</button>
            <span className="min-w-20 text-center">Page {Math.min(page, pageCount)} of {pageCount}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </section>
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
