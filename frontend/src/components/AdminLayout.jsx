import React, { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiBarChart2,
  FiBell,
  FiBriefcase,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiDollarSign,
  FiBookOpen,
  FiFileText,
  FiHome,
  FiMail,
  FiSettings,
  FiShield,
  FiShoppingBag,
  FiZap,
  FiUsers,
  FiX
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";
import { getNotifications, markNotificationAsRead } from "../api/notifications.js";
import AdminModeToggle from "./AdminModeToggle.jsx";

const navigationGroups = [
  {
    label: "Control center",
    items: [
      { to: "/admin", label: "Dashboard", icon: FiHome, end: true },
      { to: "/admin/shop", label: "Storefront management", icon: FiShoppingBag },
      { to: "/admin/tenants", label: "Tenant directory", icon: FiBriefcase },
      { to: "/admin/affiliate-network", label: "Agent network", icon: FiUsers },
      { to: "/admin/affiliates", label: "Agent ledger", icon: FiDollarSign },
      { to: "/admin/communications", label: "Communications", icon: FiMail },
      { to: "/admin/campaigns", label: "Campaigns", icon: FiFileText },
      { to: "/admin/wild-thoughts", label: "Wild Thoughts", icon: FiZap },
      { to: "/admin/email-registry", label: "Email registry", icon: FiMail }
    ]
  },
  {
    label: "Finance",
    items: [
      { to: "/admin/revenue", label: "Revenue", icon: FiBarChart2 },
      { to: "/admin/subscriptions", label: "Subscriptions", icon: FiCreditCard },
      { to: "/admin/plan-access", label: "Free & Pro modes", icon: FiShield },
      { to: "/admin/billing-settings", label: "Billing settings", icon: FiSettings },
      { to: "/admin/payouts", label: "Payout requests", icon: FiDollarSign }
    ]
  },
  {
    label: "System",
    items: [
      { to: "/admin/users", label: "Users", icon: FiUsers },
      { to: "/admin/analytics", label: "Analytics", icon: FiActivity },
      { to: "/admin/settings", label: "Settings", icon: FiSettings },
      { to: "/admin/user-guide", label: "User Guide", icon: FiBookOpen },
      { to: "/admin/operation-logs", label: "Operation logs", icon: FiFileText }
    ]
  }
];

const AdminLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <button
        type="button"
        aria-label="Close admin sidebar"
        onClick={closeMobileMenu}
        className={`fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px] transition-opacity lg:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white/90 shadow-[12px_0_32px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-200 ${mobileOpen ? "w-72 translate-x-0" : "-translate-x-full lg:translate-x-0"} ${!mobileOpen ? (collapsed ? "lg:w-20" : "lg:w-72") : ""}`}>
        <div className={`flex h-20 items-center justify-between border-b border-slate-100 px-5 ${collapsed ? "lg:justify-center lg:px-2" : ""}`}>
          <div className={`flex items-center gap-3 ${collapsed ? "lg:hidden" : ""}`}>
            <img src="/logo-icon.png" alt="Marthington" className="h-11 w-11 rounded-xl object-contain" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Marthington</p>
              <p className="text-base font-bold text-slate-900">Super Admin</p>
            </div>
          </div>
          {collapsed && <img src="/logo-icon.png" alt="Marthington" className="hidden h-9 w-9 rounded-xl object-contain lg:block" />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCollapsed((current) => !current)} aria-label={collapsed ? "Expand admin sidebar" : "Collapse admin sidebar"} aria-expanded={!collapsed} className="hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:inline-flex">
              {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
            </button>
            <button type="button" onClick={closeMobileMenu} aria-label="Close sidebar" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"><FiX /></button>
          </div>
        </div>

        <nav aria-label="Super admin navigation" className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {navigationGroups.map((group) => (
            <section key={group.label}>
              {!collapsed && <h2 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{group.label}</h2>}
              <div className="space-y-1">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={closeMobileMenu}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) => `flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${collapsed ? "lg:justify-center lg:px-0" : ""} ${isActive ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm" : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"}`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className={`border-t border-slate-100 p-3 ${collapsed ? "lg:px-2" : ""}`}>
          <button type="button" onClick={() => { logout(); navigate("/login"); }} title={collapsed ? "Log out" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
            <span aria-hidden="true">↪</span><span className={collapsed ? "lg:hidden" : ""}>Log out</span>
          </button>
        </div>
      </aside>

      <div className={collapsed ? "lg:pl-20" : "lg:pl-72"}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open admin sidebar" className="rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50 lg:hidden">☰</button>
            <div className="hidden items-center gap-2 sm:flex">
              <img src="/logo-icon.png" alt="" aria-hidden="true" className="h-8 w-8 rounded-lg object-contain" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">Marthington</p>
                <p className="text-sm font-semibold text-slate-800">Admin workspace</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AdminModeToggle />
            <span className="hidden max-w-48 truncate text-xs text-slate-500 md:block">{user?.email}</span>
            <div className="relative">
              <button
                type="button"
                aria-expanded={notificationsOpen}
                aria-label={`Notifications, ${unreadCount} unread`}
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  if (!notificationsOpen) loadNotifications();
                }}
                className="relative rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FiBell className="inline h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline"> Notifications</span>
                {unreadCount > 0 && <span className="ml-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] text-white">{unreadCount}</span>}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">Unread notifications</p>
                  {notificationError && <p role="alert" className="px-3 py-2 text-xs text-rose-700">{notificationError}</p>}
                  {notifications.length === 0 && !notificationError && <p className="px-3 py-4 text-sm text-slate-500">You’re all caught up.</p>}
                  {notifications.map((notification) => (
                    <button key={notification._id} type="button" onClick={() => openNotification(notification)} className="block w-full rounded-xl px-3 py-3 text-left hover:bg-slate-50">
                      <span className="block text-sm font-bold">{notification.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-600">{notification.message}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">{new Date(notification.createdAt).toLocaleString()}</span>
                    </button>
                  ))}
                  {unreadCount > notifications.length && <p className="px-3 py-2 text-xs text-slate-500">Showing the latest {notifications.length} of {unreadCount} unread.</p>}
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
