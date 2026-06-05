import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import MetricCard from "../components/MetricCard.jsx";
import SalesChart from "../components/charts/SalesChart.jsx";
import TopProducts from "../components/TopProducts.jsx";
import { formatCurrency } from "../utils/formatters.js";

// ... (keep existing imports)

const Dashboard = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const { business } = useAuth();
  const businessType = business?.businessType || "general_services";

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

  // 1. EXTRACT CHART DATA HERE
  const { metrics, salesTrend, topProducts, lowStockProducts } = useMemo(() => ({
    metrics: {
      totalRevenue: analytics?.metrics?.totalRevenue || 0,
      totalProfit: analytics?.metrics?.totalProfit || 0,
      totalSales: analytics?.metrics?.totalSales || 0,
      inventoryValue: analytics?.metrics?.inventoryValue || 0,
      lowStockCount: analytics?.metrics?.lowStockCount || 0,
      averageOrderValue: analytics?.metrics?.averageOrderValue || 0,
      occupancyRate: analytics?.metrics?.occupancyRate || 0,
      activeSessions: analytics?.metrics?.activeSessions || 0,
      supplierAlerts: analytics?.metrics?.supplierAlerts || 0,
      kitchenTickets: analytics?.metrics?.kitchenTickets || 0,
      checkInsToday: analytics?.metrics?.checkInsToday || 0,
      auxiliaryServices: analytics?.metrics?.auxiliaryServices || 0,
    },
    salesTrend: analytics?.salesTrend || [], // Extracting the chart array
    topProducts: analytics?.topProducts || [],
    lowStockProducts: analytics?.lowStockProducts || [],
  }), [analytics]);

  const renderBusinessTypePanel = () => {
    switch (businessType) {
      case "restaurant_hospitality":
        return (
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard icon="🍽️" label="Open Table Sessions" value={metrics.activeSessions || "--"} tone="success" />
              <MetricCard icon="🥘" label="Kitchen Tickets" value={metrics.kitchenTickets || "--"} tone="neutral" />
              <MetricCard icon="🔥" label="Top Dish Category" value={topProducts[0]?.category || "Mains"} tone="revenue" />
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-gray-900">Top Selling Dishes</h2>
                <span className="text-xs uppercase tracking-[0.3em] text-gray-400">Kitchen focus</span>
              </div>
              <div className="grid gap-3">
                {(topProducts.length ? topProducts.slice(0, 5) : []).map((product) => (
                  <div key={product._id} className="flex items-center justify-between p-4 rounded-3xl bg-slate-50">
                    <div>
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category || "Main Course"}</p>
                    </div>
                    <span className="text-sm font-black text-blue-600">{product.quantitySold ?? product.sales ?? "--"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "retail_hardware":
        return (
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard icon="🏷️" label="Tracked SKUs" value={topProducts.length} tone="success" />
              <MetricCard icon="📦" label="Stock Value" value={formatCurrency(metrics.inventoryValue)} tone="neutral" />
              <MetricCard icon="⚠️" label="Supplier Alerts" value={metrics.supplierAlerts || lowStockProducts.length} tone={metrics.supplierAlerts > 0 || lowStockProducts.length > 0 ? "warning" : "success"} />
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-gray-900">Low Stock SKUs</h2>
                <span className="text-xs uppercase tracking-[0.3em] text-gray-400">Reorder priority</span>
              </div>
              <div className="space-y-3">
                {lowStockProducts.length === 0 ? (
                  <p className="text-sm text-gray-500">No urgent low stock alerts for hardware inventory.</p>
                ) : (
                  lowStockProducts.slice(0, 5).map((item) => (
                    <div key={item._id} className="flex items-center justify-between rounded-3xl bg-slate-50 p-4">
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">SKU: {item.sku || "N/A"}</p>
                      </div>
                      <span className="font-black text-red-600">{item.stock}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      case "hotel_lodging":
        return (
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard icon="🛏️" label="Occupancy Rate" value={`${metrics.occupancyRate}%`} tone="success" />
              <MetricCard icon="🕒" label="Today Check-ins" value={metrics.checkInsToday || "--"} tone="neutral" />
              <MetricCard icon="💼" label="Auxiliary Services" value={metrics.auxiliaryServices || "--"} tone="neutral" />
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-gray-900">Upcoming Room Status</h2>
                <span className="text-xs uppercase tracking-[0.3em] text-gray-400">Stay lifecycle</span>
              </div>
              <div className="grid gap-3">
                {(analytics?.hotel?.upcomingCheckIns || []).slice(0, 4).map((room, index) => (
                  <div key={index} className="rounded-3xl bg-slate-50 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">Room {room.roomNumber}</p>
                      <p className="text-xs text-gray-500">{room.guestName || "Reserved"}</p>
                    </div>
                    <span className="text-sm font-black text-blue-600">{room.checkInTime || "TBD"}</span>
                  </div>
                ))}
                {!analytics?.hotel?.upcomingCheckIns?.length && (
                  <p className="text-sm text-gray-500">No scheduled check-ins available yet.</p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard icon="💰" label="Revenue" value={formatCurrency(metrics.totalRevenue)} tone="revenue" />
              <MetricCard icon="📈" label="Profit" value={formatCurrency(metrics.totalProfit)} tone="success" />
              <MetricCard icon="🧾" label="Sales" value={metrics.totalSales} tone="neutral" />
            </div>
            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 shadow-sm">
              <h2 className="text-lg font-black text-gray-900 mb-4">Service Overview</h2>
              <p className="text-sm text-gray-500">Your general services dashboard continues to highlight revenue, profit, and current itemized performance.</p>
            </div>
          </div>
        );
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-600">MT</div>
        </div>
        <p className="text-gray-400 font-bold tracking-widest text-xs animate-pulse uppercase">Syncing business data...</p>
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
          <p className="text-gray-500 text-sm font-medium">Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <div className="flex items-center gap-3">
            <button 
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm active:rotate-180 duration-500"
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

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard icon="💰" label="Revenue" value={formatCurrency(metrics.totalRevenue)} tone="revenue" />
        <MetricCard icon="📈" label="Profit" value={formatCurrency(metrics.totalProfit)} tone="success" />
        <MetricCard icon="🧾" label="Total Sales" value={metrics.totalSales} tone="neutral" />
        <MetricCard icon="📦" label="Stock Value" value={formatCurrency(metrics.inventoryValue)} tone="neutral" />
        <MetricCard icon="🚨" label="Low Stock" value={metrics.lowStockCount} tone={metrics.lowStockCount > 0 ? "warning" : "success"} />
        <MetricCard icon="💳" label="Avg. Order" value={formatCurrency(metrics.averageOrderValue)} tone="neutral" />
      </div>

      {/* CHART SECTION - Fixed Container */}
      <div className="grid grid-cols-1 min-h-0 min-w-0"> 
        <SalesChart data={salesTrend} />
      </div>

      {/* BUSINESS TYPE SPECIFIC DASHBOARD */}
      <div className="space-y-8">
        {renderBusinessTypePanel()}
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
            <TopProducts products={topProducts} />
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Inventory Alerts</h2>
            {lowStockProducts.length > 0 && (
              <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase animate-pulse">Action Required</span>
            )}
          </div>

          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                <p className="text-gray-400 text-sm font-bold">Inventory levels optimal</p>
              </div>
            ) : (
                lowStockProducts.map((product) => (
                <div
                  key={product._id}
                  className="flex justify-between items-center p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-red-100 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 font-bold">
                        {product.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1">{product.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{product.sku || "NO SKU"}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
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