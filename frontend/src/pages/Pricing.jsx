import React, { useEffect, useState } from "react";
import request from "../api/client.js";
import { formatCurrency } from "../utils/formatters.js";

const comparison = [
  ["Products", "Up to 20", "Unlimited"],
  ["People", "1 owner + 1 staff", "Unlimited staff with role-based permissions"],
  ["Branches", "Single-branch starter setup", "Full multi-branch control"],
  ["Counter sales", "Basic counter POS", "POS with split payments"],
  ["Stock", "Starter stock tracking", "Real-time stock sync across branches"],
  ["Receipts", "Manual receipt links", "Automated branded WhatsApp receipts"],
  ["Financial intelligence", "Explore the interface", "Profit reports, expenses, and budgets"],
  ["Purchasing & invoicing", "—", "Supplier purchase orders and customer invoices"],
  ["Onboarding & support", "Standard resources", "Priority onboarding and support"]
];

const faqs = [
  {
    question: "Is my business data secure?",
    answer: "Workspace access requires a user account, and staff access can be limited with role-based permissions. Use individual accounts and keep login details private."
  },
  {
    question: "How do I set up multiple branches?",
    answer: "With Pro, add your outlets to the same business workspace, assign staff, and manage branch stock and activity from one executive dashboard."
  },
  {
    question: "How does Pro renewal work?",
    answer: "Pro is billed annually. Renew through the Billing Center before your subscription expires to keep Pro features active. If a renewal payment is not reflected, contact support for help."
  }
];

