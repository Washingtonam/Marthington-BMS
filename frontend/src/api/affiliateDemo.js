const STORAGE_KEY = "marthington_affiliate_demo_v1";
const DEMO_TOKEN = "local-affiliate-demo-session";

const createDemoDashboard = () => ({
  affiliate: {
    affiliateCode: "VIDEO204",
    currentRate: 20,
    walletBalance: 12500,
    available: 12500,
    earned: 35500,
    totalEarned: 35500,
    totalLifetimeEarnings: 35500,
    totalClicks: 80,
    totalConversions: 2,
    totalReferrals: 3,
    conversionRate: 2.5,
    pending: 5000,
    paid: 18000,
    commissionSchedule: {
      directReferralBonus: {
        amount: 5000,
        description: "Illustrative one-time referral reward; subject to approval."
      },
      cpaActions: [
        {
          id: "verified-demo-action",
          name: "Verified demo action",
          description: "Sample action for illustrating a claim. No real payout is made.",
          flatFee: 2500,
          active: true
        }
      ],
      payoutMilestones: [
        {
          id: "starter-demo-milestone",
          name: "Demo milestone",
          thresholdAmount: 25000,
          rewardAmount: 2500,
          description: "Illustrative milestone for the demo account."
        }
      ]
    }
  },
  referrals: [
    {
      businessId: "demo-business-001",
      businessName: "Sample Harbor Grocers",
      ownerName: "Demo Business Owner",
      ownerEmail: "owner@example.test",
      industry: "Retail",
      plan: "pro",
      subscriptionStatus: "active",
      isPro: true,
      converted: true,
      commissionEarned: 18000,
      referredAt: "12 Oct 2026",
      transactionDate: "14 Oct 2026"
    },
    {
      businessId: "demo-business-002",
      businessName: "Sample Northstar Services",
      ownerName: "Demo Service Owner",
      ownerEmail: "service@example.test",
      industry: "Professional services",
      plan: "free",
      subscriptionStatus: "trial",
      isPro: false,
      converted: false,
      commissionEarned: 0,
      referredAt: "15 Oct 2026",
      transactionDate: null
    },
    {
      businessId: "demo-business-003",
      businessName: "Sample Oakfield Pharmacy",
      ownerName: "Demo Pharmacy Owner",
      ownerEmail: "pharmacy@example.test",
      industry: "Healthcare",
      plan: "pro",
      subscriptionStatus: "active",
      isPro: true,
      converted: true,
      commissionEarned: 17500,
      referredAt: "17 Oct 2026",
      transactionDate: "18 Oct 2026"
    }
  ],
  conversions: [],
  payoutRequests: [
    {
      _id: "demo-payout-pending",
      amountRequested: 5000,
      createdAt: "2026-10-16T12:00:00.000Z",
      status: "pending",
      note: "Illustrative pending request. No money was requested."
    }
  ],
  withdrawalHistory: [
    {
      _id: "demo-payout-paid",
      amount: 18000,
      date: "2026-10-10T12:00:00.000Z",
      status: "paid"
    }
  ]
});

function readState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    return { version: 1, user: null, profile: {}, claims: [], dashboard: createDemoDashboard() };
  }

  const state = JSON.parse(stored);
  if (!state || state.version !== 1 || !Array.isArray(state.claims)) {
    throw new Error("Local demo data is invalid. Clear this site's local demo data and create the demo account again.");
  }
  return { ...state, dashboard: state.dashboard || createDemoDashboard() };
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createSession(user) {
  return { token: DEMO_TOKEN, refreshToken: DEMO_TOKEN, user };
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
    role: "affiliate",
    affiliateCode: "VIDEO204",
    industryType: "retail",
    isPro: false
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
    throw new Error("No local demo account matches this email. Create one from the Partner Signup page first.");
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
    return { user: state.user, business: null };
  }
  if (path === "/billing/pricing" && method === "GET") return { data: {} };
  if (path === "/business" && method === "GET") return null;

  const state = requireDemoAccount();
  const body = parseBody(options);

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
