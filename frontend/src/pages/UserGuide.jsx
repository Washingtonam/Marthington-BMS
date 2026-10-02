import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaBookOpen,
  FaBox,
  FaChartBar,
  FaCheck,
  FaChevronDown,
  FaChevronRight,
  FaClipboardList,
  FaCog,
  FaDownload,
  FaFileAlt,
  FaQuestionCircle,
  FaReceipt,
  FaSearch,
  FaShoppingBag,
  FaUserFriends,
} from "react-icons/fa";

const tabs = [
  { id: "workflows", label: "Core Workflows" },
  { id: "onboarding", label: "Onboarding Checklist" },
  { id: "directory", label: "Page Directory" },
  { id: "faq", label: "FAQ & Troubleshooting" },
];

const tagOptions = [
  { id: "all", label: "All" },
  { id: "pos", label: "#POS" },
  { id: "invoices", label: "#Invoices" },
  { id: "inventory", label: "#Inventory" },
  { id: "branding", label: "#Branding" },
  { id: "staff", label: "#Staff" },
];

const workflowCards = [
  {
    id: "logo",
    title: "Update Company Logo",
    category: "Settings",
    tag: "branding",
    route: "/app/settings",
    routeLabel: "Open Settings",
    icon: FaCog,
    description: "Add your business identity to receipts, reports, and profile sections.",
    steps: [
      "Navigate to Settings from the left sidebar.",
      "Open the Business tab to access your profile settings.",
      "Upload your company logo and save the update.",
      "Confirm the branding appears in receipts and reports.",
    ],
  },
  {
    id: "pos",
    title: "Make a Sale at POS",
    category: "Sales",
    tag: "pos",
    route: "/app/pos",
    routeLabel: "Open POS",
    icon: FaShoppingBag,
    description: "Process a quick transaction, apply discounts, and complete checkout.",
    steps: [
      "Open the POS page from the main navigation.",
      "Search for products and add them to the cart.",
      "Select the customer and payment method.",
      "Complete the sale and print or send the receipt.",
    ],
  },
  {
    id: "invoice",
    title: "Create an Invoice",
    category: "Billing",
    tag: "invoices",
    route: "/app/invoices",
    routeLabel: "Open Invoices",
    icon: FaReceipt,
    description: "Prepare billing details, line items, and payment statuses in minutes.",
    steps: [
      "Go to Invoices from the app menu.",
      "Click Create Invoice and choose the customer.",
      "Add products or services and confirm pricing.",
      "Save, print, or email the invoice to the customer.",
    ],
  },
  {
    id: "inventory",
    title: "Add Product to Inventory",
    category: "Stock",
    tag: "inventory",
    route: "/app/products",
    routeLabel: "Manage Products",
    icon: FaBox,
    description: "Create catalog entries with stock levels and pricing visibility.",
    steps: [
      "Open the Products or Inventory page.",
      "Click Add Product and fill in the item details.",
      "Set quantity, pricing, and stock alerts.",
      "Save and make it available in POS and reports.",
    ],
  },
  {
    id: "analytics",
    title: "Check Business Performance",
    category: "Reports",
    tag: "pos",
    route: "/app/analytics",
    routeLabel: "Open Analytics",
    icon: FaChartBar,
    description: "Understand revenue, expense trends, and operational health.",
    steps: [
      "Visit the analytics dashboard.",
      "Filter by date range, branch, or category.",
      "Review sales, costs, and stock movement.",
      "Use the insights to adjust pricing and operations.",
    ],
  },
  {
    id: "staff",
    title: "Add Staff and Manage Access",
    category: "Team",
    tag: "staff",
    route: "/app/staff",
    routeLabel: "Open Staff",
    icon: FaUserFriends,
    description: "Invite team members and assign the right permissions.",
    steps: [
      "Open the Staff management page.",
      "Add a new employee and assign a role.",
      "Set permissions for tasks and sensitive actions.",
      "Review access before launching the account.",
    ],
  },
];

