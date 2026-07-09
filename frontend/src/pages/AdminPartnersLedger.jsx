import { useEffect, useState } from "react";
import { getPartnersLedger, settleBalance } from "../api/admin.js";
import SettlePayoutModal from "../components/SettlePayoutModal.jsx";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(value || 0);

const AdminPartnersLedger = () => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [expandedId, setExpandedId] = useState(null);
  
  // Settlement modal states
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);

  const loadLedger = async (pageNum = 1, search = "") => {
    setLoading(true);
    setError("");
    try {
      const query = `page=${pageNum}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const data = await getPartnersLedger(query);
      setLedger(data.ledger || []);
      setTotal(data.total || 0);
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
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadLedger(1, searchTerm);
  };

  const handleSettleClick = (partner) => {
    setSelectedPartner(partner);
    setSettleModalOpen(true);
  };

  const handleSettleSuccess = () => {
    loadLedger(page, searchTerm);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Affiliate Network Ledger</h1>
          <p className="text-slate-600 mt-2">View all partner profiles with contact and bank details for settlement processing</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, phone, or affiliate code..."
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-slate-600">Loading partners ledger...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && ledger.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-slate-600">No partners found</p>
          </div>
        )}

        {/* Ledger Table */}
        {!loading && ledger.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">Partner Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">Affiliate Code</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">Bank Details</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-900 uppercase tracking-wider">Wallet Balance</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-900 uppercase tracking-wider">Total Earned</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-900 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ledger.map((partner) => (
                    <tr key={partner._id} className="hover:bg-slate-50 transition-colors">
                      {/* Name & Code */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-slate-900">{partner.name || "—"}</p>
                          <p className="text-xs text-slate-500">{partner.affiliateCode || "—"}</p>
                        </div>
                      </td>

                      {/* Affiliate Code */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="inline-block rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 font-mono">
                          {partner.affiliateCode || "—"}
                        </code>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-slate-900">{partner.email || "—"}</p>
                          <p className="text-sm text-slate-600">{partner.phone || "—"}</p>
                          <p className="text-xs text-slate-500">{partner.address || "—"}</p>
                        </div>
                      </td>

                      {/* Bank Details */}
                      <td className="px-6 py-4">
                        {partner.bankName && partner.accountNumber && partner.accountName ? (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-900">{partner.bankName}</p>
                            <p className="text-sm text-slate-600">{partner.accountName}</p>
                            <p className="text-xs font-mono text-slate-500">{partner.accountNumber}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-amber-600 font-medium">⚠ Incomplete</span>
                        )}
                      </td>

                      {/* Wallet Balance */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(partner.walletBalance || 0)}
                        </p>
                      </td>

                      {/* Total Earned */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <p className="text-sm text-slate-700">
                          {formatCurrency(partner.totalEarned || 0)}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setExpandedId(expandedId === partner._id ? null : partner._id)}
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                          >
                            {expandedId === partner._id ? "Hide" : "View"}
                          </button>
                          {partner.walletBalance > 0 && (
                            <button
                              onClick={() => handleSettleClick(partner)}
                              className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                            >
                              Settle
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => loadLedger(page - 1, searchTerm)}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => loadLedger(p, searchTerm)}
                      className={`px-3 py-1 rounded-lg font-medium ${
                        page === p
                          ? "bg-blue-600 text-white"
                          : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => loadLedger(page + 1, searchTerm)}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Settle Balance Modal */}
      {selectedPartner && (
        <SettlePayoutModal
          isOpen={settleModalOpen}
          onClose={() => setSettleModalOpen(false)}
          affiliate={selectedPartner}
          onSuccess={handleSettleSuccess}
        />
      )}
    </div>
  );
};

export default AdminPartnersLedger;
