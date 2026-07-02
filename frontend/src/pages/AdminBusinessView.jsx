import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import request from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency } from "../utils/formatters.js";

const AdminBusinessView = () => {
  const { id } = useParams();
  const { startImpersonation, refreshBusiness } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [processing, setProcessing] = useState(false);

  const [data, setData] = useState({
    business: null,
    products: [],
    sales: [],
    users: []
  });

  const loadBusiness = async () => {
    try {
      const res = await request(`/admin/business/${id}`);
      setData(res);
    } catch (err) {
      console.error(err);
      alert("Failed to load business");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadBusiness();
  }, [id]);

  const handlePlanChange = async (plan, billingCycle = "monthly") => {
    try {
      setProcessing(true);

      await request(`/admin/business/${id}/subscription`, {
        method: "PUT",
        body: JSON.stringify({
          plan,
          billingCycle
        })
      });

      await loadBusiness();
      await refreshBusiness(); // 🔥 GLOBAL SYNC FIX

    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!window.confirm("Suspend this business? Users will be blocked from logging in.")) return;
    try {
      setProcessing(true);
      await request(`/admin/business/${id}/suspend`, { method: "PUT" });
      await loadBusiness();
    } catch (err) {
      alert(err.message || "Failed to suspend business");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnsuspend = async () => {
    try {
      setProcessing(true);
      await request(`/admin/business/${id}/unsuspend`, { method: "PUT" });
      await loadBusiness();
    } catch (err) {
      alert(err.message || "Failed to unsuspend business");
    } finally {
      setProcessing(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm("Archive this business? Users will be blocked but data kept.")) return;
    try {
      setProcessing(true);
      await request(`/admin/business/${id}/archive`, { method: "PUT" });
      await loadBusiness();
    } catch (err) {
      alert(err.message || "Failed to archive business");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnarchive = async () => {
    try {
      setProcessing(true);
      await request(`/admin/business/${id}/unarchive`, { method: "PUT" });
      await loadBusiness();
    } catch (err) {
      alert(err.message || "Failed to unarchive business");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this business and ALL its data? This is irreversible and frees emails.")) return;
    const reason = window.prompt("Reason for permanent deletion (required):");
    if (!reason || !reason.trim()) {
      alert("Deletion reason is required");
      return;
    }
    try {
      setProcessing(true);
      await request(`/admin/business/${id}?permanent=true`, { method: "DELETE", body: JSON.stringify({ reason }) });
      await loadBusiness();
    } catch (err) {
      alert(err.message || "Failed to delete business");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading business...</div>;
  }
  const { business, products, sales, users } = data;

  return (
    <section className="page-stack">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{business?.name}</h1>

          <div className="flex gap-2 mt-1 items-center">
            <span
              className={`text-xs px-2 py-1 rounded ${
                business?.subscription?.plan === "pro"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {business?.subscription?.plan || "free"}
            </span>

            <span className="text-xs text-gray-500">
              {business?.subscription?.status || "trial"}
            </span>
          </div>

          {business?.subscription?.expiresAt && (
            <p className="text-xs text-gray-500 mt-1">
              Expires:{" "}
              {new Date(
                business.subscription.expiresAt
              ).toLocaleDateString()}
            </p>
          )}
        </div>

        <button
          onClick={() => {
            startImpersonation(id);
            navigate("/app");
          }}
          className="bg-black text-white px-4 py-2 rounded-md"
        >
          Enter Business
        </button>
      </div>

      {/* ADMIN CONTROLS */}
      <div className="tool-panel mt-4 space-y-3">
        <h3 className="font-bold">Admin Controls</h3>

        <div className="flex flex-wrap gap-2">

          <button
            disabled={processing}
            onClick={() => handlePlanChange("pro", "monthly")}
            className="bg-green-600 text-white px-3 py-2 rounded-md text-sm"
          >
            Upgrade Monthly
          </button>

          <button
            disabled={processing}
            onClick={() => handlePlanChange("pro", "yearly")}
            className="bg-green-700 text-white px-3 py-2 rounded-md text-sm"
          >
            Upgrade Yearly
          </button>

          <button
            disabled={processing}
            onClick={() => handlePlanChange("free")}
            className="bg-red-600 text-white px-3 py-2 rounded-md text-sm"
          >
            Downgrade
          </button>

          {business?.status !== "suspended" && business?.status !== "deleted" && (
            <button
              disabled={processing}
              onClick={handleSuspend}
              className="bg-yellow-500 text-white px-3 py-2 rounded-md text-sm"
            >
              Suspend
            </button>
          )}

          {business?.status === "suspended" && (
            <button
              disabled={processing}
              onClick={handleUnsuspend}
              className="bg-green-500 text-white px-3 py-2 rounded-md text-sm"
            >
              Unsuspend
            </button>
          )}

          {business?.status !== "archived" && (
            <button
              disabled={processing}
              onClick={handleArchive}
              className="bg-gray-500 text-white px-3 py-2 rounded-md text-sm"
            >
              Archive
            </button>
          )}

          {business?.status === "archived" && (
            <button
              disabled={processing}
              onClick={handleUnarchive}
              className="bg-blue-500 text-white px-3 py-2 rounded-md text-sm"
            >
              Unarchive
            </button>
          )}

          <button
            disabled={processing}
            onClick={handleDelete}
            className="bg-gray-800 text-white px-3 py-2 rounded-md text-sm"
          >
            Delete (Permanent)
          </button>

        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b pb-2 mt-4">
        {["overview", "products", "sales", "staff"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm ${
              tab === t ? "font-bold" : "text-gray-500"
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="tool-panel">
            <strong>Products</strong>
            <h2>{products.length}</h2>
          </div>

          <div className="tool-panel">
            <strong>Sales</strong>
            <h2>{sales.length}</h2>
          </div>

          <div className="tool-panel">
            <strong>Staff</strong>
            <h2>{users.length}</h2>
          </div>
        </div>
      )}

      {/* PRODUCTS */}
      {tab === "products" && (
        <div className="product-table mt-4">
          <div className="product-row product-row-head">
            <span>Name</span>
            <span>Price</span>
            <span>Stock</span>
          </div>

          {products.map((p) => (
            <div className="product-row" key={p._id}>
              <span>{p.name}</span>
              <span>{formatCurrency(p.price)}</span>
              <span>{p.stock}</span>
            </div>
          ))}
        </div>
      )}

      {/* SALES */}
      {tab === "sales" && (
        <div className="product-table mt-4">
          <div className="product-row product-row-head">
            <span>Amount</span>
            <span>Date</span>
          </div>

          {sales.map((s) => (
            <div className="product-row" key={s._id}>
              <span>{formatCurrency(s.totalAmount)}</span>
              <span>
                {new Date(s.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* STAFF */}
      {tab === "staff" && (
        <div className="product-table mt-4">
          <div className="product-row product-row-head">
            <span>Name</span>
            <span>Role</span>
          </div>

          {users.map((u) => (
            <div className="product-row" key={u._id}>
              <span>{u.name}</span>
              <span>{u.role}</span>
            </div>
          ))}
        </div>
      )}

    </section>
  );
};

export default AdminBusinessView;