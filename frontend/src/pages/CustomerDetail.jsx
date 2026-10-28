import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiChevronDown, FiEdit2, FiMail, FiMapPin, FiMessageCircle, FiPhone, FiSearch, FiTrash2, FiUser, FiX } from "react-icons/fi";
import { deleteCustomer, getCustomer, updateCustomer } from "../api/customers.js";
import { getProducts } from "../api/products.js";
import { formatCurrency } from "../utils/formatters.js";
import { buildInvoiceReminderMessage, openWhatsAppMessage } from "../utils/whatsappMessages.js";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

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
  const [categoryError, setCategoryError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productSearchFocused, setProductSearchFocused] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productLoadError, setProductLoadError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", address: "", notes: "", isActive: true, whatsappFollowUpConsent: false, categories: [] });
  const [openSections, setOpenSections] = useState({ quotes: true, invoices: true, services: true, sales: true, chat: true });
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
    let active = true;
    setLoadingProducts(true);
    setProductLoadError("");

    getProducts({ limit: 5000, sort: "name-asc" })
      .then((result) => {
        if (active) setProducts(Array.isArray(result) ? result : []);
      })
      .catch((err) => {
        if (active) {
          setProducts([]);
          setProductLoadError(err.message || "Unable to load products.");
        }
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });

    return () => { active = false; };
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

  const customer = data?.customer && typeof data.customer === "object" ? data.customer : {};
  const sales = Array.isArray(data?.sales) ? data.sales : [];
  const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
  const quotes = invoices.filter((invoice) => invoice?.invoiceType === "quotation");
  const regularInvoices = invoices.filter((invoice) => invoice?.invoiceType !== "quotation");
  const serviceItems = invoices.flatMap((invoice) => (Array.isArray(invoice?.items) ? invoice.items : [])
    .filter((item) => item.service)
    .map((item, index) => ({
      ...item,
      invoiceId: invoice?._id,
      invoiceNumber: invoice?.invoiceNumber,
      createdAt: invoice?.createdAt,
      key: `${invoice?._id || "invoice"}-${index}`
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
  const validProducts = Array.isArray(products) ? products.filter((product) => product && typeof product === "object") : [];
  const filteredProducts = validProducts.filter((product) => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return true;
    return `${product.name || product.productName || ""} ${product.sku || ""}`.toLowerCase().includes(query);
  });

  const generateProductMessage = (productIds = selectedProducts) => {
    const chosen = validProducts.filter((product) => productIds.includes(product._id || product.id));
    const productLines = chosen.map((product) => `• ${product.name || product.productName || "Product"}${product.price ? ` — ${formatCurrency(product.price)}` : ""}`).join("\n");
    setMessageDraft(`Hello ${customer.name || "there"},\n\n${productLines ? `I'd like to share these products with you:\n${productLines}\n\n` : "I wanted to follow up with you.\n\n"}Please let me know if you have any questions or would like to place an order.`);
  };

  const toggleProduct = (id) => {
    const next = selectedProducts.includes(id)
      ? selectedProducts.filter((item) => item !== id)
      : [...selectedProducts, id];
    setSelectedProducts(next);
    setProductSearch("");
    generateProductMessage(next);
  };

  const saveMessageHistory = async (status, messageOverride = null, productNamesOverride = null) => {
    const message = String(messageOverride ?? messageDraft).trim();
    if (!message) return false;
    setHistoryError("");
    const selectedNames = productNamesOverride ?? validProducts
      .filter((product) => selectedProducts.includes(product._id || product.id))
      .map((product) => String(product.name || product.productName || "Product"));
    const entry = {
      message,
      productNames: selectedNames,
      status,
      createdAt: new Date().toISOString()
    };
    const existingHistory = Array.isArray(customer.messageHistory) ? customer.messageHistory : [];
    try {
      const updated = await updateCustomer(customer._id, { messageHistory: [...existingHistory, entry].slice(-100) });
      setData((current) => ({ ...current, customer: updated?.customer || updated || current.customer }));
      return true;
    } catch (err) {
      setHistoryError(err.message || "Unable to save message history.");
      return false;
    }
  };

  const handleOpenWhatsApp = async () => {
    if (!customer.phone || !messageDraft.trim()) return;
    if (openWhatsAppMessage(customer.phone, messageDraft)) {
      await saveMessageHistory("opened_in_whatsapp");
    }
  };

  const generateInvoiceReminder = async (invoice, openImmediately = false) => {
    const invoiceItems = Array.isArray(invoice?.items)
      ? invoice.items.map((item) => item?.name || item?.productName || "Item")
      : [];
    const message = buildInvoiceReminderMessage({
      record: invoice,
      customerName: customer.name || "there"
    });
    if (!message) return;

    setMessageDraft(message);
    await saveMessageHistory("drafted", message, invoiceItems);

    if (openImmediately) {
      if (!customer.phone) {
        setHistoryError("Add a phone number before opening this invoice reminder in WhatsApp.");
        return;
      }
      if (openWhatsAppMessage(customer.phone, message)) {
        await saveMessageHistory("opened_in_whatsapp", message, invoiceItems);
      }
    } else if (typeof document !== "undefined") {
      window.requestAnimationFrame(() => {
        document.querySelector('textarea[aria-label="WhatsApp message"]')?.focus();
      });
    }
  };

  const toggleSection = (section) => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
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

  const openCustomerEditor = () => {
    setEditForm({
      name: String(customer.name || ""),
      phone: String(customer.phone || ""),
      email: String(customer.email || ""),
      address: String(customer.address || ""),
      notes: String(customer.notes || ""),
      isActive: customer.isActive !== false,
      whatsappFollowUpConsent: customer.whatsappFollowUpConsent === true,
      categories: Array.isArray(customer.categories)
        ? customer.categories
        : Array.isArray(customer.tags) ? customer.tags : []
    });
    setEditError("");
    setEditOpen(true);
  };

  const handleCustomerUpdate = async (event) => {
    event.preventDefault();
    const payload = {
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      email: editForm.email.trim(),
      address: editForm.address.trim(),
      notes: editForm.notes.trim(),
      isActive: editForm.isActive,
      whatsappFollowUpConsent: editForm.whatsappFollowUpConsent,
      categories: editForm.categories
    };

    if (!payload.name) {
      setEditError("Customer name is required.");
      return;
    }
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setEditError("Please enter a valid email address, or leave it blank.");
      return;
    }
    if (payload.phone && !/^[+()\d\s-]{7,20}$/.test(payload.phone)) {
      setEditError("Please enter a valid phone number, or leave it blank.");
      return;
    }

    try {
      setSavingEdit(true);
      setEditError("");
      const updated = await updateCustomer(customer._id, payload);
      setData((current) => ({ ...current, customer: updated?.customer || updated || current.customer }));
      setEditOpen(false);
    } catch (err) {
      setEditError(err.message || "Unable to update customer details.");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleCategory = async (category) => {
    setCategoryError("");
    const next = customerCategories.includes(category)
      ? customerCategories.filter((item) => item !== category)
      : [...customerCategories, category];
    try {
      const updated = await updateCustomer(customer._id, { categories: next });
      setData((current) => ({ ...current, customer: updated }));
    } catch (err) {
      setCategoryError(err.message || "Unable to update categories.");
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
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <FiArrowLeft />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Customer profile</p>
              <h1 className="mt-1 break-words text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">{customer.name || "Unnamed customer"}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Customer since {formatDate(customer.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${customer.isActive === false ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"}`}>
              {customer.isActive === false ? "Inactive" : "Active"}
            </span>
            <button type="button" onClick={openCustomerEditor} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><FiEdit2 /> Edit</button>
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
            {categoryError && <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-300">{categoryError}</p>}
            <form onSubmit={addCategory} className="mt-3 flex gap-2">
              <input aria-label="New customer category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="New category" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950" />
              <button type="submit" disabled={!newCategory.trim()} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Add</button>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Product follow-up</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search inventory and add products to a personalized WhatsApp message.</p>
            <div className="relative mt-4">
              <FiSearch className="pointer-events-none absolute left-3 top-3 text-slate-400" />
              <input aria-label="Search products" value={productSearch} onFocus={() => setProductSearchFocused(true)} onBlur={() => window.setTimeout(() => setProductSearchFocused(false), 150)} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search or browse product names..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950" />
              {(productSearchFocused || productSearch.trim()) && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {loadingProducts && <p className="px-3 py-2 text-sm text-slate-500">Loading products...</p>}
                  {!loadingProducts && productLoadError && <p className="px-3 py-2 text-sm text-rose-600">{productLoadError}</p>}
                  {!loadingProducts && !productLoadError && filteredProducts
                    .map((product) => {
                      const productId = product._id || product.id;
                      const productName = product.name || product.productName || "Product";
                      const selected = selectedProducts.includes(productId);
                      return <button key={productId} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleProduct(productId)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><span><span className="font-medium text-slate-800 dark:text-slate-200">{productName}</span>{selected && <span className="ml-2 text-xs font-semibold text-emerald-600">Selected</span>}</span><span className="text-slate-500">{formatCurrency(product.price || 0)}</span></button>;
                    })}
                  {!loadingProducts && !productLoadError && filteredProducts.length === 0 && validProducts.length > 0 && <p className="px-3 py-2 text-sm text-slate-500">No matching products.</p>}
                  {!loadingProducts && !productLoadError && validProducts.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">No products found in inventory.</p>}
                </div>
              )}
            </div>
            {selectedProducts.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {validProducts.filter((product) => selectedProducts.includes(product._id || product.id)).map((product) => {
                  const productId = product._id || product.id;
                  return <button key={productId} type="button" onClick={() => toggleProduct(productId)} aria-label={`Remove ${product.name || product.productName || "Product"}`} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{product.name || product.productName || "Product"} ×</button>;
                })}
              </div>
            )}
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="mb-2 block">WhatsApp message</span>
              <textarea aria-label="WhatsApp message" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} rows="6" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => saveMessageHistory("drafted")} disabled={!messageDraft.trim()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">Save draft</button>
              <button type="button" onClick={handleOpenWhatsApp} disabled={!customer.phone || !messageDraft.trim()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><FiMessageCircle /> Open WhatsApp</button>
            </div>
            {historyError && <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-300">{historyError}</p>}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <button type="button" onClick={() => toggleSection("quotes")} aria-expanded={openSections.quotes} className="flex w-full items-center justify-between gap-3 text-left"><h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quotes</h2><FiChevronDown className={`transition-transform ${openSections.quotes ? "rotate-180" : ""}`} /></button>
            {openSections.quotes && <div className="mt-4 overflow-x-auto">
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
            </div>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <button type="button" onClick={() => toggleSection("invoices")} aria-expanded={openSections.invoices} className="flex w-full items-center justify-between gap-3 text-left"><h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invoices</h2><FiChevronDown className={`transition-transform ${openSections.invoices ? "rotate-180" : ""}`} /></button>
            {openSections.invoices && <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 pr-4">Invoice</th><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Total</th><th className="pb-3 pr-4">Balance</th><th className="pb-3 pr-4">Payment</th><th className="pb-3">Follow-up</th></tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {regularInvoices.length ? regularInvoices.map((invoice) => (
                    <tr key={invoice._id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 pr-4 font-medium">{invoice.invoiceNumber || "Invoice"}</td>
                      <td className="py-3 pr-4">{formatDate(invoice.createdAt)}</td>
                      <td className="py-3 pr-4">{formatCurrency(invoice.totalAmount || 0)}</td>
                      <td className="py-3 pr-4">{formatCurrency(invoice.balanceDue || (Number(invoice.totalAmount || 0) - Number(invoice.amountPaid || 0)))}</td>
                      <td className="py-3 pr-4">{invoice.paymentStatus || (Number(invoice.balanceDue || 0) <= 0 && Number(invoice.totalAmount || 0) > 0 ? "Fully Paid" : Number(invoice.amountPaid || 0) > 0 ? "Partially Paid" : "Unpaid")}</td>
                      <td className="py-3">
                        <div className="flex min-w-max gap-2">
                          <button type="button" onClick={() => generateInvoiceReminder(invoice, false)} aria-label={`Draft WhatsApp follow-up for ${invoice.invoiceNumber || "invoice"}`} className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-300">Draft reminder</button>
                          <button type="button" onClick={() => generateInvoiceReminder(invoice, true)} disabled={!customer.phone} aria-label={`Send WhatsApp reminder for ${invoice.invoiceNumber || "invoice"}`} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><FiMessageCircle /> Send</button>
                        </div>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="6" className="py-6 text-center text-slate-500">No invoices recorded for this customer.</td></tr>}
                </tbody>
              </table>
            </div>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <button type="button" onClick={() => toggleSection("services")} aria-expanded={openSections.services} className="flex w-full items-center justify-between gap-3 text-left"><h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Service history</h2><FiChevronDown className={`transition-transform ${openSections.services ? "rotate-180" : ""}`} /></button>
            {openSections.services && <div className="mt-4 overflow-x-auto">
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
            </div>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <button type="button" onClick={() => toggleSection("sales")} aria-expanded={openSections.sales} className="flex w-full items-center justify-between gap-3 text-left"><h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sales history</h2><FiChevronDown className={`transition-transform ${openSections.sales ? "rotate-180" : ""}`} /></button>
            {openSections.sales && <div className="mt-4 overflow-x-auto">
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
            </div>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <button type="button" onClick={() => toggleSection("chat")} aria-expanded={openSections.chat} className="flex w-full items-center justify-between gap-3 text-left"><h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Message History</h2><FiChevronDown className={`transition-transform ${openSections.chat ? "rotate-180" : ""}`} /></button>
            {openSections.chat && <div className="mt-4 space-y-3">
              {Array.isArray(customer.messageHistory) && customer.messageHistory.length ? [...customer.messageHistory].reverse().map((entry, index) => (
                <article key={`${entry.createdAt || "message"}-${index}`} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.status === "opened_in_whatsapp" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{entry.status === "opened_in_whatsapp" ? "Opened in WhatsApp" : "Draft saved"}</span>
                    <time className="text-xs text-slate-500">{formatDate(entry.createdAt)}{entry.createdAt && !Number.isNaN(new Date(entry.createdAt).getTime()) ? ` ${new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</time>
                  </div>
                  {Array.isArray(entry.productNames) && entry.productNames.length > 0 && <p className="mt-2 text-xs font-medium text-slate-500">Products: {entry.productNames.join(", ")}</p>}
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-300">{String(entry.message || "")}</p>
                </article>
              )) : <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-700">No WhatsApp messages recorded yet.</p>}
            </div>}
          </section>
        </div>
      </div>
      {editOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <form onSubmit={handleCustomerUpdate} className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl dark:bg-slate-900 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600">CRM</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Edit customer</h2>
              </div>
              <button type="button" onClick={() => { setEditOpen(false); setEditError(""); }} aria-label="Close edit customer" className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"><FiX /></button>
            </div>

            <div className="mt-6 space-y-4">
              {[
                { name: "name", label: "Customer name", required: true },
                { name: "phone", label: "Phone" },
                { name: "email", label: "Email", type: "email" },
                { name: "address", label: "Address" }
              ].map((field) => (
                <label key={field.name} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="mb-2 block">{field.label}</span>
                  <input name={field.name} type={field.type || "text"} required={field.required} value={editForm[field.name]} onChange={(event) => setEditForm((current) => ({ ...current, [field.name]: event.target.value, ...(field.name === "phone" && event.target.value !== String(customer.phone || "") ? { whatsappFollowUpConsent: false } : {}) }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950" />
                </label>
              ))}

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="mb-2 block">Notes</span>
                <textarea value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} rows="4" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950" />
              </label>

              {[...new Set([...catalogCategories, ...customerCategories])].length > 0 && (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Categories</legend>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set([...catalogCategories, ...customerCategories])].map((category) => {
                      const checked = editForm.categories.some((item) => String(item).toLowerCase() === category.toLowerCase());
                      return (
                        <label key={category} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>
                          <input type="checkbox" className="sr-only" checked={checked} onChange={(event) => setEditForm((current) => ({ ...current, categories: event.target.checked ? [...current.categories, category] : current.categories.filter((item) => String(item).toLowerCase() !== category.toLowerCase()) }))} />
                          {category}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <label className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={editForm.isActive} onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                Active customer
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-slate-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-slate-200">
                <input type="checkbox" checked={editForm.whatsappFollowUpConsent} onChange={(event) => setEditForm((current) => ({ ...current, whatsappFollowUpConsent: event.target.checked }))} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span>Customer agreed to WhatsApp follow-ups<span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Turn this off if the customer withdraws consent.</span></span>
              </label>
            </div>

            {editError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{editError}</p>}
            <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button type="button" onClick={() => { setEditOpen(false); setEditError(""); }} disabled={savingEdit} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">Cancel</button>
              <button type="submit" disabled={savingEdit} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{savingEdit ? "Saving..." : "Save changes"}</button>
            </div>
          </form>
        </div>
      )}
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