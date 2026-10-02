import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const tasks = [
  {
    icon: "🖼️",
    title: "Update your company logo",
    route: "/app/settings",
    routeLabel: "Open Settings",
    steps: [
      "Go to Settings from the left sidebar or open /app/settings.",
      "Click the Business tab to open your profile details.",
      "Scroll to the logo section and upload your new logo image.",
      "Save the form and the new brand logo will be used in profile, receipts, and reports."
    ]
  },
  {
    icon: "🧾",
    title: "Create an invoice",
    route: "/app/invoices",
    routeLabel: "Open Invoices",
    steps: [
      "Go to the Invoices page at /app/invoices.",
      "Click Create Invoice or New Invoice from the invoice toolbar.",
      "Choose the customer, add the product or service lines, confirm pricing, and set the payment status.",
      "Save the invoice. You can then print, email, or view it from the invoice details page."
    ]
  },
  {
    icon: "🛒",
    title: "Make a sale at the POS",
    route: "/app/pos",
    routeLabel: "Open POS",
    steps: [
      "Open the POS from /app/pos.",
      "Search for a product or service and add it to the cart.",
      "Select the customer, adjust quantity or discount if needed, and choose the payment method.",
      "Complete checkout and print or send the receipt. The sale will appear in the sales dashboard and reports."
    ]
  },
  {
    icon: "📦",
    title: "Add a product to inventory",
    route: "/app/products",
    routeLabel: "Manage Products",
    steps: [
      "Open /app/products or /app/inventory to manage stock.",
      "Click Add Product, fill in the name, pricing, category, and SKU.",
      "Set inventory quantity and any related product details.",
      "Save it and it becomes available for POS sales and reports."
    ]
  },
  {
    icon: "📊",
    title: "Check business performance",
    route: "/app/analytics",
    routeLabel: "Open Analytics",
    steps: [
      "Visit /app/analytics to review your revenue, expenses, sales activity, customers, and stock trends.",
      "Use the filters to focus on a date range, branch, or product category.",
      "Compare KPIs and use the insights to plan stock, pricing, and operations."
    ]
  },
  {
    icon: "👥",
    title: "Add staff and control access",
    route: "/app/staff",
    routeLabel: "Open Staff",
    steps: [
      "Go to /app/staff and invite a team member.",
      "Assign a role and permissions according to what they should and should not access.",
      "If needed, review role templates and approval rules in the access settings section."
    ]
  },
  {
    icon: "📦",
    title: "Review branch inventory",
    route: "/app/branches/inventory",
    routeLabel: "Open Inventory",
    steps: [
      "Open /app/branches/inventory or /app/inventory to see stock by branch.",
      "Filter by location, category, or product type to find movement quickly.",
      "Check stock warnings and adjust orders before the shortage becomes a sales problem.",
      "Use the report to plan restocks and transfer products between branches."
    ]
  },
  {
    icon: "🧍",
    title: "Manage customer records",
    route: "/app/customers",
    routeLabel: "View Customers",
    steps: [
      "Open /app/customers and search for the customer profile you need.",
      "Add or update customer details, tags, order history, and notes.",
      "Use this information for repeat business, payment follow-up, and customer service.",
      "Create better sales conversations by knowing what they bought before."
    ]
  },
  {
    icon: "🛍️",
    title: "Review sales history",
    route: "/app/sales",
    routeLabel: "Open Sales",
    steps: [
      "Visit /app/sales to review completed sales and receipts.",
      "Use filters to narrow sales by cashier, branch, customer, or date.",
      "Open a specific sale to confirm details, returns, status, or payment follow-up.",
      "Use these records to investigate refunds, errors, and daily performance."
    ]
  },
  {
    icon: "📋",
    title: "Create a purchase order",
    route: "/app/purchase-orders",
    routeLabel: "Open Purchase Orders",
    steps: [
      "Open /app/purchase-orders and start a new order.",
      "Select a supplier, add the products, quantity, and expected delivery date.",
      "Review the totals and send the order for approval if your workflow requires it.",
      "Track the order until stock is received and recorded against the purchase."
    ]
  },
  {
    icon: "🤝",
    title: "Check supplier performance",
    route: "/app/suppliers",
    routeLabel: "Open Suppliers",
    steps: [
      "Go to /app/suppliers and review your suppliers and active relationships.",
      "Check purchase history, lead times, and pricing trends for each supplier.",
      "Use the supplier score and performance insights for better purchasing decisions.",
      "Switch suppliers when cost, delivery, or quality is not meeting expectations."
    ]
  },
  {
    icon: "💸",
    title: "Track expenses and budgets",
    route: "/app/expenses",
    routeLabel: "Open Expenses",
    steps: [
      "Open /app/expenses to record operational costs and vendor payments.",
      "Create or review categories, approvals, and budget limits for each department.",
      "Use /app/budget-management to compare spending versus monthly limits.",
      "Set alerts and review exceptions before costs exceed the planned budget."
    ]
  },
  {
    icon: "🏪",
    title: "Manage branches and locations",
    route: "/app/branches",
    routeLabel: "Open Branches",
    steps: [
      "Open /app/branches to review all your business locations.",
      "Add or update each branch's profile, contact details, and location notes.",
      "Compare branch sales, inventory, and operational activity from the dashboard.",
      "Use the data to allocate stock, staff, and performance targets correctly."
    ]
  },
  {
    icon: "📈",
    title: "Build a report for leadership",
    route: "/app/reports",
    routeLabel: "Open Reports",
    steps: [
      "Use /app/reports or /app/analytics to generate a practical summary for your team.",
      "Select the date range and the category you need: sales, stock, customers, or finances.",
      "Review the report and identify the strongest and weakest areas of the business.",
      "Share the insights with management so actions are based on evidence, not guesswork."
    ]
  },
  {
    icon: "💳",
    title: "Handle billing and payment review",
    route: "/app/billing",
    routeLabel: "Open Billing",
    steps: [
      "Open /app/billing to review recurring payments, account balances, or customer billing issues.",
      "Check pending items and verify whether a payment was received or needs follow-up.",
      "Confirm the correct invoice or account before sending reminders or closing the case.",
      "Keep the billing trail clean so cash flow and collections stay organized."
    ]
  },
  {
    icon: "🔔",
    title: "Configure business settings",
    route: "/app/settings",
    routeLabel: "Open Settings",
    steps: [
      "Go to /app/settings and review the business, notifications, and access configuration.",
      "Update the profile, branding, tax details, and communication preferences for your team.",
      "Check approval rules and emergency permissions for sensitive operations.",
      "Save the configuration and keep every workflow consistent across departments."
    ]
  }
];

