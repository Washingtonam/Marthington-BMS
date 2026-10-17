import React, { useEffect, useState } from "react";
import request from "../api/client.js";
import { getCommissionClaims, processCommissionClaim } from "../api/admin.js";

const currency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const AdminAffiliateNetwork = () => {
  const [data, setData] = useState({ affiliates: [], globalRate: 20, stats: {} });
  const [claims, setClaims] = useState([]);
  const [rate, setRate] = useState(20);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [claimError, setClaimError] = useState("");

  const load = async () => {
    try {
      const [response, claimsResponse] = await Promise.all([
        request("/admin/affiliates"),
        getCommissionClaims()
      ]);
      setData(response);
      setRate(response.globalRate || 20);
      setClaims(claimsResponse.claims || []);
    } catch (err) {
      alert(err.message || "Failed to load affiliate network");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRate = async () => {
    if (!window.confirm("Are you sure you want to change the global affiliate commission rate?")) return;

    try {
      setActionLoading("rate");
      const response = await request("/admin/affiliate-settings", {
        method: "PUT",
        body: JSON.stringify({ globalAffiliateRate: Number(rate) })
      });
      setData((current) => ({
        ...current,
        globalRate: response?.settings?.globalAffiliateRate ?? Number(rate)
      }));
      alert("Commission rate updated.");
    } catch (err) {
      alert(err.message || "Failed to update rate");
    } finally {
      setActionLoading("");
    }
  };

  const settle = async (affiliate) => {
    if (!window.confirm(`Are you sure you want to settle ${affiliate.name}'s balance?`)) return;

    try {
      setActionLoading(affiliate._id);
      await request(`/admin/affiliates/${affiliate._id}/payout`, { method: "POST" });
      await load();
    } catch (err) {
      alert(err.message || "Failed to settle balance");
    } finally {
      setActionLoading("");
    }
  };

  const processClaim = async (claim, decision) => {
    const prompt = decision === "approve"
      ? `Approve ${claim.title} for ${currency(claim.amount)} and credit the agent wallet?`
      : `Reject ${claim.title} for ${claim.affiliate?.name || "this agent"}?`;
    if (!window.confirm(prompt)) return;
    let note = "";
    if (decision === "reject") {
      const enteredNote = window.prompt("Optional note for the agent:", "");
      if (enteredNote === null) return;
      note = enteredNote;
    }

    try {
      setActionLoading(`claim-${claim._id}`);
      setClaimError("");
      await processCommissionClaim(claim._id, decision, note);
      setClaims((current) => current.filter((item) => item._id !== claim._id));
    } catch (err) {
      setClaimError(err.message || `Failed to ${decision} commission claim.`);
    } finally {
      setActionLoading("");
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin</span>
            <h1 className="mt-2 text-4xl font-extrabold text-slate-900">Affiliate Network</h1>
          </div>
          <p className="max-w-2xl text-sm text-slate-500">Manage partners, commission configuration, wallet activity, and conversion performance.</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Partners</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{data.stats?.totalPartners || 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Clicks</p>
            <p className="mt-3 text-3xl font-bold text-violet-600">{data.affiliates.reduce((sum, item) => sum + Number(item.clicks || 0), 0)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Conversions</p>
            <p className="mt-3 text-3xl font-bold text-emerald-600">{data.affiliates.reduce((sum, item) => sum + Number(item.conversions || 0), 0)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Live rate</p>
            <p className="mt-3 text-3xl font-bold text-sky-600">{data.globalRate}%</p>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-600">Approval queue</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Supplemental commission claims</h2>
            <p className="mt-1 text-sm text-slate-500">Approve verified CPA actions, first-subscription bonuses, and earnings milestones. Approval credits the agent wallet.</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">{claims.length} pending</span>
        </div>
        {claimError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{claimError}</p>}
        {loading ? (
          <p className="mt-5 text-sm text-slate-500">Loading commission claims…</p>
        ) : claims.length ? (
          <div className="mt-5 space-y-3">
            {claims.map((claim) => (
              <article key={claim._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{claim.title}</h3>
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{claim.kind.replaceAll("_", " ")}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {claim.affiliate?.name || "Agent"} · {claim.affiliate?.affiliateCode || "—"}
                      {claim.business?.name ? ` · ${claim.business.name}` : ""}
                    </p>
                    {claim.description && <p className="mt-2 text-sm text-slate-500">{claim.description}</p>}
                    {claim.evidence && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-white p-3 text-sm leading-5 text-slate-700">{claim.evidence}</p>}
                    <p className="mt-2 text-xs text-slate-400">Submitted {new Date(claim.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                    <p className="text-xl font-bold text-emerald-700">{currency(claim.amount)}</p>
                    <div className="flex gap-2">
                      <button type="button" disabled={actionLoading === `claim-${claim._id}`} onClick={() => processClaim(claim, "reject")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject</button>
                      <button type="button" disabled={actionLoading === `claim-${claim._id}`} onClick={() => processClaim(claim, "approve")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{actionLoading === `claim-${claim._id}` ? "Processing…" : "Approve & credit"}</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No supplemental commission claims are awaiting review.</p>}
      </section>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Global commission rate</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{data.globalRate}%</p>
          </div>
          <div className="flex items-end gap-3">
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Rate (%)
              <input
                type="number"
                min="0"
                max="100"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                className="mt-2 block w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900"
              />
            </label>
            <button
              type="button"
              disabled={actionLoading === "rate"}
              onClick={updateRate}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold uppercase text-white disabled:opacity-50"
            >
              {actionLoading === "rate" ? "Updating..." : "Update Rate"}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-5 py-4">Partner</th>
              <th className="px-5 py-4">Code</th>
              <th className="px-5 py-4">Clicks</th>
              <th className="px-5 py-4">Conversions</th>
              <th className="px-5 py-4">Rate</th>
              <th className="px-5 py-4">Balance</th>
              <th className="px-5 py-4">Lifetime</th>
              <th className="px-5 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                  Loading partners...
                </td>
              </tr>
            ) : (
              data.affiliates.map((affiliate) => (
                <tr key={affiliate._id} className="text-slate-700">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{affiliate.name}</div>
                    <div className="text-[11px] text-slate-500">{affiliate.email}</div>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700">{affiliate.affiliateCode || "—"}</td>
                  <td className="px-5 py-4 font-semibold text-violet-700">{Number(affiliate.clicks || 0)}</td>
                  <td className="px-5 py-4 font-semibold text-emerald-700">{Number(affiliate.conversions || 0)}</td>
                  <td className="px-5 py-4 font-semibold text-sky-700">{Number(affiliate.conversionRate || 0)}%</td>
                  <td className="px-5 py-4 font-semibold text-emerald-700">{currency(affiliate.walletBalance || 0)}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{currency(affiliate.totalEarned || 0)}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      disabled={actionLoading === affiliate._id}
                      onClick={() => settle(affiliate)}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
                    >
                      {actionLoading === affiliate._id ? "Settling..." : "Settle"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminAffiliateNetwork;
