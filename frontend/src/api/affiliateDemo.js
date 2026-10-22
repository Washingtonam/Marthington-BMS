const STORAGE_KEY = "marthington_affiliate_demo_v1";
const DEMO_TOKEN = "local-affiliate-demo-session";
const SAMPLE_DATA_VERSION = 2;

import { createDemoBusiness, requestDemoWorkspace } from "./demoWorkspace.js";

const demoPermissions = {
  canViewDashboard: true,
  canViewProducts: true,
  canViewBranches: true,
  canViewBranchInventory: true,
  canAccessPOS: true,
  canViewSales: true,
  canManageStaff: true,
  canManageSettings: true,
  canViewReports: true,
  canViewFinancialReports: true,
  canViewInvoices: true,
  canViewPayments: true,
  canManagePayments: true,
  canManageBilling: true,
  canViewCustomers: true,
  canViewExpenses: true,
  canViewPurchaseOrders: true,
  canViewStaffReports: true
};

const toDemoUser = (user) => ({
  ...user,
  role: "owner",
  isDemo: true,
  affiliateCode: "VIDEO204",
  industryType: "retail",
  isPro: true,
  business: createDemoBusiness(),
  permissions: demoPermissions
});

const createDemoDashboard = () => ({
  affiliate: {
    affiliateCode: "VIDEO204",
    currentRate: 10,
    walletBalance: 78000,
    available: 78000,
    earned: 78000,
    totalEarned: 78000,
    totalLifetimeEarnings: 78000,
    totalClicks: 230,
    totalConversions: 7,
    totalReferrals: 10,
    conversionRate: 3.04,
    pending: 0,
    paid: 0,
    commissionSchedule: {
      monthlySubscriptionPrice: 15000,
      yearlySubscriptionPrice: 150000,
      yearlySavings: 30000,
      subscriptionCommissionRate: 10,
      subscriptionCommissionDescription: "10% of each qualifying paid subscription payment, including monthly renewals.",
      directReferralBonus: null,
      cpaActions: [],
      payoutMilestones: []
    }
  },
  referrals: [
    ...[
      ["Harbor Grocers", "Retail"],
      ["Oakfield Pharmacy", "Healthcare"],
      ["Cedar Home Supplies", "Home goods"],
      ["Northstar Services", "Professional services"],
      ["Meadow Fresh Foods", "Food retail"]
    ].map(([businessName, industry], index) => ({
      businessId: `demo-business-yearly-${index + 1}`,
      businessName,
      ownerName: `Demo Business Owner ${index + 1}`,
      ownerEmail: `owner${index + 1}@example.test`,
      industry,
      plan: "pro",
      billingCycle: "yearly",
      subscriptionAmount: 150000,
      subscriptionStatus: "active",
      isPro: true,
      converted: true,
      commissionRate: 10,
      commissionEarned: 15000,
      referredAt: `${12 + index} Oct 2026`,
      transactionDate: `${14 + index} Oct 2026`
    })),
    ...[
      ["Northstar Design Studio", "Creative services"],
      ["Willow Learning Centre", "Education"],
      ["Clearwater Repairs", "Repairs"]
    ].map(([businessName, industry], index) => ({
      businessId: `demo-business-free-${index + 1}`,
      businessName,
      ownerName: `Demo Free Business Owner ${index + 1}`,
      ownerEmail: `free${index + 1}@example.test`,
      industry,
      plan: "free",
      billingCycle: null,
      subscriptionAmount: 0,
      subscriptionStatus: "free",
      isPro: false,
      converted: false,
      commissionRate: 10,
      commissionEarned: 0,
      referredAt: `${18 + index} Oct 2026`,
      transactionDate: null
    })),
    ...[
      ["Parkview Electronics", "Electronics"],
      ["Sunrise Fashion House", "Fashion retail"]
    ].map(([businessName, industry], index) => ({
      businessId: `demo-business-monthly-${index + 1}`,
      businessName,
      ownerName: `Demo Monthly Business Owner ${index + 1}`,
      ownerEmail: `monthly${index + 1}@example.test`,
      industry,
      plan: "pro",
      billingCycle: "monthly",
      subscriptionAmount: 15000,
      subscriptionStatus: "active",
      isPro: true,
      converted: true,
      commissionRate: 10,
      commissionEarned: 1500,
      referredAt: `${19 + index} Oct 2026`,
      transactionDate: `${20 + index} Oct 2026`
    }))
  ],
  conversions: [],
  payoutRequests: [],
  withdrawalHistory: []
});

