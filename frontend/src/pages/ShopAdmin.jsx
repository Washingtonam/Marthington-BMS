import React, { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { shopRequest } from "../api/shop.js";
import { formatCurrency } from "../utils/formatters.js";

const orderStatuses = ["received", "sourcing", "preparing_delivery", "out_for_delivery", "delivered", "cancelled"];

const ShopAdmin = () => {
  const outletContext = useOutletContext() || {};
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [salePriceDrafts, setSalePriceDrafts] = useState({});
  const [priceModeDrafts, setPriceModeDrafts] = useState({});
  const [imageUrlDrafts, setImageUrlDrafts] = useState({});
  const [categories, setCategories] = useState([]);
  const [sourceCategories, setSourceCategories] = useState([]);
  const [categoryNames, setCategoryNames] = useState({});
  const [businesses, setBusinesses] = useState([]);
  const [businessesLoaded, setBusinessesLoaded] = useState(false);
  const [deliveryAreas, setDeliveryAreas] = useState([]);
  const [storefrontSettings, setStorefrontSettings] = useState({ whatsappNumber: "", accentColor: "#10b981", theme: "light" });
  const [deliveryAreaDrafts, setDeliveryAreaDrafts] = useState({});
  const [newDeliveryArea, setNewDeliveryArea] = useState({ state: "", city: "", fee: "" });
  const [refundSources, setRefundSources] = useState({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [productPagination, setProductPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [productPage, setProductPage] = useState(1);
  const [search, setSearch] = useState("");
  const [imageFilter, setImageFilter] = useState("all");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [draggedProductId, setDraggedProductId] = useState("");

  const loadOrders = useCallback(async () => {
    const data = await shopRequest("/admin/orders", { token: localStorage.getItem("bms_token") });
    setOrders(data.orders || []);
  }, []);

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100", search, page: String(productPage) });
    if (imageFilter !== "all") params.set("imageStatus", imageFilter);
    if (businessFilter !== "all") params.set("businessId", businessFilter);
    const data = await shopRequest(`/admin/products?${params}`, { token: localStorage.getItem("bms_token") });
    setProducts(data.products || []);
    setSalePriceDrafts((current) => Object.fromEntries((data.products || []).map((product) => [
      product._id,
      current[product._id] ?? product.shopSalePrice ?? ""
    ])));
    setPriceModeDrafts((current) => Object.fromEntries((data.products || []).map((product) => [
      product._id,
      current[product._id] ?? (
        product.shopSalePrice > 0 &&
        (product.shopPriceMode === "override" || product.shopSalePrice >= product.price)
          ? "override"
          : "discount"
      )
    ])));
    setImageUrlDrafts((current) => Object.fromEntries((data.products || []).map((product) => [
      product._id,
      current[product._id] ?? product.shopImage ?? ""
    ])));
    setProductPagination(data.pagination || { currentPage: 1, totalPages: 1 });
  }, [search, productPage, imageFilter, businessFilter]);

  const loadCategories = useCallback(async () => {
    const data = await shopRequest("/admin/categories", { token: localStorage.getItem("bms_token") });
    setCategories(data.categories || []);
    setSourceCategories(data.sourceCategories || []);
    setCategoryNames(Object.fromEntries((data.categories || []).map((category) => [category._id, category.name])));
  }, []);

  const loadBusinesses = useCallback(async () => {
    const data = await shopRequest("/admin/businesses", { token: localStorage.getItem("bms_token") });
    setBusinesses(data.businesses || []);
    setBusinessesLoaded(true);
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

  const loadStorefrontSettings = useCallback(async () => {
    const data = await shopRequest("/admin/settings", { token: localStorage.getItem("bms_token") });
    setStorefrontSettings({ whatsappNumber: "", accentColor: "#10b981", theme: "light", ...(data.settings || {}) });
  }, []);

  useEffect(() => {
    setError("");
    const loaders = {
      orders: () => Promise.all([loadOrders(), loadDeliveryAreas()]),
      products: loadProducts,
      categories: loadCategories,
      businesses: loadBusinesses,
      delivery: loadDeliveryAreas,
      settings: loadStorefrontSettings
    };
    const loader = loaders[tab];
    loader().catch((requestError) => setError(requestError.message || "Could not load storefront admin data."));
  }, [tab, loadOrders, loadProducts, loadCategories, loadBusinesses, loadDeliveryAreas, loadStorefrontSettings]);

  useEffect(() => {
    if (tab !== "products" || businessesLoaded) return;
    loadBusinesses().catch((requestError) => setError(requestError.message || "Could not load storefront businesses."));
  }, [tab, businessesLoaded, loadBusinesses]);

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

  const retryOrderEmail = async (order, type) => {
    setBusy(`${type}-email-${order._id}`);
    setError("");
    setMessage("");
    try {
      const result = await shopRequest(`/admin/orders/${order._id}/emails/${type}/retry`, {
        method: "POST",
        token: localStorage.getItem("bms_token")
      });
      await loadOrders();
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message || `Could not resend the ${type} email.`);
      await loadOrders();
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
      if (changes.shopSalePrice !== undefined) form.append("shopSalePrice", String(changes.shopSalePrice));
      if (changes.shopPriceMode !== undefined) form.append("shopPriceMode", changes.shopPriceMode);
      if (changes.shopImageUrl !== undefined) form.append("shopImageUrl", changes.shopImageUrl);
      const data = await shopRequest(`/admin/products/${product._id}`, {
        method: "PATCH",
        token: localStorage.getItem("bms_token"),
        body: form
      });
      if (changes.image || changes.shopImageUrl !== undefined) {
        setImageUrlDrafts((current) => ({ ...current, [product._id]: data.product?.shopImage || "" }));
      }
      if (changes.shopSalePrice !== undefined) {
        setSalePriceDrafts((current) => ({ ...current, [product._id]: data.product?.shopSalePrice ?? 0 }));
      }
      if (changes.shopPriceMode !== undefined) {
        setPriceModeDrafts((current) => ({ ...current, [product._id]: data.product?.shopPriceMode || changes.shopPriceMode }));
      }
      await loadProducts();
      setMessage(`${product.name} updated.`);
    } catch (requestError) {
      setError(requestError.message || "Could not update product.");
    } finally {
      setBusy("");
    }
  };

  const uploadProductImage = (product, file) => {
    if (!file.type.startsWith("image/")) {
      setError("Choose a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image no larger than 5 MB.");
      return;
    }
    changeProduct(product, { image: file });
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

  const saveStorefrontSettings = async (event) => {
    event.preventDefault();
    setBusy("storefront-settings");
    setError("");
    setMessage("");
    try {
      const result = await shopRequest("/admin/settings", {
        method: "PATCH",
        token: localStorage.getItem("bms_token"),
        body: JSON.stringify(storefrontSettings)
      });
      setStorefrontSettings(result.settings);
      outletContext.updateStorefrontSettings?.(result.settings);
      setMessage("Storefront appearance and WhatsApp contact settings saved.");
    } catch (requestError) {
      setError(requestError.message || "Could not save storefront settings.");
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

  const pageNumbers = (() => {
    const totalPages = Number(productPagination.totalPages) || 1;
    const currentPage = Number(productPagination.currentPage) || productPage;
    const pages = new Set([1, totalPages]);
    for (let pageNumber = Math.max(1, currentPage - 2); pageNumber <= Math.min(totalPages, currentPage + 2); pageNumber += 1) {
      pages.add(pageNumber);
    }
    return [...pages].sort((a, b) => a - b).flatMap((pageNumber, index, values) => {
      const previous = values[index - 1];
      return previous && pageNumber - previous > 1 ? ["ellipsis", pageNumber] : [pageNumber];
    });
  })();
  const currentProductPage = Number(productPagination.currentPage) || productPage;
  const selectedBusiness = businesses.find((business) => business._id === businessFilter);
  const productRangeStart = Number(productPagination.totalProducts) > 0
    ? (currentProductPage - 1) * 100 + 1
    : 0;
  const productRangeEnd = Math.min(
    currentProductPage * 100,
    Number(productPagination.totalProducts) || 0
  );

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Marthington platform administration</p>
          <h1 className="mt-2 text-3xl font-black">Storefront operations</h1>
          <p className="mt-2 text-sm text-slate-500">Orders are received and coordinated by Marthington. Suppliers are contacted from the order details.</p>
        </div>
        <Link to="/shop" className="text-sm font-semibold text-emerald-700">View storefront</Link>
      </div>
      <div className="mt-7 flex gap-2 border-b border-slate-200">
        {[["orders", "Orders"], ["products", "Products & images"], ["categories", "Categories"], ["businesses", "Businesses"], ["delivery", "Delivery areas"], ["settings", "Appearance & contact"]].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === value ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500"}`}>{label}</button>
        ))}
      </div>
      {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {tab === "orders" ? (
        <section className="mt-5 space-y-5">
          {orders.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No storefront orders to manage yet.</div>}
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
                    return (
                      <div key={`${item.productName}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm">
                        <p className="font-bold">{item.productName} × {item.quantity}</p>
                        <p className="text-slate-600">Business / supplier: {item.supplierName}</p>
                        {phone ? (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            <a className="font-semibold text-emerald-700 underline" href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hello, Marthington has received order ${order.orderNumber} for ${item.productName} (${item.quantity}). Please confirm availability and delivery arrangements.`)}`} target="_blank" rel="noreferrer">WhatsApp {item.supplierName}</a>
                            <a className="font-semibold text-emerald-700 underline" href={`tel:+${phone}`}>Call business</a>
                          </div>
                        ) : <p className="mt-2 text-xs text-slate-500">No business contact number is available.</p>}
                      </div>
                    );
                  })}</div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Marthington delivery address</p>
                  <p className="mt-2 text-sm">{order.deliveryAddress.recipientName} · WhatsApp: {order.deliveryAddress.phone}<br />{order.deliveryAddress.addressLine}, {order.deliveryAddress.city}{order.deliveryAddress.localGovernment ? `, ${order.deliveryAddress.localGovernment} LGA` : ""}, {order.deliveryAddress.state}, {order.deliveryAddress.country || "Nigeria"}</p>
                  {order.deliveryAddress.nearestBusStop && <p className="mt-1 text-xs text-slate-500">Nearest bus stop / landmark: {order.deliveryAddress.nearestBusStop}</p>}
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
              <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 text-sm sm:grid-cols-2">
                {[
                  ["receipt", "Receipt", order.receiptEmailStatus || "not_sent", order.receiptEmailError],
                  ["delivery", "Delivery confirmation", order.deliveryEmailStatus || "not_sent", order.deliveryEmailError]
                ].map(([type, label, status, emailError]) => (
                  <div key={type}>
                    <p className="font-semibold">{label} email: <span className="capitalize">{status.replace(/_/g, " ")}</span></p>
                    {emailError && <p className="mt-1 text-xs text-rose-700">{emailError}</p>}
                    {status === "failed" && (
                      <button
                        type="button"
                        disabled={busy === `${type}-email-${order._id}`}
                        onClick={() => retryOrderEmail(order, type)}
                        className="mt-2 rounded-lg border border-emerald-600 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-50"
                      >
                        {busy === `${type}-email-${order._id}` ? "Resending..." : `Retry ${label.toLowerCase()} email`}
                      </button>
                    )}
                  </div>
                ))}
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
                <label className="grid gap-1 text-xs font-semibold text-slate-600">Order status — mark delivered to email customer<select value={order.status} onChange={(event) => updateOrder(order, { status: event.target.value })} disabled={busy === order._id} className="rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize">{orderStatuses.filter((status) => status !== "cancelled" || (order.totalPaid === 0 && !order.paymentReference) || (order.totalRefunded || 0) >= order.totalPaid).map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select></label>
                {order.totalPaid > (order.totalRefunded || 0) && <p className="text-xs text-amber-700">Refund the remaining {formatCurrency(order.totalPaid - (order.totalRefunded || 0))} before cancelling.</p>}
                <label className="grid min-w-64 flex-1 gap-1 text-xs font-semibold text-slate-600">Internal note<input id={`note-${order._id}`} defaultValue={order.adminNote || ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
                <button type="button" disabled={busy === order._id} onClick={() => updateOrder(order, { adminNote: document.getElementById(`note-${order._id}`)?.value })} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white">Save note</button>
              </div>
            </article>
          ))}
        </section>
      ) : tab === "products" ? (
        <section className="mt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1 sm:max-w-lg"><span className="sr-only">Search all BMS products</span><input value={search} onChange={(event) => { setProductPage(1); setSearch(event.target.value); }} placeholder="Search all BMS products" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /></label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Source business
              <select
                aria-label="Filter products by source business"
                value={businessFilter}
                onChange={(event) => { setProductPage(1); setBusinessFilter(event.target.value); }}
                className="min-w-52 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
              >
                <option value="all">All businesses</option>
                {businesses.map((business) => (
                  <option key={business._id} value={business._id}>{business.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Product images
              <select aria-label="Filter products by image" value={imageFilter} onChange={(event) => { setProductPage(1); setImageFilter(event.target.value); }} className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm">
                <option value="all">All products</option>
                <option value="present">With storefront images</option>
                <option value="missing">Missing storefront images</option>
              </select>
            </label>
          </div>
          {businessFilter !== "all" && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p>
                Showing {Number(productPagination.totalProducts) || 0}{" "}
                {(Number(productPagination.totalProducts) || 0) === 1 ? "product" : "products"} from{" "}
                <span className="font-bold">{selectedBusiness?.name || "the selected business"}</span>.
              </p>
              <button
                type="button"
                onClick={() => { setProductPage(1); setBusinessFilter("all"); }}
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                Show all businesses
              </button>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">Choose whether to show a lower price as a discount or replace the BMS price without a strike-through. Set 0 to use the regular BMS price.</p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">Product</th><th className="p-3">Source business</th><th className="p-3">Regular price</th><th className="p-3">Storefront price</th><th className="p-3">Storefront image</th><th className="p-3">Featured</th><th className="p-3">Listing</th></tr></thead>
              <tbody>{products.map((product) => (
                <tr key={product._id} className="border-t border-slate-100">
                  <td className="p-3"><p className="font-bold">{product.name}</p><p className="text-xs text-slate-500">{product.category}</p></td>
                  <td className="p-3">{product.business?.name || "Business removed"}<p className="text-xs text-slate-500">Stock: {product.stock}</p></td>
                  <td className="p-3">{formatCurrency(product.price)}</td>
                  <td className="p-3">
                    <label className="block text-xs font-semibold text-slate-600">
                      Storefront price (NGN)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        aria-label={`${product.name} storefront price`}
                        value={salePriceDrafts[product._id] ?? ""}
                        onChange={(event) => setSalePriceDrafts((current) => ({ ...current, [product._id]: event.target.value }))}
                        className="mt-1 w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="mt-2 block text-xs font-semibold text-slate-600">
                      Price display
                      <select aria-label={`${product.name} storefront price mode`} value={priceModeDrafts[product._id] || "discount"} onChange={(event) => setPriceModeDrafts((current) => ({ ...current, [product._id]: event.target.value }))} className="mt-1 w-44 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
                        <option value="discount">Show as discount</option>
                        <option value="override">Replace BMS price</option>
                      </select>
                    </label>
                    <p className="mt-1 text-[11px] text-slate-500">0 uses BMS price</p>
                  </td>
                  <td className="p-3">
                    <div
                      aria-label={`Drop image for ${product.name}`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (event.dataTransfer.types.includes("Files")) setDraggedProductId(String(product._id));
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) setDraggedProductId("");
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDraggedProductId("");
                        const files = [...(event.dataTransfer.files || [])];
                        if (files.length > 1) {
                          setError("Drop one image at a time for each product.");
                          return;
                        }
                        if (files[0]) uploadProductImage(product, files[0]);
                      }}
                      className={`min-w-64 rounded-xl border border-dashed p-2 transition-colors ${draggedProductId === String(product._id) ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200" : "border-slate-200"}`}
                    >
                      <div className="flex items-center gap-3">
                        {product.shopImage && <img src={product.shopImage} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                        <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">
                          {busy === String(product._id) ? "Uploading..." : product.shopImage ? "Replace image" : "Add image"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={busy === String(product._id)}
                            onChange={(event) => {
                              const image = event.target.files?.[0];
                              if (image) uploadProductImage(product, image);
                              event.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">
                        {draggedProductId === String(product._id) ? "Drop to upload this product image" : "Drag and drop an image here"}
                      </p>
                    </div>
                    <label className="mt-2 block text-xs font-semibold text-slate-600">
                      Or paste Cloudinary URL
                      <input
                        type="url"
                        aria-label={`${product.name} Cloudinary image URL`}
                        value={imageUrlDrafts[product._id] ?? ""}
                        onChange={(event) => setImageUrlDrafts((current) => ({ ...current, [product._id]: event.target.value }))}
                        placeholder="https://res.cloudinary.com/..."
                        className="mt-1 w-64 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-normal"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy === String(product._id)}
                      onClick={() => changeProduct(product, {
                        shopSalePrice: salePriceDrafts[product._id] ?? product.shopSalePrice ?? 0,
                        shopPriceMode: priceModeDrafts[product._id] || "discount",
                        shopImageUrl: imageUrlDrafts[product._id] ?? product.shopImage ?? ""
                      })}
                      className="mt-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Save product changes
                    </button>
                  </td>
                  <td className="p-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={product.shopFeatured === true} disabled={busy === String(product._id)} onChange={(event) => changeProduct(product, { shopFeatured: event.target.checked })} />Feature</label></td>
                  <td className="p-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={product.shopVisible !== false} disabled={busy === String(product._id)} onChange={(event) => changeProduct(product, { shopVisible: event.target.checked })} />Visible</label></td>
                </tr>
              ))}</tbody>
            </table>
            {products.length === 0 && <p className="p-8 text-center text-slate-500">{imageFilter === "missing" ? "No products without storefront images match this search." : imageFilter === "present" ? "No products with storefront images match this search." : "No products match the search."}</p>}
          </div>
          {productPagination.totalPages > 1 && (
            <nav aria-label="Storefront product pages" className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-xs text-slate-500">Showing {productRangeStart.toLocaleString()}–{productRangeEnd.toLocaleString()} of {Number(productPagination.totalProducts).toLocaleString()} products</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button type="button" disabled={productPage <= 1} onClick={() => setProductPage((current) => current - 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button>
                {pageNumbers.map((pageNumber, index) => pageNumber === "ellipsis"
                  ? <span key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-sm text-slate-400">…</span>
                  : <button
                    key={pageNumber}
                    type="button"
                    aria-label={`Page ${pageNumber}`}
                    aria-current={pageNumber === currentProductPage ? "page" : undefined}
                    onClick={() => setProductPage(pageNumber)}
                    className={`min-w-10 rounded-lg border px-3 py-2 text-sm font-semibold ${pageNumber === currentProductPage ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                  >
                    {pageNumber}
                  </button>
                )}
                <button type="button" disabled={productPage >= productPagination.totalPages} onClick={() => setProductPage((current) => current + 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button>
              </div>
              <span className="sr-only">Page {currentProductPage} of {productPagination.totalPages}</span>
            </nav>
          )}
        </section>
      ) : tab === "categories" ? (
        <section className="mt-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black">Storefront categories</h2>
            <p className="mt-1 text-sm text-slate-500">Create storefront categories, then map BMS category labels—including spelling variants—to the right storefront category. These changes do not modify product categories in any business's BMS.</p>
            <form onSubmit={createCategory} className="mt-4 flex flex-wrap gap-3">
              <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} maxLength={80} required placeholder="For example, Perfumes" className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button type="submit" disabled={busy === "new-category"} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy === "new-category" ? "Adding..." : "Add storefront category"}</button>
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
              <p className="mt-1 text-sm text-slate-500">Case and extra-space variants are grouped together. Map each label to a storefront category; unmapped labels continue to appear under their original category name.</p>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">BMS category labels</th><th className="p-3">Products</th><th className="p-3">Storefront category</th></tr></thead>
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
            <h2 className="text-lg font-black">Businesses in the storefront</h2>
            <p className="mt-1 text-sm text-slate-500">Businesses are sourced automatically from BMS. Hide or show each business's products in the storefront without changing its BMS account or catalogue.</p>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">Business</th><th className="p-3">BMS status</th><th className="p-3">Products</th><th className="p-3">Storefront listing</th><th className="p-3">Action</th></tr></thead>
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
      ) : tab === "delivery" ? (
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
      ) : (
        <form onSubmit={saveStorefrontSettings} className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">Storefront experience</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Branding and customer contact</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">These settings are shared with storefront visitors. The WhatsApp number receives product questions and purchase inquiries.</p>
            <div className="mt-5 space-y-5">
              <label className="grid gap-1.5 text-xs font-bold text-slate-600">Marthington WhatsApp number
                <input aria-label="Marthington WhatsApp number" type="tel" inputMode="tel" value={storefrontSettings.whatsappNumber} onChange={(event) => setStorefrontSettings((current) => ({ ...current, whatsappNumber: event.target.value }))} placeholder="e.g. +234 801 234 5678" className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                <span className="font-normal text-slate-400">Use the number that should receive shopper inquiries. Enter country code where possible.</span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-bold text-slate-600">Accent color
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-2">
                    <input type="color" aria-label="Storefront accent color" value={storefrontSettings.accentColor} onChange={(event) => setStorefrontSettings((current) => ({ ...current, accentColor: event.target.value }))} className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent" />
                    <input aria-label="Storefront accent hex value" value={storefrontSettings.accentColor} onChange={(event) => setStorefrontSettings((current) => ({ ...current, accentColor: event.target.value }))} pattern="^#[0-9A-Fa-f]{6}$" className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold uppercase text-slate-800 outline-none" />
                  </div>
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-slate-600">Color mode
                  <select value={storefrontSettings.theme} onChange={(event) => setStorefrontSettings((current) => ({ ...current, theme: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
              <button type="submit" disabled={busy === "storefront-settings"} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50">{busy === "storefront-settings" ? "Saving..." : "Save storefront settings"}</button>
            </div>
          </section>
          <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Preview</p>
            <h3 className="mt-2 text-base font-extrabold text-slate-900">Shopper contact button</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">A WhatsApp inquiry link appears beside Add to Cart on product detail pages once a valid number is saved.</p>
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-700">Marthington Storefront</p>
              <button type="button" disabled={!storefrontSettings.whatsappNumber} style={{ borderColor: storefrontSettings.accentColor, color: storefrontSettings.accentColor }} className="mt-3 w-full rounded-xl border px-3 py-2.5 text-xs font-bold disabled:opacity-40">Ask about this on WhatsApp</button>
              <p className="mt-2 text-center text-[10px] text-slate-400">{storefrontSettings.theme === "dark" ? "Dark" : "Light"} storefront · {storefrontSettings.accentColor}</p>
            </div>
          </aside>
        </form>
      )}
    </main>
  );
};

export default ShopAdmin;
