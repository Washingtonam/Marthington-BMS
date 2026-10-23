import React, { useEffect, useMemo, useState } from "react";
import request from "../api/client.js";

const roles = ["super_admin", "owner", "manager", "cashier", "staff", "affiliate"];
const pageSize = 20;
const formatRole = (role) => role.replace("_", " ");

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter) params.set("role", roleFilter);
      const result = await request(`/admin/users?${params}`);
      setUsers(result.users || []);
    } catch (err) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter]);

  const pageCount = Math.max(1, Math.ceil(users.length / pageSize));
  const visibleUsers = useMemo(
    () => users.slice((page - 1) * pageSize, page * pageSize),
    [page, users]
  );

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const changeRole = async (user, role) => {
    if (role === user.role) return;
    if (
      role === "super_admin" &&
      !window.confirm(`Promote ${user.name} to super admin? This grants full access to platform administration.`)
    ) {
      return;
    }
    setUpdatingUserId(user._id);
    setError("");
    setNotice("");
    try {
      const result = await request(`/admin/users/${user._id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role })
      });
      setUsers((current) => current.map((item) => item._id === user._id
        ? { ...item, role: result.user.role }
        : item));
      setNotice(`Updated ${user.name}'s role to ${formatRole(result.user.role)}.`);
    } catch (err) {
      setError(err.message || "Failed to update user role.");
    } finally {
      setUpdatingUserId("");
    }
  };

  return (
    <section className="page-stack mx-auto max-w-7xl">
      <div className="page-heading">
        <div>
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin</span>
          <h1 className="mt-2 text-4xl font-extrabold text-slate-900">Users</h1>
        </div>
        <p className="max-w-2xl text-sm text-slate-500">
          View platform accounts and manage roles across all tenants. Super admins have full platform access.
        </p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{notice}</p>}

      <div className="grid gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl md:grid-cols-2">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Search users
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search by name or email"
            className="mt-2 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Filter by role
          <select
            value={roleFilter}
            onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }}
            className="mt-2 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900"
          >
            <option value="">All roles</option>
            {roles.map((role) => <option key={role} value={role}>{formatRole(role)}</option>)}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Business</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-400">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-400">No users match these filters.</td></tr>
            ) : visibleUsers.map((user) => (
              <tr key={user._id}>
                <td className="px-5 py-4">
                  <strong className="text-slate-900">{user.name}</strong>
                  {user.isCurrentUser && <span className="ml-2 text-[10px] font-bold uppercase text-slate-400">You</span>}
                  <p className="text-slate-400">{user.email}</p>
                </td>
                <td className="px-5 py-4">{user.business?.name || "Platform account"}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${user.isActive === false ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
                    {user.isActive === false ? "Disabled" : "Active"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <select
                    aria-label={`Role for ${user.name}`}
                    value={user.role}
                    disabled={user.isCurrentUser || updatingUserId === user._id}
                    onChange={(event) => changeRole(user, event.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 capitalize disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {roles.map((role) => <option key={role} value={role}>{formatRole(role)}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && users.length > 0 && (
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>{users.length} user{users.length === 1 ? "" : "s"}</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button>
              <span>Page {page} of {pageCount}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminUsers;
