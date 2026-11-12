import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getBranches,
  getProductNameAudit,
  getProductMergePreview,
  keepCatalogProductsSeparate,
  mergeCatalogProducts
} from "../api/branches.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const pairKey = (first, second) => [first, second].sort().join(":");
const groupKey = (group, index) => `${group.type}-${group.products.map((product) => product._id).join("-")}-${index}`;
const sourceLabel = (product) => `${product.name} · SKU ${product.sku || "not set"} · ${product.category || "General"} · #${String(product._id).slice(-6)}`;
const stockAfterMerge = (products, policy) => {
  if (policy === "sum") return products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const source = policy === "primary" ? products[0] : products.find((product) => product._id === policy);
  return Number(source?.stock || 0);
};
const valueAfterMerge = (products, policy, field, weights = []) => {
  if (policy === "highest") return Math.max(...products.map((product) => Number(product[field] || 0)));
  if (policy === "lowest") return Math.min(...products.map((product) => Number(product[field] || 0)));
  if (policy === "weighted-average") {
    const totalWeight = weights.reduce((sum, weight) => sum + Number(weight || 0), 0);
    return totalWeight > 0
      ? Number((products.reduce((sum, product, index) =>
        sum + Number(product[field] || 0) * Number(weights[index] || 0), 0
      ) / totalWeight).toFixed(2))
      : Number((products.reduce((sum, product) => sum + Number(product[field] || 0), 0) / products.length).toFixed(2));
  }
  const source = policy === "primary" ? products[0] : products.find((product) => product._id === policy);
  return Number(source?.[field] || 0);
};

