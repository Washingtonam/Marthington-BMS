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

  const { business } = useAuth();

  // ====================================
  // STATE
  // ====================================

  const [products, setProducts] = useState([]);

  const [pagination, setPagination] =
    useState({
      currentPage: 1,
      totalPages: 1,
      totalProducts: 0,
      hasNextPage: false,
      hasPrevPage: false
    });

  const [page, setPage] = useState(1);

  const [limit, setLimit] =
    useState(20);

  const [form, setForm] =
    useState(initialForm);

  const [editingId, setEditingId] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [upgradeMsg, setUpgradeMsg] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [categoryFilter, setCategoryFilter] =
    useState("");

  const isPro =
    business?.subscription?.status ===
    "active";

  // ====================================
  // LOAD PRODUCTS
  // ====================================

  useEffect(() => {

    loadProducts();

  }, [
    business,
    page,
    search,
    categoryFilter
  ]);

  const loadProducts = async () => {

    try {

      setLoading(true);

      const query =
        new URLSearchParams({
          page,
          limit,
          search,
          category: categoryFilter
        });

      const data =
        await request(
          `/products?${query.toString()}`
        );

      setProducts(
        data.products || []
      );

      setPagination(
        data.pagination || {}
      );

    } catch (err) {

      setError(
        err.message ||
        "Failed to load products"
      );

    } finally {

      setLoading(false);

    }
  };

  // ====================================
  // CATEGORIES
  // ====================================

  const categories = useMemo(() => {

    return [
      ...new Set(
        products
          .map((p) => p.category)
          .filter(Boolean)
      )
    ];

  }, [products]);

  // ====================================
  // FORM CHANGE
  // ====================================

  const handleChange = (e) => {

    const { name, value } =
      e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // ====================================
  // CREATE / UPDATE
  // ====================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");
    setSuccess("");
    setUpgradeMsg("");

    try {

      setSaving(true);

      // CREATE
      if (!editingId) {

        const newProduct =
          await request(
            "/products",
            {
              method: "POST",

              body:
                JSON.stringify({
                  name: form.name,

                  sellingPrice:
                    Number(
                      form.sellingPrice
                    ),

                  costPrice:
                    Number(
                      form.costPrice
                    ),

                  stock:
                    Number(
                      form.stock
                    ),

                  category:
                    form.category,

                  sku:
                    form.sku
                })
            }
          );

        setProducts((prev) => [
          newProduct,
          ...prev
        ]);

        setSuccess(
          "Product added successfully"
        );

      }

      // UPDATE
      else {

        const updated =
          await request(
            `/products/${editingId}`,
            {
              method: "PUT",

              body:
                JSON.stringify({
                  name: form.name,

                  sellingPrice:
                    Number(
                      form.sellingPrice
                    ),

                  costPrice:
                    Number(
                      form.costPrice
                    ),

                  stock:
                    Number(
                      form.stock
                    ),

                  category:
                    form.category,

                  sku:
                    form.sku
                })
            }
          );

        setProducts((prev) =>
          prev.map((p) =>
            p._id === editingId
              ? updated
              : p
          )
        );

        setEditingId(null);

        setSuccess(
          "Product updated successfully"
        );
      }

      setForm(initialForm);

      loadProducts();

    } catch (err) {

      setError(
        err.message
      );

    } finally {

      setSaving(false);

    }
  };

  // ====================================
  // EDIT
  // ====================================

  const handleEdit = (product) => {

    setEditingId(product._id);

    setForm({
      name:
        product.name || "",

      sellingPrice:
        product.sellingPrice ||
        product.price ||
        "",

      costPrice:
        product.costPrice || "",

      stock:
        product.stock || "",

      category:
        product.category || "",

      sku:
        product.sku || ""
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // ====================================
  // DELETE
  // ====================================

  const handleDelete = async (id) => {

    const confirmDelete =
      window.confirm(
        "Delete this product?"
      );

    if (!confirmDelete) return;

    try {

      await request(
        `/products/${id}`,
        {
          method: "DELETE"
        }
      );

      setSuccess(
        "Product deleted successfully"
      );

      loadProducts();

    } catch (err) {

      alert(err.message);

    }
  };

  // ====================================
  // BULK IMPORT
  // ====================================

  const handleFileUpload = async (
    e
  ) => {

    const file =
      e.target.files[0];

    if (!file) return;

    try {

      setUploading(true);

      setError("");
      setSuccess("");

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      await request(
        "/products/bulk-import",
        {
          method: "POST",

          body: formData,

          isFormData: true
        }
      );

      setSuccess(
        "Products imported successfully"
      );

      loadProducts();

    } catch (err) {

      setError(
        err.message ||
        "Upload failed"
      );

    } finally {

      setUploading(false);

    }
  };

  // ====================================
  // PAGINATION
  // ====================================

  const renderPages = () => {

    const pages = [];

    for (
      let i = 1;
      i <= pagination.totalPages;
      i++
    ) {

      pages.push(

        <button
          key={i}

          onClick={() =>
            setPage(i)
          }

          className={`px-4 py-2 rounded-lg border text-sm ${
            pagination.currentPage === i
              ? "bg-black text-white"
              : "bg-white"
          }`}
        >
          {i}
        </button>
      );
    }

    return pages;
  };

  return (

    <section className="products-layout">

      {/* LEFT */}
      <div>

        {/* HEADER */}
        <div className="page-heading table-heading">

          <div>

            <span>
              Inventory
            </span>

            <h1>
              Products
            </h1>

            <p className="text-sm text-gray-500 mt-2">

              {pagination.totalProducts || 0}
              {" "}
              total products

            </p>

          </div>

          {/* ACTIONS */}
          <div className="flex flex-wrap gap-3 items-center">

            {/* UPLOAD */}
            <label className="primary-button cursor-pointer">

              {uploading
                ? "Uploading..."
                : "Upload Excel"}

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                hidden
                onChange={handleFileUpload}
              />
            </label>

            {/* TEMPLATE */}
            <a
              href="/templates/products-template.xlsx"
              download
              className="border px-4 py-3 rounded-md text-sm font-medium hover:bg-gray-100 transition"
            >
              Download Template
            </a>

          </div>

        </div>

        {/* GUIDE */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-5">

          <div className="font-semibold text-blue-900">
            Excel Import Guide
          </div>

          <div className="text-sm text-blue-700 mt-2">
            Required columns:
          </div>

          <div className="font-mono text-xs mt-2 text-blue-800 break-all">
            name, category, sellingPrice, costPrice, stock, sku
          </div>

        </div>

        {/* FILTERS */}
        <div className="flex flex-col md:flex-row gap-3 mb-4 mt-5">

          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => {

              setPage(1);

              setSearch(
                e.target.value
              );
            }}
            className="border rounded-md p-3 w-full"
          />

          <select
            value={categoryFilter}
            onChange={(e) => {

              setPage(1);

              setCategoryFilter(
                e.target.value
              );
            }}
            className="border rounded-md p-3 min-w-[220px]"
          >

            <option value="">
              All Categories
            </option>

            {categories.map((cat) => (

              <option
                key={cat}
                value={cat}
              >
                {cat}
              </option>

            ))}

          </select>

        </div>

        {/* TABLE */}
        <div className="product-table mt-4">

          <div className="product-row product-row-head">

            <span>Name</span>
            <span>Category</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Status</span>
            <span>Actions</span>

          </div>

          {loading && (
            <div className="empty-state">
              Loading products...
            </div>
          )}

          {!loading &&
            !products.length && (
            <div className="empty-state">
              No products found
            </div>
          )}

          {products.map((p) => (

            <div
              className="product-row"
              key={p._id}
            >

              <span>

                <div className="font-semibold">
                  {p.name}
                </div>

                <div className="text-xs text-gray-400">
                  SKU:
                  {" "}
                  {p.sku || "N/A"}
                </div>

              </span>

              <span>
                {p.category || "-"}
              </span>

              <span>

                {formatCurrency(
                  p.sellingPrice ||
                  p.price ||
                  0
                )}

              </span>

              <span>
                {p.stock}
              </span>

              <span>

                {p.stock <= 5 ? (

                  <span className="text-red-500 font-medium">
                    Low Stock
                  </span>

                ) : (

                  <span className="text-green-600 font-medium">
                    In Stock
                  </span>

                )}

              </span>

              <span className="flex gap-3">

                <button
                  onClick={() =>
                    handleEdit(p)
                  }
                  className="text-blue-600 text-sm font-medium"
                >
                  Edit
                </button>

                <button
                  onClick={() =>
                    handleDelete(p._id)
                  }
                  className="text-red-500 text-sm font-medium"
                >
                  Delete
                </button>

              </span>

            </div>
          ))}

        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">

          <button
            onClick={() =>
              setPage(
                (prev) =>
                  Math.max(prev - 1, 1)
              )
            }

            disabled={
              !pagination.hasPrevPage
            }

            className="border px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>

          {renderPages()}

          <button
            onClick={() =>
              setPage(
                (prev) => prev + 1
              )
            }

            disabled={
              !pagination.hasNextPage
            }

            className="border px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Next
          </button>

        </div>

      </div>

      {/* RIGHT PANEL */}
      <div className="product-form tool-panel">

        <h2 className="font-bold text-lg">

          {editingId
            ? "Edit Product"
            : "Add Product"}

        </h2>

        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded-md text-sm">
            {success}
          </div>
        )}

        {upgradeMsg && (
          <div className="form-error">
            {upgradeMsg}
          </div>
        )}

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-3"
        >

          <label>
            Product Name

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Product Name"
              required
            />
          </label>

          <label>
            Category

            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="Category"
            />
          </label>

          <label>
            SKU

            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              placeholder="SKU-001"
            />
          </label>

          <label>
            Selling Price

            <input
              type="number"
              name="sellingPrice"
              value={form.sellingPrice}
              onChange={handleChange}
              placeholder="Selling Price"
              required
            />
          </label>

          <label>
            Cost Price

            <input
              type="number"
              name="costPrice"
              value={form.costPrice}
              onChange={handleChange}
              placeholder="Cost Price"
            />
          </label>

          <label>
            Stock

            <input
              type="number"
              name="stock"
              value={form.stock}
              onChange={handleChange}
              placeholder="Stock Quantity"
              required
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="primary-button"
          >

            {saving
              ? "Saving..."
              : editingId
              ? "Update Product"
              : "Add Product"}

          </button>

          {editingId && (

            <button
              type="button"
              onClick={() => {

                setEditingId(null);

                setForm(initialForm);

              }}
              className="border rounded-md py-2"
            >
              Cancel Edit
            </button>

          )}

        </form>

      </div>

    </section>
  );
};

export default Products;