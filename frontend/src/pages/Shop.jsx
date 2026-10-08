import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { shopRequest } from "../api/shop.js";
import { useShopCart } from "../context/ShopCartContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const Shop = () => {
  const { add } = useShopCart();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const [catalog, setCatalog] = useState({ products: [], categories: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadListings = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), limit: "24" });
        if (search.trim()) params.set("search", search.trim());
        if (category) params.set("category", category);
        const data = await shopRequest(`/?${params.toString()}`);
        if (!cancelled) {
          setCatalog({
            products: data.products || [],
            categories: data.categories || [],
            pagination: data.pagination || {}
          });
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message || "Could not load the shop.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadListings();
    return () => { cancelled = true; };
  }, [page, search, category, retryCount]);

  return (
    <main>
      <section className="bg-slate-950 px-5 py-14 text-white sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">The Marthington marketplace</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Great finds, one checkout.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Shop products from businesses across Marthington. Marthington receives your order, handles payment and coordinates delivery.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
            <input
              value={search}
              onChange={(event) => { setPage(1); setSearch(event.target.value); }}
              placeholder="Search products or categories"
              aria-label="Search products or categories"
              className="rounded-xl border border-white/15 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-400 focus:ring-2"
            />
            <select
              value={category}
              onChange={(event) => { setPage(1); setCategory(event.target.value); }}
              aria-label="Filter by category"
              className="rounded-xl border border-white/15 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-400 focus:ring-2"
            >
              <option value="">All categories</option>
              {catalog.categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Shop products</h2>
            <p className="mt-1 text-sm text-slate-500">New products from active BMS businesses appear automatically.</p>
          </div>
          {!loading && <p className="text-sm text-slate-500">{catalog.pagination.totalProducts || 0} products</p>}
        </div>

        {error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {error}
            <button type="button" onClick={() => setRetryCount((current) => current + 1)} className="ml-3 font-bold underline">Retry</button>
          </div>
        )}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading shop listings...</div>
        ) : !error && catalog.products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h3 className="text-lg font-bold">No products found</h3>
            <p className="mt-2 text-sm text-slate-500">Try another search or check that active BMS businesses have products in their catalogues.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {catalog.products.map((product) => (
              <article key={product.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Link to={`/shop/product/${product.id}`} className="group">
                  <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100">
                    {product.image
                      ? <img src={product.image} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                      : <span className="text-5xl font-black text-emerald-700">{product.name.slice(0, 1).toUpperCase()}</span>}
                    {product.featured && <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-950">Featured</span>}
                  </div>
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{product.category}</p>
                  <Link to={`/shop/product/${product.id}`} className="mt-2 text-lg font-bold hover:text-emerald-700">{product.name}</Link>
                  <p className="mt-1 text-sm text-slate-500">Supplied by {product.business.name}</p>
                  <p className={`mt-2 text-xs font-semibold ${product.available ? "text-emerald-700" : "text-amber-700"}`}>
                    {product.available ? "In stock" : "Currently out of stock"}
                  </p>
                  <div className="mt-auto pt-5">
                    <p className="text-xl font-black">{formatCurrency(product.price)}</p>
                    <button
                      type="button"
                      disabled={!product.canPurchase}
                      onClick={() => add(product)}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      {!product.available ? "Out of stock" : product.canPurchase ? "Add to cart" : "Price unavailable"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {catalog.pagination.totalPages > 1 && !error && (
          <nav aria-label="Shop pages" className="mt-8 flex items-center justify-center gap-4">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button>
            <span className="text-sm text-slate-600">Page {page} of {catalog.pagination.totalPages}</span>
            <button type="button" disabled={page >= catalog.pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button>
          </nav>
        )}
      </section>
    </main>
  );
};

export default Shop;
