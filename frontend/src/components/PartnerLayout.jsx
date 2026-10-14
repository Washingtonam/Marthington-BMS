import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AdminModeToggle from "./AdminModeToggle.jsx";
import { applyAccentColor, applyColorMode, defaultAccentColor, getColorMode } from "../utils/appearance.js";

const navigation = [
  { to: "/partners/dashboard", label: "Dashboard", icon: "⌂", end: true },
  { to: "/partners/conversions", label: "Live Conversions", icon: "↗" },
  { to: "/partners/withdrawals", label: "Withdrawals & Payouts", icon: "₦" },
  { to: "/partners/link-history", label: "Link History", icon: "⌁" },
  { to: "/partners/profile", label: "Profile & Settings", icon: "◎" }
];

const PartnerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(getColorMode);

  useEffect(() => {
    applyColorMode(theme);
  }, [theme]);

  useEffect(() => {
    applyAccentColor(user?.appearance?.accentColor || defaultAccentColor);
  }, [user?.appearance?.accentColor]);

  const linkClass = ({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
    isActive
      ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
      : "text-slate-300 hover:bg-white/10 hover:text-white"
  }`;

  return (
    <div data-partner-theme={theme} className={theme === "light" ? "min-h-screen bg-slate-100 text-slate-900" : "min-h-screen bg-slate-950 text-slate-100"}>
      {open && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-slate-950 p-5 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate("/partners/dashboard")} className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-300">Partner Portal</p>
            <p className="mt-2 text-xl font-semibold text-white">Marthington</p>
          </button>
          <button type="button" className="text-slate-400 lg:hidden" onClick={() => setOpen(false)} aria-label="Close sidebar">×</button>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="mt-1 truncate font-semibold text-white">{user?.name || "Partner"}</p>
          <p className="mt-1 truncate text-xs text-slate-400">{user?.email || ""}</p>
        </div>

        <nav className="mt-8 space-y-2" aria-label="Partner navigation">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={() => setOpen(false)}>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
          <button type="button" onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} className="flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-3 text-sm text-slate-300 hover:bg-white/10">
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span><span>{theme === "dark" ? "☼" : "◐"}</span>
          </button>
          <button type="button" onClick={() => { logout(); navigate("/login"); }} className="w-full rounded-xl border border-rose-400/20 px-3 py-3 text-left text-sm font-medium text-rose-300 hover:bg-rose-500/10">Log out</button>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-950/85 px-4 py-4 backdrop-blur lg:px-8">
          <button type="button" onClick={() => setOpen(true)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 lg:hidden" aria-label="Open sidebar">☰</button>
          <div className="hidden text-sm text-slate-400 lg:block">Agent operations</div>
          <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
            <span>{user?.affiliateCode || "Agent account"}</span>
            <AdminModeToggle />
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></div>
      </main>
    </div>
  );
};

export default PartnerLayout;
