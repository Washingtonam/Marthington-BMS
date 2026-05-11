import { useEffect, useState } from "react";
import request from "../api/client.js";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "staff",
  permissions: {
    canViewDashboard: false, // 🔥 NEW: Permission to lock/unlock dashboard
    canManageProducts: false,
    canViewProducts: true,
    canMakeSale: true,
    canViewSales: true,
    canViewReports: false,
    canOverridePrice: false,
    canManageStaff: false,
    canManageSettings: false
  }
};

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // =====================================
  // LOAD STAFF
  // =====================================
  useEffect(() => {
    const load = async () => {
      try {
        const data = await request("/staff");
        setStaff(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // =====================================
  // CHANGE
  // =====================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // =====================================
  // PERMISSIONS
  // =====================================
  const togglePermission = (permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission]
      }
    }));
  };

  // =====================================
  // SUBMIT
  // =====================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setSaving(true);
      if (!editingId) {
        const res = await request("/staff", {
          method: "POST",
          body: JSON.stringify(form)
        });
        setStaff((prev) => [res.user, ...prev]);
      } else {
        const res = await request(`/staff/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(form)
        });
        setStaff((prev) => prev.map((u) => (u._id === editingId ? res.user : u)));
        setEditingId(null);
      }
      setForm(initialForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // EDIT
  // =====================================
  const handleEdit = (user) => {
    setEditingId(user._id);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "staff",
      permissions: user.permissions || initialForm.permissions
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =====================================
  // DELETE
  // =====================================
  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete staff member?");
    if (!confirmed) return;
    try {
      await request(`/staff/${id}`, { method: "DELETE" });
      setStaff((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section className="products-layout">
      {/* STAFF LIST */}
      <div>
        <div className="page-heading">
          <div>
            <span>Team Management</span>
            <h1>Staff Workspace</h1>
          </div>
        </div>

        <div className="product-table mt-4">
          <div className="product-row product-row-head">
            <span>Staff Member</span>
            <span>Role</span>
            <span>Account Status</span>
            <span>Actions</span>
          </div>

          {loading && <div className="empty-state">Syncing team data...</div>}
          {!loading && !staff.length && <div className="empty-state">No staff found. Add your first team member!</div>}

          {staff.map((user) => (
            <div key={user._id} className="product-row">
              <span>
                <div className="font-semibold">{user.name}</div>
                <div className="text-xs text-gray-400">{user.email}</div>
              </span>
              <span className="capitalize">{user.role}</span>
              <span>
                {user.isActive !== false ? (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Active</span>
                ) : (
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Disabled</span>
                )}
              </span>
              <span className="flex gap-4">
                <button onClick={() => handleEdit(user)} className="text-blue-600 hover:underline font-medium">Edit</button>
                <button onClick={() => handleDelete(user._id)} className="text-red-500 hover:underline font-medium">Remove</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* FORM */}
      <div className="tool-panel bg-white border border-gray-100 rounded-3xl p-6 shadow-sm h-fit">
        <h2 className="font-extrabold text-2xl mb-6">{editingId ? "Modify Staff" : "New Staff Account"}</h2>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-4 border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
            <input className="input-field" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
            <input className="input-field" name="email" type="email" value={form.email} onChange={handleChange} required disabled={editingId} />
          </div>

          {!editingId && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Default Password</label>
              <input className="input-field" name="password" type="password" value={form.password} onChange={handleChange} required />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Designated Role</label>
            <select className="input-field capitalize" name="role" value={form.role} onChange={handleChange}>
              <option value="staff">Staff</option>
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          {/* PREMIUM PERMISSIONS TOGGLES */}
          <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50">
            <h3 className="font-bold text-sm text-gray-700 mb-4 flex items-center gap-2">
              <span>🛡️</span> Security & Permissions
            </h3>

            <div className="space-y-3">
              {Object.keys(form.permissions).map((permission) => (
                <label key={permission} className="flex items-center justify-between group cursor-pointer">
                  <span className="text-sm text-gray-600 group-hover:text-black transition-colors capitalize">
                    {permission.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={form.permissions[permission]} 
                      onChange={() => togglePermission(permission)} 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:bg-gray-400">
            {saving ? "Saving..." : editingId ? "Update Account" : "Create Account"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Staff;