import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const SIDEBAR_GROUPS_STORAGE_KEY = "marthington-sidebar-groups";
const SIDEBAR_AUTO_COLLAPSE_MS = 10000;

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("bms_user")) || null;
  } catch {
    return null;
  }
};

const defaultNavGroups = [
  {
    label: "Main",
    items: [{ to: "/app", label: "Dashboard", icon: "◉", permission: "canViewDashboard" }],
  },
  {
    label: "Sales & Operations",
    items: [
      { to: "/app/pos", label: "POS", icon: "🛒", permission: "canAccessPOS" },
      { to: "/app/sales", label: "Sales", icon: "▣", permission: "canViewSales" },
      { to: "/app/invoices", label: "Invoices", icon: "◫", permission: "canViewInvoices" },
      { to: "/app/payments", label: "Payments", icon: "💳", permission: "canViewPayments" },
      { to: "/app/customers", label: "Customers / CRM", icon: "◌", permission: "canViewCustomers" },
    ],
  },
  {
    label: "Catalog & Inventory",
    items: [
      { to: "/app/products", label: "Products", icon: "📦", permission: "canViewProducts" },
      { to: "/app/services", label: "Services", icon: "🛠️", permission: "canViewProducts" },
      { to: "/app/inventory", label: "Inventory", icon: "◧", permission: "canViewBranchInventory" },
      { to: "/app/suppliers", label: "Suppliers", icon: "🏭", permission: "canViewPurchaseOrders" },
      { to: "/app/supplier-performance", label: "Supplier Performance", icon: "📈", permission: "canViewPurchaseOrders" },
      { to: "/app/purchase-orders", label: "Purchase Orders", icon: "🧾", permission: "canViewPurchaseOrders" },
    ],
  },
  {
    label: "Finance & Control",
    items: [
      { to: "/app/expenses", label: "Expenses", icon: "💸", permission: "canViewExpenses" },
      { to: "/app/budget-management", label: "Budget Management", icon: "💰", permission: "canViewExpenses" },
      { to: "/app/budget-alerts", label: "Budget Alerts", icon: "🔔", permission: "canViewExpenses" },
      { to: "/app/cost-trends", label: "Cost Trends", icon: "📉", permission: "canViewExpenses" },
      { to: "/app/billing", label: "Billing", icon: "⬡", permission: "canManageBilling" },
      { to: "/app/reports", label: "Reports", icon: "📊", permission: "canViewReports" },
      { to: "/app/analytics", label: "Analytics", icon: "⬢", permission: "canViewReports" },
    ],
  },
  {
    label: "Team & Access",
    items: [
      { to: "/app/staff", label: "Staff", icon: "◎", permission: "canManageStaff" },
      { to: "/app/settings?tab=access", label: "Roles & Permissions", icon: "🛡️", permission: "canManageSettings" },
    ],
  },
  {
    label: "People & Locations",
    items: [
      { to: "/app/branches", label: "Branches", icon: "🏢", permission: "canViewBranches" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/app/settings", label: "Settings", icon: "⚙", permission: "canManageSettings" },
      { to: "/app/user-guide", label: "User Guide", icon: "📘" },
    ],
  },
];

export default function Sidebar({
  navigationGroups = defaultNavGroups,
  mobileOpen,
  setMobileOpen,
  theme,
  toggleTheme,
  onCollapseChange,
}) {
  const { pathname } = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const collapseTimerRef = useRef(null);
  const user = getStoredUser();

  const clearCollapseTimer = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  };

  const expandSidebar = () => {
    if (mobileOpen) return;
    clearCollapseTimer();
    setIsCollapsed(false);
    collapseTimerRef.current = setTimeout(() => {
      setIsCollapsed(true);
    }, SIDEBAR_AUTO_COLLAPSE_MS);
  };

  const scheduleCollapse = () => {
    if (mobileOpen) return;
    clearCollapseTimer();
    setIsCollapsed(true);
  };

  useEffect(() => {
    return () => clearCollapseTimer();
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      clearCollapseTimer();
      return;
    }

    if (!isCollapsed) {
      collapseTimerRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, SIDEBAR_AUTO_COLLAPSE_MS);
    }

    return () => clearCollapseTimer();
  }, [isCollapsed, mobileOpen]);

  useEffect(() => {
    if (typeof onCollapseChange === "function") {
      onCollapseChange(isCollapsed);
    }
  }, [isCollapsed, onCollapseChange]);

  const canAccessItem = (item) => {
    if (!user || !item.permission || user.role === "owner" || user.role === "super_admin") return true;
    return user?.permissions?.[item.permission] === true;
  };
  const permissionSignature = JSON.stringify(user?.permissions || {});
  const visibleGroups = useMemo(() => navigationGroups
    .map((group) => ({ ...group, items: group.items.filter(canAccessItem) }))
    .filter((group) => group.items.length > 0), [navigationGroups, permissionSignature, user?.role]);
  const normalizeTarget = (target) => (typeof target === "string" ? target.split("?")[0] : target?.pathname || "/app");
  const [openGroups, setOpenGroups] = useState(() => {
    if (typeof window === "undefined") return {};

    try {
      return JSON.parse(localStorage.getItem(SIDEBAR_GROUPS_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify(openGroups));
    }
  }, [openGroups]);

  useEffect(() => {
    const activeGroup = visibleGroups.find((group) =>
      group.items.some((item) => {
        const target = normalizeTarget(item.to);
        return target === "/app"
          ? pathname === target
          : pathname === target || pathname.startsWith(`${target}/`);
      })
    );

    if (activeGroup) {
      setOpenGroups((current) => current[activeGroup.label] === true
        ? current
        : { ...current, [activeGroup.label]: true });
    }
  }, [navigationGroups, pathname, visibleGroups]);

  const toggleGroup = (groupLabel) => {
    setOpenGroups((current) => ({
      ...current,
      [groupLabel]: current[groupLabel] === false,
    }));
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        onMouseEnter={expandSidebar}
        onMouseLeave={scheduleCollapse}
        onClick={() => {
          if (!mobileOpen && isCollapsed) {
            expandSidebar();
          }
        }}
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden border-r border-slate-200/80 bg-white/70 bg-gradient-to-b from-white/80 via-white/70 to-slate-50/75 shadow-[12px_0_32px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-200 ring-1 ring-white/60 dark:border-slate-700/80 dark:bg-slate-950/70 dark:from-slate-950/80 dark:via-slate-950/75 dark:to-slate-900/80 dark:ring-slate-800/80 ${
          mobileOpen ? "w-72 translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${!mobileOpen ? (isCollapsed ? "lg:w-20" : "lg:w-72") : ""}`}
      >
        <div className={`flex items-center justify-between border-b border-slate-200/80 bg-white/20 px-5 py-4 backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-950/15 ${isCollapsed ? "lg:justify-center lg:px-2 lg:py-3" : ""}`}>
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              <img
                src="/logo-icon.png"
                alt="Marthington"
                className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <img
                src="/logo-icon.png"
                alt="Marthington"
                className="h-9 w-9 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Marthington
                </p>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Business Hub
                </p>
              </div>
            </div>
          )}

          {!isCollapsed && (
            <button
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-all duration-150 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen(false)}
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-slate-200/80 scrollbar-track-transparent dark:scrollbar-thumb-slate-700/80">
          {visibleGroups.map((group, groupIndex) => {
            const isPermanent = groupIndex === 0;
            const isOpen = isPermanent || openGroups[group.label] !== false;
            const groupId = `sidebar-group-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            const showSectionLabel = !isCollapsed;

            return (
            <div key={group.label} className="mb-5">
              {showSectionLabel && (isPermanent ? (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                  {group.label}
                </p>
              ) : (
                <button
                  type="button"
                  className="mb-2 flex w-full items-center justify-between rounded-lg px-3 py-1 text-left text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-300"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isOpen}
                  aria-controls={groupId}
                >
                  <span>{group.label}</span>
                  <span className="text-sm leading-none" aria-hidden="true">
                    {isOpen ? "⌄" : "›"}
                  </span>
                </button>
              ))}

              <div id={groupId} className={`space-y-1 ${isOpen ? "" : "hidden"}`}>
                {group.items.map((item) => (
                  <NavLink
                    key={typeof item.to === "string" ? item.to : item.to?.pathname || item.label}
                    to={item.to}
                    end={normalizeTarget(item.to) === "/app"}
                    onClick={() => {
                      setMobileOpen(false);
                      if (!mobileOpen) setIsCollapsed(true);
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl border border-transparent text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-150 active:scale-[0.99] ${
                        isCollapsed ? "justify-center px-0 py-2.5" : "justify-start px-3 py-2.5"
                      } ${
                        isActive
                          ? "border-emerald-200 bg-emerald-50/90 text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "text-slate-600 hover:border-slate-200/80 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:border-slate-700/70 dark:hover:bg-slate-800/80 dark:hover:text-slate-100"
                      }`
                    }
                    title={item.label}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center text-base">{item.icon}</span>
                    {!isCollapsed && (
                      <span className="overflow-visible whitespace-nowrap text-left">{item.label}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
            );
          })}
        </nav>

        <div className={`border-t border-slate-200/80 bg-white/15 p-3 backdrop-blur-sm dark:border-slate-700/80 ${isCollapsed ? "lg:px-2" : ""}`}>
          <button
            onClick={toggleTheme}
            className={`flex w-full items-center rounded-xl border border-slate-200/80 bg-white/70 text-sm font-medium text-slate-700 shadow-sm shadow-slate-200/50 transition-all duration-150 hover:bg-slate-50/90 active:scale-[0.99] dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800/80 ${isCollapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2.5"}`}
            type="button"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            <span>{theme === "dark" ? "☀️" : "🌙"}</span>
            {!isCollapsed && <span className="text-xs text-slate-400">Toggle</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
