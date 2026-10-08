import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { shopRequest } from "../api/shop.js";
import { formatCurrency } from "../utils/formatters.js";

const orderStatuses = ["received", "sourcing", "preparing_delivery", "out_for_delivery", "delivered", "cancelled"];

const ShopAdmin = () => {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
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

  useEffect(() => {
    setError("");
    const loader = tab === "orders" ? loadOrders : loadProducts;
    loader().catch((requestError) => setError(requestError.message || "Could not load shop admin data."));
  }, [tab, loadOrders, loadProducts]);

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

  const changeProduct = async (product, changes) => {
    setBusy(String(product._id));
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      if (changes.image) form.append("image", changes.image);
      if (changes.shopVisible !== undefined) form.append("shopVisible", String(changes.shopVisible));
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
        {[["orders", "Orders"], ["products", "Products & images"]].map(([value, label]) => (
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
                <div className="text-sm sm:text-right"><p className="capitalize">Status: <strong>{order.status.replace(/_/g, " ")}</strong></p><p className="mt-1">Items paid: <strong>{formatCurrency(order.subtotal)}</strong> ({order.paymentStatus})</p><p className="mt-1">Delivery fee: <strong>{order.deliveryFee ? formatCurrency(order.deliveryFee) : "Not set"}</strong> ({order.deliveryFeePaymentStatus})</p></div>
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
                  <label className="mt-4 grid gap-1 text-xs font-semibold text-slate-600">Delivery fee (NGN)<input id={`fee-${order._id}`} type="number" min="0" step="1" defaultValue={order.deliveryFee || ""} className="max-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                  <button type="button" disabled={busy === order._id} onClick={() => {
                    const value = document.getElementById(`fee-${order._id}`)?.value;
                    updateOrder(order, { deliveryFee: Number(value) });
                  }} className="mt-2 rounded-lg border border-emerald-600 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-50">Confirm delivery fee</button>
                  {order.deliveryFee > 0 && order.deliveryFeePaymentStatus === "pending" && <button type="button" disabled={busy === order._id} onClick={() => updateOrder(order, { deliveryFeeMarkedPaid: true })} className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Record fee paid manually</button>}
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1 text-xs font-semibold text-slate-600">Order status<select value={order.status} onChange={(event) => updateOrder(order, { status: event.target.value })} disabled={busy === order._id} className="rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize">{orderStatuses.filter((status) => status !== "cancelled" || order.totalPaid === 0).map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select></label>
                {order.totalPaid > 0 && <p className="text-xs text-amber-700">Paid orders must be refunded in Paystack before they can be cancelled.</p>}
                <label className="grid min-w-64 flex-1 gap-1 text-xs font-semibold text-slate-600">Internal note<input id={`note-${order._id}`} defaultValue={order.adminNote || ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
                <button type="button" disabled={busy === order._id} onClick={() => updateOrder(order, { adminNote: document.getElementById(`note-${order._id}`)?.value })} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white">Save note</button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="mt-5">
          <label className="block max-w-lg"><span className="sr-only">Search all BMS products</span><input value={search} onChange={(event) => { setProductPage(1); setSearch(event.target.value); }} placeholder="Search all BMS products" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /></label>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">Product</th><th className="p-3">Source business</th><th className="p-3">Price</th><th className="p-3">Shop image</th><th className="p-3">Listing</th></tr></thead>
              <tbody>{products.map((product) => (
                <tr key={product._id} className="border-t border-slate-100">
                  <td className="p-3"><p className="font-bold">{product.name}</p><p className="text-xs text-slate-500">{product.category}</p></td>
                  <td className="p-3">{product.business?.name || "Business removed"}<p className="text-xs text-slate-500">Stock: {product.stock}</p></td>
                  <td className="p-3">{formatCurrency(product.price)}</td>
                  <td className="p-3"><div className="flex items-center gap-3">{product.shopImage && <img src={product.shopImage} alt="" className="h-12 w-12 rounded-lg object-cover" />}<label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">{busy === String(product._id) ? "Uploading..." : product.shopImage ? "Replace image" : "Add image"}<input type="file" accept="image/*" className="hidden" disabled={busy === String(product._id)} onChange={(event) => { const image = event.target.files?.[0]; if (image) changeProduct(product, { image }); event.target.value = ""; }} /></label></div></td>
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
      )}
    </main>
  );
};

export default ShopAdmin;