const Pricing = () => {
  const hashSearch = window.location.hash.includes("?") ? window.location.hash.slice(window.location.hash.indexOf("?") + 1) : "";
  const referralCode = new URLSearchParams(window.location.search).get("ref") || new URLSearchParams(hashSearch).get("ref");
  const registerPath = referralCode ? `/#/register?ref=${encodeURIComponent(referralCode)}` : "/#/register";
  const [yearlyPrice, setYearlyPrice] = useState(150000);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const response = await request("/billing/pricing");
        const configuredPrice = response?.data?.yearly?.ngn;
        if (typeof configuredPrice === "number" && configuredPrice > 0) setYearlyPrice(configuredPrice);
      } catch (error) {
        console.warn("Failed to load billing pricing", error);
      }
    };

    loadPricing();
  }, []);

  const dailyPrice = Math.ceil(yearlyPrice / 365);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6">
          <a href="/" className="flex items-center gap-3" aria-label="Marthington home">
            <img src="/logo-icon.png" alt="" className="h-10 w-10 rounded-xl" />
            <span>
              <span className="block text-base font-bold tracking-tight">Marthington</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Business OS</span>
            </span>
          </a>
          <a href={registerPath} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800">
            Start Free
          </a>
        </div>
      </header>

      <section className="px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">Straightforward annual pricing</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">Start free. Choose Pro when you’re ready to grow.</h1>
            <p className="mt-5 text-sm leading-6 text-slate-600 sm:text-base">
              Test the essentials at no cost, then get the capacity and insight to manage your whole business with Pro.
            </p>
          </div>

          <div className="grid items-stretch gap-6 md:grid-cols-2 md:gap-8">
            <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <p className="text-sm font-bold text-slate-900">Free Mode</p>
              <p className="mt-5 text-4xl font-black tracking-tight text-slate-900">₦0</p>
              <p className="mt-1 text-sm font-medium text-slate-500">Forever · Best for testing</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">A starter sandbox to explore the interface and try your first setup.</p>
              <ul className="mt-6 flex-1 space-y-3 border-t border-slate-100 pt-6 text-sm leading-6 text-slate-600">
                {["Up to 20 products", "1 owner + 1 staff account", "Basic counter POS and manual receipt links", "Single-branch starter setup"].map((item) => (
                  <li key={item} className="flex gap-2.5"><span aria-hidden="true" className="text-slate-400">✓</span>{item}</li>
                ))}
              </ul>
              <a href={registerPath} className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                Start Free
              </a>
            </article>

            <article className="relative flex flex-col rounded-3xl border-2 border-emerald-500 bg-white p-7 shadow-[0_20px_60px_-24px_rgba(16,185,129,0.35)] sm:p-8">
              <span className="absolute -top-3.5 right-6 rounded-full bg-emerald-600 px-4 py-1.5 text-[10px] font-black tracking-[0.16em] text-white shadow-sm">MOST POPULAR · RECOMMENDED</span>
              <p className="text-sm font-bold text-slate-900">Pro Mode</p>
              <p className="mt-5 text-4xl font-black tracking-tight text-slate-900">{formatCurrency(yearlyPrice)}</p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">Per year · Built for serious business growth</p>
              <p className="mt-3 inline-flex self-start rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                {yearlyPrice <= 151475 ? "Less than ₦415/day to run your entire business" : `About ₦${dailyPrice.toLocaleString("en-NG")}/day to run your entire business`}
              </p>
              <ul className="mt-6 flex-1 space-y-3 border-t border-emerald-100 pt-6 text-sm leading-6 text-slate-700">
                {[
                  "Unlimited products and unlimited staff accounts with strict role-based permissions",
                  "Automated branded WhatsApp receipts after every sale",
                  "Full multi-branch control and real-time stock sync",
                  "Automated profit calculations, expense and budget tracking, supplier purchase orders, and customer invoicing",
                  "Priority onboarding and support"
                ].map((item) => (
                  <li key={item} className="flex gap-2.5"><span aria-hidden="true" className="text-emerald-600">✓</span>{item}</li>
                ))}
              </ul>
              <a href={registerPath} className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700">
                Start Free, Then Upgrade to Pro
              </a>
            </article>
          </div>

          <section aria-labelledby="comparison-heading" className="mt-16">
            <div className="mb-6 text-center">
              <h2 id="comparison-heading" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Compare Free and Pro</h2>
              <p className="mt-2 text-sm text-slate-500">See exactly what Pro unlocks as your business grows.</p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-5 py-4">Feature</th>
                    <th scope="col" className="px-5 py-4">Free Mode</th>
                    <th scope="col" className="px-5 py-4 text-emerald-800">Pro Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map(([feature, free, pro]) => (
                    <tr key={feature} className="border-t border-slate-100 align-top">
                      <th scope="row" className="px-5 py-4 font-semibold text-slate-800">{feature}</th>
                      <td className="px-5 py-4 leading-5 text-slate-600">{free}</td>
                      <td className="px-5 py-4 leading-5 font-medium text-slate-800">{pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="upgrade-heading" className="mt-12 rounded-3xl bg-slate-950 p-7 text-white sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">A practical return on investment</p>
            <h2 id="upgrade-heading" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Why upgrade to Pro?</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
              Pro costs {formatCurrency(yearlyPrice)} for a full year—about ₦{dailyPrice.toLocaleString("en-NG")} a day. Preventing one stock leak or capturing one unrecorded expense worth the annual fee is enough to cover that investment. Better visibility can keep paying back every day after.
            </p>
            <a href={registerPath} className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400">
              Start with Free Mode
            </a>
          </section>

          <section aria-labelledby="faq-heading" className="mx-auto mt-16 max-w-3xl">
            <h2 id="faq-heading" className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Frequently asked questions</h2>
            <div className="mt-7 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-6">
              {faqs.map(({ question, answer }) => (
                <article key={question} className="py-5">
                  <h3 className="text-sm font-bold text-slate-900">{question}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
                </article>
              ))}
            </div>
          </section>

          <p className="mt-10 text-center text-sm text-slate-500">
            <a href="/" className="font-semibold text-emerald-700 hover:text-emerald-900">← Back to Marthington Business OS</a>
          </p>
        </div>
      </section>
    </main>
  );
};

export default Pricing;
