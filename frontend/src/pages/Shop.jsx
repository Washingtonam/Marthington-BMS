import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { shopRequest } from "../api/shop.js";
import { useShopCart } from "../context/ShopCartContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const Shop = () => {
  const { add } = useShopCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const [catalog, setCatalog] = useState({ products: [], categories: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const slideshowProducts = useMemo(
    () => catalog.products.filter((product) => product.image),
    [catalog.products]
  );
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const nextCategory = searchParams.get("category") || "";
    setCategory(nextCategory);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    if (slideshowProducts.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % slideshowProducts.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slideshowProducts]);

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
          setSlideIndex(0);
          setCatalog({
            products: data.products || [],
            categories: data.categories || [],
            pagination: data.pagination || {}
          });
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message || "Could not load the storefront.");
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
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">The Marthington storefront</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Discover something good.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Explore products from businesses across Marthington. We receive your order, handle payment and coordinate delivery.
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
              onChange={(event) => {
                setPage(1);
                setCategory(event.target.value);
                const nextParams = new URLSearchParams(searchParams);
                if (event.target.value) nextParams.set("category", event.target.value);
                else nextParams.delete("category");
                setSearchParams(nextParams, { replace: true });
              }}
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
        {!loading && !error && slideshowProducts.length > 0 && (() => {
          const product = slideshowProducts[slideIndex % slideshowProducts.length];
          return (
            <section aria-label="Featured storefront slideshow" className="relative mb-10 overflow-hidden rounded-[2rem] bg-slate-950 shadow-xl">
              <div className="absolute inset-0">
                <img src={product.image} alt="" className="h-full w-full object-cover opacity-45" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-slate-950/10" />
              </div>
              <div className="relative flex min-h-[310px] flex-col justify-between gap-8 p-6 text-white sm:min-h-[380px] sm:p-10 lg:flex-row lg:items-end">
                <div className="max-w-xl">
                  <div className="flex flex-wrap gap-2">
                    {product.featured && <span className="rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-950">Featured</span>}
                    {product.salePrice > 0 && <span className="rounded-full bg-rose-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">Save {formatCurrency(product.originalPrice - product.price)}</span>}
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">{product.business.name}</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{product.name}</h2>
                  {product.description && <p className="mt-3 line-clamp-2 max-w-lg text-sm leading-6 text-white/75">{product.description}</p>}
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span className="text-2xl font-black">{formatCurrency(product.price)}</span>
                    {product.salePrice > 0 && <span className="text-sm text-white/60 line-through">{formatCurrency(product.originalPrice)}</span>}
                    <Link to={`/shop/product/${product.id}`} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-100">View product</Link>
                  </div>
                </div>
                {slideshowProducts.length > 1 && (
                  <div className="flex items-center gap-2 self-end">
                    <button type="button" aria-label="Previous featured product" onClick={() => setSlideIndex((current) => (current - 1 + slideshowProducts.length) % slideshowProducts.length)} className="grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-black/20 text-lg hover:bg-white/20">←</button>
                    <span className="min-w-14 text-center text-xs font-bold tabular-nums">{slideIndex + 1} / {slideshowProducts.length}</span>
                    <button type="button" aria-label="Next featured product" onClick={() => setSlideIndex((current) => (current + 1) % slideshowProducts.length)} className="grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-black/20 text-lg hover:bg-white/20">→</button>
                  </div>
                )}
              </div>
            </section>
          );
        })()}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Explore the storefront</h2>
            <p className="mt-1 text-sm text-slate-500">Featured picks and products with photos are shown first. Discover a fresh randomized selection whenever you reload.</p>
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
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading storefront listings...</div>
        ) : !error && catalog.products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h3 className="text-lg font-bold">No products found</h3>
            <p className="mt-2 text-sm text-slate-500">Try another search or check that active BMS businesses have products listed in their storefronts.</p>
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
                    {product.salePrice > 0 && <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">On sale</span>}
                  </div>
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{product.category}</p>
                  <Link to={`/shop/product/${product.id}`} className="mt-2 text-lg font-bold hover:text-emerald-700">{product.name}</Link>
                  {product.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{product.description}</p>}
                  <p className="mt-1 text-sm text-slate-500">Supplied by {product.business.name}</p>
                  <p className={`mt-2 text-xs font-semibold ${product.available ? "text-emerald-700" : "text-amber-700"}`}>
                    {product.available ? "In stock" : "Currently out of stock"}
                  </p>
                  <div className="mt-auto pt-5">
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-black">{formatCurrency(product.price)}</p>
                      {product.salePrice > 0 && <p className="text-sm font-semibold text-slate-400 line-through">{formatCurrency(product.originalPrice)}</p>}
                    </div>
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
          <nav aria-label="Storefront pages" className="mt-8 flex items-center justify-center gap-4">
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
