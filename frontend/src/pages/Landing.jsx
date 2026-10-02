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

const categoryTabs = [
  { value: "retail", label: "Retail" },
  { value: "school", label: "Schools" },
  { value: "hospital", label: "Hospitals" }
];

const Landing = () => {
  const [pricing, setPricing] = useState({ monthly: 15000, yearly: 150000 });
  const [selectedTab, setSelectedTab] = useState("retail");

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
      <section className="relative overflow-hidden px-6 py-24 sm:py-32">
        <div className="absolute left-1/4 top-0 -z-10 h-96 w-96 rounded-full bg-blue-50/70 blur-3xl" />
        <div className="absolute right-1/4 top-10 -z-10 h-72 w-72 rounded-full bg-indigo-50/50 blur-3xl" />
        <div className="absolute inset-x-0 top-1/3 -z-10 h-64 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.9),transparent_70%)]" />

        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-12">
          <div className="flex flex-col items-start lg:col-span-7">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600 shadow-sm backdrop-blur">
              <span>⚡ Consolidated Multi-Sector Suite</span>
            </div>

            <h1 className="mb-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 md:text-6xl">
              The premium enterprise operating system for
              <span className="mt-1 block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                African Business Hubs.
              </span>
            </h1>

            <p className="mb-10 max-w-xl text-base leading-relaxed text-slate-500 md:text-lg">
              One unified workspace engineered for cross-channel sales management, continuous inventory controls, automated analytics, and absolute administrative security.
            </p>

            <div className="mb-10 flex max-w-md rounded-full border border-slate-200/70 bg-slate-100/80 p-1 shadow-inner">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setSelectedTab(tab.value)}
                  className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    selectedTab === tab.value
                      ? "border border-slate-200/40 bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex w-full flex-wrap items-center gap-4">
              <Link to="/register" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-7 py-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800">
                Deploy Workspace
              </Link>
              <Link to="/affiliate-register" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-7 py-4 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50">
                Become a Partner
              </Link>
            </div>

            <div className="mt-14 grid w-full grid-cols-3 gap-8 border-t border-slate-200/60 pt-8">
              <div>
                <span className="block text-2xl font-bold tracking-tight text-slate-900">99.9%</span>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1 block">Uptime SLA</span>
              </div>
              <div>
                <span className="block text-2xl font-bold tracking-tight text-slate-900">Instant</span>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1 block">Receipt Stream</span>
              </div>
              <div>
                <span className="block text-2xl font-bold tracking-tight text-slate-900">Multi-Tenancy</span>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1 block">Data Isolation</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative w-full">
            <div className="absolute -top-3 -right-3 bg-slate-900 text-white text-[10px] uppercase font-bold tracking-widest px-3.5 py-1.5 rounded-full shadow-lg z-10 border border-slate-800">
              Live Preview
            </div>

            <div className="bg-white border border-slate-200 shadow-xl rounded-[32px] p-8 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    {selectedTab === "retail" && "Point of Sale Terminal"}
                    {selectedTab === "school" && "Academic Overview"}
                    {selectedTab === "hospital" && "Clinical Hub Terminal"}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {selectedTab === "retail" && "Seamless physical transactional manager"}
                    {selectedTab === "school" && "Central core metrics engine"}
                    {selectedTab === "hospital" && "Patient diagnostic registry portal"}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shadow-inner">
                  M
                </div>
              </div>

              {selectedTab === "retail" && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div>
                      <p className="font-semibold text-sm text-slate-800">LaserJet Pro MFP476</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">SKU-1780656</p>
                    </div>
                    <span className="font-bold text-sm text-slate-900">₦350,000</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div>
                      <p className="font-semibold text-sm text-slate-800">Hardware Component Batch</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Qty: 2 units</p>
                    </div>
                    <span className="font-bold text-sm text-slate-900">₦24,000</span>
                  </div>
                  <div className="pt-6 mt-6 border-t border-slate-100">
                    <div className="flex justify-between items-center text-slate-900">
                      <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Balance</span>
                      <span className="text-xl font-bold text-slate-900">₦374,000</span>
                    </div>
                    <div className="mt-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl p-3 text-xs font-semibold text-center shadow-inner">
                      ✅ Digital confirmation ledger processed successfully
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === "school" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Enrolled</span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">1,248</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tuition Ledger</span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">₦1.5M</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                    <div className="flex justify-between text-xs font-semibold border-b border-slate-200/60 pb-2 mb-2">
                      <span className="text-slate-400">Class</span>
                      <span className="text-slate-400">Instructor</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-700 font-medium">
                      <span>Advanced Mathematics</span>
                      <span className="text-slate-500">Mrs. Adisa</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === "hospital" && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Patient Registry Sync</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">Bed Count & Wards</p>
                    </div>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Outpatients</span>
                      <span className="text-xl font-bold text-slate-800 mt-0.5 block">142</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Pharmacy SKU</span>
                      <span className="text-xl font-bold text-slate-800 mt-0.5 block">1,850</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
            <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed">
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
            <p className="text-slate-400 text-sm font-medium mt-3 leading-relaxed">
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
