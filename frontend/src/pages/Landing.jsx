import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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

const useRegistrationPath = () => {
  const { search } = useLocation();
  const referralCode = new URLSearchParams(search).get("ref") || new URLSearchParams(window.location.search).get("ref");
  return referralCode ? `/register?ref=${encodeURIComponent(referralCode)}` : "/register";
};

const PreviewCard = ({ eyebrow, title, description, children, className = "" }) => (
  <article className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm ${className}`}>
    <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">{eyebrow}</p>
      <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </article>
);

const ProductPreviews = () => (
  <section id="platform" className="scroll-mt-24 border-y border-slate-200 bg-slate-50/80 py-20 sm:py-24">
    <div className="mx-auto max-w-7xl px-5 sm:px-6">
      <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-14">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">One connected workspace</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          See your business clearly, wherever you are.
        </h2>
        <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">
          A closer look at checkout, cross-sector operations and partner performance. These illustrative previews adapt to desktop and phone screens.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <PreviewCard
          eyebrow="Sales · Checkout"
          title="Smart POS & digital receipts"
          description="Move from basket to a shareable receipt with a clear, reliable checkout flow."
        >
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">New sale</p>
                <p className="mt-1 text-[10px] text-slate-400">Counter 01 · Today, 10:42</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Ready</span>
            </div>
            <div className="mt-4 space-y-2">
              {[["Everyday backpack", "1 × ₦18,500"], ["A5 exercise book", "3 × ₦1,200"]].map(([item, price]) => (
                <div key={item} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5">
                  <span className="text-xs font-semibold text-slate-700">{item}</span>
                  <span className="shrink-0 text-[10px] font-medium text-slate-500">{price}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-xs font-semibold text-slate-500">Total</span>
              <span className="text-base font-extrabold text-slate-900">₦22,100</span>
            </div>
            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Digital receipt</p>
                  <p className="mt-1 text-[10px] text-emerald-700">Sale recorded · Customer copy ready</p>
                </div>
                <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">✓</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] font-medium text-slate-400">Illustrative workspace preview</p>
        </PreviewCard>

        <PreviewCard
          eyebrow="Management · Reporting"
          title="Executive, multi-sector view"
          description="Switch between retail, school and hospital workflows with relevant operational signals."
        >
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="flex flex-wrap gap-1.5">
              {["Retail", "Schools", "Hospitals"].map((sector, index) => (
                <span key={sector} className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold ${index === 0 ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500"}`}>
                  {sector}
                </span>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[["Sales today", "₦482k", "↑ 12%"], ["Stock alerts", "08", "2 urgent"]].map(([label, value, note]) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-white p-3">
                  <p className="text-[10px] font-medium text-slate-400">{label}</p>
                  <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-1">
                    <span className="text-lg font-extrabold text-slate-900">{value}</span>
                    <span className="text-[9px] font-bold text-emerald-600">{note}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-700">Operations overview</p>
                <p className="text-[9px] text-slate-400">This week</p>
              </div>
              <div className="mt-3 flex h-14 items-end gap-1.5" aria-label="Illustrative weekly activity chart">
                {[38, 58, 45, 76, 54, 88, 68, 100, 73, 84, 60, 92].map((height, index) => (
                  <span key={index} className={`flex-1 rounded-t-sm ${index === 7 ? "bg-emerald-600" : "bg-emerald-200"}`} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-100 pt-3 text-center">
                {[["RETAIL", "Stock & sales"], ["SCHOOLS", "Fees & classes"], ["HOSPITALS", "Care & supplies"]].map(([sector, detail]) => (
                  <div key={sector}>
                    <p className="text-[8px] font-bold tracking-wide text-slate-500">{sector}</p>
                    <p className="mt-1 text-[8px] leading-tight text-slate-400">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] font-medium text-slate-400">Illustrative workspace preview</p>
        </PreviewCard>

        <PreviewCard
          eyebrow="Partnerships · Performance"
          title="Partner wallet & conversions"
          description="Follow referral activity, qualifying commissions and payout progress in one place."
        >
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold text-slate-400">Available balance</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight">₦184,500</p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold text-emerald-300">Wallet</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[9px] text-slate-400">Conversions</p>
                <p className="mt-1 text-lg font-bold">24</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[9px] text-slate-400">Pending payout</p>
                <p className="mt-1 text-lg font-bold">₦32,000</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <p className="text-[10px] font-bold text-slate-200">Recent activity</p>
                <p className="text-[9px] text-slate-400">Status</p>
              </div>
              {[["Northstar Stores", "Confirmed"], ["Bright Future School", "Processing"], ["Greenview Clinic", "Confirmed"]].map(([name, status]) => (
                <div key={name} className="flex items-center justify-between gap-2 border-b border-white/5 py-2 last:border-0 last:pb-0">
                  <span className="truncate text-[9px] text-slate-300">{name}</span>
                  <span className={`shrink-0 text-[9px] font-semibold ${status === "Confirmed" ? "text-emerald-300" : "text-amber-300"}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] font-medium text-slate-400">Illustrative partner preview</p>
        </PreviewCard>
      </div>
    </div>
  </section>
);

const TeamManagement = () => {
  const registerPath = useRegistrationPath();

  return <section id="team" className="scroll-mt-24 bg-white py-20 sm:py-24">
    <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-2 lg:gap-16">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">People · Permissions · Oversight</p>
        <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Delegate the work. Keep control.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
          Bring assistants into your workspace, give each person access that matches their role, and keep an eye on day-to-day activity without being at the counter.
        </p>
        <ul className="mt-7 space-y-4">
          {[
            ["Invite assistants", "Add team members to the business workspace you manage."],
            ["Choose permissions", "Allow the tasks they need—such as checkout or inventory—without handing over owner-level settings."],
            ["Stay in the loop", "Review sales and operating activity remotely from your phone or desktop."]
          ].map(([title, description]) => (
            <li key={title} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">✓</span>
              <div>
                <p className="text-sm font-bold text-slate-800">{title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link to={registerPath} className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
          Set up your workspace
        </Link>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Team access</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Assistant permissions</h3>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-bold text-emerald-700">Owner managed</span>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            <span>Team member</span><span>Checkout</span><span>Inventory</span>
          </div>
          {[
            ["AO", "Amara Okafor", "Store assistant", true, true],
            ["TO", "Tunde Ojo", "Sales assistant", true, false],
            ["NK", "Ngozi Kalu", "Stock manager", false, true]
          ].map(([initials, name, role, checkout, inventory]) => (
            <div key={name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-slate-100 px-4 py-3.5 last:border-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700">{initials}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800">{name}</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-400">{role}</p>
                </div>
              </div>
              {[checkout, inventory].map((allowed, index) => (
                <span key={index} className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${allowed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`} aria-label={allowed ? "Permission granted" : "Permission not granted"}>
                  {allowed ? "✓" : "—"}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div>
            <p className="text-xs font-bold text-emerald-900">Workspace activity</p>
            <p className="mt-1 text-[10px] text-emerald-700">Sales and operations at a glance</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
            Remote view
          </span>
        </div>
        <p className="mt-3 text-center text-[10px] font-medium text-slate-400">Illustrative team access preview</p>
      </div>
    </div>
  </section>;
};

const Landing = () => {
  const [pricing, setPricing] = useState({ monthly: 15000, yearly: 150000 });
  const [selectedTab, setSelectedTab] = useState("retail");
  const registerPath = useRegistrationPath();

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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3.5">
            <img src="/logo-icon.png" alt="Marthington" className="h-9 w-9 rounded-xl shadow-sm sm:h-10 sm:w-10" />
            <div>
              <h2 className="font-bold text-lg tracking-tight text-slate-900">Marthington</h2>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Business OS</p>
            </div>
          </div>

          <nav aria-label="Main navigation" className="flex items-center gap-0 sm:gap-5">
            <a href="#platform" className="hidden text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 md:inline">
              Platform
            </a>
            <a href="#team" className="hidden text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 lg:inline">
              Team
            </a>
            <Link to="/login?next=%2Fpartners%2Fdashboard" className="inline px-1 text-[10px] font-semibold text-slate-600 transition-colors hover:text-slate-900 sm:px-0 sm:text-sm">
              Partners
            </Link>
            <Link to="/shop" className="px-1 text-[10px] font-semibold text-emerald-700 transition-colors hover:text-emerald-900 sm:px-0 sm:text-sm">
              Storefronts
            </Link>
            <Link to="/login" className="px-1 text-[10px] font-semibold text-slate-600 transition-colors hover:text-slate-900 sm:px-0 sm:text-sm">
              Login
            </Link>
            <Link to={registerPath} className="inline-flex min-h-9 items-center justify-center rounded-xl bg-slate-900 px-2 py-2 text-[10px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 sm:min-h-10 sm:px-4 sm:text-sm">
              Deploy
            </Link>
          </nav>
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

            <div role="tablist" aria-label="Business sectors" className="mb-10 flex w-full max-w-md rounded-full border border-slate-200/70 bg-slate-100/80 p-1 shadow-inner">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={selectedTab === tab.value}
                  onClick={() => setSelectedTab(tab.value)}
                  className={`flex-1 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 sm:px-5 sm:text-xs ${
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
              <Link to={registerPath} className="inline-flex items-center justify-center rounded-full bg-slate-900 px-7 py-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800">
                Deploy Workspace
              </Link>
              <Link to="/affiliate-register" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-7 py-4 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50">
                Become a Partner
              </Link>
            </div>

            <div className="mt-14 grid w-full grid-cols-3 gap-3 border-t border-slate-200/60 pt-8 sm:gap-8">
              <div>
                <span className="block text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">One</span>
                <span className="mt-1 block text-[9px] font-medium uppercase tracking-wider text-slate-400 sm:text-xs">Connected workspace</span>
              </div>
              <div>
                <span className="block text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">Your team</span>
                <span className="mt-1 block text-[9px] font-medium uppercase tracking-wider text-slate-400 sm:text-xs">Role-based access</span>
              </div>
              <div>
                <span className="block text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">Mobile</span>
                <span className="mt-1 block text-[9px] font-medium uppercase tracking-wider text-slate-400 sm:text-xs">Ready for business</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative w-full">
            <div className="absolute -top-3 -right-3 bg-slate-900 text-white text-[10px] uppercase font-bold tracking-widest px-3.5 py-1.5 rounded-full shadow-lg z-10 border border-slate-800">
              Workspace Preview
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
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Enrolled</span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">1,248</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tuition Ledger</span>
                      <span className="text-2xl font-bold text-slate-900 mt-1 block">₦1.5M</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
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
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Patient Registry Sync</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">Bed Count & Wards</p>
                    </div>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
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

      <ProductPreviews />
      <TeamManagement />

      {/* THREE CARDS OF TRUST */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300">
            <h3 className="font-bold text-xl text-slate-900 tracking-tight">Rapid Processing</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Handle in-person checkout with searchable sales records and digital receipt sharing.
            </p>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300">
            <h3 className="font-bold text-xl text-slate-900 tracking-tight">Workspace access</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Give team members the access they need for their role while keeping workspace ownership and settings in your hands.
            </p>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300">
            <h3 className="font-bold text-xl text-slate-900 tracking-tight">Scalable Monetization</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Choose retail, school or hospital workflows designed around the day-to-day needs of your sector.
            </p>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES GRID */}
      <section className="border-y border-slate-200 bg-white/80 py-28 backdrop-blur-sm">
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
      <section className="border-b border-slate-200 bg-slate-50/70 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div id="partners" className="scroll-mt-24 text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">Grow with Marthington</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">The Referral Partnership Program</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
              Introduce businesses to a workspace they can grow with—and follow your referrals, commissions and payouts with transparent tracking.
            </p>
          </div>

          <div className="mb-10 grid gap-6 overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">For commission agents</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Build recurring income through referrals.</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Earn commissions on qualifying payments from businesses you refer, according to your current partner rate and program terms. See referral conversions, each recorded earning, and payout status in your partner wallet.
              </p>
            </div>
            <Link to="/affiliate-register" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400">
              Become a Partner <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </div>

          <div className="mb-12 grid gap-6 md:grid-cols-3">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm text-center">
              <h3 className="font-bold text-lg text-slate-900 tracking-tight">Recurring commissions</h3>
              <p className="mt-3 text-sm text-slate-500 font-medium leading-relaxed">
                Qualifying payments from referred workspaces can continue to earn commission under the applicable program terms.
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm text-center">
              <h3 className="font-bold text-lg text-slate-900 tracking-tight">Transparent performance tracking</h3>
              <p className="mt-3 text-sm text-slate-500 font-medium leading-relaxed">
                Review clicks, conversions, your current commission rate and the exact amounts credited to your account.
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm text-center">
              <h3 className="font-bold text-lg text-slate-900 tracking-tight">Payout visibility</h3>
              <p className="mt-3 text-sm text-slate-500 font-medium leading-relaxed">
                Follow available balances, submitted withdrawals and payout activity from your partner dashboard.
              </p>
            </div>
          </div>

          <div className="max-w-3xl mx-auto bg-white border border-slate-200/80 rounded-[32px] p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-5">Partner Onboarding Workflow</h3>
            <ol className="space-y-3.5 text-sm text-slate-600 font-medium">
              <li className="flex items-start gap-3"><span className="flex h-5 w-5 rounded-full bg-slate-900 text-white font-bold items-center justify-center text-[10px] shrink-0 mt-0.5">1</span> <span>Initialize your verified partner profile via the application link.</span></li>
              <li className="flex items-start gap-3"><span className="flex h-5 w-5 rounded-full bg-slate-900 text-white font-bold items-center justify-center text-[10px] shrink-0 mt-0.5">2</span> <span>Get your unique referral code and link from the partner dashboard.</span></li>
              <li className="flex items-start gap-3"><span className="flex h-5 w-5 rounded-full bg-slate-900 text-white font-bold items-center justify-center text-[10px] shrink-0 mt-0.5">3</span> <span>Deploy promotional pipelines to active retail heads, institutional schools, and clinics.</span></li>
              <li className="flex items-start gap-3"><span className="flex h-5 w-5 rounded-full bg-slate-900 text-white font-bold items-center justify-center text-[10px] shrink-0 mt-0.5">4</span> <span>Track referred workspaces, commission earnings and payout status.</span></li>
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
              <Link to={registerPath} className="inline-flex items-center justify-center w-full px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl mt-8 transition-colors">
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
              <Link to={registerPath} className="inline-flex items-center justify-center w-full px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl mt-8 shadow-sm transition-all">
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
              <Link to={registerPath} className="inline-flex items-center justify-center w-full px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl mt-8 transition-colors">
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
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={registerPath} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-600 px-8 py-4 font-bold text-white shadow-lg transition-all duration-200 hover:bg-emerald-700">
              Deploy Workspace
            </Link>
            <Link to="/affiliate-register" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/20 px-8 py-4 font-bold text-white transition-colors hover:bg-white/10">
              Become a Partner
            </Link>
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-slate-500">
            <Link to="/shop" className="transition-colors hover:text-emerald-700">Storefronts</Link>
            <Link to="/login" className="transition-colors hover:text-emerald-700">Login</Link>
            <Link to="/affiliate-register" className="transition-colors hover:text-emerald-700">Become a Partner</Link>
            <span>© {new Date().getFullYear()} Marthington Systems Ltd. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
