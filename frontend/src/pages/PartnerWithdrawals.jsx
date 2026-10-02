import { useEffect, useMemo, useState } from "react";
import { getAffiliateDashboard, requestPayout } from "../api/affiliates.js";

const currency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return value;
  }
};

const statusStyles = {
  pending: "bg-amber-500/15 text-amber-300 border border-amber-400/20",
  approved: "bg-sky-500/15 text-sky-300 border border-sky-400/20",
  paid: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20",
  rejected: "bg-rose-500/15 text-rose-300 border border-rose-400/20"
};

const PartnerWithdrawals = () => {
  const [data, setData] = useState({ affiliate: {}, payoutRequests: [], withdrawalHistory: [] });
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const result = await getAffiliateDashboard();
      setData(result);
    } catch (err) {
      setMessage(err.message || "Unable to load payout details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const affiliate = data?.affiliate || {};
  const payoutRequests = data?.payoutRequests || [];
  const withdrawalHistory = data?.withdrawalHistory || [];

  const pendingAmount = useMemo(
    () => payoutRequests.filter((item) => item.status === "pending").reduce((sum, item) => sum + Number(item.amountRequested || 0), 0),
    [payoutRequests]
  );

  const submit = async () => {
    try {
      const value = Number(amount);
      if (!value || value <= 0) throw new Error("Enter a valid payout amount.");

      const result = await requestPayout({ amount: value });
      setMessage(result.message || "Payout requested.");
      setAmount("");
      await load();
    } catch (err) {
      setMessage(err.message || "Unable to request payout.");
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">Withdrawals</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Withdrawal requests & payout status</h1>
        <p className="mt-2 text-sm text-slate-400">Request a payout and follow every settlement from one page.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
          <p className="text-sm text-emerald-100/70">Available balance</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{currency(affiliate.available ?? affiliate.walletBalance)}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
          <p className="text-sm text-amber-100/70">Pending requests</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{currency(pendingAmount || affiliate.pending)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Paid out</p>
          <p className="mt-2 text-2xl font-semibold text-white">{currency(affiliate.paid)}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-white">Request a payout</h2>
        <p className="mt-1 text-sm text-slate-400">Payouts are sent to the bank account saved in your profile.</p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Amount in NGN"
            className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
          />
          <button
            type="button"
            onClick={submit}
            className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Request payout
          </button>
        </div>

        {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Pending requests</h2>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
              {payoutRequests.filter((item) => item.status === "pending").length} open
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-slate-400">Loading payout requests...</p>
            ) : payoutRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                No payout requests yet.
              </div>
            ) : (
              payoutRequests.map((request) => (
                <div key={request._id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">{currency(request.amountRequested || 0)}</p>
                      <p className="mt-1 text-xs text-slate-400">Requested {formatDate(request.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[request.status] || statusStyles.pending}`}>
                      {request.status}
                    </span>
                  </div>

                  {request.note && <p className="mt-3 text-sm text-slate-300">{request.note}</p>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Settlement history</h2>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
              {withdrawalHistory.length} entries
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {withdrawalHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                No completed withdrawals yet.
              </div>
            ) : (
              withdrawalHistory.slice(0, 8).map((item) => (
                <div key={item._id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">{currency(item.amount || 0)}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(item.date || item.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[item.status] || statusStyles.approved}`}>
                      {item.status}
                    </span>
                  </div>

                  {item.note && <p className="mt-3 text-sm text-slate-300">{item.note}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </section>
  );
};

export default PartnerWithdrawals;