const moduleDirectory = [
  {
    title: "Dashboard",
    path: "/app",
    summary: "Live operations summary and daily performance overview.",
    action: "Open Dashboard",
  },
  {
    title: "Point of Sale",
    path: "/app/pos",
    summary: "Cash register workflow for checkout and instant sales.",
    action: "Open POS",
  },
  {
    title: "Sales",
    path: "/app/sales",
    summary: "Record, review, and monitor completed transactions.",
    action: "View Sales",
  },
  {
    title: "Invoices",
    path: "/app/invoices",
    summary: "Issue customer billing and manage payment flows.",
    action: "Open Invoices",
  },
  {
    title: "Products",
    path: "/app/products",
    summary: "Catalog setup with pricing, categories, and SKU details.",
    action: "Manage Products",
  },
  {
    title: "Inventory",
    path: "/app/inventory",
    summary: "Track stock levels, movement, and branch inventory.",
    action: "Manage Inventory",
  },
  {
    title: "Customers",
    path: "/app/customers",
    summary: "Client records, communication, and relationship history.",
    action: "View Customers",
  },
  {
    title: "Staff",
    path: "/app/staff",
    summary: "Access and team management by role and permission.",
    action: "Manage Staff",
  },
  {
    title: "Reports",
    path: "/app/reports",
    summary: "Operational and financial insights for monitoring performance.",
    action: "View Reports",
  },
  {
    title: "Settings",
    path: "/app/settings",
    summary: "Branding, profile details, and business configuration.",
    action: "Open Settings",
  },
];

const onboardingChecklist = [
  { id: "products", label: "Add products and services", done: false },
  { id: "staff", label: "Create staff accounts and assign roles", done: false },
  { id: "pos", label: "Set up POS checkout for daily sales", done: false },
  { id: "invoices", label: "Configure billing and invoice preferences", done: false },
  { id: "branding", label: "Upload company logo and branding details", done: false },
];

const faqItems = [
  {
    question: "Where do I start if I am new to the system?",
    answer:
      "Start by setting up your product catalog, adding staff, and making sure your branding is configured. Once those are complete, you can begin sales and billing from POS and Invoices.",
  },
  {
    question: "How do I create a sale quickly?",
    answer:
      "Open POS, search for products, add them to the cart, select the customer, choose a payment method, and complete checkout. The sale is then saved in the records and reports.",
  },
  {
    question: "Can I track stock after sales are made?",
    answer:
      "Yes. Inventory and product records update based on sales and stock movements, helping you monitor product availability and restocking needs.",
  },
  {
    question: "How do I update the business brand?",
    answer:
      "Go to Settings, open the Business tab, and upload your logo with your saved business profile. This updates branding across receipts and reports when applicable.",
  },
];

const getStoredChecklist = () => {
  if (typeof window === "undefined") return onboardingChecklist;

  const saved = window.localStorage.getItem("marthington-guide-checklist");
  if (!saved) return onboardingChecklist;

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // ignore invalid localStorage values
  }

  return onboardingChecklist;
};

