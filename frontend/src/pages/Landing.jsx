import { Link } from "react-router-dom";

const features = [
  {
    title: "Smart POS",
    desc: "Complete sales in seconds with a fast modern checkout experience."
  },
  {
    title: "WhatsApp Receipts",
    desc: "Send digital receipts instantly to customers after every sale."
  },
  {
    title: "Inventory Tracking",
    desc: "Track stock movement and monitor low inventory automatically."
  },
  {
    title: "Staff Management",
    desc: "Control permissions, teams, and business access securely."
  },
  {
    title: "Business Reports",
    desc: "Monitor revenue, sales trends, and product performance."
  },
  {
    title: "Cloud Workspace",
    desc: "Run your business from anywhere across devices."
  }
];

const Landing = () => {
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

        <div className="hero-grid">

          <div>
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              ⚡ Modern POS + Receipt Platform
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight text-slate-900">
              Run your business.
              <span className="text-green-600 block">
                Send receipts instantly.
              </span>
            </h1>

            <p className="mt-8 text-lg leading-8 text-slate-600 max-w-2xl">
              Marthington helps businesses manage inventory, sales,
              receipts, staff, and reporting from one clean workspace.
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

            <div className="mt-10 flex gap-8 text-sm text-slate-500">
              <div>
                <strong className="block text-2xl text-slate-900">
                  99.9%
                </strong>
                Reliability
              </div>

              <div>
                <strong className="block text-2xl text-slate-900">
                  Instant
                </strong>
                Receipt Delivery
              </div>

              <div>
                <strong className="block text-2xl text-slate-900">
                  Cloud
                </strong>
                Business Workspace
              </div>
            </div>
          </div>

          {/* POS CARD */}
          <div className="glass-card rounded-[32px] p-8">

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

            <div className="space-y-4">

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div>
                  <strong>iPhone Charger</strong>
                  <p className="text-sm text-gray-500">Qty: 1</p>
                </div>
                <span className="font-bold">₦8,500</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div>
                  <strong>Bluetooth Speaker</strong>
                  <p className="text-sm text-gray-500">Qty: 2</p>
                </div>
                <span className="font-bold">₦24,000</span>
              </div>

            </div>

            <div className="mt-8 border-t pt-6">

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₦32,500</span>
              </div>

              <button className="primary-btn w-full mt-6">
                Send Receipt via WhatsApp
              </button>
            </div>
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
            From sales and inventory to receipts and staff management,
            Marthington gives you one central operating system.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="feature-card">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-2xl mb-6">
                ⚡
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

            <div className="pricing-card">
              <h3 className="font-bold text-2xl">Free</h3>
              <p className="text-5xl font-extrabold mt-6">₦0</p>

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

            <div className="pricing-card pricing-active">
              <div className="inline-flex bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm font-semibold mb-4">
                Most Popular
              </div>

              <h3 className="font-bold text-2xl">Pro</h3>
              <p className="text-5xl font-extrabold mt-6">₦3,000</p>

              <ul className="space-y-4 mt-8 text-gray-600">
                <li>✔ Unlimited products</li>
                <li>✔ WhatsApp receipts</li>
                <li>✔ PDF exports</li>
                <li>✔ Staff controls</li>
                <li>✔ Reports</li>
              </ul>

              <Link
                to="/register"
                className="primary-btn block text-center mt-10"
              >
                Upgrade to Pro
              </Link>
            </div>

            <div className="pricing-card">
              <h3 className="font-bold text-2xl">Business</h3>
              <p className="text-5xl font-extrabold mt-6">Custom</p>

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

        <h2 className="text-5xl font-extrabold max-w-3xl mx-auto leading-tight">
          Start running your business smarter today.
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
                Run your business. Send receipts instantly.
              </p>
            </div>
          </div>

          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Marthington. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;