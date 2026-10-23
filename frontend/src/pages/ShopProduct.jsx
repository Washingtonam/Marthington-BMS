import React, { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { shopRequest } from "../api/shop.js";
import { useShopCart } from "../context/ShopCartContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const RecommendedProduct = ({ item, add }) => (
  <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <Link to={`/shop/product/${item.id}`} className="group block">
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 to-slate-100">
        {item.image
          ? <img src={item.image} alt={item.name} className="h-full w-full object-contain p-3 transition group-hover:scale-[1.02]" />
          : <span className="text-5xl font-black text-emerald-700">{String(item.name || "?").slice(0, 1).toUpperCase()}</span>}
        {item.featured && <span className="absolute left-3 top-3 rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-950">Featured</span>}
      </div>
    </Link>
    <div className="flex flex-1 flex-col p-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">{item.category || "General"}</p>
      <Link to={`/shop/product/${item.id}`} className="mt-1 block h-10 overflow-hidden text-sm font-extrabold leading-5 text-slate-900 hover:text-emerald-700">{item.name}</Link>
      <p className="mt-1 truncate text-[11px] text-slate-500">From {item.business.name}</p>
      <p className={`mt-1 text-[11px] font-semibold ${item.available ? "text-emerald-700" : "text-amber-700"}`}>{item.available ? "In stock" : "Currently out of stock"}</p>
      <div className="mt-auto flex items-baseline gap-2 pt-2">
        <span className="text-base font-black text-slate-900">{formatCurrency(item.price)}</span>
        {item.salePrice > 0 && <span className="text-xs text-slate-400 line-through">{formatCurrency(item.originalPrice)}</span>}
      </div>
      <button
        type="button"
        disabled={!item.canPurchase}
        onClick={() => add(item)}
        className="mt-2 w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {item.available ? item.canPurchase ? "Add to cart" : "Price unavailable" : "Out of stock"}
      </button>
    </div>
  </article>
);

const ShopProduct = () => {
  const { id } = useParams();
  const { add } = useShopCart();
  const outletContext = useOutletContext() || {};
  const settings = outletContext.settings || {};
  const customer = outletContext.customer;
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    shopRequest(`/products/${id}`)
      .then((data) => { if (active) setProduct(data.product); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [id]);

  if (error) return <main role="alert" className="mx-auto max-w-5xl px-5 py-16 text-center text-rose-700">{error}<div><Link to="/shop" className="mt-4 inline-block font-semibold underline">Back to storefront</Link></div></main>;
  if (!product) return <main className="mx-auto max-w-5xl px-5 py-16 text-center text-slate-500">Loading product...</main>;

  const whatsappPhone = String(settings.whatsappNumber || "").replace(/\D/g, "").replace(/^0(?=\d{10}$)/, "234");
  const whatsappText = [
    `Hello Marthington, I’m interested in ${product.name}.`,
    `Price: ${formatCurrency(product.price)}.`,
    customer?.name ? `My name is ${customer.name}.` : "",
    customer?.phone ? `You can reach me on ${customer.phone}.` : "",
    "Please share more details and help me place an order."
  ].filter(Boolean).join(" ");
  const whatsappLink = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappText)}`
    : "";

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <Link to="/shop" className="text-sm font-semibold text-emerald-700">← Back to storefront</Link>
      <section className="mt-6 grid gap-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 md:p-8">
        <div className="mx-auto flex aspect-square w-full max-w-[520px] items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
          {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain p-4" /> : <span className="text-7xl font-black text-emerald-700">{product.name.slice(0, 1).toUpperCase()}</span>}
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">{product.category}</p>{product.featured && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Featured</span>}</div>
          <h1 className="mt-3 text-4xl font-black">{product.name}</h1>
          <p className="mt-3 text-sm text-slate-500">Supplied by {product.business.name}</p>
          {product.description && <p className="mt-5 whitespace-pre-line leading-7 text-slate-600">{product.description}</p>}
          <p className={`mt-6 text-sm font-semibold ${product.available ? "text-emerald-700" : "text-amber-700"}`}>{product.available ? "In stock" : "Currently out of stock"}</p>
          <div className="mt-3 flex items-baseline gap-3">
            <p className="text-3xl font-black">{formatCurrency(product.price)}</p>
            {product.salePrice > 0 && <><span className="text-sm font-black text-rose-600">Save {formatCurrency(product.originalPrice - product.price)}</span><p className="text-lg font-semibold text-slate-400 line-through">{formatCurrency(product.originalPrice)}</p></>}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" disabled={!product.canPurchase} onClick={() => add(product)} className="rounded-xl bg-emerald-600 px-5 py-4 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">{!product.available ? "Out of stock" : product.canPurchase ? "Add to cart" : "Price unavailable"}</button>
            {whatsappLink ? (
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center font-bold text-emerald-900 transition hover:bg-emerald-100">
                <span aria-hidden="true">◉</span> Ask about this on WhatsApp
              </a>
            ) : (
              <button type="button" disabled title="WhatsApp contact has not been configured yet" className="rounded-xl border border-slate-200 bg-slate-100 px-5 py-4 font-bold text-slate-400">WhatsApp unavailable</button>
            )}
          </div>
          {!whatsappPhone && <p className="mt-2 text-xs text-slate-500">WhatsApp inquiries are not available right now.</p>}
          <p className="mt-3 text-xs leading-5 text-slate-500">Orders and payment are handled by Marthington. The supplier does not receive customer orders directly.</p>
        </div>
      </section>
      {product.relatedProducts?.length > 0 && (
        <section className="mt-12" aria-label={`More products from ${product.business.name}`}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">More from this business</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">More from {product.business.name}</h2>
              <p className="mt-1 text-sm text-slate-500">Explore other products listed by this business.</p>
            </div>
            <Link to="/shop" className="text-sm font-bold text-emerald-700 hover:underline">Explore all products</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {product.relatedProducts.map((item) => <RecommendedProduct key={item.id} item={item} add={add} />)}
          </div>
        </section>
      )}
      {product.discoverProducts?.length > 0 && (
        <section className="mt-12" aria-label="Explore products from other businesses">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Discover more</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">More from across the storefront</h2>
              <p className="mt-1 text-sm text-slate-500">A selection of products from other Marthington businesses.</p>
            </div>
            <Link to="/shop" className="text-sm font-bold text-emerald-700 hover:underline">Browse the storefront</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {product.discoverProducts.map((item) => <RecommendedProduct key={item.id} item={item} add={add} />)}
          </div>
        </section>
      )}
    </main>
  );
};

export default ShopProduct;