const UserGuide = () => {
  const [activeTab, setActiveTab] = useState("workflows");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [expandedFaq, setExpandedFaq] = useState(0);
  const [checklist, setChecklist] = useState(getStoredChecklist);

  useEffect(() => {
    window.localStorage.setItem("marthington-guide-checklist", JSON.stringify(checklist));
  }, [checklist]);

  const filteredWorkflows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return workflowCards.filter((item) => {
      const matchesTag = selectedTag === "all" || item.tag === selectedTag;
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.steps.some((step) => step.toLowerCase().includes(query));

      return matchesTag && matchesSearch;
    });
  }, [searchQuery, selectedTag]);

  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return moduleDirectory.filter((item) => {
      if (!query) return true;
      return (
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.path.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  const filteredFaq = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return faqItems;

    return faqItems.filter((item) => {
      return item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query);
    });
  }, [searchQuery]);

  const completedCount = checklist.filter((item) => item.done).length;
  const progressPercent = (completedCount / checklist.length) * 100;

  const toggleChecklistItem = (id) => {
    setChecklist((current) =>
      current.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const handleDownload = () => {
    const markdown = `# Marthington BMS User Guide

## Getting Started
- Open the app and review your dashboard.
- Add products and services to the inventory.
- Set up staff and permissions.
- Configure branding in Settings.
- Start selling with POS and issue customer invoices.

## Common Workflows
${workflowCards
  .map(
    (item) => `### ${item.title}\n${item.steps.map((step) => `- ${step}`).join("\n")}`
  )
  .join("\n\n")}`;

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "marthington-bms-user-guide.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl dark:border-slate-800">
        <div className="flex flex-col gap-6 p-6 md:p-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-200">
              Marthington Business OS
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                User Guide & Help Center
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                Learn the common workflows, setup steps, and daily actions your team needs to run the business efficiently.
              </p>
            </div>

            <div className="relative max-w-xl">
              <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="What do you want to learn how to do?"
                className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTag(tag.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selectedTag === tag.id
                      ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                      : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            <FaDownload />
            Download Guide
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 pb-2 dark:border-slate-800">
        <nav className="flex flex-wrap gap-3 md:gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 pb-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "workflows" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
                Task guides
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                Common workflows
              </h2>
            </div>

            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {filteredWorkflows.length} guides
            </div>
          </div>

          {filteredWorkflows.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredWorkflows.map((workflow) => {
                const Icon = workflow.icon;

                return (
                  <div
                    key={workflow.id}
                    className="flex h-full flex-col justify-between rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                          <Icon />
                        </div>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {workflow.category}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {workflow.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {workflow.description}
                      </p>

                      <ol className="mt-5 space-y-3">
                        {workflow.steps.map((step, index) => (
                          <li key={step} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <Link
                      to={workflow.route}
                      className="mt-6 inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40"
                    >
                      <span>{workflow.routeLabel}</span>
                      <FaArrowRight className="ml-2 text-xs" />
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              No matching guides found for your search.
            </div>
          )}
        </div>
      )}

      {activeTab === "onboarding" && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
                  Getting started
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                  Basic setup checklist
                </h2>
              </div>

              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                {completedCount} of {checklist.length} complete
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="space-y-3">
                {checklist.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      item.done
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          item.done
                            ? "bg-emerald-500 text-white"
                            : "border border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900"
                        }`}
                      >
                        {item.done ? <FaCheck className="text-xs" /> : null}
                      </span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {item.label}
                      </span>
                    </span>

                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {item.done ? "Done" : "Next"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                <FaClipboardList />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Quick flow
                </p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Start here
                </h3>
              </div>
            </div>

            <ol className="mt-6 space-y-5">
              {[
                "Create your product list and price structure.",
                "Invite your staff and assign roles and permissions.",
                "Create a few test sales from the POS.",
                "Generate invoices and monitor the reports dashboard.",
                "Update branding and business settings to complete your setup.",
              ].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-indigo-500">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {activeTab === "directory" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
                Module directory
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                Navigate the app faster
              </h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredModules.map((module) => (
              <div
                key={module.path}
                className="flex h-full flex-col justify-between rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <FaFileAlt />
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      {module.path.replace("/app/", "").toUpperCase() || "HOME"}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {module.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {module.summary}
                  </p>
                </div>

                <Link
                  to={module.path}
                  className="mt-5 inline-flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                >
                  <span>{module.action}</span>
                  <FaChevronRight className="ml-2 text-xs" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "faq" && (
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
                Help center
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                FAQ & troubleshooting
              </h2>
            </div>

            <div className="space-y-3">
              {filteredFaq.length > 0 ? (
                filteredFaq.map((item, index) => {
                  const isOpen = expandedFaq === index;

                  return (
                    <div
                      key={item.question}
                      className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(isOpen ? -1 : index)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                            <FaQuestionCircle className="text-xs" />
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-100">
                            {item.question}
                          </span>
                        </span>

                        <FaChevronDown
                          className={`text-slate-500 transition ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isOpen && (
                        <div className="border-t border-slate-200 px-4 py-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  No FAQ result matches your search.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[28px] border border-slate-200 bg-gradient-to-r from-emerald-50 to-slate-50 p-6 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <FaBookOpen />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
                Documentation
              </p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Need to review the full flow?
              </h3>
            </div>
          </div>

          <Link
            to="/app"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
          >
            Go to dashboard
            <FaArrowRight />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
