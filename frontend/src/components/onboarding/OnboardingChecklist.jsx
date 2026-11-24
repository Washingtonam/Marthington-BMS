import React from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiChevronRight, FiX } from "react-icons/fi";
import { useOnboarding } from "../../context/OnboardingContext.jsx";

const checklistItems = [
  { id: "dashboard", label: "Explore Dashboard", path: "/app" },
  { id: "product-created", label: "Add a Product", path: "/app/products" },
  { id: "pos-sale", label: "Complete a POS Sale", path: "/app/pos" },
  { id: "sales", label: "Review Sales History", path: "/app/sales" }
];

export default function OnboardingChecklist() {
  const navigate = useNavigate();
  const { progress, dismissChecklist, startFullOnboarding } = useOnboarding();
  const isComplete = checklistItems.every((item) => progress.completedTours.includes(item.id));
  if (progress.checklistDismissed || isComplete) return null;

  const completed = checklistItems.filter((item) => progress.completedTours.includes(item.id)).length;

  return (
    <section
      data-tour="dashboard-checklist"
      className="rounded-[24px] border border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-5 shadow-sm dark:border-emerald-900/60 dark:from-slate-900 dark:to-emerald-950/30"
      aria-label="Onboarding checklist"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">Getting started</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Your setup checklist</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{completed} of {checklistItems.length} steps explored</p>
        </div>
        <button type="button" onClick={dismissChecklist} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Dismiss onboarding checklist">
          <FiX aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(completed / checklistItems.length) * 100}%` }} />
      </div>
      <ol className="mt-3 divide-y divide-emerald-100 dark:divide-slate-800">
        {checklistItems.map((item, index) => {
          const done = progress.completedTours.includes(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  if (item.id === "dashboard" && progress.flowStatus === "not_started") {
                    startFullOnboarding();
                    return;
                  }
                  navigate(item.path);
                }}
                className="flex w-full items-center gap-3 py-2.5 text-left"
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-500 text-white" : "border border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400"}`}>
                  {done ? <FiCheck aria-hidden="true" /> : index + 1}
                </span>
                <span className={`flex-1 text-sm font-medium ${done ? "text-slate-500 line-through dark:text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>{item.label}</span>
                {!done && <FiChevronRight className="text-slate-400" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
