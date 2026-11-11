import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getBranches, getInventoryHistory } from "../api/branches.js";
import { useAuth } from "../context/AuthContext.jsx";

const InventoryHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assignedBranchId = user?.branch?._id || user?.branchId || user?.branch || "";
  const canChooseBranch = user?.role === "owner"
    || user?.role === "super_admin"
    || user?.permissions?.canViewAllBranchInventory === true
    || user?.permissions?.canManageAllBranchInventory === true;
  const [branchId, setBranchId] = useState(
    searchParams.get("branchId") || (user?.role === "owner" || user?.role === "super_admin" || !assignedBranchId ? "headOffice" : assignedBranchId)
  );
  const [branches, setBranches] = useState([]);
  const [branchesError, setBranchesError] = useState("");
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = async (pageValue = 1) => {
    try {
      setLoading(true);
      setError("");
      const data = await getInventoryHistory({ branchId, page: pageValue });
      setHistory(Array.isArray(data?.history) ? data.history : []);
      setPagination(data?.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: Array.isArray(data?.history) ? data.history.length : 0,
        hasNextPage: false,
        hasPrevPage: false
      });
    } catch (err) {
      setHistory([]);
      setError(err.message || "Could not load inventory history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getBranches()
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch((err) => {
        setBranches([]);
        setBranchesError(err.message || "Branch names could not be loaded.");
      });
  }, []);

  useEffect(() => {
    setPage(1);
    loadHistory(1);
  }, [branchId]);

  const selectedBranchName = branchId === "headOffice"
    ? "Head Office"
    : branches.find((branch) => branch._id === branchId)?.name || "Selected branch";

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span className="text-sm uppercase tracking-[0.3em] text-slate-500">Inventory audit</span>
          <h1 className="mt-2 text-4xl font-semibold text-slate-900">Stock movement history</h1>
          <p className="mt-2 text-sm text-slate-500">Review recorded purchases, sales, transfers, returns, and manual adjustments.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(`/app/inventory?branchId=${encodeURIComponent(branchId)}`)}>
          Back to inventory
        </button>
      </div>

      <div className="page-card">
        <div className="inventory-history-toolbar">
          <div>
            <label htmlFor="inventory-history-branch" className="block text-sm font-semibold text-slate-700">Location</label>
            <select
              id="inventory-history-branch"
              className="form-select mt-2 w-full"
              value={branchId}
              disabled={!canChooseBranch}
              onChange={(event) => setBranchId(event.target.value)}
            >
              {(user?.role === "owner" || user?.role === "super_admin" || !assignedBranchId) && (
                <option value="headOffice">Head Office</option>
              )}
              {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
              {!canChooseBranch && assignedBranchId && !branches.some((branch) => branch._id === assignedBranchId) && (
                <option value={assignedBranchId}>Assigned branch</option>
              )}
            </select>
          </div>
          <div className="inventory-history-count">
            <span>Location</span>
            <strong>{selectedBranchName}</strong>
            <span>{pagination.totalItems} recorded movements</span>
          </div>
        </div>
        {branchesError && <p role="status" className="mt-2 text-xs text-amber-700">{branchesError} Your movement history is still available.</p>}

        {error && (
          <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <span>{error}</span>
            <button type="button" className="font-semibold underline" onClick={() => loadHistory(page)}>Try again</button>
          </div>
        )}

        <div className="inventory-history-table-wrap mt-5">
          <table className="inventory-history-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Movement</th>
                <th>Quantity</th>
                <th>Stock change</th>
                <th>Recorded by</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="inventory-history-empty">Loading stock history...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan="6" className="inventory-history-empty">No stock movements have been recorded for this location yet.</td></tr>
              ) : history.map((item) => (
                <tr key={item._id}>
                  <td><strong>{item.product?.name || "Deleted product"}</strong><span>SKU: {item.product?.sku || "N/A"}</span></td>
                  <td><span className={`inventory-movement-type is-${item.type}`}>{item.type}</span>{item.note && <small>{item.note}</small>}</td>
                  <td>{Number(item.quantity || 0)}</td>
                  <td>{item.previousStock ?? "-"} <span aria-hidden="true">-&gt;</span> {item.newStock ?? "-"}</td>
                  <td>{item.createdBy?.name || "System"}</td>
                  <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="inventory-history-pagination">
          <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
          <div className="flex items-center gap-2">
            <button type="button" className="btn" disabled={!pagination.hasPrevPage || loading} onClick={() => { const next = Math.max(page - 1, 1); setPage(next); loadHistory(next); }}>Previous</button>
            <button type="button" className="btn" disabled={!pagination.hasNextPage || loading} onClick={() => { const next = page + 1; setPage(next); loadHistory(next); }}>Next</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InventoryHistory;
