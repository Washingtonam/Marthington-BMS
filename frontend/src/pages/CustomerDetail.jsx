import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiMail, FiMapPin, FiMessageCircle, FiPhone, FiTrash2, FiUser } from "react-icons/fi";
import { deleteCustomer, getCustomer, updateCustomer } from "../api/customers.js";
import { getProducts } from "../api/products.js";
import { formatCurrency } from "../utils/formatters.js";
import { openWhatsAppMessage } from "../utils/whatsappMessages.js";

const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
}) : "—";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [catalogCategories, setCatalogCategories] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("crm-custom-categories") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let active = true;

    const loadCustomer = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getCustomer(id);
        if (active) setData(result);
      } catch (err) {
        if (active) setError(err.message || "Unable to load this customer.");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (id) loadCustomer();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    getProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!deleteOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !deleting) {
        setDeleteOpen(false);
        setDeleteError("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteOpen, deleting]);

  if (loading) {
    return <section className="mx-auto max-w-7xl p-6 text-sm text-slate-500">Loading customer details...</section>;
  }

  if (error || !data?.customer) {
    return (
      <section className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/50 dark:bg-rose-950/20">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Customer unavailable</h1>
          <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error || "This customer could not be found."}</p>
          <button type="button" onClick={() => navigate("/app/customers")} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <FiArrowLeft /> Back to customers
          </button>
        </div>
      </section>
    );
  }

  const { customer, sales = [], invoices = [] } = data;
  const quotes = invoices.filter((invoice) => invoice.invoiceType === "quotation");
  const regularInvoices = invoices.filter((invoice) => invoice.invoiceType !== "quotation");
  const serviceItems = invoices.flatMap((invoice) => (invoice.items || [])
    .filter((item) => item.service)
    .map((item, index) => ({
      ...item,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt,
      key: `${invoice._id}-${index}`
    })));
  const summary = [
    { label: "Total spent", value: formatCurrency(customer.totalSpent || 0) },
    { label: "Outstanding balance", value: formatCurrency(customer.outstandingBalance || 0) },
    { label: "Sales", value: sales.length },
    { label: "Quotes", value: quotes.length }
  ];

  const customerCategories = Array.isArray(customer.categories)
    ? customer.categories
    : Array.isArray(customer.tags) ? customer.tags : [];

  const generateProductMessage = (productIds = selectedProducts) => {
    const chosen = products.filter((product) => productIds.includes(product._id || product.id));
    const productLines = chosen.map((product) => `• ${product.name || product.productName || "Product"}${product.price ? ` — ${formatCurrency(product.price)}` : ""}`).join("\n");
    setMessageDraft(`Hello ${customer.name || "there"},\n\n${productLines ? `I'd like to share these products with you:\n${productLines}\n\n` : "I wanted to follow up with you.\n\n"}Please let me know if you have any questions or would like to place an order.`);
  };

  const toggleProduct = (id) => {
    const next = selectedProducts.includes(id)
      ? selectedProducts.filter((item) => item !== id)
      : [...selectedProducts, id];
    setSelectedProducts(next);
    generateProductMessage(next);
  };

  const handleOpenWhatsApp = () => {
    if (!customer.phone || !messageDraft.trim()) return;
    openWhatsAppMessage(customer.phone, messageDraft);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setDeleteError("");
      await deleteCustomer(customer._id);
      navigate("/app/customers");
    } catch (err) {
      setDeleteError(err.message || "Failed to delete customer.");
    } finally {
      setDeleting(false);
    }
  };

  const toggleCategory = async (category) => {
    const next = customerCategories.includes(category)
      ? customerCategories.filter((item) => item !== category)
      : [...customerCategories, category];
    try {
      const updated = await updateCustomer(customer._id, { categories: next });
      setData((current) => ({ ...current, customer: updated }));
    } catch (err) {
      setError(err.message || "Unable to update categories.");
    }
  };

  const addCategory = async (event) => {
    event.preventDefault();
    const category = newCategory.trim();
    if (!category || customerCategories.some((item) => item.toLowerCase() === category.toLowerCase())) return;
    const nextCatalog = [...new Set([...catalogCategories, category])];
    setCatalogCategories(nextCatalog);
    localStorage.setItem("crm-custom-categories", JSON.stringify(nextCatalog));
    setNewCategory("");
    await toggleCategory(category);
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <FiArrowLeft />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Customer profile</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">{customer.name}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Customer since {formatDate(customer.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${customer.isActive === false ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"}`}>
              {customer.isActive === false ? "Inactive" : "Active"}
            </span>
            <button type="button" onClick={() => setDeleteOpen(true)} aria-label={`Delete ${customer.name}`} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300"><FiTrash2 /> Delete</button>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.7fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Contact details</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3"><FiPhone className="mt-0.5 shrink-0" /><span>{customer.phone || "No phone number"}</span></div>
              <div className="flex items-start gap-3"><FiMail className="mt-0.5 shrink-0" /><span className="break-all">{customer.email || "No email address"}</span></div>
              <div className="flex items-start gap-3"><FiMapPin className="mt-0.5 shrink-0" /><span>{customer.address || "No address on file"}</span></div>
              <div className="flex items-start gap-3"><FiUser className="mt-0.5 shrink-0" /><span>{customer.loyaltyPoints || 0} loyalty points</span></div>
              <div className="flex items-start gap-3"><FiCalendar className="mt-0.5 shrink-0" /><span>Last purchase: {formatDate(customer.lastPurchaseAt)}</span></div>
              <div className="flex items-start gap-3">
                <FiMessageCircle className="mt-0.5 shrink-0" />
                <span>
                  WhatsApp follow-ups: {customer.whatsappFollowUpConsent ? "Opted in" : "Not opted in"}
                  {customer.whatsappFollowUpConsentAt && <span className="block text-xs text-slate-500">Recorded {formatDate(customer.whatsappFollowUpConsentAt)}</span>}
                </span>
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Notes</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{customer.notes || "No notes saved for this customer."}</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Categories</h2>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Customer categories">
              {[...new Set([...catalogCategories, ...customerCategories])].map((category) => {
                const active = customerCategories.some((item) => item.toLowerCase() === category.toLowerCase());
                return (
                  <button key={category} type="button" onClick={() => toggleCategory(category)} className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                    {category}{active ? " ×" : ""}
                  </button>
                );
              })}
            </div>
            {![...catalogCategories, ...customerCategories].length && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No category tags.</p>}
            <form onSubmit={addCategory} className="mt-3 flex gap-2">
              <input aria-label="New customer category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="New category" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950" />
              <button type="submit" disabled={!newCategory.trim()} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Add</button>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Product follow-up</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Select products to draft a personalized WhatsApp message.</p>
            <div className="mt-4 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
              {products.length ? products.map((product) => {
                const productId = product._id || product.id;
                return (
                  <label key={productId} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="flex items-center gap-2"><input type="checkbox" checked={selectedProducts.includes(productId)} onChange={() => toggleProduct(productId)} className="h-4 w-4 rounded text-emerald-600" />{product.name || product.productName || "Product"}</span>
                    <span className="text-slate-500">{formatCurrency(product.price || 0)}</span>
                  </label>
                );
              }) : <p className="p-2 text-sm text-slate-500">No products available.</p>}
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="mb-2 block">WhatsApp message</span>
              <textarea aria-label="WhatsApp message" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} rows="6" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <button type="button" onClick={handleOpenWhatsApp} disabled={!customer.phone || !messageDraft.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><FiMessageCircle /> Open WhatsApp</button>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quotes</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 pr-4">Quote</th><th className="pb-3 pr-4">Date created</th><th className="pb-3 pr-4">Total</th><th className="pb-3 pr-4">Valid until</th><th className="pb-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {quotes.length ? quotes.map((invoice) => (
                    <tr key={invoice._id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 pr-4 font-medium">{invoice.invoiceNumber || "Quote"}</td>
                      <td className="py-3 pr-4">{formatDate(invoice.createdAt)}</td>
                      <td className="py-3 pr-4">{formatCurrency(invoice.totalAmount || 0)}</td>
                      <td className="py-3 pr-4">{formatDate(invoice.dueDate)}</td>
                      <td className="py-3">{invoice.status || "Draft"}</td>
                    </tr>
                  )) : <tr><td colSpan="5" className="py-6 text-center text-slate-500">No quotes recorded for this customer.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invoices</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 pr-4">Invoice</th><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Total</th><th className="pb-3 pr-4">Balance</th><th className="pb-3">Payment</th></tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {regularInvoices.length ? regularInvoices.map((invoice) => (
                    <tr key={invoice._id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 pr-4 font-medium">{invoice.invoiceNumber || "Invoice"}</td>
                      <td className="py-3 pr-4">{formatDate(invoice.createdAt)}</td>
                      <td className="py-3 pr-4">{formatCurrency(invoice.totalAmount || 0)}</td>
                      <td className="py-3 pr-4">{formatCurrency(invoice.balanceDue || 0)}</td>
                      <td className="py-3">{invoice.paymentStatus || "Unpaid"}</td>
                    </tr>
                  )) : <tr><td colSpan="5" className="py-6 text-center text-slate-500">No invoices recorded for this customer.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Service history</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 pr-4">Service</th><th className="pb-3 pr-4">Order</th><th className="pb-3 pr-4">Recorded</th><th className="pb-3">Progress</th></tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {serviceItems.length ? serviceItems.map((item) => (
                    <tr key={item.key} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 pr-4 font-medium">{item.name || "Service"}</td>
                      <td className="py-3 pr-4">{item.invoiceNumber || "Invoice"}</td>
                      <td className="py-3 pr-4">{formatDate(item.createdAt)}</td>
                      <td className="py-3 capitalize">{String(item.serviceStatus || "pending").replace("_", " ")}</td>
                    </tr>
                  )) : <tr><td colSpan="4" className="py-6 text-center text-slate-500">No service work recorded for this customer.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sales history</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 pr-4">Receipt</th><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Total</th><th className="pb-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {sales.length ? sales.map((sale) => (
                    <tr key={sale._id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 pr-4 font-medium">{sale.receiptId || sale._id?.slice(-8) || "Sale"}</td>
                      <td className="py-3 pr-4">{formatDate(sale.createdAt)}</td>
                      <td className="py-3 pr-4">{formatCurrency(sale.totalAmount || 0)}</td>
                      <td className="py-3">{sale.status || "Completed"}</td>
                    </tr>
                  )) : <tr><td colSpan="4" className="py-6 text-center text-slate-500">No sales recorded for this customer.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
      {deleteOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-customer-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h2 id="delete-customer-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">Delete customer?</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This permanently removes {customer.name}. Customers with transactions or an outstanding balance cannot be deleted.</p>
            {deleteError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setDeleteOpen(false); setDeleteError(""); }} disabled={deleting} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{deleting ? "Deleting..." : "Delete customer"}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

export default CustomerDetail;