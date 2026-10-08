import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { shopRequest } from "../api/shop.js";
import { useShopCart } from "../context/ShopCartContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const ShopOrders = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { clear } = useShopCart();
  const reference = params.get("reference") || "";
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const loadOrders = async () => {
    const result = await shopRequest("/orders");
    setOrders(result.orders || []);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setError("");
      try {
        if (reference) {
          setMessage("Verifying your Paystack payment...");
          const isDeliveryFee = reference.includes("-DEL-");
          await shopRequest(isDeliveryFee ? "/orders/verify-delivery-payment" : "/orders/verify-payment", {
            method: "POST",
            body: JSON.stringify({ reference })
          });
          if (!isDeliveryFee) clear();
          setMessage(isDeliveryFee ? "Delivery fee payment confirmed." : "Your order payment is confirmed.");
          navigate("/shop/orders", { replace: true });
        }
        const result = await shopRequest("/orders");
        if (active) setOrders(result.orders || []);
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Could not load order history.");
          setMessage("");
        }
      }
    };
    load();
    return () => { active = false; };
  }, [reference, navigate, clear]);

  const payDelivery = async (order) => {
    setBusyId(order.id);
    setError("");
    try {
      const payment = await shopRequest(`/orders/${order.id}/delivery-fee/initialize`, { method: "POST" });
      window.location.assign(payment.authorizationUrl);
    } catch (requestError) {
      setError(requestError.message || "Could not initialize delivery-fee payment.");
      setBusyId("");
    }
  };

  const statusLabel = (status) => String(status || "").replace(/_/g, " ");

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Shopper account</p>
        <h1 className="mt-2 text-3xl font-black">My orders</h1>
      </div>
      {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      <div className="mt-7 space-y-5">
        {orders.length === 0 && !error && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No shop orders yet.</div>}
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order</p><h2 className="mt-1 text-lg font-black">{order.orderNumber}</h2><p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-800">{statusLabel(order.status)}</span>
            </div>
            <div className="mt-5 space-y-2 border-y border-slate-100 py-4">
              {order.items.map((item, index) => <div key={`${item.productName}-${index}`} className="flex justify-between gap-3 text-sm"><span>{item.productName} × {item.quantity}</span><strong>{formatCurrency(item.unitPrice * item.quantity)}</strong></div>)}
            </div>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div><p className="text-xs font-semibold uppercase text-slate-500">Delivery address</p><p className="mt-1">{order.deliveryAddress.recipientName}<br />{order.deliveryAddress.addressLine}, {order.deliveryAddress.city}, {order.deliveryAddress.state}</p></div>
              <div className="sm:text-right"><p>Products: <strong>{formatCurrency(order.subtotal)}</strong></p><p className="mt-1">Paid to date: <strong>{formatCurrency(order.totalPaid)}</strong></p>{order.deliveryFee > 0 && <p className="mt-1">Delivery: <strong>{formatCurrency(order.deliveryFee)}</strong> ({statusLabel(order.deliveryFeePaymentStatus)})</p>}</div>
            </div>
            {order.deliveryFee > 0 && order.deliveryFeePaymentStatus === "pending" && order.paymentStatus !== "pending" && (
              <button type="button" disabled={busyId === order.id} onClick={() => payDelivery(order)} className="mt-5 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                {busyId === order.id ? "Opening Paystack..." : `Pay delivery fee ${formatCurrency(order.deliveryFee)}`}
              </button>
            )}
            {order.deliveryFeePaymentStatus === "not_set" && order.paymentStatus !== "pending" && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">Marthington is confirming the delivery fee and will update this order.</p>}
          </article>
        ))}
      </div>
    </main>
  );
};

export default ShopOrders;
