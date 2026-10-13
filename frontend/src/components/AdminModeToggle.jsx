import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminModeToggle() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, stopImpersonation, ensureSuperAdminWorkspace } = useAuth();
  const [switchError, setSwitchError] = useState("");
  const [switching, setSwitching] = useState(false);

  if (user?.role !== "super_admin") return null;

  const isAdminMode = pathname.startsWith("/admin");
  const openBusinessWorkspace = async () => {
    setSwitching(true);
    setSwitchError("");
    stopImpersonation();
    try {
      await ensureSuperAdminWorkspace();
      navigate("/app");
    } catch (error) {
      setSwitchError(error.message || "Could not open your BMS workspace.");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        role="group"
        aria-label="Super admin mode"
        className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900"
      >
        <button
          type="button"
          aria-pressed={isAdminMode}
          disabled={switching}
          onClick={() => {
            stopImpersonation();
            navigate("/admin");
          }}
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
          disabled={switching}
          onClick={openBusinessWorkspace}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            !isAdminMode
              ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`}
        >
          {switching ? "Opening BMS..." : "My BMS"}
        </button>
      </div>
      {switchError && <span role="alert" className="max-w-56 text-xs text-rose-600">{switchError}</span>}
    </div>
  );
}