const sections = [
  {
    title: "Overview",
    content: [
      "Marthington BMS is your one-stop business control center for sales, stock, logistics, customer relationships, reports, and billing.",
      "Whether you are running a retail shop, service business, school, or medical operation, the system gives each team member the tools they need in one place."
    ]
  },
  {
    title: "Start here: the basic flow",
    content: [
      "1. Add your products and services from the product pages.",
      "2. Add staff and assign permissions if you have a team.",
      "3. Start sales from POS and generate customer invoices when needed.",
      "4. Monitor analytics and reports to understand revenue, inventory, and customer behavior.",
      "5. Customize your business profile and branding in Settings."
    ]
  },
  {
    title: "The most useful pages in the app",
    content: [
      "Dashboard: your live operational summary from /app.",
      "POS: sales and customer checkout from /app/pos.",
      "Sales: completed transactions and receipts from /app/sales.",
      "Invoices: customer billing and payment tracking from /app/invoices.",
      "Products: catalog management from /app/products.",
      "Inventory: stock control and branch view from /app/inventory.",
      "Customers: client records and account notes from /app/customers.",
      "Staff: team management and permissions from /app/staff.",
      "Reports: deeper business insights from /app/reports or /app/analytics."
    ]
  }
];

const UserGuide = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 4;
  const totalPages = Math.ceil(tasks.length / tasksPerPage);
  const currentTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * tasksPerPage;
    return tasks.slice(startIndex, startIndex + tasksPerPage);
  }, [currentPage]);

  const markdown = useMemo(() => {
    return sections
      .map((section) => {
        return `## ${section.title}\n\n${section.content.map((line) => `- ${line}`).join("\n")}`;
      })
      .join("\n\n");
  }, []);

  const handleDownload = () => {
    const blob = new Blob([`# Marthington BMS User Guide\n\n${markdown}\n\n${tasks.map((task) => `## ${task.title}\n\n${task.steps.map((step) => `- ${step}`).join("\n")}`).join("\n\n")}`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "marthington-bms-user-guide.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const goToPage = (page) => {
    if (page < 1) return;
    if (page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <section className="mx-auto max-w-6xl space-y-8 py-8">
      <div className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">User Guide</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Marthington BMS: How to actually use it
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              This guide is built around the real tasks people do every day: brand updates, sales, invoices, stock control, and day-to-day operations.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Download Guide
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{section.title}</h2>
              <div className="mt-4 space-y-2 text-slate-600 dark:text-slate-300">
                {section.content.map((line) => (
                  <p key={line} className="leading-7">{line}</p>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">Task guides</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Most common workflows</h2>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              {currentTasks.map((task) => (
                <div key={task.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{task.icon}</span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{task.title}</h3>
                    </div>
                    <Link
                      to={task.route}
                      className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    >
                      {task.routeLabel}
                    </Link>
                  </div>

                  <ol className="mt-4 space-y-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {task.steps.map((step) => (
                      <li key={step} className="flex gap-3">
                        <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {task.steps.indexOf(step) + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Previous
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => goToPage(page)}
                    className={`h-9 min-w-9 rounded-xl border px-2 text-sm font-semibold transition ${
                      page === currentPage
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-6 rounded-[32px] border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">At a glance</p>
            <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">What this system is built for</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li>• Sell faster with POS and customer checkout</li>
              <li>• Track stock and products without chaos</li>
              <li>• Build invoices and collect payments cleanly</li>
              <li>• Understand the business through live analytics</li>
              <li>• Keep your branding and settings polished</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Fast navigation</p>
            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
              <Link to="/app" className="block font-medium hover:text-emerald-600">Dashboard</Link>
              <Link to="/app/pos" className="block font-medium hover:text-emerald-600">Point of Sale</Link>
              <Link to="/app/products" className="block font-medium hover:text-emerald-600">Products</Link>
              <Link to="/app/invoices" className="block font-medium hover:text-emerald-600">Invoices</Link>
              <Link to="/app/reports" className="block font-medium hover:text-emerald-600">Reports</Link>
              <Link to="/app/settings" className="block font-medium hover:text-emerald-600">Settings</Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default UserGuide;
