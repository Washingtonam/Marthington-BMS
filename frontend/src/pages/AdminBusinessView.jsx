import React, { Fragment, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import request from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const AdminBusinessView = () => {
  const { id } = useParams();
  const { startImpersonation, refreshBusiness } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [processing, setProcessing] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState("");
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmation: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  const [data, setData] = useState({
    business: null,
    products: [],
    sales: [],
    users: []
  });

  const loadBusiness = async () => {
    try {
      const res = await request(`/admin/business/${id}`);
      setData(res);
    } catch (err) {
      console.error(err);
      alert("Failed to load business");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadBusiness();
  }, [id]);

  const handlePlanChange = async (plan, billingCycle = "monthly") => {
    try {
      setProcessing(true);

      await request(`/admin/business/${id}/subscription`, {
        method: "PUT",
        body: JSON.stringify({
          plan,
          billingCycle
        })
      });

      await loadBusiness();
      await refreshBusiness(); // 🔥 GLOBAL SYNC FIX

    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!window.confirm("Suspend this business? Users will be blocked from logging in.")) return;
    try {
      setProcessing(true);
      await request(`/admin/business/${id}/suspend`, { method: "PUT" });
      await loadBusiness();
    } catch (err) {
      alert(err.message || "Failed to suspend business");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnsuspend = async () => {
    try {
      setProcessing(true);
      await request(`/admin/business/${id}/unsuspend`, { method: "PUT" });
      await loadBusiness();
    } catch (err) {
      alert(err.message || "Failed to unsuspend business");
    } finally {
      setProcessing(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm("Archive this business? Users will be blocked but data kept.")) return;
    try {
      setProcessing(true);
      await request(`/admin/business/${id}/archive`, { method: "PUT" });
      await loadBusiness();
    } catch (err) {
      alert(err.message || "Failed to archive business");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnarchive = async () => {
    try {
      setProcessing(true);
      await request(`/admin/business/${id}/unarchive`, { method: "PUT" });
      await loadBusiness();
    } catch (err) {
      alert(err.message || "Failed to unarchive business");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this business and ALL its data? This is irreversible and frees emails.")) return;
    const reason = window.prompt("Reason for permanent deletion (required):");
    if (!reason || !reason.trim()) {
      alert("Deletion reason is required");
      return;
    }
    try {
      setProcessing(true);
      await request(`/admin/business/${id}?permanent=true`, { method: "DELETE", body: JSON.stringify({ reason }) });
      await loadBusiness();
    } catch (err) {
      alert(err.message || "Failed to delete business");
    } finally {
      setProcessing(false);
    }
  };

  const handlePasswordUpdate = async (event, user) => {
    event.preventDefault();
    if (passwordForm.password.length < 8) {
      setPasswordMessage("Password must be at least 8 characters.");
      return;
    }
    if (passwordForm.password !== passwordForm.confirmation) {
      setPasswordMessage("Passwords do not match.");
      return;
    }

    try {
      setPasswordSaving(true);
      setPasswordMessage("");
      const result = await request(`/admin/business/${id}/users/${user._id}/password`, {
        method: "PUT",
        body: JSON.stringify({ password: passwordForm.password })
      });
      setPasswordForm({ password: "", confirmation: "" });
      setPasswordMessage(result.message || "User password updated.");
    } catch (error) {
      setPasswordMessage(error.message || "Could not update user password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl space-y-5" aria-label="Loading business">
        <div className="h-56 animate-pulse rounded-[2rem] bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      </section>
    );
  }
  const { business, products, sales, users } = data;
  const subscription = business?.subscription || {};
  const businessStatus = business?.status || "active";
  const statusTone = businessStatus === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : businessStatus === "suspended" || businessStatus === "deleted"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
  const tabs = [
    { id: "overview", label: "Overview", count: null },
    { id: "products", label: "Products", count: products.length },
    { id: "sales", label: "Sales", count: sales.length },
    { id: "staff", label: "Staff", count: users.length }
  ];

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-7 text-white shadow-xl sm:px-9 sm:py-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <button type="button" onClick={() => navigate("/admin/tenants")} className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-slate-300 transition hover:text-white">
              <span aria-hidden="true">←</span> Tenant directory
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">{business?.industryType || "Retail"}</span>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-bold capitalize ${statusTone}`}>{businessStatus}</span>
            </div>
            <h1 className="mt-4 break-words text-3xl font-black tracking-tight sm:text-4xl">{business?.name || "Business profile"}</h1>
            <p className="mt-2 text-sm text-slate-300">{business?.ownerName || "Business owner"}{business?.ownerEmail ? ` · ${business.ownerEmail}` : ""}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-lg px-3 py-1.5 font-extrabold capitalize ${subscription.plan === "pro" ? "bg-emerald-300 text-slate-950" : "bg-white/10 text-slate-100"}`}>{subscription.plan || "free"} plan</span>
              <span className="rounded-lg border border-white/15 px-3 py-1.5 font-semibold capitalize text-slate-200">{subscription.status || "trial"}</span>
              {subscription.expiresAt && <span className="px-1 text-slate-300">Renews / expires {new Date(subscription.expiresAt).toLocaleDateString()}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { startImpersonation(id); navigate("/app"); }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-extrabold text-slate-950 shadow transition hover:bg-emerald-200"
          >
            Access business account <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="business-controls-title">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 id="business-controls-title" className="text-sm font-extrabold text-slate-900">Business controls</h2>
            <p className="mt-1 text-xs text-slate-500">Manage plan, access, and the business lifecycle.</p>
          </div>
          {processing && <span role="status" className="text-xs font-semibold text-emerald-700">Updating business…</span>}
        </div>
        <div className="flex flex-wrap gap-2 p-4 sm:p-5">
          <button type="button" disabled={processing} onClick={() => handlePlanChange("pro", "monthly")} className="rounded-xl bg-emerald-700 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50">Upgrade · Monthly</button>
          <button type="button" disabled={processing} onClick={() => handlePlanChange("pro", "yearly")} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50">Upgrade · Yearly</button>
          <button type="button" disabled={processing} onClick={() => handlePlanChange("free")} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Downgrade</button>
          {business?.status !== "suspended" && business?.status !== "deleted" && <button type="button" disabled={processing} onClick={handleSuspend} className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50">Suspend access</button>}
          {business?.status === "suspended" && <button type="button" disabled={processing} onClick={handleUnsuspend} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50">Restore access</button>}
          {business?.status !== "archived" && <button type="button" disabled={processing} onClick={handleArchive} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Archive</button>}
          {business?.status === "archived" && <button type="button" disabled={processing} onClick={handleUnarchive} className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-bold text-sky-800 transition hover:bg-sky-100 disabled:opacity-50">Restore from archive</button>}
          <button type="button" disabled={processing} onClick={handleDelete} className="ml-auto rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">Permanently delete</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-3 sm:px-5" role="tablist" aria-label="Business details">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`business-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`business-panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-sm font-bold transition ${tab === item.id ? "border-emerald-600 bg-emerald-50/60 text-emerald-800" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
            >
              {item.label}
              {item.count !== null && <span className={`rounded-full px-2 py-0.5 text-[10px] ${tab === item.id ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{item.count}</span>}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div id="business-panel-overview" role="tabpanel" aria-labelledby="business-tab-overview" className="space-y-5 p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Products", value: products.length, detail: "Items in this workspace", tone: "emerald" },
                { label: "Recent sales", value: sales.length, detail: "Latest 20 sales records", tone: "sky" },
                { label: "Team members", value: users.length, detail: "Registered workspace users", tone: "violet" }
              ].map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{metric.value.toLocaleString()}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{metric.detail}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">Owner contact</p>
                <h3 className="mt-2 text-base font-extrabold text-slate-900">{business?.ownerName || "Business owner"}</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {business?.ownerEmail ? <a className="block font-semibold text-emerald-700 hover:underline" href={`mailto:${business.ownerEmail}`}>{business.ownerEmail}</a> : <p className="text-slate-500">No owner email on file</p>}
                  {business?.ownerPhone && <a className="block text-slate-600 hover:text-emerald-700" href={`tel:${business.ownerPhone}`}>{business.ownerPhone}</a>}
                  {business?.businessPhone && <p className="text-slate-500">Business: {business.businessPhone}</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">Subscription</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-slate-500">Plan</p><p className="mt-1 font-bold capitalize text-slate-900">{subscription.plan || "free"}</p></div>
                  <div><p className="text-xs text-slate-500">Status</p><p className="mt-1 font-bold capitalize text-slate-900">{subscription.status || "trial"}</p></div>
                  <div><p className="text-xs text-slate-500">Billing cycle</p><p className="mt-1 font-bold capitalize text-slate-900">{subscription.billingCycle || "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Industry</p><p className="mt-1 font-bold capitalize text-slate-900">{business?.industryType || "retail"}</p></div>
                </div>
                {subscription.expiresAt && <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Expires {new Date(subscription.expiresAt).toLocaleDateString()}</p>}
              </div>
            </div>
          </div>
        )}

        {tab === "products" && (
          <div id="business-panel-products" role="tabpanel" aria-labelledby="business-tab-products" className="p-4 sm:p-6">
            {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                <p className="text-sm font-bold text-slate-800">No products yet</p>
                <p className="mt-1 text-xs text-slate-500">Products added to this workspace will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{products.map((product) => <tr key={product._id} className="hover:bg-slate-50/70"><td className="px-4 py-3.5 font-semibold text-slate-900">{product.name}</td><td className="px-4 py-3.5 font-semibold text-slate-700">{formatCurrency(product.price)}</td><td className="px-4 py-3.5 text-slate-600">{product.stock ?? "—"}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "sales" && (
          <div id="business-panel-sales" role="tabpanel" aria-labelledby="business-tab-sales" className="p-4 sm:p-6">
            {sales.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                <p className="text-sm font-bold text-slate-800">No sales recorded</p>
                <p className="mt-1 text-xs text-slate-500">Recent sales activity will show here when available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Sale amount</th><th className="px-4 py-3">Date</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{sales.map((sale) => <tr key={sale._id} className="hover:bg-slate-50/70"><td className="px-4 py-3.5 font-bold text-slate-900">{formatCurrency(sale.totalAmount)}</td><td className="px-4 py-3.5 text-slate-600">{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : "—"}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "staff" && (
          <div id="business-panel-staff" role="tabpanel" aria-labelledby="business-tab-staff" className="p-4 sm:p-6">
            {users.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                <p className="text-sm font-bold text-slate-800">No team members found</p>
                <p className="mt-1 text-xs text-slate-500">Workspace users and their roles will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Team member</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Password</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{users.map((user) => (
                    <Fragment key={user._id}>
                      <tr className="hover:bg-slate-50/70">
                        <td className="px-4 py-3.5 font-semibold text-slate-900">{user.name || "Unnamed user"}</td>
                        <td className="px-4 py-3.5 text-slate-600">{user.email || "—"}</td>
                        <td className="px-4 py-3.5"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">{user.role || "staff"}</span></td>
                        <td className="px-4 py-3.5 text-slate-600">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordUserId((current) => current === user._id ? "" : user._id);
                              setPasswordForm({ password: "", confirmation: "" });
                              setPasswordMessage("");
                            }}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            {passwordUserId === user._id ? "Cancel" : "Set password"}
                          </button>
                        </td>
                      </tr>
                      {passwordUserId === user._id && (
                        <tr>
                          <td colSpan={5} className="bg-slate-50 p-4">
                            <form onSubmit={(event) => handlePasswordUpdate(event, user)} className="space-y-3">
                              <p className="text-xs font-semibold text-slate-700">Set a new password for {user.name || user.email} (at least 8 characters).</p>
                              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                  New password
                                  <input
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    value={passwordForm.password}
                                    onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                                  />
                                </label>
                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                  Confirm password
                                  <input
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    value={passwordForm.confirmation}
                                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirmation: event.target.value }))}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                                  />
                                </label>
                                <button type="submit" disabled={passwordSaving} className="self-end rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                                  {passwordSaving ? "Updating..." : "Update password"}
                                </button>
                              </div>
                              {passwordMessage && <p role="status" className="text-xs font-semibold text-slate-600">{passwordMessage}</p>}
                            </form>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </section>
  );
};

export default AdminBusinessView;