import { useState } from "react";
import { settleBalance } from "../api/admin.js";

const SettlePayoutModal = ({ isOpen, onClose, affiliate, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const settlementAmount = Number(amount);
    if (!settlementAmount || settlementAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (settlementAmount > affiliate.walletBalance) {
      setError(`Amount cannot exceed wallet balance of ₦${affiliate.walletBalance.toLocaleString()}`);
      return;
    }

    try {
      setLoading(true);
      await settleBalance({
        affiliateId: affiliate.affiliate,
        amount: settlementAmount,
        note
      });

      // Success - reset form and close
      setAmount("");
      setNote("");
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to settle balance");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold text-white">Settle Partner Balance</h2>
          <p className="text-blue-100 text-sm mt-1">{affiliate.name}</p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Wallet Balance Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-slate-600">Current Wallet Balance</p>
            <p className="text-2xl font-bold text-blue-600">
              ₦{affiliate.walletBalance.toLocaleString()}
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Settlement Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-500 text-lg">₦</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount to settle"
                className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
                disabled={loading}
              />
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Admin Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for the partner (e.g., 'Processed on 2024-01-15')"
              rows="3"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Settlement Summary */}
          {amount && !error && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-slate-600">
                Settlement Amount: <span className="font-bold text-green-600">₦{Number(amount).toLocaleString()}</span>
              </p>
              <p className="text-sm text-slate-600">
                New Balance: <span className="font-bold text-green-600">₦{(affiliate.walletBalance - Number(amount)).toLocaleString()}</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Processing..." : "Confirm Settlement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettlePayoutModal;
