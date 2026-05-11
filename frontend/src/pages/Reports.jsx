import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import { formatCurrency } from "../utils/formatters.js";

const Reports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await request("/reports");
        setReports(data);
      } catch (err) {
        setError(err.message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-6">Loading reports...</div>;

  const overview = reports?.overview || {};

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span>Business Intelligence</span>
          <h1>Reports Hub</h1>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="metrics-grid">
        <div className="tool-panel">
          <strong>Today's Revenue</strong>
          <h2>{formatCurrency(overview.todayRevenue)}</h2>
        </div>
        <div className="tool-panel">
          <strong>Monthly Revenue</strong>
          <h2>{formatCurrency(overview.monthlyRevenue)}</h2>
        </div>
        <div className="tool-panel">
          <strong>Monthly Profit</strong>
          <h2>{formatCurrency(overview.monthlyProfit)}</h2>
        </div>
        <div className="tool-panel">
          <strong>Inventory Value</strong>
          <h2>{formatCurrency(overview.inventoryValue)}</h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* STAFF PERFORMANCE */}
        <div className="tool-panel">
          <div className="panel-heading">
            <div>
              <h2>Staff Performance</h2>
              <p>View staff revenue and analytics.</p>
            </div>
          </div>
          <div className="compact-list">
            {reports?.staffPerformance?.slice(0, 3).map((staff, index) => (
              <div key={index} className="compact-row">
                <div>
                  <strong>{staff.name}</strong>
                  <span>{staff.sales} sales</span>
                </div>
                <strong>{formatCurrency(staff.revenue)}</strong>
              </div>
            ))}
          </div>
          {/* 🔥 FIXED PATH */}
          <button onClick={() => navigate("/app/staff-reports")} className="primary-button mt-4 w-full">
            View Staff Analytics
          </button>
        </div>

        {/* LOW STOCK */}
        <div className="tool-panel">
          <div className="panel-heading">
            <div>
              <h2>Low Stock Alerts</h2>
              <p>Monitor items running low.</p>
            </div>
          </div>
          <div className="compact-list">
            {reports?.lowStockProducts?.slice(0, 3).map((product) => (
              <div key={product._id} className="compact-row">
                <div>
                  <strong>{product.name}</strong>
                  <span>SKU: {product.sku || "N/A"}</span>
                </div>
                <strong className="text-red-500">{product.stock}</strong>
              </div>
            ))}
          </div>
          {/* 🔥 FIXED PATH */}
          <button onClick={() => navigate("/app/inventory-reports")} className="primary-button mt-4 w-full">
            Open Inventory Alerts
          </button>
        </div>

        {/* SALES CENTER */}
        <div className="tool-panel">
          <div className="panel-heading">
            <div>
              <h2>Sales Center</h2>
              <p>Access receipts and transactions.</p>
            </div>
          </div>
          <div className="compact-list">
            {reports?.recentSales?.slice(0, 3).map((sale) => (
              <div key={sale._id} className="compact-row">
                <div>
                  <strong>#{sale.receiptId}</strong>
                  <span>{sale.createdBy?.name || "Unknown"}</span>
                </div>
                <strong>{formatCurrency(sale.totalAmount)}</strong>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/app/sales")} className="primary-button mt-4 w-full">
            Open Sales Center
          </button>
        </div>
      </div>
    </section>
  );
};

export default Reports;