import { useMemo, useState } from "react";
import { settleBalance } from "../api/admin.js";

const SettlePayoutModal = ({ isOpen, onClose, affiliate, onSuccess }) => {
  const [mode, setMode] = useState("full");
  const [customAmount, setCustomAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const walletBalance = Number(affiliate?.walletBalance || 0);
  const settlementAmount = useMemo(() => {
    if (mode === "full") return walletBalance;
    const value = Number(customAmount);
    return Number.isFinite(value) ? value : 0;
  }, [customAmount, mode, walletBalance]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "custom") {
      if (!customAmount || Number(customAmount) <= 0) {
        setError("Please enter a valid custom amount");
        return;
      }
      if (Number(customAmount) > walletBalance) {
        setError(`Amount cannot exceed wallet balance of ₦${walletBalance.toLocaleString()}`);
        return;
      }
    }

    try {
      setLoading(true);
      await settleBalance({
        affiliateId: affiliate?.affiliate || affiliate?._id || affiliate?.partnerId,
        amount: settlementAmount,
        note
      });

      setCustomAmount("");
      setNote("");
      setMode("full");
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to settle balance");
    } finally {
      setLoading(false);
    }
  };

  const copyBankDetails = async () => {
    const text = [affiliate?.bankName, affiliate?.accountName, affiliate?.accountNumber].filter(Boolean).join("\n");
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="rounded-t-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200">Manual settlement</p>
              <h2 className="mt-2 text-xl font-semibold">Settle partner balance</h2>
              <p className="mt-1 text-sm text-slate-200">{affiliate?.name || "Partner"}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-white/20 px-3 py-1 text-sm text-white/90 transition hover:bg-white/10">Close</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Current wallet balance</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">₦{walletBalance.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">{affiliate?.affiliateCode || "—"}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Bank details for payment</p>
                <p className="mt-1 text-sm text-slate-600">Send the payout manually using these details.</p>
              </div>
              <button type="button" onClick={copyBankDetails} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100">Copy</button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p><span className="font-semibold">Bank:</span> {affiliate?.bankName || affiliate?.paymentDetails?.bankName || "Not provided"}</p>
              <p><span className="font-semibold">Account Name:</span> {affiliate?.accountName || affiliate?.paymentDetails?.accountName || "Not provided"}</p>
              <p><span className="font-semibold">Account Number:</span> {affiliate?.accountNumber || affiliate?.paymentDetails?.accountNumber || "Not provided"}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button type="button" onClick={() => setMode("full")} className={`rounded-xl border px-4 py-3 text-left transition ${mode === "full" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
              <p className="font-semibold">Settle full balance</p>
              <p className="mt-1 text-sm opacity-80">Clear the entire outstanding ledger balance.</p>
            </button>
            <button type="button" onClick={() => setMode("custom")} className={`rounded-xl border px-4 py-3 text-left transition ${mode === "custom" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
              <p className="font-semibold">Settle custom amount</p>
              <p className="mt-1 text-sm opacity-80">Enter a partial payout amount manually.</p>
            </button>
          </div>

          {mode === "custom" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Custom settlement amount</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₦</span>
                <input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-8 pr-4 text-slate-900 outline-none ring-0 focus:border-emerald-500" min="0" step="1" placeholder="Enter amount" />
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Admin note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows="3" className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500" placeholder="Optional memo for the ledger entry" />
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Settlement amount</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">₦{settlementAmount.toLocaleString()}</p>
            <p className="mt-2 text-sm text-slate-500">Remaining balance after settlement: ₦{Math.max(walletBalance - settlementAmount, 0).toLocaleString()}</p>
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={loading || (mode === "custom" && (!customAmount || Number(customAmount) <= 0))} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Processing..." : "Confirm settlement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettlePayoutModal;
