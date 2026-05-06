import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import request from "../api/client.js";

import MetricCard from "../components/MetricCard.jsx";

import SalesChart from "../components/charts/SalesChart.jsx";

import TopProducts from "../components/TopProducts.jsx";

import {
  formatCurrency
} from "../utils/formatters.js";

const Dashboard = () => {

  const navigate = useNavigate();

  const [analytics, setAnalytics] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {

    const load = async () => {

      try {

        const data =
          await request(
            "/analytics"
          );

        setAnalytics(data);

      } catch (err) {

        setError(
          err.message ||
          "Failed to load analytics"
        );

      } finally {

        setLoading(false);

      }
    };

    load();

  }, []);

  if (loading) {

    return (
      <div className="p-6">
        Loading dashboard...
      </div>
    );
  }

  const metrics =
    analytics?.metrics || {};

  return (

    <section className="page-stack">

      <div className="page-heading">

        <div>

          <span>
            Business Intelligence
          </span>

          <h1>
            Analytics Dashboard
          </h1>

        </div>

        <button
          onClick={() =>
            navigate("/app/pos")
          }

          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
        >

          Open POS

        </button>

      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      {/* KPI */}

      <div className="metrics-grid">

        <MetricCard
          icon="dollar"
          label="Revenue"
          value={
            formatCurrency(
              metrics.totalRevenue
            )
          }
          tone="revenue"
        />

        <MetricCard
          icon="chart"
          label="Profit"
          value={
            formatCurrency(
              metrics.totalProfit
            )
          }
          tone="success"
        />

        <MetricCard
          icon="receipt"
          label="Sales"
          value={
            metrics.totalSales || 0
          }
        />

        <MetricCard
          icon="stock"
          label="Inventory Value"
          value={
            formatCurrency(
              metrics.inventoryValue
            )
          }
        />

        <MetricCard
          icon="alert"
          label="Low Stock"
          value={
            metrics.lowStockCount || 0
          }
          tone="warning"
        />

        <MetricCard
          icon="wallet"
          label="Average Order"
          value={
            formatCurrency(
              metrics.averageOrderValue
            )
          }
        />

      </div>

      {/* CHART */}

      <SalesChart
        data={
          analytics?.salesTrend || []
        }
      />

      {/* LOWER GRID */}

      <div className="grid lg:grid-cols-2 gap-6">

        <TopProducts
          products={
            analytics?.topProducts || []
          }
        />

        <div className="tool-panel">

          <div className="panel-heading">
            <h2>
              Low Stock Alerts
            </h2>
          </div>

          <div className="compact-list">

            {!analytics
              ?.lowStockProducts
              ?.length && (
              <div className="empty-state">
                No low stock items
              </div>
            )}

            {analytics
              ?.lowStockProducts
              ?.map((product) => (

                <div
                  key={product._id}
                  className="compact-row"
                >

                  <div>

                    <strong>
                      {product.name}
                    </strong>

                    <span>
                      SKU:
                      {" "}
                      {product.sku || "N/A"}
                    </span>

                  </div>

                  <span className="text-red-500 font-semibold">

                    {product.stock}

                  </span>

                </div>
              ))}

          </div>

        </div>

      </div>

    </section>
  );
};

export default Dashboard;