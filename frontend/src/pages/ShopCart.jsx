import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShopCart } from "../context/ShopCartContext.jsx";
import { refreshShopCartItems } from "../api/shop.js";
import { formatCurrency } from "../utils/formatters.js";

const ShopCart = () => {
  const { items, replaceItems, setQuantity, remove, subtotal } = useShopCart();
  const navigate = useNavigate();
  const [refreshingPrices, setRefreshingPrices] = useState(true);
  const [refreshError, setRefreshError] = useState("");
  const [refreshAttempt, setRefreshAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setRefreshingPrices(true);
    setRefreshError("");
    refreshShopCartItems(items)
      .then((latestItems) => {
        if (active) replaceItems(latestItems);
      })
      .catch((error) => {
        if (active) setRefreshError(error.message || "Could not refresh storefront prices.");
      })
      .finally(() => {
        if (active) setRefreshingPrices(false);
      });
    return () => { active = false; };
  }, [refreshAttempt]);

  if (!items.length) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16 text-center">
        <h1 className="text-3xl font-black">Your cart is empty</h1>
        <p className="mt-3 text-slate-500">Browse the shop and add something you like.</p>
        <Link to="/shop" className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white">Browse products</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <h1 className="text-3xl font-black">Your cart</h1>
      <p className="mt-2 text-sm text-slate-500">Marthington receives and coordinates every order. Products may come from multiple suppliers.</p>
      {refreshError && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{refreshError}<button type="button" onClick={() => setRefreshAttempt((attempt) => attempt + 1)} className="ml-2 font-bold underline">Retry</button></div>}
      {refreshingPrices && <p role="status" className="mt-4 text-sm text-slate-500">Checking current storefront prices…</p>}
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <span className="text-3xl font-black text-emerald-700">{item.name.slice(0, 1)}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/shop/product/${item.id}`} className="font-bold hover:text-emerald-700">{item.name}</Link>
                <p className="mt-1 text-xs text-slate-500">Supplied by {item.business.name}</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <p className="font-semibold">{formatCurrency(item.price)}</p>
                  {item.salePrice > 0 && item.originalPrice > item.price && <p className="text-xs text-slate-400 line-through">{formatCurrency(item.originalPrice)}</p>}
                </div>
                {!item.canPurchase && <p className="mt-1 text-xs font-semibold text-rose-700">This product is currently unavailable for purchase. Remove it to continue.</p>}
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-600">Qty
                    <input aria-label={`Quantity for ${item.name}`} type="number" min="1" max="50" value={item.quantity} disabled={refreshingPrices} onChange={(event) => setQuantity(item.id, Number(event.target.value))} className="ml-2 w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-60" />
                  </label>
                  <button type="button" disabled={refreshingPrices} onClick={() => remove(item.id)} className="text-xs font-semibold text-rose-700 underline disabled:opacity-50">Remove</button>
                </div>
              </div>
              <p className="hidden font-bold sm:block">{formatCurrency(item.price * item.quantity)}</p>
            </article>
          ))}
        </div>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">Order summary</h2>
          <div className="mt-4 flex justify-between text-sm"><span>Products subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Delivery fee is confirmed by Marthington after your order and paid separately.</p>
          <button type="button" disabled={refreshingPrices || Boolean(refreshError) || items.some((item) => !item.canPurchase)} onClick={() => navigate("/shop/checkout")} className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Continue to checkout</button>
          <Link to="/shop" className="mt-4 block text-center text-sm font-semibold text-slate-600">Continue shopping</Link>
        </aside>
      </div>
    </main>
  );
};

export default ShopCart;
