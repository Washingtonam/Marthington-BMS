import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import Icon from "../components/Icon.jsx";
import { formatCurrency } from "../utils/formatters.js";

const Sales = () => {
  const navigate = useNavigate();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await request("/sales");
        setSales(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <span>Sales</span>
          <h1>Sales History</h1>
        </div>
        <p>Track all completed transactions.</p>
      </div>

      <div className="tool-panel">
        <div className="panel-heading">
          <h2>All Sales</h2>
        </div>

        <div className="product-table">
          <div className="product-row product-row-head">
            <span>Date</span>
            <span>Items</span>
            <span>Total</span>
            <span>Staff</span>
            <span>Action</span>
          </div>

          {loading ? <div className="empty-state">Loading...</div> : null}

          {sales.map((sale) => (
            <div className="product-row" key={sale._id}>
              <span>{new Date(sale.createdAt).toLocaleString()}</span>
              <span>{sale.items.length}</span>
              <span>{formatCurrency(sale.totalAmount)}</span>
              <span>{sale.createdBy?.name || "—"}</span>

              <button
                className="text-blue-600"
                onClick={() => navigate(`/app/sales/${sale._id}`)}
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Sales;