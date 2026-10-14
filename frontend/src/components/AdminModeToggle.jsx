import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { linkMarketplaceAccount, saveShopSession } from "../api/shop.js";

const modeForPath = (pathname) => {
  if (pathname.startsWith("/admin")) return "Super Admin";
  if (pathname.startsWith("/partners")) return "Agents";
  if (pathname.startsWith("/shop")) return "Storefront";
  if (pathname.startsWith("/app")) return "BMS";
  return "";
};

export default function AdminModeToggle() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const {
    user,
    stopImpersonation,
    ensureSuperAdminWorkspace,
    ensureBmsWorkspace,
    activateAgentMode
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const [switching, setSwitching] = useState(false);
  const [requiresMarketplacePassword, setRequiresMarketplacePassword] = useState(false);
  const [marketplacePassword, setMarketplacePassword] = useState("");

  if (!user) return null;

  const currentMode = modeForPath(pathname);
  const switchMode = async (mode) => {
    setSwitching(true);
    setSwitchError("");
    try {
      if (mode === "Super Admin") {
        stopImpersonation();
        navigate("/admin");
      } else if (mode === "BMS") {
        if (user.role === "super_admin") {
          stopImpersonation();
          await ensureSuperAdminWorkspace();
        } else {
          await ensureBmsWorkspace();
        }
        navigate("/app");
      } else if (mode === "Agents") {
        if (!user.affiliateCode) await activateAgentMode();
        navigate("/partners/dashboard");
      } else if (mode === "Storefront") {
        const session = await linkMarketplaceAccount(
          localStorage.getItem("bms_token"),
          marketplacePassword
        );
        saveShopSession(session);
        setRequiresMarketplacePassword(false);
        setMarketplacePassword("");
        navigate("/shop");
      }
      setOpen(false);
    } catch (error) {
      if (mode === "Storefront" && error.requiresPassword) {
        setRequiresMarketplacePassword(true);
        setSwitchError("");
      } else {
        setSwitchError(error.message || `Could not open ${mode}.`);
      }
    } finally {
      setSwitching(false);
    }
  };

  const modes = [
    ...(user.role === "super_admin" ? ["Super Admin"] : []),
    "BMS",
    "Storefront",
    "Agents"
  ];

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open mode switcher"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setSwitchError("");
        }}
        className="flex h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950"
      >
        <span>Mode</span>
        <span className="max-w-24 truncate text-xs font-medium opacity-70">{currentMode}</span>
        <span aria-hidden="true" className="text-[10px]">▼</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Switch mode"
          className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Switch workspace
          </p>
          {modes.map((mode) => (
            <button
              key={mode}
              type="button"
              role="menuitem"
              disabled={switching}
              onClick={() => switchMode(mode)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800 ${
                mode === currentMode
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              <span>{mode}</span>
              {mode === currentMode && <span aria-label="Current mode">●</span>}
            </button>
          ))}
          {requiresMarketplacePassword && (
            <form
              className="mt-2 space-y-2 border-t border-slate-100 p-2 dark:border-slate-800"
              onSubmit={(event) => {
                event.preventDefault();
                switchMode("Storefront");
              }}
            >
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="marketplace-link-password">
                Confirm marketplace password
              </label>
              <input
                id="marketplace-link-password"
                type="password"
                autoComplete="current-password"
                value={marketplacePassword}
                onChange={(event) => setMarketplacePassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              <button
                type="submit"
                disabled={switching || !marketplacePassword}
                className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {switching ? "Linking..." : "Link account"}
              </button>
            </form>
          )}
          {switchError && <p role="alert" className="px-3 py-2 text-xs text-rose-600">{switchError}</p>}
        </div>
      )}
    </div>
  );
}
