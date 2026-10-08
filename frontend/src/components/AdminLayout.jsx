import { useCallback, useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getNotifications, markNotificationAsRead } from "../api/notifications.js";

const AdminLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotifications("limit=8&isRead=false");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setNotificationError("");
    } catch (error) {
      setNotificationError(error.message || "Could not load notifications.");
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  const openNotification = async (notification) => {
    try {
      await markNotificationAsRead(notification._id);
      setNotifications((current) => current.filter((item) => item._id !== notification._id));
      setUnreadCount((current) => Math.max(0, current - 1));
      setNotificationsOpen(false);
      if (notification.actionUrl) navigate(notification.actionUrl);
    } catch (error) {
      setNotificationError(error.message || "Could not open notification.");
    }
  };

  const navItem = ({ isActive }) =>
    `block px-3 py-2 rounded-md text-sm transition ${
      isActive ? "bg-white text-black font-semibold" : "hover:bg-gray-800"
    }`;

  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* SIDEBAR */}
      <aside className="w-64 bg-black text-white p-5 flex flex-col justify-between">

        <div>
          <h1 className="text-xl font-bold mb-6">Super Admin</h1>

          <nav className="space-y-5">
            <div>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Control Center</p>

              <div className="space-y-1">

                <NavLink to="/admin" end className={navItem}>Dashboard</NavLink>
                <NavLink to="/admin/shop" className={navItem}>Shop Management</NavLink>
                <NavLink to="/admin/tenants" className={navItem}>Tenant Directory</NavLink>
                <NavLink to="/admin/affiliate-network" className={navItem}>Affiliate Network</NavLink>
                <NavLink to="/admin/affiliates" className={navItem}>Affiliate Ledger</NavLink>
                <NavLink to="/admin/communications" className={navItem}>Communications</NavLink>
                <NavLink to="/admin/campaigns" className={navItem}>Campaigns</NavLink>
                <NavLink to="/admin/email-registry" className={navItem}>Email Registry</NavLink>
              </div>
            </div>

            <div>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Finance</p>

              <div className="space-y-1">

                <NavLink to="/admin/revenue" className={navItem}>Revenue</NavLink>
                <NavLink to="/admin/subscriptions" className={navItem}>Subscriptions</NavLink>
                <NavLink to="/admin/billing-settings" className={navItem}>Billing Settings</NavLink>
                <NavLink to="/admin/payouts" className={navItem}>Payout Requests</NavLink>
              </div>
            </div>

            <div>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">System</p>

              <div className="space-y-1">
                <NavLink to="/admin/users" className={navItem}>Users</NavLink>
                <NavLink to="/admin/analytics" className={navItem}>Analytics</NavLink>
                <NavLink to="/admin/settings" className={navItem}>Settings</NavLink>
                <NavLink to="/admin/operation-logs" className={navItem}>Operation Logs</NavLink>
              </div>
            </div>

          </nav>
        </div>

        {/* LOGOUT */}
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="bg-red-500 px-3 py-2 rounded-md text-sm"
        >
          Logout
        </button>

      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col">

        {/* 🔥 TOP BAR (CRITICAL) */}
        <header className="bg-white border-b px-6 py-3 flex justify-between items-center">

          <div>
            <h2 className="font-semibold text-lg">Admin Panel</h2>
            <p className="text-xs text-gray-500">
              Full system control
            </p>
          </div>

          <div className="flex items-center gap-4">

            <div className="text-sm text-gray-500 hidden md:block">
              {user?.email}
            </div>

            <div className="relative">
              <button
                type="button"
                aria-expanded={notificationsOpen}
                aria-label={`Notifications, ${unreadCount} unread`}
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  if (!notificationsOpen) loadNotifications();
                }}
                className="relative rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Notifications
                {unreadCount > 0 && <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs text-white">{unreadCount}</span>}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">Unread notifications</p>
                  {notificationError && <p role="alert" className="px-3 py-2 text-xs text-rose-700">{notificationError}</p>}
                  {notifications.length === 0 && !notificationError && <p className="px-3 py-4 text-sm text-slate-500">You’re all caught up.</p>}
                  {notifications.map((notification) => (
                    <button
                      key={notification._id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className="block w-full rounded-lg px-3 py-3 text-left hover:bg-slate-50"
                    >
                      <span className="block text-sm font-bold">{notification.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-600">{notification.message}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">{new Date(notification.createdAt).toLocaleString()}</span>
                    </button>
                  ))}
                  {unreadCount > notifications.length && <p className="px-3 py-2 text-xs text-slate-500">Showing the latest {notifications.length} of {unreadCount} unread.</p>}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-sm bg-black text-white px-3 py-2 rounded-md"
            >
              Logout
            </button>

          </div>

        </header>

        {/* 🔥 PAGE CONTENT */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default AdminLayout;