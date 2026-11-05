import { useState } from "react";
import { useNavigate } from "react-router-dom";

const GUIDE_STEPS = [
  {
    title: "1. Record a sale",
    description: "Open POS and add Golden Harvest Rice to the cart.",
    problem: "The owner needs today's cash sale recorded accurately.",
    route: "/app/pos",
    action: "Open POS"
  },
  {
    title: "2. Generate a receipt",
    description: "Choose Confirm & Print. Marthington opens the receipt automatically.",
    problem: "The customer leaves with proof of payment.",
    route: "/app/sales",
    action: "View receipts"
  },
  {
    title: "3. Track inventory",
    description: "Check the updated Rice stock under Inventory or Products.",
    problem: "Selling stock must update the quantity on hand immediately.",
    route: "/app/inventory",
    action: "Check inventory"
  },
  {
    title: "4. Review sales reports",
    description: "Open Reports and compare today's revenue, sales, and stock movement.",
    problem: "The owner can decide whether to reorder before the item sells out.",
    route: "/app/reports",
    action: "Review reports"
  }
];

const DemoGuideBadge = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  if (import.meta.env.VITE_AFFILIATE_DEMO_MODE !== "true") return null;

  const current = GUIDE_STEPS[step];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-50 rounded-full border border-amber-300/40 bg-amber-950/95 px-4 py-2 text-xs font-bold tracking-wide text-amber-200 shadow-xl"
        aria-haspopup="dialog"
      >
        VIDEO GUIDE
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/35 p-3 sm:items-center" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-guide-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Business problem demo</p>
                <h2 id="demo-guide-title" className="mt-1 text-lg font-black text-slate-900">{current.title}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-lg text-slate-500 hover:bg-slate-100" aria-label="Close demo guide">x</button>
            </div>

            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{current.problem}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{current.description}</p>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex gap-1" aria-label={`Step ${step + 1} of ${GUIDE_STEPS.length}`}>
                {GUIDE_STEPS.map((item, index) => (
                  <span key={item.title} className={`h-1.5 w-6 rounded-full ${index === step ? "bg-emerald-600" : "bg-slate-200"}`} />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={step === 0}
                  onClick={() => setStep((value) => value - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
                >
                  Back
                </button>
                {step < GUIDE_STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((value) => value + 1)}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setOpen(false); navigate(current.route); }}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
                  >
                    {current.action}
                  </button>
                )}
              </div>
            </div>

            {step < GUIDE_STEPS.length - 1 && (
              <button
                type="button"
                onClick={() => { setOpen(false); navigate(current.route); }}
                className="mt-3 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800"
              >
                {current.action}
              </button>
            )}
          </section>
        </div>
      )}
    </>
  );
};

export default DemoGuideBadge;
