import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import request from "../api/client.js";
import { formatCurrency } from "../utils/formatters.js";

const features = [
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: "Smart POS Engine",
    desc: "Execute high-volume retail transactions flawlessly with zero checkout friction."
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: "Instant Digital Receipts",
    desc: "Automate continuous post-sale customer engagement directly through WhatsApp streams."
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: "Precision Inventory Analytics",
    desc: "Monitor raw material metrics, automated stock velocities, and low-inventory triggers."
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: "Granular Team Access Control",
    desc: "Delegate staff permissions safely with institutional role-based authorization parameters."
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Executive Intelligence Suite",
    desc: "Compile centralized balance data, sales turnover curves, and cross-channel reports."
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5 5 0 00-4.591-2.941A1.391 1.391 0 0011 5.516 4 4 0 003 11v3z" />
      </svg>
    ),
    title: "Unified Cloud Infrastructure",
    desc: "Maintain absolute operating continuity across hardware arrays and mobile channels globally."
  }
];

const Landing = () => {
  const [pricing, setPricing] = useState({ monthly: 15000, yearly: 150000 });

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const data = await request("/billing/pricing");
        const pricingData = data?.data;

        if (pricingData?.monthly?.ngn && pricingData?.yearly?.ngn) {
          setPricing({ monthly: pricingData.monthly.ngn, yearly: pricingData.yearly.ngn });
        }
      } catch (err) {
        console.warn("Failed to load billing pricing", err);
      }
    };

    loadPricing();
  }, []);

  const yearlySavings = Math.max(0, pricing.monthly * 12 - pricing.yearly);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f8fbff_45%,#ffffff_100%)] text-slate-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-100/80 bg-white/70 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img src="/logo-icon.png" alt="Marthington" className="w-10 h-10 rounded-xl shadow-sm" />
            <div>
              <h2 className="font-bold text-lg tracking-tight text-slate-900">Marthington</h2>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Business OS</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Login
            </Link>
            <Link to="/register" className="inline-flex items-center justify-center px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-200">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden px-6 py-24 text-center sm:py-32">
        <div className="absolute left-1/4 top-0 -z-10 h-96 w-96 rounded-full bg-blue-50/70 blur-3xl" />
        <div className="absolute right-1/4 top-10 -z-10 h-72 w-72 rounded-full bg-indigo-50/50 blur-3xl" />
        <div className="absolute inset-x-0 top-1/3 -z-10 h-64 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.9),transparent_70%)]" />

        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <span className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600 shadow-sm backdrop-blur">
            ⚡ Identity Infrastructure 2026
          </span>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Verification, <span className="block text-emerald-600 sm:inline">Made Effortless.</span>
          </h1>

          <p className="mb-10 max-w-2xl text-lg font-medium leading-relaxed text-slate-500">
            Marthington helps agents and businesses verify identities, process modifications, and manage operations with a polished, professional workflow.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800">
              Get Started Free <span aria-hidden="true">→</span>
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-transparent px-6 py-3.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50">
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* THREE CARDS OF TRUST */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300">
            <h3 className="font-bold text-xl text-slate-900 tracking-tight">Rapid Processing</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Compile customer transactions, parse credit balance states, and deploy operational workflows within seconds.
            </p>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300">
            <h3 className="font-bold text-xl text-slate-900 tracking-tight">Isolated Tenancy</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Your organizational databases are cryptographically and logic-isolated for absolute multi-tenant platform integrity.
            </p>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300">
            <h3 className="font-bold text-xl text-slate-900 tracking-tight">Scalable Monetization</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              A comprehensive architecture built to evolve with commercial retail shops, corporate schools, and specialized medical clinics.
            </p>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES GRID */}
      <section className="border-y border-slate-150 bg-white/80 py-28 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Enterprise management architecture.</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
              One meticulously designed environment to govern accounts receivable, verify personnel pipelines, track inventory batches, and download structural analytics.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="group p-8 bg-[#fafbfc] border border-slate-200/70 rounded-3xl hover:bg-white hover:shadow-xl hover:border-transparent transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform duration-200">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-lg text-slate-900 tracking-tight">{feature.title}</h3>
                <p className="text-slate-500 text-sm mt-3 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVENUE SHARING PARTNERSHIP ECOSYSTEM */}
      <section className="border-b border-slate-150 bg-slate-50/70 py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">The Referral Partnership Program</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
              Earn generous, continuous revenue streams while deploying enterprise platform logic to thousands of expanding retail businesses.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm text-center">
              <h3 className="font-bold text-lg text-slate-900 tracking-tight">20% Recurring Share</h3>
              <p className="mt-3 text-sm text-slate-500 font-medium leading-relaxed">
                Receive predictable commissions for every corporate entity or commercial workspace using your code reference.
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm text-center">
              <h3 className="font-bold text-lg text-slate-900 tracking-tight">Granular Wallet Monitoring</h3>
              <p className="mt-3 text-sm text-slate-500 font-medium leading-relaxed">
                Inspect conversion logs, clear payouts, and track dynamic processing parameters from your dedicated partner screen.
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm text-center">
              <h3 className="font-bold text-lg text-slate-900 tracking-tight">Instant Bank Payouts</h3>
              <p className="mt-3 text-sm text-slate-500 font-medium leading-relaxed">
                Trigger withdrawals directly into your active corporate bank account with absolute transparency and receipt access.
              </p>
            </div>
          </div>

          <div className="max-w-3xl mx-auto bg-white border border-slate-200/80 rounded-[32px] p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-5">Partner Onboarding Workflow</h3>
            <ol className="space-y-3.5 text-sm text-slate-600 font-medium">
              <li className="flex items-start gap-3"><span className="flex h-5 w-5 rounded-full bg-slate-900 text-white font-bold items-center justify-center text-[10px] shrink-0 mt-0.5">1</span> <span>Initialize your verified partner profile via the application link.</span></li>
              <li className="flex items-start gap-3"><span className="flex h-5 w-5 rounded-full bg-slate-900 text-white font-bold items-center justify-center text-[10px] shrink-0 mt-0.5">2</span> <span>Extract your cryptographic reference code directly from the standalone dashboard.</span></li>
              <li className="flex items-start gap-3"><span className="flex h-5 w-5 rounded-full bg-slate-900 text-white font-bold items-center justify-center text-[10px] shrink-0 mt-0.5">3</span> <span>Deploy promotional pipelines to active retail heads, institutional schools, and clinics.</span></li>
              <li className="flex items-start gap-3"><span className="flex h-5 w-5 rounded-full bg-slate-900 text-white font-bold items-center justify-center text-[10px] shrink-0 mt-0.5">4</span> <span>Track workspace conversions, processing payouts, and account state histories.</span></li>
            </ol>
          </div>
        </div>
      </section>

      {/* SUBSCRIPTION CENTER (SOURCE OF TRUTH LINKED) */}
      <section className="bg-white py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Transparent subscription plans.</h2>
            <p className="text-slate-400 text-sm font-medium mt-2">
              Deploy your workspace completely free. Unlock infinite parameters as your organization scales.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <h3 className="font-bold text-lg text-slate-900">Starter Core</h3>
              <p className="text-4xl font-bold text-slate-900 tracking-tight mt-5">₦0</p>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mt-1">Free Tier Base</span>
              <ul className="space-y-3.5 mt-8 text-xs font-medium text-slate-500 border-t border-slate-100 pt-6">
                <li className="flex items-center gap-2">✔ 20 Product Entries</li>
                <li className="flex items-center gap-2">✔ Standard POS Module</li>
                <li className="flex items-center gap-2">✔ Digital Receipt Sharing</li>
              </ul>
              <Link to="/register" className="inline-flex items-center justify-center w-full px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl mt-8 transition-colors">
                Deploy Free Hub
              </Link>
            </div>

            <div className="bg-white border-2 border-emerald-600 rounded-[32px] p-8 shadow-xl relative">
              <div className="absolute -top-3.5 right-6 bg-emerald-600 text-white px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase">
                Enterprise Core
              </div>
              <h3 className="font-bold text-lg text-slate-900">Premium Pro</h3>
              <div className="mt-5">
                <p className="text-4xl font-bold text-slate-900 tracking-tight">{formatCurrency(pricing.monthly)}</p>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mt-1">Per Workspace / Month</span>
              </div>
              <div className="mt-4 bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                <p className="text-[11px] text-emerald-700 font-bold">
                  Save {yearlySavings > 0 ? formatCurrency(yearlySavings) : "more"} with upfront billing:
                </p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {formatCurrency(pricing.yearly)} <span className="text-xs font-medium text-slate-400">/ year</span>
                </p>
              </div>
              <ul className="space-y-3.5 mt-6 text-xs font-medium text-slate-500 border-t border-slate-100 pt-5">
                <li className="flex items-center gap-2">✔ Infinite Document SKUs</li>
                <li className="flex items-center gap-2">✔ Automated WhatsApp Streams</li>
                <li className="flex items-center gap-2">✔ Accounts Receivable Tracking</li>
                <li className="flex items-center gap-2">✔ Granular Personnel Control</li>
                <li className="flex items-center gap-2">✔ Dynamic Multi-Sector UI</li>
              </ul>
              <Link to="/register" className="inline-flex items-center justify-center w-full px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl mt-8 shadow-sm transition-all">
                Upgrade Workspace
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <h3 className="font-bold text-lg text-slate-900">Custom Business</h3>
              <p className="text-4xl font-bold text-slate-900 tracking-tight mt-5">Custom</p>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mt-1">Tailored Deployments</span>
              <ul className="space-y-3.5 mt-8 text-xs font-medium text-slate-500 border-t border-slate-100 pt-6">
                <li className="flex items-center gap-2">✔ Multi-Instance Clustering</li>
                <li className="flex items-center gap-2">✔ Bespoke School Portal</li>
                <li className="flex items-center gap-2">✔ Dedicated Database Backing</li>
                <li className="flex items-center gap-2">✔ 24/7 Priority SLA Routing</li>
              </ul>
              <Link to="/register" className="inline-flex items-center justify-center w-full px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl mt-8 transition-colors">
                Contact Strategy Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION BOTTOM */}
      <section className="relative overflow-hidden bg-[#090d16] px-6 py-24 text-center text-white">
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-6">
            Terminate manual data bookkeeping errors.
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent block mt-1">
              Accelerate your operational intelligence.
            </span>
          </h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-10">
            Provision your dynamic business, school, or hospital ecosystem parameters in minutes. Join a high-velocity network today.
          </p>
          <Link to="/register" className="inline-flex items-center justify-center px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg transition-all duration-200">
            Initialize Free Hub
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <img src="/logo-icon.png" alt="Marthington" className="w-8 h-8" />
            <div>
              <strong className="text-sm font-bold text-slate-900 block tracking-tight">Marthington</strong>
              <p className="text-xs text-slate-400 font-medium">Next-generation institutional software automation.</p>
            </div>
          </div>
          <p className="text-slate-400 text-xs font-medium">
            © {new Date().getFullYear()} Marthington Systems Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