const ProductNameReview = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const initialBranchId = searchParams.get("branchId")
    || (user?.role === "owner" || user?.role === "super_admin" ? "headOffice" : user?.branchId || "headOffice");
  const [branchId, setBranchId] = useState(initialBranchId);
  const [branches, setBranches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [scannedProducts, setScannedProducts] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [branchError, setBranchError] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [preview, setPreview] = useState(null);
  const [stockPolicy, setStockPolicy] = useState("sum");
  const [sellingPricePolicy, setSellingPricePolicy] = useState("primary");
  const [costPricePolicy, setCostPricePolicy] = useState("weighted-average");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [savingDecision, setSavingDecision] = useState(false);
  const [merging, setMerging] = useState(false);
  const [notice, setNotice] = useState("");

  const canManageCatalog = user?.role === "owner"
    || user?.role === "super_admin"
    || user?.permissions?.canManageProducts === true;
  const canMergeProducts = user?.role === "owner"
    || user?.role === "super_admin"
    || (user?.permissions?.canManageProducts === true
      && user?.permissions?.canManageAllBranchInventory === true);
  const canChooseBranch = user?.role === "owner"
    || user?.role === "super_admin"
    || user?.permissions?.canViewAllBranchInventory === true
    || user?.permissions?.canManageAllBranchInventory === true;

  const loadAudit = useCallback(async (location = branchId) => {
    try {
      setLoading(true);
      setPageError("");
      const result = await getProductNameAudit(location);
      setGroups(result.groups || []);
      setTotalGroups(result.totalGroups || 0);
      setScannedProducts(result.scannedProducts || 0);
      setTruncated(Boolean(result.truncated));
      setSelectedProducts([]);
      setSelectedGroup("");
      setPreview(null);
    } catch (error) {
      setPageError(error.message || "Could not load product-name review.");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (!canChooseBranch) return undefined;
    let active = true;
    getBranches()
      .then((result) => {
        if (active) setBranches(Array.isArray(result) ? result : []);
      })
      .catch((error) => {
        if (active) setBranchError(error.message || "Could not load branches.");
      });
    return () => { active = false; };
  }, [canChooseBranch]);

  useEffect(() => {
    loadAudit(branchId);
  }, [branchId, loadAudit]);

  const selectedProductsForMerge = useMemo(() => {
    const group = groups.find((candidate, index) => groupKey(candidate, index) === selectedGroup);
    if (!group || !selectedProducts.every((id) => group.products.some((product) => product._id === id))) return [];
    return selectedProducts.map((id) => group.products.find((product) => product._id === id));
  }, [groups, selectedGroup, selectedProducts]);

  const selectProduct = (groupId, productId) => {
    setNotice("");
    setPageError("");
    setPreview(null);
    if (selectedGroup !== groupId) {
      setSelectedGroup(groupId);
      setSelectedProducts([productId]);
      return;
    }
    if (selectedProducts.includes(productId)) {
      setSelectedProducts((current) => current.filter((id) => id !== productId));
      return;
    }
    if (selectedProducts.length >= 50) {
      setPageError("Select no more than 50 products in a single merge.");
      return;
    }
    setSelectedProducts((current) => [...current, productId]);
  };

  const openMergePreview = async () => {
    if (selectedProducts.length < 2 || !canMergeProducts) return;
    try {
      setPreviewLoading(true);
      setPageError("");
      if (stockPolicy !== "sum" && !selectedProducts.includes(stockPolicy)) setStockPolicy("primary");
      if (!["highest", "lowest"].includes(sellingPricePolicy)
        && !["primary", "secondary"].includes(sellingPricePolicy)
        && !selectedProducts.includes(sellingPricePolicy)) setSellingPricePolicy("primary");
      if (!["weighted-average", "highest", "lowest", "primary", "secondary"].includes(costPricePolicy)
        && !selectedProducts.includes(costPricePolicy)) setCostPricePolicy("weighted-average");
      const result = await getProductMergePreview(selectedProducts);
      setPreview(result);
    } catch (error) {
      setPageError(error.message || "Could not prepare the merge preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const keepSeparate = async () => {
    if (selectedProducts.length < 2 || !canManageCatalog) return;
    const group = groups.find((candidate, index) => groupKey(candidate, index) === selectedGroup);
    const selectedPairKeys = [];
    for (let firstIndex = 0; firstIndex < selectedProducts.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < selectedProducts.length; secondIndex += 1) {
        selectedPairKeys.push(pairKey(selectedProducts[firstIndex], selectedProducts[secondIndex]));
      }
    }
    const savedPairKeys = new Set((group?.keptSeparatePairs || []).map((pair) => pairKey(...pair)));
    const alreadySeparate = selectedPairKeys.length > 0 && selectedPairKeys.every((key) => savedPairKeys.has(key));
    try {
      setSavingDecision(true);
      setPageError("");
      const result = await keepCatalogProductsSeparate({
        branchId,
        productIds: selectedProducts,
        keepSeparate: !alreadySeparate
      });
      setNotice(result.message || (alreadySeparate ? "Keep-separate decision removed." : "Saved: these products will remain separate."));
      await loadAudit(branchId);
    } catch (error) {
      setPageError(error.message || "Could not save this decision.");
    } finally {
      setSavingDecision(false);
    }
  };

  const confirmMerge = async () => {
    if (!preview || selectedProducts.length < 2 || !canMergeProducts) return;
    const [primary, ...secondaries] = selectedProductsForMerge;
    try {
      setMerging(true);
      setPageError("");
      const result = await mergeCatalogProducts({
        primaryId: primary._id,
        secondaryIds: secondaries.map((product) => product._id),
        stockPolicy,
        sellingPricePolicy,
        costPricePolicy
      });
      setNotice(result.message || "Products merged successfully.");
      await loadAudit(branchId);
    } catch (error) {
      setPageError(error.message || "Could not merge the selected products.");
    } finally {
      setMerging(false);
    }
  };

  const makeSurvivor = (productId) => {
    const reorderedIds = [productId, ...selectedProducts.filter((id) => id !== productId)];
    setSelectedProducts(reorderedIds);
    setPreview((current) => current && ({
      ...current,
      products: reorderedIds.map((id) => current.products.find((product) => product._id === id))
    }));
  };

  useEffect(() => {
    if (!preview) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !merging) setPreview(null);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [preview, merging]);

  return (
    <main className="page-shell space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link className="text-sm font-medium text-blue-700 hover:underline" to={`/app/inventory?branchId=${encodeURIComponent(branchId)}`}>
            &larr; Back to inventory
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Product name review</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Compare duplicate and similar-name suggestions. Similarity is never treated as proof: products are only merged after you review the business-wide impact and confirm.
          </p>
        </div>
        {canChooseBranch ? (
          <label className="min-w-56 text-sm font-medium text-slate-700">
            Scan location
            <select
              className="form-select mt-1 w-full"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              aria-label="Scan inventory location"
            >
              <option value="headOffice">Head office</option>
              {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
            </select>
          </label>
        ) : (
          <p className="text-sm text-slate-500">Scanning your permitted inventory location</p>
        )}
      </header>

      {pageError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{pageError}</div>}
      {branchError && canChooseBranch && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{branchError}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      <section className="page-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Suggestions</h2>
            <p className="text-sm text-slate-500">
              {loading ? "Scanning catalog..." : `${totalGroups} groups found across ${scannedProducts} products${truncated ? " (showing the first 200)" : ""}.`}
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => loadAudit(branchId)} disabled={loading}>
            {loading ? "Scanning..." : "Refresh scan"}
          </button>
        </div>

        {!loading && groups.length === 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
            No unresolved duplicate or similar-name suggestions were found at this location.
          </div>
        )}

        <div className="space-y-4">
          {groups.map((group, index) => {
            const groupId = groupKey(group, index);
            const hasSelection = selectedGroup === groupId && selectedProducts.length > 0;
            const selectedPairKeys = [];
            for (let firstIndex = 0; firstIndex < selectedProducts.length; firstIndex += 1) {
              for (let secondIndex = firstIndex + 1; secondIndex < selectedProducts.length; secondIndex += 1) {
                selectedPairKeys.push(pairKey(selectedProducts[firstIndex], selectedProducts[secondIndex]));
              }
            }
            const savedPairKeys = new Set((group.keptSeparatePairs || []).map((pair) => pairKey(...pair)));
            const selectedPairsSeparate = selectedPairKeys.length > 0 && selectedPairKeys.every((key) => savedPairKeys.has(key));
            return (
              <article key={groupId} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${group.type === "duplicate" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                      {group.type === "duplicate" ? "Same normalized name" : "Possible similar name"}
                    </span>
                    <span className="ml-2 text-sm text-slate-500">{group.products.length} products</span>
                    {group.keptSeparatePairs?.length > 0 && <span className="ml-2 text-xs text-slate-500">{group.keptSeparatePairs.length} pair{group.keptSeparatePairs.length === 1 ? "" : "s"} marked separate</span>}
                  </div>
                  <p className="text-xs text-slate-500">Select two or more products to compare, keep separate, or merge.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.products.map((product) => {
                    const selected = selectedGroup === groupId && selectedProducts.includes(product._id);
                    return (
                      <button
                        key={product._id}
                        type="button"
                        onClick={() => selectProduct(groupId, product._id)}
                        aria-pressed={selected}
                        className={`rounded-lg border p-3 text-left transition ${selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-400"}`}
                      >
                        <strong className="block text-slate-900">{product.name}</strong>
                        <span className="mt-1 block text-xs text-slate-500">SKU: {product.sku || "Not set"} · {product.category || "General"}</span>
                        <span className="mt-2 block text-sm text-slate-700">Stock {Number(product.stock || 0)} · Selling {formatCurrency(Number(product.price || 0))}</span>
                        {product.costPrice !== undefined && <span className="block text-sm text-slate-700">Cost {formatCurrency(Number(product.costPrice || 0))}</span>}
                        {product.preferredSupplier?.name && <span className="mt-1 block text-xs text-slate-500">Supplier: {product.preferredSupplier.name}</span>}
                      </button>
                    );
                  })}
                </div>
                {hasSelection && selectedProducts.length >= 2 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <span className="mr-auto text-sm text-slate-600">
                      Selected {selectedProducts.length}: {selectedProductsForMerge.map((product) => product?.name).join(", ")}
                      {selectedPairsSeparate && " · saved to stay separate"}
                    </span>
                    {canManageCatalog && (
                      <button type="button" className="btn btn-secondary" onClick={keepSeparate} disabled={savingDecision}>
                        {savingDecision ? "Saving..." : selectedPairsSeparate ? "Undo keep separate" : "Keep selected separate"}
                      </button>
                    )}
                    {canMergeProducts && (
                      <button type="button" className="btn btn-primary" onClick={openMergePreview} disabled={previewLoading}>
                        {previewLoading ? "Preparing..." : "Compare merge impact"}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {preview && selectedProductsForMerge.length >= 2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !merging) setPreview(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-merge-title"
            className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
          >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="product-merge-title" className="text-lg font-semibold">Merge impact and rules</h2>
              <p className="mt-1 text-sm text-slate-600">{preview.warning}</p>
            </div>
            <button type="button" className="btn btn-secondary shrink-0" onClick={() => setPreview(null)} disabled={merging}>
              Close
            </button>
          </div>
          {pageError && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{pageError}</div>}
          <section className="space-y-4" aria-label="Product merge preview">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {preview.products.map((product, index) => (
              <div key={product._id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong>{index === 0 ? "Surviving product" : "Product to merge in"}</strong>
                  {index !== 0 && <button type="button" className="text-sm font-medium text-blue-700 underline" onClick={() => makeSurvivor(product._id)}>Use as survivor</button>}
                </div>
                <p className="mt-1 text-slate-900">{product.name} {product.sku ? `· ${product.sku}` : ""}</p>
                <p className="text-sm text-slate-600">Head office: stock {product.stock} · selling {formatCurrency(product.sellingPrice)} · cost {formatCurrency(product.costPrice)}</p>
                <p className="text-xs text-slate-500">Category: {product.category || "General"} · Supplier: {product.preferredSupplier || "Not linked"}</p>
                <p className="mt-1 text-xs text-slate-500">Online store: {product.shopVisible ? "visible" : "hidden"}</p>
                <p className="mt-2 text-xs font-medium text-slate-500">Linked records</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                  {Object.entries(product.references || {}).map(([label, count]) => <span key={label} className="rounded bg-slate-100 px-2 py-1">{label}: {count}</span>)}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">Stock at each location
              <select className="form-select mt-1 w-full" value={stockPolicy} onChange={(event) => setStockPolicy(event.target.value)}>
                <option value="sum">Add all quantities together</option>
                {preview.products.map((product, index) => <option key={product._id} value={index === 0 ? "primary" : product._id}>Use stock from {sourceLabel(product)}{index === 0 ? " (survivor)" : ""}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Selling price
              <select className="form-select mt-1 w-full" value={sellingPricePolicy} onChange={(event) => setSellingPricePolicy(event.target.value)}>
                {preview.products.map((product, index) => <option key={product._id} value={index === 0 ? "primary" : product._id}>Use price from {sourceLabel(product)}{index === 0 ? " (survivor)" : ""}</option>)}
                <option value="highest">Use highest price</option>
                <option value="lowest">Use lowest price</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Cost price
              <select className="form-select mt-1 w-full" value={costPricePolicy} onChange={(event) => setCostPricePolicy(event.target.value)}>
                {preview.products.map((product, index) => <option key={product._id} value={index === 0 ? "primary" : product._id}>Use cost from {sourceLabel(product)}{index === 0 ? " (survivor)" : ""}</option>)}
                <option value="weighted-average">Use stock-weighted average</option>
                <option value="highest">Use highest cost</option>
                <option value="lowest">Use lowest cost</option>
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            <strong>Projected head-office result:</strong>{" "}
            {stockAfterMerge(preview.products, stockPolicy)} units ·{" "}
            {formatCurrency(valueAfterMerge(preview.products.map((product) => ({ ...product, price: product.sellingPrice })), sellingPricePolicy, "price"))} selling price ·{" "}
            {formatCurrency(valueAfterMerge(
              preview.products,
              costPricePolicy,
              "costPrice",
              preview.products.map((product) => product.stock)
            ))} cost price.
            {" "}The survivor keeps its name, SKU, category, supplier, and online-store settings.
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-2">Branch</th><th className="p-2">Selected stocks</th><th className="p-2">Current prices</th><th className="p-2">Projected result</th></tr></thead>
              <tbody>
                {preview.locations.map((location) => {
                  const branchProducts = preview.products.map((product) => {
                    const branchProduct = location.products[product._id];
                    return {
                      ...product,
                      stock: Number(branchProduct?.quantity || 0),
                      price: Number(branchProduct?.sellingPrice ?? product.sellingPrice),
                      costPrice: Number(branchProduct?.costPrice ?? product.costPrice)
                    };
                  });
                  const stockResult = stockAfterMerge(branchProducts, stockPolicy);
                  const priceResult = valueAfterMerge(branchProducts, sellingPricePolicy, "price");
                  const costResult = valueAfterMerge(
                    branchProducts,
                    costPricePolicy,
                    "costPrice",
                    branchProducts.map((product) => product.stock)
                  );
                  return (
                    <tr key={location.branchId} className="border-b border-slate-100">
                      <td className="p-2 font-medium">{location.branchName}</td>
                      <td className="p-2">{branchProducts.map((product) => `${product.name}: ${product.stock} units`).join(" · ")}</td>
                      <td className="p-2">{branchProducts.map((product) => `${product.name}: ${formatCurrency(product.price)} sell / ${formatCurrency(product.costPrice)} cost`).join(" · ")}</td>
                      <td className="p-2 font-medium">{stockResult} units · {formatCurrency(priceResult)} sell · {formatCurrency(costResult)} cost</td>
                    </tr>
                  );
                })}
                {preview.locations.length === 0 && <tr><td className="p-2 text-slate-500" colSpan="4">No branches are configured.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="max-w-3xl text-xs text-amber-800">Merging is a business-wide change and cannot be undone. Historical item names and prices remain as recorded, while their product links move to the survivor.</p>
            <button type="button" className="btn btn-primary" onClick={confirmMerge} disabled={merging}>
              {merging ? "Merging products..." : "Confirm merge"}
            </button>
          </div>
          </section>
          </div>
        </div>
      )}
    </main>
  );
};

export default ProductNameReview;
