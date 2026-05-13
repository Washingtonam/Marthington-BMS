import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import MetricCard from "../components/MetricCard.jsx";
import SalesChart from "../components/charts/SalesChart.jsx";
import TopProducts from "../components/TopProducts.jsx";
import { formatCurrency } from "../utils/formatters.js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await request("/analytics");
        
        // Defensive check: ensure the data exists
        if (!data) {
          throw new Error("No data received from server");
        }
        
        setAnalytics(data);
      } catch (err) {
        console.error("Dashboard Load Error:", err);
        setError(err.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Safeguard metrics to prevent "cannot read property of undefined"
  const metrics = useMemo(() => ({
    totalRevenue: analytics?.metrics?.totalRevenue || 0,
    totalProfit: analytics?.metrics?.totalProfit || 0,
    totalSales: analytics?.metrics?.totalSales || 0,
    inventoryValue: analytics?.metrics?.inventoryValue || 0,
    lowStockCount: analytics?.metrics?.lowStockCount || 0,
    averageOrderValue: analytics?.metrics?.averageOrderValue || 0,
  }), [analytics]);

  // Safeguard arrays
  const salesTrend = analytics?.salesTrend || [];
  const topProducts = analytics?.topProducts || [];
  const lowStockProducts = analytics?.lowStockProducts || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold animate-pulse">Analyzing Business Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="page-stack p-4 lg:p-6 space-y-6">
      <div className="page-heading flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
        <div>
          <span className="text-blue-600 font-bold text-xs uppercase tracking-widest">
            Business Intelligence
          </span>
          <h1 className="text-2xl font-black text-gray-800">
            Analytics Dashboard
          </h1>
        </div>
        <button
          onClick={() => navigate("/app/pos")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
        >
          🛒 Open POS
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl text-red-700 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          icon="dollar"
          label="Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          tone="revenue"
        />
        <MetricCard
          icon="chart"
          label="Profit"
          value={formatCurrency(metrics.totalProfit)}
          tone="success"
        />
        <MetricCard
          icon="receipt"
          label="Sales"
          value={metrics.totalSales}
        />
        <MetricCard
          icon="stock"
          label="Inventory Value"
          value={formatCurrency(metrics.inventoryValue)}
        />
        <MetricCard
          icon="alert"
          label="Low Stock"
          value={metrics.lowStockCount}
          tone="warning"
        />
        <MetricCard
          icon="wallet"
          label="Average Order"
          value={formatCurrency(metrics.averageOrderValue)}
        />
      </div>

      {/* SALES TREND CHART */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Sales Performance Trend</h2>
        <div className="h-[400px] w-full">
          <SalesChart data={salesTrend} />
        </div>
      </div>

      {/* LOWER SECTION: TOP PRODUCTS & ALERTS */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TopProducts products={topProducts} />

        <div className="tool-panel bg-white p-6 rounded-3xl shadow-sm border">
          <div className="panel-heading mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              Low Stock Alerts
            </h2>
          </div>

          <div className="compact-list space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                <p className="text-gray-400 text-xs font-bold uppercase">All inventory levels healthy</p>
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <div
                  key={product._id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-red-200 transition-colors"
                >
                  <div>
                    <strong className="block text-sm text-gray-800 group-hover:text-red-600 transition-colors">
                      {product.name}
                    </strong>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      SKU: {product.sku || "N/A"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-red-600 font-black text-lg bg-red-50 px-3 py-1 rounded-xl">
                      {product.stock}
                    </span>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Left</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;