import React from "react";
import { Link } from "react-router-dom";

export const isPlanAccessMessage = (message = "") =>
  /limit reached|not available on your current plan|not available on .* plan/i.test(String(message));

const PlanUpgradeNotice = ({ message = "This action is not included in your current plan.", mode = "Free mode", onDismiss }) => (
  <div role="status" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="font-semibold">{mode === "Free mode" ? "You’re using Free mode" : `${mode} access limit`}</p>
      <p className="mt-1 text-amber-900">{message} Review your plan options if you need more access.</p>
    </div>
    <div className="flex shrink-0 items-center gap-3">
      <Link to="/app/billing" className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-700">
        {mode === "Free mode" ? "View Pro options" : "Review plan options"}
      </Link>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="px-2 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          Dismiss
        </button>
      )}
    </div>
  </div>
);

export default PlanUpgradeNotice;
