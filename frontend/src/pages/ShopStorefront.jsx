import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { shopRequest } from "../api/shop.js";
import { formatCurrency } from "../utils/formatters.js";

const PAGE_SIZE = 12;

const ShopStorefront = () => {
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [descriptions, setDescriptions] = useState({});
  const [priceDrafts, setPriceDrafts] = useState({});
  const [priceModeDrafts, setPriceModeDrafts] = useState({});
  const [images, setImages] = useState({});
  const [imageUrls, setImageUrls] = useState({});
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalProducts: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [imageFilter, setImageFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const imageDrafts = useRef({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), search });
      if (imageFilter !== "all") query.set("imageStatus", imageFilter);
      const data = await shopRequest(`/storefront/products?${query}`, {
        token: localStorage.getItem("bms_token")
      });
      setBusiness(data.business);
      setProducts(data.products || []);
      setPagination(data.pagination || { currentPage: page, totalPages: 1, totalProducts: 0 });
      setDescriptions((current) => Object.fromEntries((data.products || []).map((product) => [
        product._id,
        current[product._id] ?? product.shopDescription ?? ""
      ])));
      setPriceDrafts((current) => Object.fromEntries((data.products || []).map((product) => [
        product._id,
        current[product._id] ?? (product.shopSalePrice > 0 ? String(product.shopSalePrice) : "")
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
      setImageUrls((current) => Object.fromEntries((data.products || []).map((product) => [
        product._id,
        current[product._id] ?? product.shopImage ?? ""
      ])));
    } catch (requestError) {
      setError(requestError.message || "Could not load your storefront.");
    } finally {
      setLoading(false);
    }
  }, [page, search, imageFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => {
    Object.values(imageDrafts.current).forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);

  const saveProduct = async (product) => {
    setBusyId(product._id);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.append("shopDescription", descriptions[product._id] || "");
      form.append("shopSalePrice", String(Number(priceDrafts[product._id]) || 0));
      form.append("shopPriceMode", priceModeDrafts[product._id] || "discount");
      if (images[product._id]) form.append("image", images[product._id].file);
      else if ((imageUrls[product._id] ?? product.shopImage ?? "") !== (product.shopImage || "")) {
        form.append("shopImageUrl", imageUrls[product._id] ?? "");
      }
      const response = await shopRequest(`/storefront/products/${product._id}`, {
        method: "PATCH",
        token: localStorage.getItem("bms_token"),
        body: form
      });
      setProducts((current) => current.map((item) => item._id === product._id ? response.product : item));
      setDescriptions((current) => ({ ...current, [product._id]: response.product.shopDescription || "" }));
      setPriceDrafts((current) => ({
        ...current,
        [product._id]: response.product.shopSalePrice > 0 ? String(response.product.shopSalePrice) : ""
      }));
      setPriceModeDrafts((current) => ({
        ...current,
        [product._id]: response.product.shopPriceMode || "discount"
      }));
      setImageUrls((current) => ({ ...current, [product._id]: response.product.shopImage || "" }));
      if (imageDrafts.current[product._id]) URL.revokeObjectURL(imageDrafts.current[product._id].previewUrl);
      delete imageDrafts.current[product._id];
      setImages((current) => {
        const next = { ...current };
        delete next[product._id];
        return next;
      });
      setMessage(`Storefront details saved for ${product.name}.`);
    } catch (requestError) {
      setError(requestError.message || `Could not update ${product.name}.`);
    } finally {
      setBusyId("");
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">Storefront manager</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">{business?.name || "Your business"} storefront</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Add storefront photos, descriptions, and pricing for your products. Product names, base prices, stock, and categories remain managed in your BMS catalogue.
          </p>
        </div>
        <Link to="/shop" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">View public storefront</Link>
      </div>

      {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}<button type="button" onClick={load} className="ml-3 font-bold underline">Retry</button></div>}
      {message && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}
      {!loading && business && business.shopVisible === false && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your storefront is currently hidden from shoppers. Contact your administrator if it should be made visible.
        </p>
      )}

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 lg:max-w-xl">
          <span aria-hidden="true" className="text-slate-400">🔎</span>
          <input
            type="search"
            aria-label="Search storefront products"
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Search products by name, category, or SKU..."
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          Product photos
          <select
            aria-label="Filter products by image"
            value={imageFilter}
            onChange={(event) => {
              setPage(1);
              setImageFilter(event.target.value);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="all">All products</option>
            <option value="present">With photos</option>
            <option value="missing">Without photos</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading your storefront products...</div>
      ) : !error && products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h2 className="text-lg font-bold text-slate-900">{imageFilter !== "all" ? "No products match this photo filter" : search ? "No matching products" : "No products in your BMS catalogue yet"}</h2>
          <p className="mt-2 text-sm text-slate-500">{imageFilter !== "all" ? "Choose a different photo filter or search term." : search ? "Try another product name, category, or SKU." : "Add products in BMS, then return here to manage their storefront details."}</p>
          {!search && imageFilter === "all" && <Link to="/app/products" className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Open BMS product catalogue</Link>}
        </div>
      ) : (
        <>
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const preview = images[product._id]?.previewUrl || product.shopImage;
            return (
              <article key={product._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="relative">
                  <div className="relative flex h-40 items-center justify-center bg-slate-100">
                    {preview ? <img src={preview} alt={`${product.name} storefront`} className="absolute inset-0 h-full w-full object-cover" /> : <span className="text-5xl font-black text-emerald-700">{product.name.slice(0, 1).toUpperCase()}</span>}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{product.category || "General"}</p>
                    <h2 className="mt-1 truncate text-lg font-bold text-slate-900">{product.name}</h2>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-black text-slate-900">{formatCurrency(Number(priceDrafts[product._id]) > 0 ? Number(priceDrafts[product._id]) : product.price)}</span>
                      {priceModeDrafts[product._id] === "discount" && Number(priceDrafts[product._id]) > 0 && Number(priceDrafts[product._id]) < product.price && <span className="text-xs text-slate-400 line-through">{formatCurrency(product.price)}</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Base BMS price: {formatCurrency(product.price)} · Stock: {product.stock}</p>
                    <Link to={`/app/products?edit=${encodeURIComponent(product._id)}`} className="mt-2 inline-block text-xs font-bold text-emerald-700 underline">Edit product in BMS</Link>
                  </div>
                </div>
                <div className="space-y-3 border-t border-slate-100 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-bold text-slate-600">
                      Storefront price (NGN)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        aria-label={`${product.name} storefront price`}
                        value={priceDrafts[product._id] ?? ""}
                        onChange={(event) => setPriceDrafts((current) => ({ ...current, [product._id]: event.target.value }))}
                        placeholder={String(product.price)}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800"
                      />
                      <span className="mt-1 block font-normal text-slate-400">Leave blank or enter 0 to use the BMS price.</span>
                    </label>
                    <label className="block text-xs font-bold text-slate-600">
                      Price display
                      <select
                        aria-label={`${product.name} storefront price mode`}
                        value={priceModeDrafts[product._id] || "discount"}
                        onChange={(event) => setPriceModeDrafts((current) => ({ ...current, [product._id]: event.target.value }))}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"
                      >
                        <option value="discount">Show as discount (strike through BMS price)</option>
                        <option value="override">Replace price (no strike-through)</option>
                      </select>
                      <span className="mt-1 block font-normal text-slate-400">Discount price must be lower than the base price.</span>
                    </label>
                  </div>
                  <label className="block text-xs font-bold text-slate-600">
                    Product photo
                    <input type="file" accept="image/*" onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
                        setError("Choose an image no larger than 5 MB.");
                        event.target.value = "";
                        return;
                      }
                      setError("");
                      if (imageDrafts.current[product._id]) URL.revokeObjectURL(imageDrafts.current[product._id].previewUrl);
                      const draft = { file, previewUrl: URL.createObjectURL(file) };
                      imageDrafts.current[product._id] = draft;
                      setImages((current) => ({ ...current, [product._id]: draft }));
                    }} className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-bold file:text-emerald-800" />
                    <span className="mt-1 block font-normal text-slate-400">Uploads are saved to Cloudinary. Maximum 5 MB.</span>
                  </label>
                  <label className="block text-xs font-bold text-slate-600">
                    Or paste a Cloudinary image URL
                    <input
                      type="url"
                      aria-label={`${product.name} Cloudinary image URL`}
                      value={imageUrls[product._id] ?? product.shopImage ?? ""}
                      onChange={(event) => {
                        setImageUrls((current) => ({ ...current, [product._id]: event.target.value }));
                        if (imageDrafts.current[product._id]) URL.revokeObjectURL(imageDrafts.current[product._id].previewUrl);
                        delete imageDrafts.current[product._id];
                        setImages((current) => {
                          const next = { ...current };
                          delete next[product._id];
                          return next;
                        });
                      }}
                      placeholder="https://res.cloudinary.com/..."
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-normal text-slate-800"
                    />
                    <span className="mt-1 block font-normal text-slate-400">Only secure Cloudinary image URLs are accepted.</span>
                  </label>
                  <label className="block text-xs font-bold text-slate-600">
                    Storefront description
                    <textarea aria-label="Storefront description" rows={3} maxLength={1000} value={descriptions[product._id] || ""} onChange={(event) => setDescriptions((current) => ({ ...current, [product._id]: event.target.value }))} placeholder="Describe this product for shoppers..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800" />
                    <span className="mt-1 block text-right font-normal text-slate-400">{(descriptions[product._id] || "").length}/1000</span>
                  </label>
                  <button type="button" onClick={() => saveProduct(product)} disabled={busyId === product._id} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-50">
                    {busyId === product._id ? "Saving..." : "Save storefront details"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        </>
      )}

      {pagination.totalPages > 1 && (() => {
        const currentPage = Number(pagination.currentPage) || page;
        const totalPages = Number(pagination.totalPages);
        const pages = new Set([1, totalPages]);
        for (let pageNumber = Math.max(1, currentPage - 2); pageNumber <= Math.min(totalPages, currentPage + 2); pageNumber += 1) pages.add(pageNumber);
        const pageNumbers = [...pages].sort((a, b) => a - b).flatMap((pageNumber, index, values) => {
          const previous = values[index - 1];
          return previous && pageNumber - previous > 1 ? ["ellipsis", pageNumber] : [pageNumber];
        });
        const totalProducts = Number(pagination.totalProducts) || 0;
        return (
          <nav aria-label="Storefront product pages" className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-slate-500">Showing {((currentPage - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(currentPage * PAGE_SIZE, totalProducts).toLocaleString()} of {totalProducts.toLocaleString()} products</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button>
              {pageNumbers.map((pageNumber, index) => pageNumber === "ellipsis"
                ? <span key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-sm text-slate-400">…</span>
                : <button key={pageNumber} type="button" aria-label={`Page ${pageNumber}`} aria-current={pageNumber === currentPage ? "page" : undefined} disabled={loading} onClick={() => setPage(pageNumber)} className={`min-w-10 rounded-lg border px-3 py-2 text-sm font-semibold ${pageNumber === currentPage ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{pageNumber}</button>
              )}
              <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button>
            </div>
          </nav>
        );
      })()}
    </main>
  );
};

export default ShopStorefront;
