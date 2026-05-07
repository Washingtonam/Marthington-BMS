import { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import request from "../api/client.js";

import { formatCurrency } from "../utils/formatters.js";

const InventoryReports = () => {

  const navigate = useNavigate();

  const [reports, setReports] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // =====================================
  // LOAD REPORTS
  // =====================================

  useEffect(() => {

    const load = async () => {

      try {

        const data =
          await request("/reports");

        setReports(data);

      } catch (err) {

        setError(
          err.message ||
          "Failed to load inventory reports"
        );

      } finally {

        setLoading(false);

      }
    };

    load();

  }, []);

  // =====================================
  // FILTER PRODUCTS
  // =====================================

  const filteredProducts = useMemo(() => {

    return (
      reports?.lowStockProducts?.filter((product) => {

        const query =
          search.toLowerCase();

        return (

          product.name
            ?.toLowerCase()
            .includes(query) ||

          product.sku
            ?.toLowerCase()
            .includes(query)

        );

      }) || []
    );

  }, [reports, search]);

  // =====================================
  // LOADING
  // =====================================

  if (loading) {

    return (
      <div className="p-6">
        Loading inventory reports...
      </div>
    );
  }

  // =====================================
  // TOTAL INVENTORY VALUE
  // =====================================

  const inventoryValue =
    reports?.overview?.inventoryValue || 0;

  // =====================================
  // LOW STOCK COUNT
  // =====================================

  const lowStockCount =
    filteredProducts.length;

  return (

    <section className="page-stack">

      {/* HEADER */}

      <div className="page-heading">

        <div>

          <span>
            Inventory Intelligence
          </span>

          <h1>
            Inventory Reports
          </h1>

        </div>

        <button
          onClick={() =>
            navigate("/app/reports")
          }
          className="border border-gray-300 px-4 py-2 rounded-xl"
        >
          Back to Reports
        </button>

      </div>

      {/* ERROR */}

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      {/* OVERVIEW */}

      <div className="metrics-grid">

        <div className="tool-panel">

          <strong>
            Inventory Value
          </strong>

          <h2 className="mt-3">

            {formatCurrency(
              inventoryValue
            )}

          </h2>

        </div>

        <div className="tool-panel">

          <strong>
            Low Stock Products
          </strong>

          <h2 className="mt-3 text-red-500">

            {lowStockCount}

          </h2>

        </div>

      </div>

      {/* LOW STOCK TABLE */}

      <div className="tool-panel">

        <div className="panel-heading">

          <div>

            <h2>
              Low Stock Alerts
            </h2>

            <p>
              Click any product
              to restock or edit inventory.
            </p>

          </div>

          <input
            type="text"
            placeholder="Search product..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="border rounded-xl px-4 py-2"
          />

        </div>

        {/* TABLE */}

        <div className="product-table">

          <div className="product-row product-row-head">

            <span>
              Product
            </span>

            <span>
              SKU
            </span>

            <span>
              Stock
            </span>

            <span>
              Action
            </span>

          </div>

          {!filteredProducts.length && (

            <div className="empty-state">
              No low stock alerts
            </div>

          )}

          {filteredProducts.map((product) => (

            <div
              key={product._id}
              className="product-row"
            >

              <span className="font-semibold">
                {product.name}
              </span>

              <span>
                {product.sku || "N/A"}
              </span>

              <span className="text-red-500 font-bold">

                {product.stock}

              </span>

              <button
                onClick={() =>
                  navigate(
                    `/app/products`
                  )
                }
                className="text-blue-600 font-medium"
              >
                Manage Product
              </button>

            </div>

          ))}

        </div>

      </div>

      {/* QUICK ACTIONS */}

      <div className="grid lg:grid-cols-2 gap-6">

        <div className="tool-panel">

          <h2 className="font-bold text-lg">
            Inventory Management
          </h2>

          <p className="text-gray-500 mt-2">

            Open products center
            to restock inventory,
            update pricing and
            manage products.

          </p>

          <button
            onClick={() =>
              navigate("/app/products")
            }
            className="primary-button mt-6"
          >
            Open Products
          </button>

        </div>

        <div className="tool-panel">

          <h2 className="font-bold text-lg">
            Inventory History
          </h2>

          <p className="text-gray-500 mt-2">

            Review inventory movement,
            stock deductions and
            product activity logs.

          </p>

          <button
            onClick={() =>
              navigate("/app/inventory-history")
            }
            className="primary-button mt-6"
          >
            View History
          </button>

        </div>

      </div>

    </section>
  );
};

export default InventoryReports;