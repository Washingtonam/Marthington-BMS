import { useEffect, useMemo, useState } from "react";
import { getAffiliateLedgerOverview, getPartnerPayoutHistory, getPartnersLedger, getPendingPayoutRequests, getWithdrawalHistory, rejectPayoutRequest, settlePayoutRequest, updateAffiliateSettings } from "../api/admin.js";
import SettlePayoutModal from "../components/SettlePayoutModal.jsx";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const AdminPartnersLedger = () => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [stats, setStats] = useState({ totalPartners: 0, pendingPayouts: 0, totalPaidCommissions: 0 });
  const [commissionRate, setCommissionRate] = useState(20);
  const [rateUpdating, setRateUpdating] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showWithdrawalHistory, setShowWithdrawalHistory] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);

  const loadLedger = async (pageNum = 1, search = "") => {
    setLoading(true);
    setError("");
    try {
      const query = `page=${pageNum}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const [overviewData, ledgerData] = await Promise.all([
        getAffiliateLedgerOverview(),
        getPartnersLedger(query)
      ]);

      const nextStats = overviewData?.stats || {};
      setStats({
        totalPartners: Number(nextStats.totalPartners || overviewData?.affiliates?.length || 0),
        pendingPayouts: Number(nextStats.pendingPayouts || 0),
        totalPaidCommissions: Number(nextStats.totalPaidCommissions || 0)
      });
      setCommissionRate(Number(overviewData?.globalRate || overviewData?.settings?.globalAffiliateRate || 20));
      setLedger(ledgerData?.ledger || []);
      setTotal(ledgerData?.total || 0);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load ledger:", err);
      setError(err.message || "Failed to load partners ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger(1, searchTerm);
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      const data = await getPendingPayoutRequests();
      setPendingRequests(data?.requests || []);
    } catch (err) {
      console.error("Failed to load pending requests", err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadLedger(1, searchTerm);
  };

  const handleRateUpdate = async () => {
    try {
      setRateUpdating(true);
      const data = await updateAffiliateSettings({ globalAffiliateRate: Number(commissionRate) });
      setCommissionRate(Number(data?.settings?.globalAffiliateRate ?? commissionRate));
    } catch (err) {
      setError(err.message || "Failed to update rate");
    } finally {
      setRateUpdating(false);
    }
  };

  const handleSettleClick = (partner) => {
    setSelectedPartner(partner);
    setSettleModalOpen(true);
  };

  const handleHistoryClick = async (partner) => {
    try {
      const data = await getPartnerPayoutHistory(partner.affiliate || partner._id);
      setHistoryItems(data?.history || []);
      setSelectedPartner(partner);
      setHistoryModalOpen(true);
    } catch (err) {
      setError(err.message || "Failed to load payout history");
    }
  };

  const handleSettleSuccess = () => {
    loadLedger(page, searchTerm);
    loadPendingRequests();
  };

  const handleApproveRequest = async (requestId) => {
    try {
      await settlePayoutRequest(requestId, { note: "Approved by admin" });
      await loadPendingRequests();
      await loadLedger(page, searchTerm);
    } catch (err) {
      setError(err.message || "Failed to settle payout request");
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await rejectPayoutRequest(requestId, { note: "Rejected by admin" });
      await loadPendingRequests();
      await loadLedger(page, searchTerm);
    } catch (err) {
      setError(err.message || "Failed to reject payout request");
    }
  };

  const openWithdrawalHistory = async () => {
    try {
      const data = await getWithdrawalHistory();
      setWithdrawalHistory((data?.history || []).map((item) => ({
        _id: item._id,
        amount: item.amount,
        status: item.status,
        date: item.date,
        note: item.note || "",
        partnerName: item.partnerId?.name || item.partnerName || ""
      })));
      setShowWithdrawalHistory(true);
    } catch (err) {
      setError(err.message || "Failed to load withdrawal history");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const statCards = useMemo(() => [
    { label: "Total Approved Partners", value: stats.totalPartners.toLocaleString(), accent: "from-slate-900 to-slate-700" },
    { label: "Pending Ledger Balances", value: formatCurrency(stats.pendingPayouts), accent: "from-amber-500 to-orange-500" },
    { label: "Commissions Cleared (Lifetime)", value: formatCurrency(stats.totalPaidCommissions), accent: "from-emerald-600 to-emerald-500" }
  ], [stats]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(135deg,_#f8fafc_0%,_#f1f5f9_100%)] p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-8 shadow-[0_20px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Affiliate operations</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Affiliate Network Ledger</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">Track partner balances, adjust the live commission share, and settle payouts directly from a premium admin workspace.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Live Revenue Share</p>
              <p className="mt-1">{commissionRate}% dynamic index</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {statCards.map((card) => (
              <div key={card.label} className={`rounded-2xl bg-gradient-to-br ${card.accent} p-[1px]`}>
                <div className="h-full rounded-[15px] bg-white/95 p-5">
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Global commission settings</h2>
              <p className="mt-1 text-sm text-slate-600">Adjust the revenue-share index for future commissions in real time.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input type="number" min="0" max="100" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 sm:w-32" />
              <button onClick={handleRateUpdate} disabled={rateUpdating} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                {rateUpdating ? "Updating..." : "Update Rate"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Pending withdrawal requests</h2>
              <p className="mt-1 text-sm text-slate-600">Approve or reject partner withdrawal requests before settlement.</p>
            </div>
            <button onClick={openWithdrawalHistory} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">View Withdrawal History</button>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Partner name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Amount requested</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Bank details</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Request date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-sm text-slate-500">No pending withdrawal requests.</td>
                    </tr>
                  ) : pendingRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">{request?.affiliate?.name || request?.partnerName || "—"}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{formatCurrency(request.amountRequested || 0)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        <div className="space-y-1">
                          <p>{request.bankSnapshot?.bankName || request.paymentDetails?.bankName || request?.affiliate?.bankName || "—"}</p>
                          <p>{request.bankSnapshot?.accountName || request.paymentDetails?.accountName || request?.affiliate?.accountName || "—"}</p>
                          <p>{request.bankSnapshot?.accountNumber || request.paymentDetails?.accountNumber || request?.affiliate?.accountNumber || "—"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{new Date(request.createdAt || request.created_at || Date.now()).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => handleApproveRequest(request._id)} className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700">Approve & Settle</button>
                          <button onClick={() => handleRejectRequest(request._id)} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Affiliate ledger table</h2>
              <p className="mt-1 text-sm text-slate-600">Each partner includes their bank data and settlement actions for direct payout processing.</p>
            </div>
            <form onSubmit={handleSearch} className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, email, code, or phone" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 lg:w-80" />
              <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">Search</button>
            </form>
          </div>

          {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="mt-8 flex justify-center py-10 text-sm text-slate-500">Loading affiliate ledger...</div>
          ) : ledger.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">No partners found for this filter.</div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Partner identity</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Tracking code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Wallet balance</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Total earned</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Bank data</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Settlement controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {ledger.map((partner) => (
                      <tr key={partner._id} className="align-top hover:bg-slate-50/80">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">{partner.name || "—"}</p>
                            <p className="mt-1 text-sm text-slate-500">{partner.email || "—"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-700">{partner.affiliateCode || "—"}</span>
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-900">{formatCurrency(partner.walletBalance || 0)}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{formatCurrency(partner.totalEarned || 0)}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">{partner.bankName || partner.accountName || partner.accountNumber ? `${partner.bankName || "—"}` : "No bank data saved"}</p>
                            <p>{partner.accountName || "—"}</p>
                            <p>{partner.accountNumber || "—"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => handleHistoryClick(partner)} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">View History</button>
                            <button onClick={() => handleSettleClick(partner)} disabled={(partner.walletBalance || 0) <= 0} className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">Settle Balance</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button onClick={() => loadLedger(page - 1, searchTerm)} disabled={page === 1} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
                <button key={item} onClick={() => loadLedger(item, searchTerm)} className={`rounded-full px-3 py-2 text-sm font-semibold ${page === item ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                  {item}
                </button>
              ))}
              <button onClick={() => loadLedger(page + 1, searchTerm)} disabled={page === totalPages} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      </div>

      {selectedPartner && (
        <SettlePayoutModal isOpen={settleModalOpen} onClose={() => setSettleModalOpen(false)} affiliate={selectedPartner} onSuccess={handleSettleSuccess} />
      )}

      {showWithdrawalHistory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Withdrawal history</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Completed payout requests</h3>
              </div>
              <button onClick={() => setShowWithdrawalHistory(false)} className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Close</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {withdrawalHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No withdrawal history yet.</div>
              ) : (
                <div className="space-y-3">
                  {withdrawalHistory.map((item) => (
                    <div key={item._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{formatCurrency(item.amount || 0)}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.status}</p>
                        </div>
                        <p className="text-sm text-slate-500">{new Date(item.date || Date.now()).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      </div>
                      {item.note && <p className="mt-2 text-sm text-slate-500">{item.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {historyModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Payout history</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{selectedPartner?.name || "Partner"}</h3>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Close</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {historyItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No payout history yet.</div>
              ) : (
                <div className="space-y-3">
                  {historyItems.map((item, index) => (
                    <div key={item._id || index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{formatCurrency(item.amount || 0)}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.status || "Paid"}</p>
                        </div>
                        <p className="text-sm text-slate-500">{new Date(item.date || item.createdAt || Date.now()).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPartnersLedger;
