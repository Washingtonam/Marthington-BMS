import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import request from "../api/client.js";
import { formatCurrency } from "../utils/formatters.js";

const Shop = () => {
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
        const data = await request(`/shop?${params.toString()}`);
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
    return () => {
      cancelled = true;
    };
  }, [page, search, category, retryCount]);

  const getContactUrl = (phone, productName) => {
    let digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("0") && digits.length === 11) digits = `234${digits.slice(1)}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(`Hello, I’m interested in ${productName}.`)}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="text-lg font-black tracking-tight">Marthington <span className="text-emerald-600">Shop</span></Link>
          <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Back to home</Link>
        </div>
      </header>

      <section className="bg-slate-950 px-5 py-14 text-white sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">Discover local businesses</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Find your next favourite</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Browse products from businesses on Marthington and contact sellers directly to make an enquiry.
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
          <h2 className="text-xl font-bold">Shop products</h2>
          {!loading && <p className="text-sm text-slate-500">{catalog.pagination.totalProducts || 0} available</p>}
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
            <p className="mt-2 text-sm text-slate-500">Try another search, or check back as more businesses publish their products.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {catalog.products.map((product) => {
              const contactUrl = getContactUrl(product.business.phone, product.name);
              return (
                <article key={product.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex h-36 items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100">
                    {product.business.logo
                      ? <img src={product.business.logo} alt="" className="h-20 w-20 rounded-2xl object-contain" />
                      : <span className="text-4xl font-black text-emerald-700">{product.name.slice(0, 1).toUpperCase()}</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{product.category}</p>
                    <h3 className="mt-2 text-lg font-bold">{product.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{product.business.name}</p>
                    <p className={`mt-2 text-xs font-semibold ${product.available ? "text-emerald-700" : "text-amber-700"}`}>
                      {product.available ? "In stock" : "Currently out of stock"}
                    </p>
                    {product.business.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-slate-500">{product.business.description}</p>
                    )}
                    <div className="mt-auto pt-5">
                      <p className="text-xl font-black">{formatCurrency(product.price)}</p>
                      <a
                        href={contactUrl || product.business.website || undefined}
                        target={contactUrl || product.business.website ? "_blank" : undefined}
                        rel={contactUrl || product.business.website ? "noreferrer" : undefined}
                        aria-disabled={!contactUrl && !product.business.website}
                        className={`mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ${
                          contactUrl || product.business.website
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "cursor-not-allowed bg-slate-100 text-slate-400"
                        }`}
                      >
                        {contactUrl ? "Contact on WhatsApp" : product.business.website ? "Visit business website" : "Contact unavailable"}
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {catalog.pagination.totalPages > 1 && !error && (
          <nav aria-label="Shop pages" className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">Page {page} of {catalog.pagination.totalPages}</span>
            <button
              type="button"
              disabled={page >= catalog.pagination.totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </main>
  );
};

export default Shop;
