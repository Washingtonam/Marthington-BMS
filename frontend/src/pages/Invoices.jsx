import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import { formatCurrency } from "../utils/formatters.js";

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ====================================
  // DATA LOADING
  // ====================================
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const data = await request("/invoices");
        setInvoices(Array.isArray(data) ? data : data?.invoices || []);
      } catch (err) {
        console.error("Failed to load invoices:", err);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    loadInvoices();
  }, []);

  // ====================================
  // COMPUTED METRICS
  // ====================================
  const metrics = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const paidInvoices = invoices.filter(inv => inv.status === "paid" || inv.status === "completed").length;
    const pendingPayments = invoices.filter(inv => inv.status === "pending" || inv.status === "draft").length;
    const pendingAmount = invoices
      .filter(inv => inv.status === "pending" || inv.status === "draft")
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    return { totalInvoiced, paidInvoices, pendingPayments, pendingAmount };
  }, [invoices]);

  // ====================================
  // FILTERING
  // ====================================
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    if (statusFilter !== "all") {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(inv =>
        inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [invoices, statusFilter, searchTerm]);

  // ====================================
  // ACTIONS
  // ====================================
  const handleMarkAsPaid = async (invoiceId) => {
    if (!confirm("Mark this invoice as paid?")) return;
    try {
      await request(`/invoices/${invoiceId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "paid" })
      });
      setInvoices(invoices.map(inv =>
        inv._id === invoiceId ? { ...inv, status: "paid" } : inv
      ));
    } catch (err) {
      console.error("Failed to update invoice:", err);
    }
  };

  const handleViewPDF = (invoiceId) => {
    window.open(`/api/invoices/${invoiceId}/pdf`, "_blank");
  };

  const handleShareLink = (invoiceId) => {
    const link = `${window.location.origin}/invoices/${invoiceId}`;
    navigator.clipboard.writeText(link);
    alert("Invoice link copied to clipboard!");
  };

  // ====================================
  // EMPTY STATE
  // ====================================
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center">
            <span className="text-5xl">📄</span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900">No Invoices Yet</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Start creating invoices to track your billing and manage customer payments efficiently.
        </p>
        <button
          onClick={() => navigate("/app/billing")}
          className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
        >
          + Create Invoice
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Billing</p>
            <h1 className="text-4xl font-black text-gray-900">Invoices</h1>
          </div>
          <button
            onClick={() => navigate("/app/billing")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg"
          >
            + Create Invoice
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-200 transition-colors">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Total Invoiced</p>
            <p className="text-3xl font-black text-gray-900">{formatCurrency(metrics.totalInvoiced)}</p>
            <p className="text-xs text-gray-400 mt-2">{invoices.length} invoices</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-200 transition-colors">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Pending Payments</p>
            <p className="text-3xl font-black text-amber-600">{formatCurrency(metrics.pendingAmount)}</p>
            <p className="text-xs text-gray-400 mt-2">{metrics.pendingPayments} invoice(s)</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-200 transition-colors">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Paid Invoices</p>
            <p className="text-3xl font-black text-emerald-600">{metrics.paidInvoices}</p>
            <p className="text-xs text-gray-400 mt-2">Completed payments</p>
          </div>
        </div>

        {/* FILTER & SEARCH */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold"
            />

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* INVOICE TABLE */}
        {filteredInvoices.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-gray-700">Invoice</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-700">Customer</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-right font-bold text-gray-700">Amount</th>
                    <th className="px-6 py-4 text-center font-bold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map(invoice => (
                    <tr key={invoice._id} className="hover:bg-gray-50 transition-colors">
                      {/* INVOICE INFO */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-gray-900">#{invoice.invoiceNumber || invoice._id?.slice(-6)}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                      </td>

                      {/* CUSTOMER */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{invoice.customerName || "N/A"}</p>
                      </td>

                      {/* STATUS BADGE */}
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 font-bold text-xs rounded-full transition-colors ${
                            invoice.status === "paid" || invoice.status === "completed"
                              ? "bg-emerald-50 text-emerald-700"
                              : invoice.status === "overdue"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : "Draft"}
                        </span>
                      </td>

                      {/* AMOUNT */}
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-gray-900 text-base">{formatCurrency(invoice.totalAmount || 0)}</p>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewPDF(invoice._id)}
                            className="px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View PDF"
                          >
                            📄
                          </button>
                          <button
                            onClick={() => handleShareLink(invoice._id)}
                            className="px-3 py-1 text-xs font-bold text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Share Link"
                          >
                            🔗
                          </button>
                          {(invoice.status === "pending" || invoice.status === "draft") && (
                            <button
                              onClick={() => handleMarkAsPaid(invoice._id)}
                              className="px-3 py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Mark as Paid"
                            >
                              ✓
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Invoices;