function readState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    return { version: 1, sampleDataVersion: SAMPLE_DATA_VERSION, user: null, profile: {}, claims: [], dashboard: createDemoDashboard() };
  }

  const state = JSON.parse(stored);
  if (!state || state.version !== 1 || !Array.isArray(state.claims)) {
    throw new Error("Local demo data is invalid. Clear this site's local demo data and create the demo account again.");
  }
  return {
    ...state,
    sampleDataVersion: SAMPLE_DATA_VERSION,
    user: state.user ? toDemoUser(state.user) : null,
    dashboard: state.sampleDataVersion === SAMPLE_DATA_VERSION && state.dashboard
      ? state.dashboard
      : createDemoDashboard()
  };
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createSession(user) {
  const state = readState();
  const demoUser = toDemoUser(user);
  state.user = demoUser;
  state.sampleDataVersion = SAMPLE_DATA_VERSION;
  writeState(state);
  return {
    token: DEMO_TOKEN,
    refreshToken: DEMO_TOKEN,
    user: demoUser,
    business: createDemoBusiness()
  };
}

export function registerAffiliateDemo(payload) {
  const state = readState();
  const name = String(payload?.name || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();

  if (!name || !email || !payload?.password) {
    throw new Error("Name, email and password are required.");
  }
  if (state.user && state.user.email !== email) {
    throw new Error(`This browser already has a local demo account (${state.user.email}). Sign in with that email or clear the local demo data first.`);
  }

  const user = {
    _id: "local-demo-affiliate",
    name,
    email,
    role: "owner",
    isDemo: true,
    affiliateCode: "VIDEO204",
    industryType: "retail",
    isPro: true,
    permissions: demoPermissions
  };
  state.user = user;
  state.profile = { phone: "", address: "", paymentDetails: {} };
  writeState(state);
  return createSession(user);
}

export function loginAffiliateDemo(payload) {
  const state = readState();
  const email = String(payload?.email || "").trim().toLowerCase();
  if (!state.user || state.user.email !== email) {
    if (email !== "demo@marthington.com") {
      throw new Error("No local demo account matches this email. Use demo@marthington.com.");
    }
    state.user = toDemoUser({
      _id: "local-demo-affiliate",
      name: "Video Demo Partner",
      email,
      role: "owner",
      affiliateCode: "VIDEO204"
    });
    writeState(state);
  }
  if (!payload?.password) throw new Error("Enter any non-empty demo password to continue.");
  return createSession(state.user);
}

function requireDemoAccount() {
  const state = readState();
  if (!state.user) {
    throw new Error("Create or sign in to the local demo account first. No live services were contacted.");
  }
  return state;
}

function parseBody(options) {
  if (!options.body) return {};
  try {
    return JSON.parse(options.body);
  } catch {
    throw new Error("Invalid local demo request body.");
  }
}

export async function requestAffiliateDemo(path, options = {}) {
  const method = options.method || "GET";
  if (path === "/auth/me" && method === "GET") {
    const state = requireDemoAccount();
    return { user: state.user, business: createDemoBusiness() };
  }
  if (path === "/billing/pricing" && method === "GET") return { data: {} };

  const state = requireDemoAccount();
  if (path.startsWith("/shop")) return requestDemoWorkspace(path, options);
  const body = parseBody(options);

  if (path === "/auth/modes/bms" && method === "POST") return createSession(state.user);
  if (path === "/business/workspace" && method === "POST") return { business: createDemoBusiness() };
  if (!path.startsWith("/affiliates/") && path !== "/auth/appearance" && !path.startsWith("/notifications")) {
    return requestDemoWorkspace(path, options);
  }

  if (path === "/affiliates/dashboard" && method === "GET") {
    return state.dashboard;
  }
  if (path === "/affiliates/commission-claims" && method === "GET") {
    return { claims: state.claims };
  }
  if (path === "/affiliates/commission-claims" && method === "POST") {
    if (!body.businessId || !body.action || !body.evidence) {
      throw new Error("Choose a sample business and action and provide evidence.");
    }
    const action = state.dashboard.affiliate.commissionSchedule.cpaActions.find((item) => item.id === body.action);
    if (!action) throw new Error("Choose an active sample action.");
    const business = state.dashboard.referrals.find((item) => item.businessId === body.businessId);
    if (!business) throw new Error("Choose a sample business from this demo account.");
    const claim = {
      _id: `demo-claim-${Date.now()}`,
      title: action.name,
      description: business.businessName,
      business: { name: business.businessName },
      evidence: body.evidence,
      amount: action.flatFee,
      status: "pending"
    };
    state.claims.unshift(claim);
    writeState(state);
    return { claim };
  }
  if (path === "/affiliates/profile" && method === "GET") {
    return { affiliate: { ...state.profile, ...state.user } };
  }
  if (path === "/affiliates/profile" && method === "PUT") {
    state.profile = {
      ...state.profile,
      phone: body.phone || "",
      address: body.address || "",
      paymentDetails: {
        bankName: body.bankName || "",
        accountNumber: body.accountNumber || "",
        accountName: body.accountName || ""
      }
    };
    writeState(state);
    return { message: "Demo profile saved in this browser only.", affiliate: state.profile };
  }
  if (path === "/affiliates/payouts" && method === "GET") {
    return { payoutRequests: state.dashboard.payoutRequests, withdrawalHistory: state.dashboard.withdrawalHistory };
  }
  if (path === "/affiliates/payouts" && method === "POST") {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid sample payout amount.");
    const available = Number(state.dashboard.affiliate.available ?? state.dashboard.affiliate.walletBalance ?? 0);
    if (amount > available) throw new Error("The sample payout amount exceeds this demo balance.");
    const request = {
      _id: `demo-payout-${Date.now()}`,
      amountRequested: amount,
      createdAt: new Date().toISOString(),
      status: "pending",
      note: "Demo only. This is not a real payout request."
    };
    state.dashboard.payoutRequests.unshift(request);
    state.dashboard.affiliate.available = available - amount;
    state.dashboard.affiliate.walletBalance = available - amount;
    state.dashboard.affiliate.pending = Number(state.dashboard.affiliate.pending || 0) + amount;
    writeState(state);
    return { message: "Demo request added locally only. No payout was sent or requested.", payoutRequest: request };
  }
  if (path === "/affiliates/track-click" && method === "POST") {
    return { tracked: true, demo: true };
  }
  if (path === "/affiliates/activate" && method === "POST") {
    return { message: "Affiliate demo account is already active." };
  }
  if (path.startsWith("/notifications") && method === "GET") return { notifications: [] };
  if (path.startsWith("/notifications/") && ["PUT", "DELETE"].includes(method)) {
    return { message: "There are no notifications in this local demo." };
  }
  if (path === "/auth/appearance" && method === "PATCH") {
    state.user.appearance = { ...state.user.appearance, accentColor: body.accentColor };
    writeState(state);
    return { appearance: state.user.appearance };
  }

  throw new Error(`This action is unavailable in the local affiliate demo (${method} ${path}). No live service was contacted.`);
}
