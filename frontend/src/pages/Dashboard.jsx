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
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await request("/analytics");
        if (!data) throw new Error("No data received from server");
        setAnalytics(data);
      } catch (err) {
        setError(err.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshKey]);

  const metrics = useMemo(() => ({
    totalRevenue: analytics?.metrics?.totalRevenue || 0,
    totalProfit: analytics?.metrics?.totalProfit || 0,
    totalSales: analytics?.metrics?.totalSales || 0,
    inventoryValue: analytics?.metrics?.inventoryValue || 0,
    lowStockCount: analytics?.metrics?.lowStockCount || 0,
    averageOrderValue: analytics?.metrics?.averageOrderValue || 0,
  }), [analytics]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-600">MT</div>
        </div>
        <p className="text-gray-400 font-bold tracking-widest text-xs animate-pulse">GENERATING INSIGHTS...</p>
      </div>
    );
  }

  return (
    <section className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-blue-600 font-bold text-[10px] uppercase tracking-widest">Live Business Intelligence</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Executive Overview</h1>
          <p className="text-gray-500 text-sm font-medium">Overview for {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="flex items-center gap-3">
            <button 
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                title="Refresh Data"
            >
                🔄
            </button>
            <button
                onClick={() => navigate("/app/pos")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-sm font-black transition-all shadow-xl shadow-blue-200 flex items-center gap-2 active:scale-95"
            >
                🛒 Open POS Terminal
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* KPI GRID - Improved for Responsiveness */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
        <MetricCard
          icon="💰"
          label="Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          trend="+12%" // Example static trend, replace with real data if available
          tone="revenue"
        />
        <MetricCard
          icon="📈"
          label="Profit"
          value={formatCurrency(metrics.totalProfit)}
          tone="success"
        />
        <MetricCard
          icon="🧾"
          label="Total Sales"
          value={metrics.totalSales}
          tone="neutral"
        />
        <MetricCard
          icon="📦"
          label="Stock Value"
          value={formatCurrency(metrics.inventoryValue)}
          tone="neutral"
        />
        <MetricCard
          icon="🚨"
          label="Low Stock"
          value={metrics.lowStockCount}
          tone={metrics.lowStockCount > 0 ? "warning" : "success"}
        />
        <MetricCard
          icon="💳"
          label="Avg. Order"
          value={formatCurrency(metrics.averageOrderValue)}
          tone="neutral"
        />
      </div>

      {/* CENTER CHARTS */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Sales Performance</h2>
            <select className="bg-gray-50 border-none text-xs font-bold py-2 px-4 rounded-lg outline-none">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[350px] w-full">
            <SalesChart data={analytics?.salesTrend || []} />
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
            <TopProducts products={analytics?.topProducts || []} />
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Inventory Alerts</h2>
            <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">Action Required</span>
          </div>

          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {(analytics?.lowStockProducts || []).length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                <p className="text-gray-400 text-sm font-bold">Inventory levels optimal</p>
              </div>
            ) : (
                (analytics?.lowStockProducts || []).map((product) => (
                <div
                  key={product._id}
                  className="flex justify-between items-center p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-red-100 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 font-bold">
                        {product.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 group-hover:text-red-600 transition-colors">{product.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{product.sku || "NO SKU"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-600 font-black text-lg">{product.stock}</div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Units Left</p>
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