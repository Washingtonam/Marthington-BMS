import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShopCart } from "../context/ShopCartContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const ShopCart = () => {
  const { items, setQuantity, remove, subtotal } = useShopCart();
  const navigate = useNavigate();

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
                <p className="mt-2 font-semibold">{formatCurrency(item.price)}</p>
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-600">Qty
                    <input aria-label={`Quantity for ${item.name}`} type="number" min="1" max="50" value={item.quantity} onChange={(event) => setQuantity(item.id, Number(event.target.value))} className="ml-2 w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                  </label>
                  <button type="button" onClick={() => remove(item.id)} className="text-xs font-semibold text-rose-700 underline">Remove</button>
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
          <button type="button" onClick={() => navigate("/shop/checkout")} className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700">Continue to checkout</button>
          <Link to="/shop" className="mt-4 block text-center text-sm font-semibold text-slate-600">Continue shopping</Link>
        </aside>
      </div>
    </main>
  );
};

export default ShopCart;
