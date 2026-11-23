import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiBarChart2,
  FiCalendar,
  FiDollarSign,
  FiFileText,
  FiMapPin,
  FiMessageCircle,
  FiPackage,
  FiShoppingCart,
  FiTruck,
  FiUser,
  FiUsers,
  FiTrendingUp
} from "react-icons/fi";
import request from "../api/client.js";
import { formatCurrency } from "../utils/formatters.js";

const services = [
  { group: "Core Operations", title: "POS & Sales", description: "Ring up counter sales, split payments, and keep every transaction recorded.", icon: FiShoppingCart },
  { group: "Core Operations", title: "Daily Reports", description: "See daily sales, revenue, profit, and staff activity at a glance.", icon: FiBarChart2 },
  { group: "Core Operations", title: "Staff & Permissions", description: "Give every team member role-based access to the tools they need.", icon: FiUsers },
  { group: "Core Operations", title: "Branch Management", description: "Manage outlets, assigned teams, and branch operations from one place.", icon: FiMapPin },
  { group: "Inventory & Supply Chain", title: "Inventory & Stock", description: "Track stock movement, low-stock items, and what is available at each branch.", icon: FiPackage },
  { group: "Inventory & Supply Chain", title: "Suppliers & Purchasing", description: "Organize supplier records, purchase orders, and incoming stock.", icon: FiTruck },
  { group: "Inventory & Supply Chain", title: "Services & Scheduling", description: "Record service sales and keep scheduled work and appointments on track.", icon: FiCalendar },
  { group: "Financial Control & Growth", title: "Financial & Inventory Reports", description: "Understand profit, costs, stock levels, and inventory movement.", icon: FiTrendingUp },
  { group: "Financial Control & Growth", title: "Customer Management", description: "Keep customer records connected to sales, invoices, and follow-ups.", icon: FiUser },
  { group: "Financial Control & Growth", title: "Invoices", description: "Create customer invoices and track outstanding balances.", icon: FiFileText },
  { group: "Financial Control & Growth", title: "Expenses & Budgets", description: "Record spending, set budgets, and spot cost trends before they grow.", icon: FiDollarSign },
  { group: "Financial Control & Growth", title: "WhatsApp Receipts", description: "Send branded digital receipts automatically with an active Pro subscription.", icon: FiMessageCircle }
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

const ProductPreviews = () => (
  <section id="platform" className="scroll-mt-24 border-y border-slate-200 bg-slate-50/80 py-20 sm:py-24">
    <div className="mx-auto max-w-7xl px-5 sm:px-6">
      <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-14">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">Three connected platforms</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          One ecosystem for running and growing your business.
        </h2>
        <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">
          Run daily operations, reach customers online, and grow through a partner network—all connected to Marthington.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {[
          {
            eyebrow: "Core cloud operating system",
            title: "Marthington BMS",
            description: "Run the daily work of your retail or service business from one connected dashboard.",
            highlights: ["Counter POS with split payments", "Stock, staff permissions, and expenses", "Invoices and real-time profit reports"],
            action: "Explore BMS",
            to: "/register",
            icon: FiShoppingCart
          },
          {
            eyebrow: "Online sales channel",
            title: "Marthington Storefronts",
            description: "Showcase your products online and receive customer orders connected to your inventory.",
            highlights: ["A storefront for your products", "Orders connected to your catalog", "Inventory managed from BMS"],
            action: "View Storefronts",
            to: "/shop",
            icon: FiPackage
          },
          {
            eyebrow: "Partner and consultant ecosystem",
            title: "Marthington Partners Portal",
            description: "Help businesses get started and earn recurring commissions as a consultant, IT vendor, or field agent.",
            highlights: ["Onboard businesses with referral links", "Track conversions and commissions", "Follow earnings and payouts"],
            action: "Become a Partner",
            to: "/affiliate-register",
            icon: FiUsers
          }
        ].map(({ eyebrow, title, description, highlights, action, to, icon: Icon }) => (
          <article key={title} className="group flex flex-col rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Icon aria-hidden="true" className="h-6 w-6" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{title}</h3>
            <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">{description}</p>
            <ul className="mt-5 space-y-3 border-t border-slate-100 pt-5">
              {highlights.map((highlight) => (
                <li key={highlight} className="flex gap-2.5 text-sm leading-5 text-slate-600">
                  <span aria-hidden="true" className="mt-0.5 text-emerald-600">✓</span>{highlight}
                </li>
              ))}
            </ul>
            <Link to={to} className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-700 transition-colors hover:text-emerald-900">
              {action}<span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
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

const PricingSection = ({ yearlyPrice, registerPath }) => {
  const proFeatures = [
    "Unlimited products and unlimited staff accounts with role-based permissions",
    "Automated branded WhatsApp receipts after every sale",
    "Multi-branch control with real-time stock sync",
    "Profit reports, expense and budget tracking, supplier purchase orders, and customer invoices",
    "Priority onboarding and support"
  ];

  return (
    <section id="pricing" className="scroll-mt-24 border-y border-slate-200 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">Start with the plan that fits</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Test for free. Grow with Pro.</h2>
          <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">
            Try the essentials at no cost, then unlock the tools and capacity to run a growing business.
          </p>
        </div>

        <div className="grid items-stretch gap-6 md:grid-cols-2 md:gap-8">
          <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
            <div>
              <p className="text-sm font-bold text-slate-900">Free Mode</p>
              <p className="mt-5 text-4xl font-black tracking-tight text-slate-900">₦0</p>
              <p className="mt-1 text-sm font-medium text-slate-500">Forever · Best for testing</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">Explore the interface and try a starter setup before you commit.</p>
            </div>
            <ul className="mt-6 flex-1 space-y-3 border-t border-slate-100 pt-6 text-sm leading-6 text-slate-600">
              {[
                "Up to 20 products",
                "1 owner + 1 staff account",
                "Basic counter POS and manual receipt links",
                "Single-branch starter setup"
              ].map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <span aria-hidden="true" className="text-slate-400">✓</span>{feature}
                </li>
              ))}
            </ul>
            <Link to={registerPath} className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
              Start Free
            </Link>
          </article>

          <article className="relative flex flex-col rounded-3xl border-2 border-emerald-500 bg-white p-7 shadow-[0_20px_60px_-24px_rgba(16,185,129,0.35)] sm:p-8">
            <span className="absolute -top-3.5 right-6 rounded-full bg-emerald-600 px-4 py-1.5 text-[10px] font-black tracking-[0.16em] text-white shadow-sm">MOST POPULAR · RECOMMENDED</span>
            <div>
              <p className="text-sm font-bold text-slate-900">Pro Mode</p>
              <p className="mt-5 text-4xl font-black tracking-tight text-slate-900">{formatCurrency(yearlyPrice)}</p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">Per year · Built for serious business growth</p>
              <p className="mt-3 inline-flex rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                {yearlyPrice <= 151475
                  ? "Less than ₦415/day to run your entire business"
                  : `About ₦${Math.ceil(yearlyPrice / 365).toLocaleString("en-NG")}/day to run your entire business`}
              </p>
            </div>
            <ul className="mt-6 flex-1 space-y-3 border-t border-emerald-100 pt-6 text-sm leading-6 text-slate-700">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <span aria-hidden="true" className="text-emerald-600">✓</span>{feature}
                </li>
              ))}
            </ul>
            <Link to={registerPath} className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700">
              Start Free, Then Upgrade to Pro
            </Link>
          </article>
        </div>

        <div className="mt-8 text-center">
          <a href="/pricing" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900">
            View Full Pricing &amp; Compare Plans <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
};

