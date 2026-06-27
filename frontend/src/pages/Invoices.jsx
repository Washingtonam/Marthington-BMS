import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import request from "../api/client.js";
import { getInvoices, createInvoice, updateInvoicePayment, updateInvoice, deleteInvoice } from "../api/invoices.js";
import { formatCurrency } from "../utils/formatters.js";

const tabOptions = [
  {
    id: "outgoing",
    label: "Customer Invoices (Accounts Receivable)"
  },
  {
    id: "incoming",
    label: "Supplier Invoices (Accounts Payable)"
  }
];

const Invoices = () => {
  const navigate = useNavigate();
  const [invoiceTab, setInvoiceTab] = useState("outgoing");
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentHistory, setPaymentHistory] = useState({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [editFields, setEditFields] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    dueDate: "",
    notes: "",
    status: "",
    invoiceType: ""
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState(null);

  const { isPro, loadingBusiness } = useAuth();

  // ====================================
  // DATA LOADING
  // ====================================
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const data = await getInvoices();
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
    const receivables = invoices.filter(inv => inv.transactionType === "outgoing");
    const payables = invoices.filter(inv => inv.transactionType === "incoming");

    const totalReceivable = receivables.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
    const totalPayable = payables.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
    const overdueDebt = invoices
      .filter(inv => inv.status === "overdue")
      .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
    const overdueReceivables = receivables
      .filter(inv => inv.status === "overdue")
      .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
    const overduePayables = payables
      .filter(inv => inv.status === "overdue")
      .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);

    return {
      totalReceivable,
      totalPayable,
      overdueDebt,
      overdueReceivables,
      overduePayables
    };
  }, [invoices]);

  const displayedInvoices = useMemo(() => {
    const activeInvoices = invoices.filter(inv => inv.transactionType === invoiceTab);
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return activeInvoices
      .filter(inv => {
        const counterparty = invoiceTab === "incoming"
          ? (inv.supplier?.name || inv.customerName || "")
          : (inv.customerName || inv.supplier?.name || "");

        const matchesSearch = !normalizedQuery ||
          inv.invoiceNumber?.toLowerCase().includes(normalizedQuery) ||
          counterparty.toLowerCase().includes(normalizedQuery);

        const matchesStatus = statusFilter === "all" || inv.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [invoices, invoiceTab, statusFilter, searchTerm]);

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
        inv._id === invoiceId ? { ...inv, status: "paid", paymentStatus: "Fully Paid", amountPaid: inv.totalAmount, balanceDue: 0, balance: 0 } : inv
      ));
    } catch (err) {
      console.error("Failed to update invoice:", err);
    }
  };

  const handleCreateInvoice = async () => {
    if (!isPro && !loadingBusiness) {
      navigate("/app/billing");
      return;
    }

    try {
      setCreatingInvoice(true);
      const invoice = await createInvoice({
        customerName: "New Invoice",
        customerPhone: "",
        customerEmail: "",
        items: [],
        tax: 0,
        discount: 0,
        invoiceType: "invoice"
      });
      setInvoices([invoice, ...invoices]);
      alert("Invoice created successfully. Refresh or view the list to continue.");
    } catch (err) {
      console.error("Failed to create invoice:", err);
      if (!isPro) {
        navigate("/app/billing");
      }
    } finally {
      setCreatingInvoice(false);
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

  const handleOpenPaymentModal = (invoice) => {
    setPaymentInvoice(invoice);
    setPaymentAmount(String(invoice.balanceDue || invoice.totalAmount || 0));
    setPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentInvoice(null);
    setPaymentAmount("");
  };

  const handleSubmitPayment = async () => {
    if (!paymentInvoice) return;

    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      alert("Enter a valid payment amount.");
      return;
    }

    if (amount > (paymentInvoice.balanceDue || paymentInvoice.totalAmount || 0)) {
      alert("Payment cannot exceed the invoice balance due.");
      return;
    }

    try {
      const updatedInvoice = await updateInvoicePayment(paymentInvoice._id, amount);
      setInvoices(invoices.map(inv =>
        inv._id === updatedInvoice._id ? updatedInvoice : inv
      ));
      setPaymentHistory(prev => ({
        ...prev,
        [updatedInvoice._id]: [
          ...(prev[updatedInvoice._id] || []),
          {
            date: new Date().toISOString(),
            amount
          }
        ]
      }));
      handleClosePaymentModal();
    } catch (err) {
      console.error("Failed to log payment:", err);
      alert("Unable to record payment. Please try again.");
    }
  };

  const handleOpenEditModal = (invoice) => {
    setEditInvoice(invoice);
    setEditFields({
      customerName: invoice.customerName || "",
      customerPhone: invoice.customerPhone || "",
      customerEmail: invoice.customerEmail || "",
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "",
      notes: invoice.notes || "",
      status: invoice.status || "",
      invoiceType: invoice.invoiceType || ""
    });
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditInvoice(null);
    setEditFields({
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      dueDate: "",
      notes: "",
      status: "",
      invoiceType: ""
    });
  };

  const handleEditFieldChange = (field, value) => {
    setEditFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitEdit = async () => {
    if (!editInvoice) return;

    try {
      const updatedInvoice = await updateInvoice(editInvoice._id, {
        customerName: editFields.customerName,
        customerPhone: editFields.customerPhone,
        customerEmail: editFields.customerEmail,
        dueDate: editFields.dueDate || null,
        notes: editFields.notes,
        status: editFields.status,
        invoiceType: editFields.invoiceType
      });
      setInvoices(invoices.map(inv =>
        inv._id === updatedInvoice._id ? updatedInvoice : inv
      ));
      handleCloseEditModal();
    } catch (err) {
      console.error("Failed to update invoice:", err);
      alert("Unable to save invoice changes. Please try again.");
    }
  };

  const handleOpenDeleteModal = (invoiceId) => {
    setDeleteInvoiceId(invoiceId);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteInvoiceId(null);
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!deleteInvoiceId) return;

    try {
      await deleteInvoice(deleteInvoiceId);
      setInvoices(invoices.filter(inv => inv._id !== deleteInvoiceId));
      handleCloseDeleteModal();
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      alert("Unable to delete invoice. Please try again.");
    }
  };

  const paymentRecords = paymentInvoice ? (paymentHistory[paymentInvoice._id] || []) : [];

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
          onClick={handleCreateInvoice}
          disabled={creatingInvoice || loadingBusiness}
          className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
        >
          {creatingInvoice ? "Creating..." : "+ Create Invoice"}
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Billing</p>
            <h1 className="text-4xl font-black text-gray-900">Invoices</h1>
          </div>
          <button
            onClick={handleCreateInvoice}
            disabled={creatingInvoice || loadingBusiness}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg disabled:opacity-50"
          >
            {creatingInvoice ? "Creating..." : "+ Create Invoice"}
          </button>
        </div>

        {/* TABS */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row gap-3">
            {tabOptions.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInvoiceTab(tab.id)}
                className={`flex-1 rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all ${
                  invoiceTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-200 transition-colors">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Accounts Receivable</p>
                <p className="text-3xl font-black text-gray-900 mt-2">{formatCurrency(metrics.totalReceivable)}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">Money owed to your business from customer invoices.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-200 transition-colors">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Accounts Payable</p>
                <p className="text-3xl font-black text-gray-900 mt-2">{formatCurrency(metrics.totalPayable)}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">Money your business owes suppliers for incoming stock and supplier credit.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-200 transition-colors">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Overdue Debt Tracker</p>
                <p className="text-3xl font-black text-red-600 mt-2">{formatCurrency(metrics.overdueDebt)}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">Total overdue balance from both customer and supplier invoices.</p>
          </div>
        </div>

        {/* FILTER & SEARCH */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm font-bold"
            />

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm font-bold"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* INVOICE TABLE */}
        {displayedInvoices.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-gray-700">Invoice</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-700">Counterparty</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-right font-bold text-gray-700">Amount</th>
                    <th className="px-6 py-4 text-center font-bold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedInvoices.map(invoice => {
                    const counterparty = invoiceTab === "incoming"
                      ? (invoice.supplier?.name || invoice.customerName || "Supplier")
                      : (invoice.customerName || invoice.supplier?.name || "Customer");

                    return (
                      <tr key={invoice._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-gray-900">#{invoice.invoiceNumber || invoice._id?.slice(-6)}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "N/A"}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{counterparty}</p>
                            <p className="text-xs text-slate-500 mt-1">{invoice.transactionType === "incoming" ? "Supplier invoice" : "Customer invoice"}</p>
                          </div>
                        </td>

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

                        <td className="px-6 py-4 text-right">
                          <p className="font-black text-gray-900 text-base">{formatCurrency(invoice.totalAmount || 0)}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Due: {formatCurrency(invoice.balanceDue || 0)}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-wrap justify-center gap-2">
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
                            <button
                              onClick={() => handleOpenEditModal(invoice)}
                              className="px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Invoice"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(invoice._id)}
                              className="px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Invoice"
                            >
                              🗑️
                            </button>
                            {invoice.transactionType === "outgoing" && invoice.balanceDue > 0 && ["pending", "draft", "partial", "overdue"].includes(invoice.status) && (
                              <button
                                onClick={() => handleOpenPaymentModal(invoice)}
                                className="px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Log partial payment"
                              >
                                💰
                              </button>
                            )}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {paymentModalOpen && paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">partial payment</p>
                <h2 className="text-2xl font-black text-slate-900">Log payment for invoice #{paymentInvoice.invoiceNumber || paymentInvoice._id?.slice(-6)}</h2>
                <p className="text-sm text-slate-500 mt-2">Use this form to log installments and update the outstanding balance.</p>
              </div>
              <button
                onClick={handleClosePaymentModal}
                className="text-slate-500 hover:text-slate-900"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Amount due</p>
                  <p className="text-3xl font-black text-slate-900">{formatCurrency(paymentInvoice.balanceDue || 0)}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Paid so far</p>
                  <p className="text-3xl font-black text-slate-900">{formatCurrency(paymentInvoice.amountPaid || 0)}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Payment status</p>
                  <p className="text-3xl font-black text-slate-900">{paymentInvoice.paymentStatus || "Unpaid"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Payment amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="text-xs text-slate-500">Enter the installment amount to log against this invoice.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Next payment date</p>
                  <p className="text-base font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                  <p className="text-sm text-slate-500 mt-2">This record updates the current balance and payment summary.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">Payment timeline</p>
                  <p className="text-xs text-slate-500">{paymentRecords.length} installment(s)</p>
                </div>

                {paymentRecords.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    No installments logged yet. Submit a payment to create a timeline entry.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentRecords.map((entry, index) => (
                      <div key={`${entry.date}-${index}`} className="rounded-2xl border border-slate-200 p-4 bg-white">
                        <p className="font-semibold text-slate-900">{formatCurrency(entry.amount)}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(entry.date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:justify-end">
              <button
                onClick={handleClosePaymentModal}
                className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPayment}
                className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Log Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest">confirm delete</p>
                  <h2 className="text-2xl font-black text-slate-900">Delete invoice</h2>
                  <p className="text-sm text-slate-500 mt-2">This action cannot be undone. The invoice and any linked supplier/customer history will be removed.</p>
                </div>
                <button
                  onClick={handleCloseDeleteModal}
                  className="text-slate-500 hover:text-slate-900"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 rounded-3xl bg-red-50 border border-red-100 p-6">
                <p className="text-sm text-red-700">Are you sure you want to permanently delete this invoice?</p>
                <p className="text-xs text-slate-500 mt-2">This will remove it from the invoice list and adjust associated balances.</p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={handleCloseDeleteModal}
                  className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteInvoice}
                  className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
                >
                  Delete Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && editInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">edit invoice</p>
                <h2 className="text-2xl font-black text-slate-900">Edit #{editInvoice.invoiceNumber || editInvoice._id?.slice(-6)}</h2>
                <p className="text-sm text-slate-500 mt-2">Update invoice details before saving.</p>
              </div>
              <button
                onClick={handleCloseEditModal}
                className="text-slate-500 hover:text-slate-900"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  {editInvoice.transactionType === "incoming" ? "Supplier Name" : "Customer Name"}
                  <input
                    value={editFields.customerName}
                    onChange={e => handleEditFieldChange("customerName", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  {editInvoice.transactionType === "incoming" ? "Supplier Email" : "Customer Email"}
                  <input
                    value={editFields.customerEmail}
                    onChange={e => handleEditFieldChange("customerEmail", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  {editInvoice.transactionType === "incoming" ? "Supplier Phone" : "Customer Phone"}
                  <input
                    value={editFields.customerPhone}
                    onChange={e => handleEditFieldChange("customerPhone", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Due Date
                  <input
                    type="date"
                    value={editFields.dueDate}
                    onChange={e => handleEditFieldChange("dueDate", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Invoice Type
                  <select
                    value={editFields.invoiceType}
                    onChange={e => handleEditFieldChange("invoiceType", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="quotation">Quotation</option>
                    <option value="proforma">Proforma</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  Status
                  <select
                    value={editFields.status}
                    onChange={e => handleEditFieldChange("status", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>

              <label className="space-y-2 text-sm font-bold text-slate-700">
                Notes
                <textarea
                  value={editFields.notes}
                  onChange={e => handleEditFieldChange("notes", e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:justify-end">
              <button
                onClick={handleCloseEditModal}
                className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEdit}
                className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Invoices;