import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminModeToggle() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, stopImpersonation } = useAuth();

  if (user?.role !== "super_admin" || !user?.business) return null;

  const isAdminMode = pathname.startsWith("/admin");

  return (
    <div
      role="group"
      aria-label="Super admin mode"
      className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900"
    >
      <button
        type="button"
        aria-pressed={isAdminMode}
        onClick={() => navigate("/admin")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
          isAdminMode
            ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        }`}
      >
        Super Admin
      </button>
      <button
        type="button"
        aria-pressed={!isAdminMode}
        onClick={() => {
          stopImpersonation();
          navigate("/app");
        }}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
          !isAdminMode
            ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        }`}
      >
        My BMS
      </button>
    </div>
  );
}
