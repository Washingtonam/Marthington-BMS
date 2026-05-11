import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "./Icon.jsx";

const navItems = [
  {
    label: "Dashboard",
    href: "/app",
    icon: "chart",
    // 🔥 Dashboard now requires the specific permission we added in Staff.jsx
    permission: "canViewDashboard" 
  },

  {
    label: "Products",
    href: "/app/products",
    icon: "boxes",
    permission: "canViewProducts"
  },

  {
    label: "Services",
    href: "/app/services",
    icon: "package",
    permission: "canViewProducts"
  },

  {
    label: "Sales",
    href: "/app/pos",
    icon: "cart",
    permission: "canMakeSale"
  },

  {
    label: "Reports",
    href: "/app/reports",
    icon: "chart",
    permission: "canViewReports"
  },

  {
    label: "Staff",
    href: "/app/staff",
    icon: "team",
    permission: "canManageStaff"
  },

  {
    label: "Billing",
    href: "/app/billing",
    icon: "wallet",
    permission: "canManageSettings"
  },

  {
    label: "Settings",
    href: "/app/settings",
    icon: "settings",
    permission: "canManageSettings"
  },

  {
    label: "Invoices",
    href: "/app/invoices",
    icon: "receipt",
    permission: "canViewSales"
  },

  {
    label: "Customers",
    href: "/app/customers",
    icon: "team",
    permission: "canViewSales"
  }
];

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    logout,
    user,
    impersonatedBusiness,
    stopImpersonation
  } = useAuth();

  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // =====================================
  // ACCESS CHECK (Upgraded)
  // =====================================
  const hasAccess = (permission) => {
    // 1. SUPER ADMIN & OWNER ALWAYS HAVE ACCESS
    if (user?.role === "super_admin" || user?.role === "owner") {
      return true;
    }

    // 2. IF NO PERMISSION IS DEFINED ON THE ITEM, ALLOW ACCESS
    if (!permission) {
      return true;
    }

    // 3. CHECK SPECIFIC STAFF PERMISSIONS
    return user?.permissions?.[permission] || false;
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        
        {/* BRAND */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-green-600 text-white flex items-center justify-center rounded-md font-bold text-lg">
            M
          </div>
          <div>
            <strong className="text-white">Marthington</strong>
            <span className="text-xs text-gray-400">Business OS</span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="sidebar-nav mt-6">
          {navItems
            .filter((item) => hasAccess(item.permission)) // 🔥 Filters sidebar based on new logic
            .map((item) => (
              <NavLink
                key={item.label}
                to={item.href}
                end={item.href === "/app"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
        </nav>

        {/* QUICK ACTIONS */}
        <div className="flex flex-col gap-2 px-4 mt-4">
          {hasAccess("canManageProducts") && (
            <button
              className="quick-create"
              type="button"
              onClick={() => navigate("/app/products")}
            >
              <Icon name="add" />
              <span>New Product</span>
            </button>
          )}

          {hasAccess("canMakeSale") && (
            <button
              className="quick-create bg-blue-600 text-white hover:bg-blue-700"
              type="button"
              onClick={() => navigate("/app/pos")}
            >
              <Icon name="cart" />
              <span>New Sale</span>
            </button>
          )}
        </div>
      </aside>

      {/* MAIN PANEL */}
      <div className="main-panel">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <Icon name="menu" />
          </button>

          <div className="global-search">
            <Icon name="search" />
            <input placeholder="Search products, sales..." />
          </div>

          {/* IMPERSONATION */}
          {impersonatedBusiness && (
            <div className="flex items-center gap-2 bg-yellow-100 px-3 py-1 rounded-md">
              <span className="text-sm font-medium text-yellow-800">
                Viewing Business
              </span>
              <button
                className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                onClick={stopImpersonation}
              >
                Exit
              </button>
            </div>
          )}

          {/* USER CHIP */}
          <div className="user-chip">
            <div>
              <strong className="capitalize">{user?.name}</strong>
              <span className="capitalize">{user?.role?.replace("_", " ")}</span>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={handleLogout}
            >
              <Icon name="logout" />
            </button>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;