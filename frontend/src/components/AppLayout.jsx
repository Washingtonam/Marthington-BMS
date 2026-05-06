import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "./Icon.jsx";

const navItems = [
  { label: "Dashboard", href: "/app", icon: "chart" },
  { label: "Products", href: "/app/products", icon: "boxes" },
  { label: "Services", href: "/app/services", icon: "package" },
  { label: "Sales", href: "/app/pos", icon: "cart" },
  { label: "Reports", href: "/app/reports", icon: "chart" },
  { label: "Staff", href: "/app/staff", icon: "team" },
  { label: "Billing", href: "/app/billing", icon: "wallet" },
  { label: "Settings", href: "/app/settings", icon: "settings" },
  { label: "Invoices", href: "/app/invoices", icon: "receipt" },
  { label: "Customers", href: "/app/customers", icon: "team" } // 🔥 NEW
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

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>

        {/* 🔥 BRAND */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-green-600 text-white flex items-center justify-center rounded-md font-bold text-lg">
            M
          </div>
          <div>
            <strong className="text-white">Marthington</strong>
            <span className="text-xs text-gray-400">Business OS</span>
          </div>
        </div>

        <nav className="sidebar-nav mt-6">
          {navItems.map((item) => (
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
          <button
            className="quick-create"
            type="button"
            onClick={() => navigate("/app/products")}
          >
            <Icon name="add" />
            <span>New Product</span>
          </button>

          <button
            className="quick-create bg-blue-600 text-white hover:bg-blue-700"
            type="button"
            onClick={() => navigate("/app/pos")}
          >
            <Icon name="cart" />
            <span>New Sale</span>
          </button>
        </div>
      </aside>

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

          {/* USER */}
          <div className="user-chip">
            <div>
              <strong>{user?.name}</strong>
              <span>{user?.role?.replace("_", " ")}</span>
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