import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import {
  FiActivity,
  FiArchive,
  FiArrowUpRight,
  FiBarChart2,
  FiBookOpen,
  FiClipboard,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiMapPin,
  FiPackage,
  FiPieChart,
  FiSettings,
  FiShield,
  FiShoppingBag,
  FiTool,
  FiTrendingUp,
  FiTruck,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

const defaultNavGroups = [
  {
    label: "Main",
    items: [{ to: "/app", label: "Dashboard", icon: <FiHome />, permission: "canViewDashboard" }],
  },
  {
    label: "Sales & Operations",
    items: [
      { to: "/app/pos", label: "POS", icon: <FiShoppingBag />, permission: "canAccessPOS" },
      { to: "/app/sales", label: "Sales", icon: <FiTrendingUp />, permission: "canViewSales" },
      { to: "/app/invoices", label: "Invoices", icon: <FiFileText />, permission: "canViewInvoices" },
      { to: "/app/payments", label: "Payments", icon: <FiDollarSign />, permission: "canViewPayments" },
      { to: "/app/customers", label: "Customers / CRM", icon: <FiUsers />, permission: "canViewCustomers" },
    ],
  },
  {
    label: "Catalog & Inventory",
    items: [
      { to: "/app/products", label: "Products", icon: <FiPackage />, permission: "canViewProducts" },
      { to: "/app/services", label: "Services", icon: <FiTool />, permission: "canViewProducts" },
      { to: "/app/inventory", label: "Inventory", icon: <FiArchive />, permission: "canViewBranchInventory" },
      { to: "/app/suppliers", label: "Suppliers", icon: <FiTruck />, permission: "canViewPurchaseOrders" },
      { to: "/app/purchase-orders", label: "Purchase Orders", icon: <FiClipboard />, permission: "canViewPurchaseOrders" },
    ],
  },
  {
    label: "Finance & Control",
    items: [
      { to: "/app/expenses", label: "Expenses", icon: <FiArrowUpRight />, permission: "canViewExpenses" },
      { to: "/app/billing", label: "Billing", icon: <FiCreditCard />, permission: "canManageBilling" },
      { to: "/app/reports", label: "Reports", icon: <FiBarChart2 />, permission: "canViewReports" },
      { to: "/app/analytics", label: "Analytics", icon: <FiPieChart />, permission: "canViewReports" },
    ],
  },
  {
    label: "Team & Access",
    items: [
      { to: "/app/staff", label: "Staff", icon: <FiUserCheck />, permission: "canManageStaff" },
      { to: "/app/settings?tab=access", label: "Roles & Permissions", icon: <FiShield />, permission: "canManageSettings" },
    ],
  },
  {
    label: "People & Locations",
    items: [
      { to: "/app/branches", label: "Branches", icon: <FiMapPin />, permission: "canViewBranches" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/app/settings", label: "Settings", icon: <FiSettings />, permission: "canManageSettings" },
      { to: "/app/user-guide", label: "User Guide", icon: <FiBookOpen /> },
    ],
  },
];

export default function AppShell({ children, navigationGroups = defaultNavGroups }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem("theme") || "light";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.classList.toggle("light", theme === "light");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="min-h-screen bg-slate-50/90 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        navigationGroups={navigationGroups}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        theme={theme}
        toggleTheme={toggleTheme}
        onCollapseChange={setSidebarCollapsed}
      />

      <div className={mobileOpen ? "" : sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}>
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
