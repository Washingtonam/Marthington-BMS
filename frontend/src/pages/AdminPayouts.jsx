import { useEffect, useState } from "react";
import { getPayoutRequests, approvePayout, rejectPayout } from "../api/admin.js";

const AdminPayouts = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPayoutRequests(`status=${selectedStatus}&limit=100`);
      setRequests(data.requests || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load payout requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, [selectedStatus]);

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this payout request?")) return;
    try {
      setActionLoading(id);
      await approvePayout(id, { note: "Approved by admin" });
      alert("Payout approved successfully");
      load();
    } catch (err) {
      alert(err.message || "Failed to approve payout");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Reject reason (optional):");
    if (reason === null) return; // User cancelled
    try {
      setActionLoading(id);
      await rejectPayout(id, { note: reason || "Rejected by admin" });
      alert("Payout rejected successfully");
      load();
    } catch (err) {
      alert(err.message || "Failed to reject payout");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Affiliate Payout Requests</h1>
          <p className="text-slate-600 mt-2">Manage and process partner withdrawal requests</p>
        </div>

        {/* Status Filter */}
        <div className="mb-6 flex gap-3 flex-wrap">
          {["pending", "processing", "paid", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === status
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-slate-600">Loading payout requests...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-slate-600">No {selectedStatus} payout requests found</p>
          </div>
        )}

        {/* Requests List Cards */}
        {!loading && requests.length > 0 && (
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r._id} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Card Header - Main Info */}
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{r.affiliate?.name || r.affiliateCode}</h3>
                          <p className="text-xs text-slate-500">Code: {r.affiliateCode}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Amount</p>
                          <p className="text-lg font-semibold text-slate-900">₦{Number(r.amountRequested).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Status</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            r.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : r.status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Requested</p>
                          <p className="text-sm text-slate-900">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="md:text-right">
                          <button
                            onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            {expandedId === r._id ? "Hide" : "View"} Details
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading === r._id}
                          onClick={() => handleApprove(r._id)}
                          className="rounded px-4 py-2 bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {actionLoading === r._id ? "..." : "Approve"}
                        </button>
                        <button
                          disabled={actionLoading === r._id}
                          onClick={() => handleReject(r._id)}
                          className="rounded px-4 py-2 bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {actionLoading === r._id ? "..." : "Reject"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === r._id && (
                  <div className="border-t border-slate-200 bg-slate-50 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Contact Info */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Contact Information</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-slate-500">Email</p>
                            <p className="text-slate-900">{r.affiliate?.email || "—"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Phone</p>
                            <p className="text-slate-900">{r.affiliate?.phone || "—"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Address</p>
                            <p className="text-slate-900">{r.affiliate?.address || "—"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bank Details */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">Bank Details</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-slate-500">Bank Name</p>
                            <p className="text-slate-900 font-medium">{r.paymentDetails?.bankName || "—"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Account Name</p>
                            <p className="text-slate-900">{r.paymentDetails?.accountName || "—"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Account Number</p>
                            <p className="text-slate-900 font-mono">{r.paymentDetails?.accountNumber || "—"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPayouts;
