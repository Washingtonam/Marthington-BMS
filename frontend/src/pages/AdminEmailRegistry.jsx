import { useEffect, useState } from "react";
import request from "../api/client.js";

const AdminEmailRegistry = () => {
  const [users, setUsers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [filters, setFilters] = useState({ search: "", role: "", businessId: "", marketingStatus: "all" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const [registry, overview] = await Promise.all([request(`/admin/email-registry?${params}`), request("/admin/overview")]);
      setUsers(registry.users || []);
      setBusinesses(overview.businesses || []);
    } catch (err) {
      alert(err.message || "Failed to load email registry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters.search, filters.role, filters.businessId, filters.marketingStatus]);

  const toggle = async (user) => {
    const nextOptOut = !user.marketingOptOut;
    if (!window.confirm(`Are you sure you want to ${nextOptOut ? "turn off" : "restore"} marketing emails for ${user.email}?`)) return;
    try {
      const response = await request(`/admin/email-registry/${user._id}/preference`, {
        method: "PATCH",
        body: JSON.stringify({ marketingOptOut: nextOptOut })
      });
      setUsers((current) => current.map((item) => item._id === user._id ? { ...item, marketingOptOut: response.preference.marketingOptOut } : item));
    } catch (err) {
      alert(err.message || "Failed to update email preference");
    }
  };

  return <section className="page-stack max-w-7xl mx-auto"><div className="page-heading"><div><span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin</span><h1 className="mt-2 text-4xl font-extrabold text-slate-900">Email Registry</h1></div><p className="max-w-2xl text-sm text-slate-500">Review platform email addresses and control promotional delivery before sending a campaign.</p></div><div className="grid gap-4 rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80 md:grid-cols-4"><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search name or email" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><select value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">All roles</option><option value="owner">Owners</option><option value="manager">Managers</option><option value="cashier">Cashiers</option><option value="staff">Staff</option><option value="affiliate">Affiliates</option></select><select value={filters.businessId} onChange={(event) => setFilters({ ...filters, businessId: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">All businesses</option>{businesses.map((business) => <option key={business._id} value={business._id}>{business.name}</option>)}</select><select value={filters.marketingStatus} onChange={(event) => setFilters({ ...filters, marketingStatus: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="all">All email status</option><option value="enabled">Marketing enabled</option><option value="disabled">Marketing disabled</option></select></div><div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-xl border border-slate-200/80"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-4">User</th><th className="px-5 py-4">Business</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Email status</th><th className="px-5 py-4 text-right">Control</th></tr></thead><tbody className="divide-y divide-slate-100 text-xs">{loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Loading email registry...</td></tr> : users.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">No users match these filters.</td></tr> : users.map((user) => <tr key={user._id}><td className="px-5 py-4"><strong className="text-slate-900">{user.name}</strong><p className="text-slate-400">{user.email}</p></td><td className="px-5 py-4">{user.business?.name || "Platform account"}</td><td className="px-5 py-4 capitalize">{user.role.replace("_", " ")}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${user.marketingOptOut ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{user.marketingOptOut ? "Disabled" : "Enabled"}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => toggle(user)} className="rounded-lg border border-slate-200 px-3 py-2 font-bold">{user.marketingOptOut ? "Enable" : "Disable"}</button></td></tr>)}</tbody></table></div></section>;
};

export default AdminEmailRegistry;
