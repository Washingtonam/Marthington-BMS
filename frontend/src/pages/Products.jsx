import { useEffect, useMemo, useState } from "react";
import request from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const initialForm = {
  name: "",
  sellingPrice: "",
  costPrice: "",
  stock: "",
  category: "",
  sku: ""
};

const Products = () => {
  const { business, isPro } = useAuth(); // Using the boolean from context

  // ====================================
  // STATE
  // ====================================
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // ====================================
  // LOAD PRODUCTS
  // ====================================
  useEffect(() => {
    loadProducts();
  }, [page, search, categoryFilter]);

  useEffect(() => {
    if (!page && !search && !categoryFilter) return;
    setSelectedProductIds([]);
  }, [page, search, categoryFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page,
        limit,
        search,
        category: categoryFilter
      });

      const data = await request(`/products?${query.toString()}`);
      setProducts(data.products || []);
      setPagination(data.pagination || {});
    } catch (err) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    return [...new Set(products.map((p) => p.category).filter(Boolean))];
  }, [products]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ====================================
  // CREATE / UPDATE
  // ====================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      setSaving(true);
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/products/${editingId}` : "/products";

      const payload = {
        ...form,
        sellingPrice: Number(form.sellingPrice),
        costPrice: Number(form.costPrice),
        stock: Number(form.stock)
      };

      await request(url, {
        method,
        body: JSON.stringify(payload)
      });

      setSuccess(`Product ${editingId ? "updated" : "added"} successfully`);
      setForm(initialForm);
      setEditingId(null);
      loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name || "",
      sellingPrice: product.sellingPrice || product.price || "",
      costPrice: product.costPrice || "",
      stock: product.stock || "",
      category: product.category || "",
      sku: product.sku || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await request(`/products/${id}`, { method: "DELETE" });
      setSuccess("Product deleted successfully");
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const allSelected = products.length > 0 && selectedProductIds.length === products.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedProductIds([]);
      return;
    }

    setSelectedProductIds(products.map((product) => product._id));
  };

  const toggleProductSelection = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id)
        ? prev.filter((productId) => productId !== id)
        : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedProductIds.length) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete these ${selectedProductIds.length} products? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setBulkDeleting(true);
      await request("/products/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedProductIds })
      });
      setSuccess(`${selectedProductIds.length} product(s) deleted successfully`);
      setSelectedProductIds([]);
      loadProducts();
    } catch (err) {
      alert(err.message || "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("file", file);

      await request("/products/bulk-import", {
        method: "POST",
        body: formData,
        isFormData: true
      });

      setSuccess("Products imported successfully");
      loadProducts();
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = null; // Clear input
    }
  };

  return (
    <section className="products-layout">
      <div>
        <div className="page-heading table-heading">
          <div>
            <span>Inventory</span>
            <h1>Products</h1>
            <p className="text-sm text-gray-500 mt-2">
              {pagination.totalProducts || 0} total products
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="primary-button cursor-pointer">
              {uploading ? "Uploading..." : "Upload Excel"}
              <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleFileUpload} />
            </label>
            <a href="/templates/products-template.xlsx" download className="border px-4 py-3 rounded-md text-sm font-medium hover:bg-gray-100 transition">
              Download Template
            </a>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col md:flex-row gap-3 mb-4 mt-5">
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            className="border rounded-md p-3 w-full"
          />
          <select
            value={categoryFilter}
            onChange={(e) => { setPage(1); setCategoryFilter(e.target.value); }}
            className="border rounded-md p-3 min-w-[220px]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {selectedProductIds.length > 0 && (
          <div className="mb-4 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 transition-all duration-200 ease-in-out shadow-sm shadow-red-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-red-700">Selected {selectedProductIds.length} item(s)</p>
              <p className="text-xs text-red-500">You can delete all selected products in one action.</p>
            </div>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkDeleting ? "Deleting..." : "🗑️ Delete Selected"}
            </button>
          </div>
        )}

        {/* TABLE */}
        <div className="product-table mt-4">
          <div className="product-row product-row-head">
            <span className="w-12 flex items-center justify-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 transition-all duration-200 ease-in-out focus:ring-0"
              />
            </span>
            <span>Name</span>
            <span>Category</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {loading ? (
            <div className="empty-state text-center py-10 text-gray-400">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="empty-state text-center py-10 text-gray-400">No products found</div>
          ) : (
            products.map((p) => (
              <div className="product-row" key={p._id}>
                <span className="w-12 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p._id)}
                    onChange={() => toggleProductSelection(p._id)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 transition-all duration-200 ease-in-out focus:ring-0"
                  />
                </span>
                <span>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-400">SKU: {p.sku || "N/A"}</div>
                </span>
                <span>{p.category || "-"}</span>
                <span>{formatCurrency(p.sellingPrice || p.price || 0)}</span>
                <span>{p.stock}</span>
                <span>
                  <span className={`font-medium ${p.stock <= 5 ? "text-red-500" : "text-green-600"}`}>
                    {p.stock <= 5 ? "Low Stock" : "In Stock"}
                  </span>
                </span>
                <span className="flex gap-3">
                  <button onClick={() => handleEdit(p)} className="text-blue-600 text-sm font-medium">Edit</button>
                  <button onClick={() => handleDelete(p._id)} className="text-red-500 text-sm font-medium">Delete</button>
                </span>
              </div>
            ))
          )}
        </div>

        {/* PAGINATION */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={!pagination.hasPrevPage}
              className="border px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm font-medium">Page {pagination.currentPage} of {pagination.totalPages}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasNextPage}
              className="border px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* RIGHT PANEL - FORM */}
      <div className="product-form tool-panel">
        <h2 className="font-bold text-lg">{editingId ? "Edit Product" : "Add Product"}</h2>
        {success && <div className="bg-green-100 text-green-700 p-3 rounded-md text-sm mb-3">{success}</div>}
        {error && <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="text-sm font-medium">Product Name
            <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. HP EliteBook 840" required className="w-full border p-2 rounded mt-1" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-medium">Category
              <input name="category" value={form.category} onChange={handleChange} placeholder="Laptops" className="w-full border p-2 rounded mt-1" />
            </label>
            <label className="text-sm font-medium">SKU
              <input name="sku" value={form.sku} onChange={handleChange} placeholder="HP-001" className="w-full border p-2 rounded mt-1" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-medium">Cost Price
              <input type="number" name="costPrice" value={form.costPrice} onChange={handleChange} placeholder="0" className="w-full border p-2 rounded mt-1" />
            </label>
            <label className="text-sm font-medium">Selling Price
              <input type="number" name="sellingPrice" value={form.sellingPrice} onChange={handleChange} placeholder="0" required className="w-full border p-2 rounded mt-1" />
            </label>
          </div>
          <label className="text-sm font-medium">Stock Quantity
            <input type="number" name="stock" value={form.stock} onChange={handleChange} placeholder="0" required className="w-full border p-2 rounded mt-1" />
          </label>

          <button type="submit" disabled={saving} className="primary-button mt-2">
            {saving ? "Saving..." : editingId ? "Update Product" : "Add Product"}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(initialForm); }} className="border rounded-md py-2">
              Cancel Edit
            </button>
          )}
        </form>
      </div>
    </section>
  );
};

export default Products;