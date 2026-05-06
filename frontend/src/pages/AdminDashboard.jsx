import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import request from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { startImpersonation } = useAuth();

  const [stats, setStats] = useState({
    businesses: 0,
    users: 0,
    sales: 0
  });

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await request("/admin/overview");
        setStats(data.stats || {});
        setBusinesses(data.businesses || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // 🔥 FIXED: USE NEW SUBSCRIPTION ENDPOINT
  const updatePlan = async (businessId, plan) => {
    try {
      setActionLoading(businessId);

      await request(`/admin/business/${businessId}/subscription`, {
        method: "PUT",
        body: JSON.stringify({
          plan,
          billingCycle: "monthly"
        })
      });

      // 🔥 REFRESH UI
      const data = await request("/admin/overview");
      setBusinesses(data.businesses || []);

    } catch (err) {
      alert(err.message || "Failed to update plan");
    } finally {
      setActionLoading("");
    }
  };

  // 🔥 IMPERSONATION
  const enterBusiness = (businessId) => {
    startImpersonation(businessId);
    navigate("/app");
  };

  // 🔥 NEW: VIEW BUSINESS (THIS IS WHAT YOU WERE MISSING)
  const viewBusiness = (businessId) => {
    navigate(`/admin/business/${businessId}`);
  };

  return (
    <section className="page-stack">

      <div className="page-heading">
        <div>
          <span>Super Admin</span>
          <h1>Control Panel</h1>
        </div>
        <p>Full control across all businesses on your platform.</p>
      </div>

      <div className="metrics-grid">
        <div className="tool-panel">
          <strong>Total Businesses</strong>
          <h2>{stats.businesses}</h2>
        </div>

        <div className="tool-panel">
          <strong>Total Users</strong>
          <h2>{stats.users}</h2>
        </div>

        <div className="tool-panel">
          <strong>Total Sales</strong>
          <h2>{stats.sales}</h2>
        </div>
      </div>

      <div className="tool-panel">
        <div className="panel-heading">
          <h2>Businesses</h2>
        </div>

        <div className="product-table">

          <div className="product-row product-row-head">
            <span>Name</span>
            <span>Plan</span>
            <span>Created</span>
            <span>Actions</span>
          </div>

          {loading && (
            <div className="empty-state">Loading businesses...</div>
          )}

          {!loading && businesses.length === 0 && (
            <div className="empty-state">No businesses found.</div>
          )}

          {businesses.map((biz) => (
            <div className="product-row" key={biz._id}>

              <span className="font-medium">{biz.name}</span>

              <span>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    biz.subscription?.plan === "pro"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {biz.subscription?.plan || "free"}
                </span>
              </span>

              <span>
                {new Date(biz.createdAt).toLocaleDateString()}
              </span>

              <div className="flex gap-2">

                {/* 🔥 VIEW (NEW — CRITICAL) */}
                <button
                  className="text-blue-600 text-sm font-medium"
                  onClick={() => viewBusiness(biz._id)}
                >
                  View
                </button>

                {/* 🔥 ENTER */}
                <button
                  className="text-black text-sm"
                  onClick={() => enterBusiness(biz._id)}
                >
                  Enter
                </button>

                {/* 🔥 UPGRADE */}
                {biz.subscription?.plan !== "pro" && (
                  <button
                    disabled={actionLoading === biz._id}
                    className="text-green-600 text-sm"
                    onClick={() => updatePlan(biz._id, "pro")}
                  >
                    Upgrade
                  </button>
                )}

                {/* 🔥 DOWNGRADE */}
                {biz.subscription?.plan === "pro" && (
                  <button
                    disabled={actionLoading === biz._id}
                    className="text-red-600 text-sm"
                    onClick={() => updatePlan(biz._id, "free")}
                  >
                    Downgrade
                  </button>
                )}

              </div>

            </div>
          ))}
        </div>
      </div>

    </section>
  );
};

export default AdminDashboard;