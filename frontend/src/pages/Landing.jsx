import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import request from "../api/client.js";
import { formatCurrency } from "../utils/formatters.js";

const features = [
  {
    icon: "🛒",
    title: "Smart POS",
    desc: "Complete sales in seconds with a fast modern checkout experience."
  },
  {
    icon: "📲",
    title: "WhatsApp Receipts",
    desc: "Send digital receipts instantly to customers after every sale."
  },
  {
    icon: "📦",
    title: "Inventory Tracking",
    desc: "Track stock movement and monitor low inventory automatically."
  },
  {
    icon: "👥",
    title: "Staff Management",
    desc: "Control permissions, teams, and business access securely."
  },
  {
    icon: "📊",
    title: "Business Reports",
    desc: "Monitor revenue, sales trends, and product performance."
  },
  {
    icon: "☁️",
    title: "Cloud Workspace",
    desc: "Run your business from anywhere across devices."
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
    <div className="gradient-bg min-h-screen overflow-hidden">

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <img
              src="/logo-icon.png"
              alt="Marthington"
              className="w-12 h-12 rounded-xl"
            />

            <div>
              <h2 className="font-extrabold text-xl text-slate-900">
                Marthington
              </h2>

              <p className="text-sm text-gray-500">
                Business Operating System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="font-medium text-slate-700"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="primary-btn"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-24">

        <div className="hero-grid items-center gap-16">

          {/* LEFT */}
          <div>

            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              ⚡ Modern POS + Receipt Platform
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight text-slate-900">
              The modern operating system
              <span className="text-green-600 block">
                for African businesses.
              </span>
            </h1>

            <p className="mt-8 text-lg leading-8 text-slate-600 max-w-2xl">
              Manage products, sales, receipts, inventory,
              staff and business reports from one powerful
              cloud platform built for modern businesses.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">

              <Link
                to="/register"
                className="primary-btn"
              >
                Create Workspace
              </Link>

              <Link
                to="/login"
                className="secondary-btn"
              >
                Login
              </Link>

            </div>

            {/* STATS */}
            <div className="mt-12 flex flex-wrap gap-8 text-sm text-slate-500">

              <div>
                <strong className="block text-3xl text-slate-900">
                  99.9%
                </strong>
                Reliability
              </div>

              <div>
                <strong className="block text-3xl text-slate-900">
                  Instant
                </strong>
                Receipt Delivery
              </div>

              <div>
                <strong className="block text-3xl text-slate-900">
                  Cloud
                </strong>
                Workspace
              </div>

            </div>

          </div>

          {/* RIGHT */}
          <div className="relative">

            {/* LIVE BADGE */}
            <div className="absolute -top-4 -right-4 bg-black text-white px-4 py-2 rounded-full text-sm font-semibold shadow-xl z-10">
              Live
            </div>

            <div className="glass-card rounded-[32px] p-8 relative overflow-hidden">

              {/* HEADER */}
              <div className="flex items-center justify-between mb-8">

                <div>
                  <h3 className="font-bold text-xl text-slate-900">
                    Live POS Preview
                  </h3>

                  <p className="text-gray-500 text-sm mt-1">
                    Modern checkout interface
                  </p>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-green-600 text-white flex items-center justify-center text-xl font-bold">
                  M
                </div>

              </div>

              {/* ITEMS */}
              <div className="space-y-4">

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">

                  <div>
                    <strong>iPhone Charger</strong>

                    <p className="text-sm text-gray-500">
                      Qty: 1
                    </p>
                  </div>

                  <span className="font-bold">
                    ₦8,500
                  </span>

                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">

                  <div>
                    <strong>Bluetooth Speaker</strong>

                    <p className="text-sm text-gray-500">
                      Qty: 2
                    </p>
                  </div>

                  <span className="font-bold">
                    ₦24,000
                  </span>

                </div>

              </div>

              {/* TOTAL */}
              <div className="mt-8 border-t pt-6">

                <div className="flex justify-between text-lg font-bold">

                  <span>Total</span>

                  <span>₦32,500</span>

                </div>

                <button className="primary-btn w-full mt-6">
                  Send Receipt via WhatsApp
                </button>

                <div className="mt-4 bg-green-100 text-green-700 rounded-2xl p-4 text-sm font-semibold">
                  ✅ Receipt sent successfully via WhatsApp
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* TRUST */}
      <section className="max-w-7xl mx-auto px-6 pb-20">

        <div className="grid md:grid-cols-3 gap-6">

          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <h3 className="font-bold text-3xl text-slate-900">
              Fast Checkout
            </h3>

            <p className="mt-3 text-gray-600">
              Complete sales and print receipts in seconds.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <h3 className="font-bold text-3xl text-slate-900">
              Cloud Based
            </h3>

            <p className="mt-3 text-gray-600">
              Access your business securely from anywhere.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <h3 className="font-bold text-3xl text-slate-900">
              Built For Growth
            </h3>

            <p className="mt-3 text-gray-600">
              Perfect for shops, supermarkets and growing businesses.
            </p>
          </div>

        </div>

      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-6 py-24">

        <div className="text-center max-w-3xl mx-auto mb-16">

          <h2 className="section-title">
            Everything your business needs
          </h2>

          <p className="section-subtitle">
            One modern operating system for products,
            inventory, receipts, staff and reporting.
          </p>

        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {features.map((feature) => (

            <div
              key={feature.title}
              className="feature-card"
            >

              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl mb-6">
                {feature.icon}
              </div>

              <h3 className="font-bold text-xl text-slate-900">
                {feature.title}
              </h3>

              <p className="text-gray-600 mt-3 leading-7">
                {feature.desc}
              </p>

            </div>

          ))}

        </div>

      </section>

      {/* BUSINESS TYPES */}
      <section className="py-20">

        <div className="text-center">

          <p className="text-sm uppercase tracking-[4px] text-gray-400 font-semibold">
            Trusted By Growing Businesses
          </p>

          <div className="flex flex-wrap justify-center gap-10 mt-10 text-2xl font-bold text-slate-300">

            <span>Retail Stores</span>
            <span>Supermarkets</span>
            <span>Pharmacies</span>
            <span>Electronics Shops</span>
            <span>Restaurants</span>

          </div>

        </div>

      </section>

      {/* PRICING */}
      <section className="py-24 bg-white">

        <div className="max-w-6xl mx-auto px-6">

          <div className="text-center mb-16">

            <h2 className="section-title">
              Simple pricing
            </h2>

            <p className="section-subtitle">
              Start free. Upgrade when your business grows.
            </p>

          </div>

          <div className="grid md:grid-cols-3 gap-8">

            {/* FREE */}
            <div className="pricing-card">

              <h3 className="font-bold text-2xl">
                Free
              </h3>

              <p className="text-5xl font-extrabold mt-6">
                ₦0
              </p>

              <ul className="space-y-4 mt-8 text-gray-600">

                <li>✔ 20 products</li>
                <li>✔ Basic POS</li>
                <li>✔ Digital receipts</li>

              </ul>

              <Link
                to="/register"
                className="secondary-btn block text-center mt-10"
              >
                Start Free
              </Link>

            </div>

            {/* PRO */}
            <div className="pricing-card pricing-active border-2 border-green-600 relative">

              <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                MOST POPULAR
              </div>

              <h3 className="font-bold text-2xl">
                Pro
              </h3>

              <div className="mt-6">

                <p className="text-5xl font-extrabold">
                  {formatCurrency(pricing.monthly)}
                </p>

                <span className="text-gray-500">
                  per month
                </span>

              </div>

              <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4">

                <p className="text-sm text-green-700 font-semibold">
                  Save {yearlySavings > 0 ? formatCurrency(yearlySavings) : "more"} yearly
                </p>

                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(pricing.yearly)} / year
                </p>

              </div>

              <ul className="space-y-4 mt-8 text-gray-600">

                <li>✔ Unlimited products</li>
                <li>✔ WhatsApp receipts</li>
                <li>✔ PDF exports</li>
                <li>✔ Staff controls</li>
                <li>✔ Business reports</li>
                <li>✔ Premium receipt themes</li>

              </ul>

              <Link
                to="/register"
                className="primary-btn block text-center mt-10"
              >
                Upgrade to Pro
              </Link>

            </div>

            {/* BUSINESS */}
            <div className="pricing-card">

              <h3 className="font-bold text-2xl">
                Business
              </h3>

              <p className="text-5xl font-extrabold mt-6">
                Custom
              </p>

              <ul className="space-y-4 mt-8 text-gray-600">

                <li>✔ Multi-team support</li>
                <li>✔ Enterprise workflows</li>
                <li>✔ Advanced controls</li>
                <li>✔ Priority support</li>

              </ul>

              <Link
                to="/register"
                className="secondary-btn block text-center mt-10"
              >
                Contact Sales
              </Link>

            </div>

          </div>

        </div>

      </section>

      {/* CTA */}
      <section className="py-24 bg-[#0F172A] text-white text-center px-6">

        <h2 className="text-5xl font-extrabold max-w-4xl mx-auto leading-tight">

          Stop managing your business manually.

          <span className="text-green-400 block">
            Start operating like a modern company.
          </span>

        </h2>

        <p className="text-slate-300 mt-6 text-lg max-w-2xl mx-auto">
          Create your workspace in minutes and start managing sales instantly.
        </p>

        <Link
          to="/register"
          className="inline-block mt-10 bg-green-600 hover:bg-green-700 px-8 py-4 rounded-2xl font-bold text-lg"
        >
          Create Free Workspace
        </Link>

      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t py-10">

        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">

          <div className="flex items-center gap-3">

            <img
              src="/logo-icon.png"
              className="w-10 h-10"
            />

            <div>

              <strong className="text-slate-900">
                Marthington
              </strong>

              <p className="text-sm text-gray-500">
                Run your business smarter.
              </p>

            </div>

          </div>

          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Marthington.
            All rights reserved.
          </p>

        </div>

      </footer>

    </div>
  );
};

export default Landing;