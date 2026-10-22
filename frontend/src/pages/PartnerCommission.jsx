import React, { useEffect, useState } from "react";
import { getAffiliateDashboard, getCommissionClaims, submitCpaClaim } from "../api/affiliates.js";

const currency = (value) => new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0
}).format(Number(value || 0));

const emptySchedule = {
  directReferralBonus: null,
  cpaActions: [],
  payoutMilestones: []
};

const actionKey = (action) => String(action.id || action.name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const claimStatuses = {
  pending: "bg-amber-500/15 text-amber-200",
  approved: "bg-emerald-500/15 text-emerald-200",
  rejected: "bg-rose-500/15 text-rose-200"
};

const PartnerCommission = () => {
  const [affiliate, setAffiliate] = useState(null);
  const [schedule, setSchedule] = useState(emptySchedule);
  const [businesses, setBusinesses] = useState([]);
  const [claims, setClaims] = useState([]);
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const activeCpaActions = schedule.cpaActions.filter((action) => action.active !== false && Number(action.flatFee) > 0);

  useEffect(() => {
    Promise.all([getAffiliateDashboard(), getCommissionClaims()])
      .then(([data, claimsData]) => {
        setAffiliate(data.affiliate || {});
        setSchedule({ ...emptySchedule, ...(data.affiliate?.commissionSchedule || {}) });
        setBusinesses((data.referrals || []).map((item) => ({
          id: item.businessId,
          name: item.businessName
        })));
        setClaims(claimsData.claims || []);
      })
      .catch((loadError) => setError(loadError.message || "Could not load commission details."))
      .finally(() => setLoading(false));
  }, []);

  const submitClaim = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const result = await submitCpaClaim({
        businessId: selectedBusiness,
        action: selectedAction,
        evidence
      });
      setClaims((current) => [result.claim, ...current]);
      setSelectedAction("");
      setSelectedBusiness("");
      setEvidence("");
      setNotice("Your CPA claim was submitted for administrator review.");
    } catch (submitError) {
      setError(submitError.message || "Could not submit the CPA claim.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">Earnings transparency</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Commission Tiers &amp; Structure</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          {import.meta.env.VITE_AFFILIATE_DEMO_MODE === "true"
            ? "Video-guide example using fictional registered businesses, plan prices, and qualifying payments. Actual earnings depend on current terms and payments received."
            : "Your account's current published commission terms, supplemental CPA fees, referral bonuses, and payout milestones."}
        </p>
      </header>

      {error && <p role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}
      {loading && <p role="status" className="text-sm text-slate-400">Loading commission schedule…</p>}

      {!loading && (
        <>
          <section className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">Subscription commission</p>
            <p className="mt-3 text-4xl font-semibold text-white">{Number(affiliate?.currentRate || 0)}%</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Commission is based on qualifying subscription payments made by businesses registered through your agent link. The rate applied to each earning is recorded when it is credited.
            </p>
          </section>

          {Number(schedule.monthlySubscriptionPrice) > 0 && Number(schedule.yearlySubscriptionPrice) > 0 && (
            <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="font-semibold text-white">Subscription pricing example</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Pro · Monthly</p>
                  <p className="mt-2 text-xl font-semibold text-white">{currency(schedule.monthlySubscriptionPrice)} / month</p>
                  <p className="mt-1 text-sm text-emerald-300">{currency(schedule.monthlySubscriptionPrice * Number(affiliate?.currentRate || 0) / 100)} per qualifying payment at {Number(affiliate?.currentRate || 0)}%</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Pro · Yearly</p>
                  <p className="mt-2 text-xl font-semibold text-white">{currency(schedule.yearlySubscriptionPrice)} / year</p>
                  <p className="mt-1 text-sm text-emerald-300">{currency(schedule.yearlySubscriptionPrice * Number(affiliate?.currentRate || 0) / 100)} per qualifying payment at {Number(affiliate?.currentRate || 0)}%</p>
                  <p className="mt-1 text-xs text-slate-500">Save {currency(schedule.yearlySavings)} versus 12 monthly payments.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Free plan</p>
                  <p className="mt-2 text-xl font-semibold text-white">{currency(0)}</p>
                  <p className="mt-1 text-sm text-slate-400">No paid subscription payment, so no subscription commission.</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                {schedule.subscriptionCommissionDescription || "Commission is calculated only on qualifying subscription payments actually received."}
              </p>
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="font-semibold text-white">Flat CPA fees</h2>
              {activeCpaActions.length ? (
                <ul className="mt-4 space-y-3">
                  {activeCpaActions.map((action, index) => (
                    <li key={`${actionKey(action)}-${index}`} className="flex items-start justify-between gap-4 border-t border-white/10 pt-3">
                      <div><p className="font-medium text-slate-200">{action.name}</p><p className="mt-1 text-sm text-slate-400">{action.description}</p></div>
                      <span className="shrink-0 font-semibold text-emerald-300">{currency(action.flatFee)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-slate-400">No active CPA action fees are currently published.</p>}
            </article>

            <article className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="font-semibold text-white">Direct referral bonus</h2>
              {schedule.directReferralBonus && Number(schedule.directReferralBonus.amount) > 0 ? (
                <>
                  <p className="mt-3 text-2xl font-semibold text-emerald-300">{currency(schedule.directReferralBonus.amount)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{schedule.directReferralBonus.description || "Published direct referral bonus."}</p>
                  <p className="mt-2 text-xs text-slate-500">Available once per referred business after its first paid subscription, subject to administrator approval.</p>
                </>
              ) : <p className="mt-3 text-sm text-slate-400">No direct referral bonus is currently configured.</p>}
            </article>
          </section>

          {activeCpaActions.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <h2 className="font-semibold text-white">Submit a CPA claim</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Claims must match an active published action and a business attributed to your agent account. An administrator reviews evidence before any amount is credited.
              </p>
              {businesses.length ? (
                <form onSubmit={submitClaim} className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-slate-300">
                    CPA action
                    <select required value={selectedAction} onChange={(event) => setSelectedAction(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white">
                      <option value="">Choose an action</option>
                      {activeCpaActions.map((action) => <option key={actionKey(action)} value={actionKey(action)}>{action.name} — {currency(action.flatFee)}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-300">
                    Referred business
                    <select required value={selectedBusiness} onChange={(event) => setSelectedBusiness(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white">
                      <option value="">Choose a business</option>
                      {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-300 md:col-span-2">
                    Evidence or context
                    <textarea required minLength={10} maxLength={2000} rows={3} value={evidence} onChange={(event) => setEvidence(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white" placeholder="Describe how the action was completed or add verification details." />
                  </label>
                  <button disabled={submitting} type="submit" className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60 md:col-span-2">
                    {submitting ? "Submitting…" : "Submit for review"}
                  </button>
                </form>
              ) : <p className="mt-4 text-sm text-slate-400">No referred businesses are available for a CPA claim yet.</p>}
            </section>
          )}

          {(error || notice) && <p role={error ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${error ? "border border-rose-400/20 bg-rose-500/10 text-rose-200" : "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"}`}>{error || notice}</p>}

          <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="font-semibold text-white">Supplemental commission claims</h2>
            {claims.length ? (
              <div className="mt-4 space-y-3">
                {claims.map((claim) => (
                  <article key={claim._id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-white">{claim.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{claim.business?.name || claim.description || "Commission milestone"}</p>
                      {claim.evidence && <p className="mt-2 text-xs leading-5 text-slate-500">{claim.evidence}</p>}
                      {claim.adminNote && <p className="mt-2 text-xs leading-5 text-rose-200">Admin note: {claim.adminNote}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-semibold text-emerald-300">{currency(claim.amount)}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${claimStatuses[claim.status] || claimStatuses.pending}`}>{claim.status}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-slate-400">No supplemental claims yet.</p>}
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="font-semibold text-white">Payout milestones</h2>
            {schedule.payoutMilestones.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {schedule.payoutMilestones.map((milestone, index) => (
                  <article key={`${milestone.name}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="font-semibold text-white">{milestone.name}</p>
                    <p className="mt-2 text-sm text-slate-300">Eligible at {currency(milestone.thresholdAmount)} in confirmed earnings</p>
                    {Number(milestone.rewardAmount) > 0 && <p className="mt-1 text-sm text-emerald-300">Milestone reward: {currency(milestone.rewardAmount)}</p>}
                    {milestone.description && <p className="mt-2 text-sm text-slate-400">{milestone.description}</p>}
                  </article>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-slate-400">No payout milestones are currently configured.</p>}
          </section>

          {schedule.payoutMilestones.length > 0 && (
            <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
              Milestone rewards become pending claims after your confirmed earnings reach the configured threshold. All supplemental claims require administrator approval before they are added to your available balance.
            </p>
          )}

          <p className="text-xs leading-5 text-slate-500">
            Commission earnings are credited only for qualifying events recorded by the platform. You can review credited amounts and applied rates in Live Conversions, and track payout requests under Withdrawals &amp; Payouts.
          </p>
        </>
      )}
    </section>
  );
};

export default PartnerCommission;
