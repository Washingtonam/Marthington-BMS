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

const normalizeWhatsAppNumber = (value) => String(value || "").replace(/\D/g, "").replace(/^0/, "234");

const buildMailLink = (email, subject, body) => (
  `mailto:${encodeURIComponent(email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
);

const buildWhatsAppLink = (phone, message) => {
  const number = normalizeWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";
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
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

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

  const openContactDraft = (business) => {
    setContactBusinessId(business._id);
    setMessageSubject(`A note about ${business.name}`);
    setMessageBody(`Hello ${business.ownerName || "there"},\n\nI’m reaching out regarding ${business.name} and your Marthington BMS workspace.\n\n`);
  };

  const messageMailLink = contactBusiness?.ownerEmail
    ? buildMailLink(contactBusiness.ownerEmail, messageSubject, messageBody)
    : "";
  const messageWhatsAppLink = contactBusiness
    ? buildWhatsAppLink(contactBusiness.whatsappPhone || contactBusiness.ownerPhone || contactBusiness.businessPhone, messageBody)
    : "";

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
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tenants..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm sm:max-w-xs"
        />
      </div>

      {contactBusiness && (
        <section aria-label={`Message ${contactBusiness.name}`} className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Tenant messaging</p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">Draft a message to {contactBusiness.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{contactBusiness.ownerName || "Business owner"} · {contactBusiness.ownerEmail || "No owner email"} · {contactBusiness.whatsappPhone || contactBusiness.ownerPhone || contactBusiness.businessPhone || "No phone number"}</p>
            </div>
            <button type="button" onClick={() => setContactBusinessId("")} aria-label="Close tenant message draft" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Close</button>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="text-xs font-bold text-slate-600">
              Email subject
              <input value={messageSubject} onChange={(event) => setMessageSubject(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Message
              <textarea rows={5} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800" />
            </label>
            <div className="flex flex-wrap gap-2">
              {messageMailLink ? (
                <a href={messageMailLink} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">Open drafted email</a>
              ) : (
                <span className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500">No email address available</span>
              )}
              {messageWhatsAppLink ? (
                <a href={messageWhatsAppLink} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Open WhatsApp draft</a>
              ) : (
                <span className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500">No WhatsApp number available</span>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400">
            <tr>
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
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400">Loading tenants...</td>
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
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{business.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{business.status || "active"}</p>
                    </td>
                    <td className="min-w-56 px-5 py-4 text-slate-500">
                      <p className="font-semibold text-slate-800">{business.ownerName || "Business owner"}</p>
                      {business.ownerEmail ? <a href={buildMailLink(business.ownerEmail, `A note about ${business.name}`, `Hello ${business.ownerName || "there"},\n\n`)} className="mt-1 block text-emerald-700 hover:underline">{business.ownerEmail}</a> : <p className="mt-1">No email address</p>}
                      <p className="mt-1">{business.whatsappPhone || business.ownerPhone || business.businessPhone || "No phone number"}</p>
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
    </section>
  );
};

export default AdminTenantDirectory;