const Landing = () => {
  const [pricing, setPricing] = useState({ monthly: 15000, yearly: 150000 });
  const [commissionRate, setCommissionRate] = useState(null);
  const [selectedTab, setSelectedTab] = useState("retail");
  const registerPath = useRegistrationPath();

  const scrollToSection = (event) => {
    event.preventDefault();
    document.getElementById(event.currentTarget.hash.slice(1))?.scrollIntoView?.({ behavior: "smooth" });
  };

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const data = await request("/billing/pricing");
        const pricingData = data?.data;

        if (pricingData?.monthly?.ngn && pricingData?.yearly?.ngn) {
          setPricing({ monthly: pricingData.monthly.ngn, yearly: pricingData.yearly.ngn });
        }
        if (typeof data?.commissionRate === "number") setCommissionRate(data.commissionRate);
      } catch (err) {
        console.warn("Failed to load billing pricing", err);
      }
    };

    loadPricing();
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f8fbff_45%,#ffffff_100%)] text-slate-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-100/80 bg-white/70 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3.5">
            <img src="/logo-icon.png" alt="Marthington" className="h-9 w-9 rounded-xl shadow-sm sm:h-10 sm:w-10" />
            <div>
              <p className="font-bold text-lg tracking-tight text-slate-900">Marthington</p>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Business OS</p>
            </div>
          </div>

          <nav aria-label="Main navigation" className="flex items-center gap-0 sm:gap-5">
            <a href="#services" onClick={scrollToSection} className="hidden text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 md:inline">
              Services
            </a>
            <a href="#platform" onClick={scrollToSection} className="hidden text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 md:inline">
              Platform
            </a>
            <a href="#team" onClick={scrollToSection} className="hidden text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 lg:inline">
              Team
            </a>
            <a href="#pricing" onClick={scrollToSection} className="hidden text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 md:inline">
              Pricing
            </a>
            <a href="#partners" onClick={scrollToSection} className="inline px-1 text-[10px] font-semibold text-slate-600 transition-colors hover:text-slate-900 sm:px-0 sm:text-sm">
              Partners
            </a>
            <Link to="/shop" className="px-1 text-[10px] font-semibold text-emerald-700 transition-colors hover:text-emerald-900 sm:px-0 sm:text-sm">
              Storefronts
            </Link>
            <Link to="/login" className="px-1 text-[10px] font-semibold text-slate-600 transition-colors hover:text-slate-900 sm:px-0 sm:text-sm">
              Login
            </Link>
            <Link to={registerPath} className="inline-flex min-h-9 items-center justify-center rounded-xl bg-slate-900 px-2 py-2 text-[10px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 sm:min-h-10 sm:px-4 sm:text-sm">
              Start Free
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
              <span>⚡ Business management for Nigeria</span>
            </div>

            <h1 className="mb-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 md:text-6xl">
              Business Management System for
              <span className="mt-1 block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Nigerian Businesses.
              </span>
            </h1>

            <p className="mb-10 max-w-xl text-base leading-relaxed text-slate-500 md:text-lg">
              Run sales, inventory, automated calculations, daily reports, staff controls, and multiple branches from one online system—built for Nigerian pharmacies, supermarkets, electronics shops, restaurants, and service businesses.
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
                Start Free
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

      <section id="services" aria-labelledby="services-heading" className="border-b border-slate-200 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">One system for everyday operations</p>
            <h2 id="services-heading" className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Services and Capabilities</h2>
            <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">
              See the tools available to help you run sales, people, stock, branches, and business finances in one place.
            </p>
          </div>
          <div className="space-y-12">
            {["Core Operations", "Inventory & Supply Chain", "Financial Control & Growth"].map((group) => (
              <div key={group}>
                <h3 className="mb-5 text-lg font-bold tracking-tight text-slate-800">{group}</h3>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {services.filter((service) => service.group === group).map(({ title, description, icon: Icon }) => (
                    <li key={title} className="group min-h-40 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:bg-white hover:shadow-lg">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700 transition-colors group-hover:bg-emerald-100">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </div>
                      <h4 className="mt-4 text-base font-bold text-slate-900">{title}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProductPreviews />
      <TeamManagement />
      <PricingSection yearlyPrice={pricing.yearly} registerPath={registerPath} />

      {/* REVENUE SHARING PARTNERSHIP ECOSYSTEM */}
      <section className="border-b border-slate-200 bg-slate-50/70 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div id="partners" className="scroll-mt-24 text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">Grow with Marthington</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">The Referral Partnership Program</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
              Introduce Nigerian businesses to Marthington BMS and follow referrals, qualifying commissions, and payouts in your partner dashboard.
            </p>
          </div>

          <div className="mb-10 grid gap-6 overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">For commission agents</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Build recurring income through referrals.</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {commissionRate === 10
                  ? "Earn 10% on qualifying subscription payments. That is ₦15,000 on a ₦150,000 annual Pro subscription. Track conversions, recorded earnings, and payout status in your partner wallet."
                  : "Earn commissions on qualifying subscription payments at the configured partner rate. Track conversions, recorded earnings, and payout status in your partner wallet."}
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
                {commissionRate === 10 ? "10% on qualifying subscription payments, subject to the partner programme terms." : "Commission on qualifying subscription payments at the configured partner rate."}
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
            Bring your sales, stock, staff, branches, and reports together in one online workspace.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={registerPath} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-600 px-8 py-4 font-bold text-white shadow-lg transition-all duration-200 hover:bg-emerald-700">
              Start Free
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
              <p className="text-xs text-slate-400 font-medium">Business management software for Nigerian retailers and service businesses.</p>
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
