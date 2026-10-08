import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const getPageTitle = (pathname) => {
  if (pathname.startsWith("/app/analytics")) return "Analytics";
  if (pathname.startsWith("/app/customers")) return "Customers / CRM";
  if (pathname.startsWith("/app/sales")) return "Sales & POS";
  if (pathname.startsWith("/app/invoices")) return "Invoices";
  if (pathname.startsWith("/app/inventory")) return "Inventory";
  if (pathname.startsWith("/app/staff")) return "Staff";
  if (pathname.startsWith("/app/billing")) return "Billing";
  if (pathname.startsWith("/app/settings")) return "Settings";
  if (pathname.startsWith("/app/user-guide")) return "User Guide";
  return "Dashboard";
};

export default function Topbar({ businessName: businessNameProp, onMenuClick, theme, toggleTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, business, logout } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const businessName = businessNameProp || business?.name || user?.businessName || "Marthington";
  const userName = user?.name || user?.email || "User";
  const roleLabel = (user?.role || "owner").replace(/_/g, " ");
  const roleBadge = roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-all duration-150 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            onClick={onMenuClick}
            type="button"
          >
            ☰
          </button>

          <button
            type="button"
            className="text-left"
            onClick={() => navigate("/app")}
            aria-label="Go to dashboard"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              {businessName}
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{pageTitle}</p>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-150 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:inline-flex"
            type="button"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>

          <div className="relative">
            <button
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all duration-150 hover:bg-slate-50 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              type="button"
              aria-label="Open account menu"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{userName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{roleBadge}</p>
              </div>
            </button>
            {accountMenuOpen && (
              <div
                role="menu"
                aria-label="Account options"
                className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{userName}</p>
                  <p className="truncate text-xs capitalize text-slate-500 dark:text-slate-400">{roleBadge}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    navigate("/app/settings?tab=profile");
                  }}
                  className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    navigate("/app/settings");
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
