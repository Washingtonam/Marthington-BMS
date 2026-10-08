import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { shopRequest } from "../api/shop.js";
import { useShopCart } from "../context/ShopCartContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const ShopProduct = () => {
  const { id } = useParams();
  const { add } = useShopCart();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    shopRequest(`/products/${id}`)
      .then((data) => { if (active) setProduct(data.product); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [id]);

  if (error) return <main role="alert" className="mx-auto max-w-5xl px-5 py-16 text-center text-rose-700">{error}<div><Link to="/shop" className="mt-4 inline-block font-semibold underline">Back to shop</Link></div></main>;
  if (!product) return <main className="mx-auto max-w-5xl px-5 py-16 text-center text-slate-500">Loading product...</main>;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <Link to="/shop" className="text-sm font-semibold text-emerald-700">← Back to shop</Link>
      <section className="mt-6 grid gap-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 md:p-8">
        <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
          {product.image ? <img src={product.image} alt={product.name} className="h-full max-h-[520px] w-full object-cover" /> : <span className="text-7xl font-black text-emerald-700">{product.name.slice(0, 1).toUpperCase()}</span>}
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">{product.category}</p>{product.featured && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Featured</span>}</div>
          <h1 className="mt-3 text-4xl font-black">{product.name}</h1>
          <p className="mt-3 text-sm text-slate-500">Supplied by {product.business.name}</p>
          {product.business.description && <p className="mt-5 leading-7 text-slate-600">{product.business.description}</p>}
          <p className={`mt-6 text-sm font-semibold ${product.available ? "text-emerald-700" : "text-amber-700"}`}>{product.available ? "In stock" : "Currently out of stock"}</p>
          <p className="mt-3 text-3xl font-black">{formatCurrency(product.price)}</p>
          <button type="button" disabled={!product.canPurchase} onClick={() => add(product)} className="mt-6 rounded-xl bg-emerald-600 px-5 py-4 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">{!product.available ? "Out of stock" : product.canPurchase ? "Add to cart" : "Price unavailable"}</button>
          <p className="mt-3 text-xs leading-5 text-slate-500">Orders and payment are handled by Marthington. The supplier does not receive customer orders directly.</p>
        </div>
      </section>
    </main>
  );
};

export default ShopProduct;
