import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  FiActivity,
  FiBookOpen,
  FiClipboard,
  FiDollarSign,
  FiHome,
  FiSettings,
  FiTrendingUp
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";
import AdminModeToggle from "./AdminModeToggle.jsx";
import Sidebar from "./layout/Sidebar.jsx";
import DemoGuideBadge from "./DemoGuideBadge.jsx";
import { applyAccentColor, applyColorMode, defaultAccentColor, getColorMode } from "../utils/appearance.js";

const navigationGroups = [
  {
    label: "Main",
    items: [{ to: "/partners/dashboard", label: "Dashboard", icon: <FiHome /> }]
  },
  {
    label: "Agent activity",
    items: [
      { to: "/partners/conversions", label: "Live Conversions", icon: <FiTrendingUp /> },
      { to: "/partners/withdrawals", label: "Withdrawals & Payouts", icon: <FiDollarSign /> },
      { to: "/partners/link-history", label: "Link History", icon: <FiActivity /> }
    ]
  },
  {
    label: "Resources",
    items: [
      { to: "/partners/guides", label: "Guides & Tutorials", icon: <FiBookOpen /> },
      { to: "/partners/commission", label: "Commission Tiers & Structure", icon: <FiClipboard /> }
    ]
  },
  {
    label: "Account",
    items: [{ to: "/partners/profile", label: "Profile & Settings", icon: <FiSettings /> }]
  }
];

const PartnerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState(getColorMode);

  useEffect(() => {
    applyColorMode(theme);
  }, [theme]);

  useEffect(() => {
    applyAccentColor(user?.appearance?.accentColor || defaultAccentColor);
  }, [user?.appearance?.accentColor]);

  return (
    <div data-partner-theme={theme} className="min-h-screen bg-slate-50/90 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        navigationGroups={navigationGroups}
        brandTitle="Agent Portal"
        mobileOpen={open}
        setMobileOpen={setOpen}
        theme={theme}
        toggleTheme={() => setTheme((value) => value === "dark" ? "light" : "dark")}
        onCollapseChange={setCollapsed}
      />

      <main className={collapsed ? "lg:pl-20" : "lg:pl-72"}>
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 py-4 backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/85 lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200 lg:hidden"
            aria-label="Open sidebar"
          >
            ☰
          </button>
          <div className="hidden text-sm font-medium text-slate-500 dark:text-slate-400 lg:block">Agent operations</div>
          <div className="ml-auto flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline">{user?.affiliateCode || "Agent account"}</span>
            <AdminModeToggle />
            <button
              type="button"
              onClick={() => { logout(); navigate("/login"); }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></div>
        <DemoGuideBadge />
      </main>
    </div>
  );
};

export default PartnerLayout;
