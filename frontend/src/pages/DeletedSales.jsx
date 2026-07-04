import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency } from "../utils/formatters.js";
import { notifySalesUpdated } from "../utils/salesEvents.js";

const DeletedSales = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoringId, setRestoringId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const loadArchive = async () => {
    try {
      setLoading(true);
      const data = await request("/sales/archive");
      setSales(data);
    } catch (err) {
      setError(err.message || "Unable to load archived sales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== "owner" && user?.role !== "super_admin") {
      navigate("/app/reports", { replace: true });
      return;
    }

    loadArchive();
  }, [navigate, user?.role]);

  const handleRestore = async (sale) => {
    try {
      setRestoringId(sale._id);
      await request(`/sales/${sale._id}/restore`, { method: "POST" });
      setStatusMessage(`Restored receipt #${sale.receiptId}`);
      notifySalesUpdated();
      await loadArchive();
    } catch (err) {
      setError(err.message || "Unable to restore sale");
    } finally {
      setRestoringId(null);
    }
  };

  if (loading) return <div className="p-6">Loading archive...</div>;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span>Archive Vault</span>
          <h1>Deleted Transactions</h1>
        </div>
        <p>Owner-only view of archived receipts and deleted sales history.</p>
      </div>

      {error && <div className="form-error">{error}</div>}
      {statusMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{statusMessage}</div>}

      <div className="tool-panel">
        <div className="panel-heading">
          <div>
            <h2>Archived Receipts</h2>
            <p className="text-sm text-gray-500 mt-1">These records remain visible for audit purposes but are excluded from active reports.</p>
          </div>
          <div className="text-sm text-gray-500">{sales.length} archived</div>
        </div>

        <div className="product-table">
          <div className="product-row product-row-head">
            <span>Receipt</span>
            <span>Archived At</span>
            <span>Total</span>
            <span>Status</span>
          </div>

          {!sales.length && <div className="empty-state">No archived sales yet.</div>}

          {sales.map((sale) => (
            <div key={sale._id} className="product-row">
              <span>
                <div className="font-semibold text-slate-800">#{sale.receiptId}</div>
                <div className="text-xs text-gray-500 mt-1">{sale.customerName || "Walk-in"}</div>
              </span>
              <span>{sale.deletedAt ? new Date(sale.deletedAt).toLocaleString() : "—"}</span>
              <span className="font-semibold">{formatCurrency(sale.totalAmount)}</span>
              <span className="flex items-center gap-3">
                <span className="text-rose-600">Archived</span>
                <button type="button" onClick={() => handleRestore(sale)} disabled={restoringId === sale._id} className="rounded-full border border-emerald-200 px-3 py-1 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-60">
                  {restoringId === sale._id ? "Restoring..." : "Restore"}
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DeletedSales;
