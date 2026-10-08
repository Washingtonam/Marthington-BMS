import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { shopRequest } from "../api/shop.js";
import { formatCurrency } from "../utils/formatters.js";

const orderStatuses = ["received", "sourcing", "preparing_delivery", "out_for_delivery", "delivered", "cancelled"];

const ShopAdmin = () => {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sourceCategories, setSourceCategories] = useState([]);
  const [categoryNames, setCategoryNames] = useState({});
  const [businesses, setBusinesses] = useState([]);
  const [deliveryAreas, setDeliveryAreas] = useState([]);
  const [deliveryAreaDrafts, setDeliveryAreaDrafts] = useState({});
  const [newDeliveryArea, setNewDeliveryArea] = useState({ state: "", city: "", fee: "" });
  const [refundSources, setRefundSources] = useState({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [productPagination, setProductPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [productPage, setProductPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const loadOrders = useCallback(async () => {
    const data = await shopRequest("/admin/orders", { token: localStorage.getItem("bms_token") });
    setOrders(data.orders || []);
  }, []);

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100", search, page: String(productPage) });
    const data = await shopRequest(`/admin/products?${params}`, { token: localStorage.getItem("bms_token") });
    setProducts(data.products || []);
    setProductPagination(data.pagination || { currentPage: 1, totalPages: 1 });
  }, [search, productPage]);

  const loadCategories = useCallback(async () => {
    const data = await shopRequest("/admin/categories", { token: localStorage.getItem("bms_token") });
    setCategories(data.categories || []);
    setSourceCategories(data.sourceCategories || []);
    setCategoryNames(Object.fromEntries((data.categories || []).map((category) => [category._id, category.name])));
  }, []);

  const loadBusinesses = useCallback(async () => {
    const data = await shopRequest("/admin/businesses", { token: localStorage.getItem("bms_token") });
    setBusinesses(data.businesses || []);
  }, []);

  const loadDeliveryAreas = useCallback(async () => {
    const data = await shopRequest("/admin/delivery-areas", { token: localStorage.getItem("bms_token") });
    setDeliveryAreas(data.areas || []);
    setDeliveryAreaDrafts(Object.fromEntries((data.areas || []).map((area) => [area._id, {
      state: area.state,
      city: area.city,
      fee: String(area.fee)
    }])));
  }, []);

  useEffect(() => {
    setError("");
    const loaders = {
      orders: () => Promise.all([loadOrders(), loadDeliveryAreas()]),
      products: loadProducts,
      categories: loadCategories,
      businesses: loadBusinesses,
      delivery: loadDeliveryAreas
    };
    const loader = loaders[tab];
    loader().catch((requestError) => setError(requestError.message || "Could not load shop admin data."));
  }, [tab, loadOrders, loadProducts, loadCategories, loadBusinesses, loadDeliveryAreas]);

  useEffect(() => {
    if (tab !== "orders") return undefined;
    const refreshOrders = () => loadOrders().catch((requestError) => setError(requestError.message || "Could not refresh orders."));
    const timer = window.setInterval(refreshOrders, 30000);
    return () => window.clearInterval(timer);
  }, [tab, loadOrders]);

  const updateOrder = async (order, changes) => {
    setBusy(order._id);
    setError("");
    setMessage("");
    try {
      await shopRequest(`/admin/orders/${order._id}`, {
        method: "PATCH",
        token: localStorage.getItem("bms_token"),
        body: JSON.stringify(changes)
      });
      await loadOrders();
      setMessage(`Order ${order.orderNumber} updated.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  };

  const submitRefund = async (order) => {
    const source = document.getElementById(`refund-source-${order._id}`)?.value;
    const amount = Number(document.getElementById(`refund-amount-${order._id}`)?.value);
    const reason = document.getElementById(`refund-reason-${order._id}`)?.value;
    const externalReference = document.getElementById(`refund-external-reference-${order._id}`)?.value;
    if (!source || !Number.isSafeInteger(amount) || amount <= 0 || !reason?.trim()) {
      setError("Choose a payment, enter a whole-naira amount, and provide a refund reason.");
      return;
    }
    const isManualRefund = source === "delivery_fee_manual";
    if (isManualRefund && !externalReference?.trim()) {
      setError("Enter the reference for the delivery-fee refund completed outside Paystack.");
      return;
    }
    const confirmation = isManualRefund
      ? `Record that you already refunded ${formatCurrency(amount)} outside Paystack for order ${order.orderNumber}?`
      : `Request a Paystack refund of ${formatCurrency(amount)} for order ${order.orderNumber}?`;
    if (!window.confirm(confirmation)) return;
    setBusy(`refund-${order._id}`);
    setError("");
    setMessage("");
    try {
      const data = await shopRequest(`/admin/orders/${order._id}/refunds`, {
        method: "POST",
        token: localStorage.getItem("bms_token"),
        body: JSON.stringify({
          source,
          amount,
          reason,
          ...(isManualRefund ? { externalReference } : {})
        })
      });
      await loadOrders();
      setMessage(data.message || "Refund request sent.");
    } catch (requestError) {
      setError(requestError.message || "Could not submit refund.");
      await loadOrders().catch(() => {});
    } finally {
      setBusy("");
    }
  };

  const refreshRefund = async (order, refund) => {
    setBusy(`refund-${order._id}`);
    setError("");
    setMessage("");
    try {
      const data = await shopRequest(`/admin/orders/${order._id}/refunds/${refund.requestKey}/refresh`, {
        method: "POST",
        token: localStorage.getItem("bms_token")
      });
      await loadOrders();
      setMessage(`Paystack refund status: ${data.refund.status}.`);
    } catch (requestError) {
      setError(requestError.message || "Could not refresh refund status.");
    } finally {
      setBusy("");
    }
  };

  const changeProduct = async (product, changes) => {
    setBusy(String(product._id));
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      if (changes.image) form.append("image", changes.image);
      if (changes.shopVisible !== undefined) form.append("shopVisible", String(changes.shopVisible));
      if (changes.shopFeatured !== undefined) form.append("shopFeatured", String(changes.shopFeatured));
      await shopRequest(`/admin/products/${product._id}`, {
        method: "PATCH",
        token: localStorage.getItem("bms_token"),
        body: form
      });
      await loadProducts();
      setMessage(`${product.name} updated.`);
    } catch (requestError) {
      setError(requestError.message || "Could not update product.");
    } finally {
      setBusy("");
    }
  };

  const createCategory = async (event) => {
    event.preventDefault();
    setBusy("new-category");
    setError("");
    setMessage("");
    try {
      await shopRequest("/admin/categories", {
        method: "POST",
        token: localStorage.getItem("bms_token"),
        body: JSON.stringify({ name: newCategoryName })
      });
      setNewCategoryName("");
      await loadCategories();
      setMessage("Shop category created.");
    } catch (requestError) {
      setError(requestError.message || "Could not create shop category.");
    } finally {
      setBusy("");
    }
  };

  const mapCategory = async (sourceCategory, categoryId) => {
    setBusy(`category-${sourceCategory}`);
    setError("");
    setMessage("");
    try {
      await shopRequest("/admin/category-mappings", {
        method: "PATCH",
        token: localStorage.getItem("bms_token"),
        body: JSON.stringify({ sourceCategory, categoryId })
      });
      await loadCategories();
      setMessage(`BMS category "${sourceCategory}" mapped successfully.`);
    } catch (requestError) {
      setError(requestError.message || "Could not map BMS category.");
    } finally {
      setBusy("");
    }
  };

  const renameCategory = async (category) => {
    setBusy(`rename-${category._id}`);
    setError("");
    setMessage("");
    try {
      await shopRequest(`/admin/categories/${category._id}`, {
        method: "PATCH",
        token: localStorage.getItem("bms_token"),
        body: JSON.stringify({ name: categoryNames[category._id] })
      });
      await loadCategories();
      setMessage("Shop category name updated.");
    } catch (requestError) {
      setError(requestError.message || "Could not update shop category.");
    } finally {
      setBusy("");
    }
  };

  const toggleBusiness = async (business) => {
    setBusy(`business-${business._id}`);
    setError("");
    setMessage("");
    try {
      await shopRequest(`/admin/businesses/${business._id}`, {
        method: "PATCH",
        token: localStorage.getItem("bms_token"),
        body: JSON.stringify({ shopVisible: !business.shopVisible })
      });
      await loadBusinesses();
      setMessage(`${business.name} ${business.shopVisible ? "hidden from" : "shown in"} the shop.`);
    } catch (requestError) {
      setError(requestError.message || "Could not update business visibility.");
    } finally {
      setBusy("");
    }
  };

  const createDeliveryArea = async (event) => {
    event.preventDefault();
    setBusy("new-delivery-area");
    setError("");
    setMessage("");
    try {
      await shopRequest("/admin/delivery-areas", {
        method: "POST",
        token: localStorage.getItem("bms_token"),
        body: JSON.stringify({ ...newDeliveryArea, fee: Number(newDeliveryArea.fee) })
      });
      setNewDeliveryArea({ state: "", city: "", fee: "" });
      await loadDeliveryAreas();
      setMessage("Delivery area and fee added.");
    } catch (requestError) {
      setError(requestError.message || "Could not add delivery area.");
    } finally {
      setBusy("");
    }
  };

  const updateDeliveryArea = async (area, changes) => {
    setBusy(`delivery-${area._id}`);
    setError("");
    setMessage("");
    try {
      const draft = deliveryAreaDrafts[area._id] || {};
      await shopRequest(`/admin/delivery-areas/${area._id}`, {
        method: "PATCH",
        token: localStorage.getItem("bms_token"),
        body: JSON.stringify({
          state: draft.state,
          city: draft.city,
          fee: Number(draft.fee),
          ...changes
        })
      });
      await loadDeliveryAreas();
      setMessage("Delivery area settings updated.");
    } catch (requestError) {
      setError(requestError.message || "Could not update delivery area.");
    } finally {
      setBusy("");
    }
  };

  const deleteDeliveryArea = async (area) => {
    if (!window.confirm(`Remove the configured delivery fee for ${area.city}, ${area.state}?`)) return;
    setBusy(`delivery-${area._id}`);
    setError("");
    setMessage("");
    try {
      await shopRequest(`/admin/delivery-areas/${area._id}`, {
        method: "DELETE",
        token: localStorage.getItem("bms_token")
      });
      await loadDeliveryAreas();
      setMessage("Delivery area removed.");
    } catch (requestError) {
      setError(requestError.message || "Could not remove delivery area.");
    } finally {
      setBusy("");
    }
  };

  const findDeliverySuggestion = (address) => deliveryAreas.find((area) =>
    area.isActive &&
    area.state.toLocaleLowerCase().trim().replace(/\s+/g, " ") === String(address.state || "").toLocaleLowerCase().trim().replace(/\s+/g, " ") &&
    area.city.toLocaleLowerCase().trim().replace(/\s+/g, " ") === String(address.city || "").toLocaleLowerCase().trim().replace(/\s+/g, " ")
  );

  const getRefundableAmount = (order, source) => {
    const sourcePaid = source === "products"
      ? order.subtotal
      : (order.deliveryFeePaymentStatus === "paid" ? order.deliveryFee : 0);
    const sourceRefunded = (order.refunds || [])
      .filter((refund) => refund.source === source && refund.status === "processed")
      .reduce((total, refund) => total + refund.amount, 0);
    return Math.max(0, sourcePaid - sourceRefunded);
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Marthington platform administration</p>
          <h1 className="mt-2 text-3xl font-black">Shop operations</h1>
          <p className="mt-2 text-sm text-slate-500">Orders are received and coordinated by Marthington. Suppliers are contacted from the order details.</p>
        </div>
        <Link to="/shop" className="text-sm font-semibold text-emerald-700">View storefront</Link>
      </div>
      <div className="mt-7 flex gap-2 border-b border-slate-200">
        {[["orders", "Orders"], ["products", "Products & images"], ["categories", "Categories"], ["businesses", "Businesses"], ["delivery", "Delivery areas"]].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === value ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500"}`}>{label}</button>
        ))}
      </div>
      {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {tab === "orders" ? (
        <section className="mt-5 space-y-5">
          {orders.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No shop orders to manage yet.</div>}
          {orders.map((order) => (
            <article key={order._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap justify-between gap-4">
                <div><h2 className="text-lg font-black">{order.orderNumber}</h2><p className="mt-1 text-sm text-slate-600">{order.customerSnapshot.name} · {order.customerSnapshot.email} · {order.customerSnapshot.phone}</p><p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p></div>
                <div className="text-sm sm:text-right"><p className="capitalize">Status: <strong>{order.status.replace(/_/g, " ")}</strong></p><p className="mt-1">Items paid: <strong>{formatCurrency(order.subtotal)}</strong> ({order.paymentStatus})</p>{(order.totalRefunded || 0) > 0 && <p className="mt-1 text-amber-700">Refunded: <strong>{formatCurrency(order.totalRefunded)}</strong> · Net paid: {formatCurrency(order.totalPaid - order.totalRefunded)}</p>}<p className="mt-1">Delivery fee: <strong>{order.deliveryFee ? formatCurrency(order.deliveryFee) : "Not set"}</strong> ({order.deliveryFeePaymentStatus})</p></div>
              </div>
              <div className="mt-4 grid gap-5 border-y border-slate-100 py-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Supplier contact — internal</p>
                  <div className="mt-2 space-y-3">{order.items.map((item, index) => {
                    const digits = String(item.supplierPhone || "").replace(/\D/g, "");
                    const phone = digits.startsWith("0") && digits.length === 11 ? `234${digits.slice(1)}` : digits;
                    return <div key={`${item.productName}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-bold">{item.productName} × {item.quantity}</p><p className="text-slate-600">Supplier: {item.supplierName}</p>{phone && <a className="mt-1 inline-block font-semibold text-emerald-700 underline" href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hello, Marthington has received order ${order.orderNumber} for ${item.productName} (${item.quantity}). Please confirm availability.`)}`} target="_blank" rel="noreferrer">Contact supplier on WhatsApp</a>}</div>;
                  })}</div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Marthington delivery address</p>
                  <p className="mt-2 text-sm">{order.deliveryAddress.recipientName} · {order.deliveryAddress.phone}<br />{order.deliveryAddress.addressLine}, {order.deliveryAddress.city}, {order.deliveryAddress.state}</p>
                  {order.deliveryAddress.deliveryNote && <p className="mt-1 text-xs text-slate-500">Note: {order.deliveryAddress.deliveryNote}</p>}
                  {(() => {
                    const suggestion = findDeliverySuggestion(order.deliveryAddress);
                    return suggestion && <button type="button" onClick={() => {
                      const input = document.getElementById(`fee-${order._id}`);
                      if (input) input.value = String(suggestion.fee);
                    }} className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                      Use configured rate: {suggestion.city}, {suggestion.state} · {formatCurrency(suggestion.fee)}
                    </button>;
                  })()}
                  <label className="mt-4 grid gap-1 text-xs font-semibold text-slate-600">Delivery fee (NGN)<input id={`fee-${order._id}`} type="number" min="0" step="1" defaultValue={order.deliveryFee || ""} className="max-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <button type="button" disabled={busy === order._id} onClick={() => {
                    const value = document.getElementById(`fee-${order._id}`)?.value;
                    const suggestion = findDeliverySuggestion(order.deliveryAddress);
                    updateOrder(order, {
                      deliveryFee: Number(value),
                      deliveryAreaName: suggestion && Number(value) === suggestion.fee
                        ? `${suggestion.city}, ${suggestion.state}`
                        : ""
                    });
                  }} className="mt-2 rounded-lg border border-emerald-600 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-50">Confirm delivery fee</button>
                  {order.deliveryFee > 0 && order.deliveryFeePaymentStatus === "pending" && <button type="button" disabled={busy === order._id} onClick={() => updateOrder(order, { deliveryFeeMarkedPaid: true })} className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Record fee paid manually</button>}
                </div>
              </div>
              {order.refunds?.length > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-bold text-amber-950">Refund history</h3>
                <div className="mt-2 space-y-2">
                  {order.refunds.map((refund) => (
                    <div key={refund.requestKey} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span><strong>{formatCurrency(refund.amount)}</strong> · {refund.source === "products" ? "Products" : "Delivery"} · <span className="capitalize">{refund.status}</span> · {refund.reason}</span>
                      {refund.method === "manual" && <span className="text-slate-500">Manual ref: {refund.externalReference}</span>}
                      {["initializing", "pending"].includes(refund.status) && refund.paystackRefundId
                        ? <button type="button" disabled={busy === `refund-${order._id}`} onClick={() => refreshRefund(order, refund)} className="rounded-md border border-amber-400 px-2 py-1 font-bold text-amber-900 disabled:opacity-50">Refresh Paystack status</button>
                        : ["initializing", "pending"].includes(refund.status)
                          ? <span className="text-amber-800">Check Paystack dashboard before retrying</span>
                          : null}
                    </div>
                  ))}
                </div>
              </div>}
              {order.totalPaid > (order.totalRefunded || 0) && !["awaiting_payment", "expired", "failed", "cancelled"].includes(order.status) && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-bold">Issue a full or partial refund</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Paystack processes the refund against the selected payment. A delivery fee marked paid manually cannot be refunded automatically.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1 text-xs font-semibold text-slate-600">Payment to refund
                      <select id={`refund-source-${order._id}`} value={refundSources[order._id] || "products"} onChange={(event) => setRefundSources((current) => ({ ...current, [order._id]: event.target.value }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="products" disabled={getRefundableAmount(order, "products") <= 0}>Product payment · {formatCurrency(getRefundableAmount(order, "products"))} refundable</option>
                        {order.deliveryFeePaymentStatus === "paid" && order.deliveryPaymentReference && <option value="delivery_fee" disabled={getRefundableAmount(order, "delivery_fee") <= 0}>Delivery fee · {formatCurrency(getRefundableAmount(order, "delivery_fee"))} refundable</option>}
                        {order.deliveryFeePaymentStatus === "paid" && !order.deliveryPaymentReference && <option value="delivery_fee_manual" disabled={getRefundableAmount(order, "delivery_fee") <= 0}>Manually recorded delivery fee · {formatCurrency(getRefundableAmount(order, "delivery_fee"))} refundable</option>}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-slate-600">Refund amount (NGN)
                      <input id={`refund-amount-${order._id}`} type="number" min="1" step="1" max={getRefundableAmount(order, refundSources[order._id] || "products")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-slate-600">Reason
                      <input id={`refund-reason-${order._id}`} maxLength={300} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Reason for refund" />
                    </label>
                    {(refundSources[order._id] || "products") === "delivery_fee_manual" && <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-3">External refund reference
                      <input id={`refund-external-reference-${order._id}`} maxLength={120} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Transfer or receipt reference (refund must already be completed)" />
                    </label>}
                  </div>
                  <button type="button" disabled={busy === `refund-${order._id}`} onClick={() => submitRefund(order)} className="mt-3 rounded-lg bg-rose-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy === `refund-${order._id}` ? "Submitting..." : (refundSources[order._id] || "products") === "delivery_fee_manual" ? "Record completed external refund" : "Request Paystack refund"}</button>
                </div>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1 text-xs font-semibold text-slate-600">Order status<select value={order.status} onChange={(event) => updateOrder(order, { status: event.target.value })} disabled={busy === order._id} className="rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize">{orderStatuses.filter((status) => status !== "cancelled" || (order.totalPaid === 0 && !order.paymentReference) || (order.totalRefunded || 0) >= order.totalPaid).map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select></label>
                {order.totalPaid > (order.totalRefunded || 0) && <p className="text-xs text-amber-700">Refund the remaining {formatCurrency(order.totalPaid - (order.totalRefunded || 0))} before cancelling.</p>}
                <label className="grid min-w-64 flex-1 gap-1 text-xs font-semibold text-slate-600">Internal note<input id={`note-${order._id}`} defaultValue={order.adminNote || ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
                <button type="button" disabled={busy === order._id} onClick={() => updateOrder(order, { adminNote: document.getElementById(`note-${order._id}`)?.value })} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white">Save note</button>
              </div>
            </article>
          ))}
        </section>
      ) : tab === "products" ? (
        <section className="mt-5">
          <label className="block max-w-lg"><span className="sr-only">Search all BMS products</span><input value={search} onChange={(event) => { setProductPage(1); setSearch(event.target.value); }} placeholder="Search all BMS products" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /></label>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">Product</th><th className="p-3">Source business</th><th className="p-3">Price</th><th className="p-3">Shop image</th><th className="p-3">Featured</th><th className="p-3">Listing</th></tr></thead>
              <tbody>{products.map((product) => (
                <tr key={product._id} className="border-t border-slate-100">
                  <td className="p-3"><p className="font-bold">{product.name}</p><p className="text-xs text-slate-500">{product.category}</p></td>
                  <td className="p-3">{product.business?.name || "Business removed"}<p className="text-xs text-slate-500">Stock: {product.stock}</p></td>
                  <td className="p-3">{formatCurrency(product.price)}</td>
                  <td className="p-3"><div className="flex items-center gap-3">{product.shopImage && <img src={product.shopImage} alt="" className="h-12 w-12 rounded-lg object-cover" />}<label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">{busy === String(product._id) ? "Uploading..." : product.shopImage ? "Replace image" : "Add image"}<input type="file" accept="image/*" className="hidden" disabled={busy === String(product._id)} onChange={(event) => { const image = event.target.files?.[0]; if (image) changeProduct(product, { image }); event.target.value = ""; }} /></label></div></td>
                  <td className="p-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={product.shopFeatured === true} disabled={busy === String(product._id)} onChange={(event) => changeProduct(product, { shopFeatured: event.target.checked })} />Feature</label></td>
                  <td className="p-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={product.shopVisible !== false} disabled={busy === String(product._id)} onChange={(event) => changeProduct(product, { shopVisible: event.target.checked })} />Visible</label></td>
                </tr>
              ))}</tbody>
            </table>
            {products.length === 0 && <p className="p-8 text-center text-slate-500">No products match the search.</p>}
          </div>
          {productPagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <button type="button" disabled={productPage <= 1} onClick={() => setProductPage((current) => current - 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button>
              <span className="text-sm text-slate-600">Page {productPagination.currentPage} of {productPagination.totalPages}</span>
              <button type="button" disabled={productPage >= productPagination.totalPages} onClick={() => setProductPage((current) => current + 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button>
            </div>
          )}
        </section>
      ) : tab === "categories" ? (
        <section className="mt-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black">Shop categories</h2>
            <p className="mt-1 text-sm text-slate-500">Create the storefront categories, then map BMS category labels—including spelling variants—to the right shop category. These changes do not modify product categories in any business's BMS.</p>
            <form onSubmit={createCategory} className="mt-4 flex flex-wrap gap-3">
              <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} maxLength={80} required placeholder="For example, Perfumes" className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button type="submit" disabled={busy === "new-category"} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy === "new-category" ? "Adding..." : "Add shop category"}</button>
            </form>
            {categories.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <div key={category._id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
                  <input value={categoryNames[category._id] || ""} onChange={(event) => setCategoryNames((current) => ({ ...current, [category._id]: event.target.value }))} aria-label={`Name for ${category.name}`} className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm font-semibold" />
                  <button type="button" onClick={() => renameCategory(category)} disabled={busy === `rename-${category._id}` || categoryNames[category._id] === category.name} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40">Save</button>
                </div>
              ))}
            </div>}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-black">BMS category mapping</h2>
              <p className="mt-1 text-sm text-slate-500">Case and extra-space variants are grouped together. Map each label to a shop category; unmapped labels continue to appear under their original category name.</p>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">BMS category labels</th><th className="p-3">Products</th><th className="p-3">Shop category</th></tr></thead>
              <tbody>{sourceCategories.map((source) => (
                <tr key={source.sourceCategory.toLocaleLowerCase()} className="border-t border-slate-100">
                  <td className="p-3"><p className="font-semibold">{source.sourceCategory}</p>{source.variants.length > 1 && <p className="mt-1 text-xs text-slate-500">Also: {source.variants.filter((value) => value !== source.sourceCategory).join(", ")}</p>}</td>
                  <td className="p-3">{source.productsCount.toLocaleString()}</td>
                  <td className="p-3">
                    <select aria-label={`Map ${source.sourceCategory}`} value={source.mappedCategoryId} disabled={busy === `category-${source.sourceCategory}`} onChange={(event) => mapCategory(source.sourceCategory, event.target.value)} className="min-w-52 rounded-lg border border-slate-300 bg-white px-3 py-2">
                      <option value="">Unmapped (keep original)</option>
                      {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {sourceCategories.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No BMS product categories found.</p>}
          </div>
        </section>
      ) : tab === "businesses" ? (
        <section className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-black">Businesses in the shop</h2>
            <p className="mt-1 text-sm text-slate-500">Businesses are sourced automatically from BMS. Hide or show each business's products in the storefront without changing its BMS account or catalogue.</p>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">Business</th><th className="p-3">BMS status</th><th className="p-3">Products</th><th className="p-3">Shop listing</th><th className="p-3">Action</th></tr></thead>
            <tbody>{businesses.map((business) => (
              <tr key={business._id} className="border-t border-slate-100">
                <td className="p-3 font-semibold">{business.name}</td>
                <td className="p-3 capitalize">{business.status || "active"}</td>
                <td className="p-3">{business.productsCount.toLocaleString()}</td>
                <td className="p-3"><span className={business.shopVisible ? "font-semibold text-emerald-700" : "font-semibold text-slate-500"}>{business.shopVisible ? "Visible" : "Hidden"}</span></td>
                <td className="p-3"><button type="button" onClick={() => toggleBusiness(business)} disabled={busy === `business-${business._id}`} className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${business.shopVisible ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-700 hover:bg-emerald-800"}`}>{busy === `business-${business._id}` ? "Saving..." : business.shopVisible ? "Hide business" : "Show business"}</button></td>
              </tr>
            ))}</tbody>
          </table>
          {businesses.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No businesses found.</p>}
        </section>
      ) : (
        <section className="mt-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black">Delivery areas and fee presets</h2>
            <p className="mt-1 text-sm text-slate-500">Configure a standard fee for each city and state. Matching rates appear as suggestions on orders; you still confirm the fee after reviewing the delivery, and the customer pays it separately.</p>
            <form onSubmit={createDeliveryArea} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <input required maxLength={80} value={newDeliveryArea.state} onChange={(event) => setNewDeliveryArea((current) => ({ ...current, state: event.target.value }))} placeholder="State" aria-label="New delivery state" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input required maxLength={100} value={newDeliveryArea.city} onChange={(event) => setNewDeliveryArea((current) => ({ ...current, city: event.target.value }))} placeholder="City or area" aria-label="New delivery city or area" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input required type="number" min="0" step="1" value={newDeliveryArea.fee} onChange={(event) => setNewDeliveryArea((current) => ({ ...current, fee: event.target.value }))} placeholder="Fee in NGN" aria-label="New delivery fee" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button type="submit" disabled={busy === "new-delivery-area"} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy === "new-delivery-area" ? "Adding..." : "Add area"}</button>
            </form>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">State</th><th className="p-3">City or area</th><th className="p-3">Fee (NGN)</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
              <tbody>{deliveryAreas.map((area) => {
                const draft = deliveryAreaDrafts[area._id] || { state: area.state, city: area.city, fee: String(area.fee) };
                return (
                  <tr key={area._id} className="border-t border-slate-100">
                    <td className="p-3"><input aria-label={`State for ${area.city}`} value={draft.state} onChange={(event) => setDeliveryAreaDrafts((current) => ({ ...current, [area._id]: { ...draft, state: event.target.value } }))} className="w-36 rounded-md border border-slate-200 px-2 py-1.5" /></td>
                    <td className="p-3"><input aria-label={`City for ${area.city}`} value={draft.city} onChange={(event) => setDeliveryAreaDrafts((current) => ({ ...current, [area._id]: { ...draft, city: event.target.value } }))} className="w-40 rounded-md border border-slate-200 px-2 py-1.5" /></td>
                    <td className="p-3"><input aria-label={`Fee for ${area.city}`} type="number" min="0" step="1" value={draft.fee} onChange={(event) => setDeliveryAreaDrafts((current) => ({ ...current, [area._id]: { ...draft, fee: event.target.value } }))} className="w-32 rounded-md border border-slate-200 px-2 py-1.5" /></td>
                    <td className="p-3"><span className={area.isActive ? "font-semibold text-emerald-700" : "font-semibold text-slate-500"}>{area.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="p-3"><div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busy === `delivery-${area._id}`} onClick={() => updateDeliveryArea(area)} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-bold disabled:opacity-50">Save</button>
                      <button type="button" disabled={busy === `delivery-${area._id}`} onClick={() => updateDeliveryArea(area, { isActive: !area.isActive })} className="rounded-md border border-emerald-300 px-2 py-1.5 text-xs font-bold text-emerald-800 disabled:opacity-50">{area.isActive ? "Deactivate" : "Activate"}</button>
                      <button type="button" disabled={busy === `delivery-${area._id}`} onClick={() => deleteDeliveryArea(area)} className="rounded-md border border-rose-300 px-2 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50">Remove</button>
                    </div></td>
                  </tr>
                );
              })}</tbody>
            </table>
            {deliveryAreas.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No delivery fee presets yet.</p>}
          </div>
        </section>
      )}
    </main>
  );
};

export default ShopAdmin;
