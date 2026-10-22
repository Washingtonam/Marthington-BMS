import { beforeEach, describe, expect, it } from "vitest";
import {
  loginAffiliateDemo,
  registerAffiliateDemo,
  requestAffiliateDemo
} from "../api/affiliateDemo.js";

const demoEmail = "demo@marthington.com";

describe("browser-only affiliate demo", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the demo account in this browser without storing the entered password", () => {
    const session = registerAffiliateDemo({
      name: "Video Demo Partner",
      email: demoEmail,
      password: "discard-this-demo-password"
    });
    const storedState = localStorage.getItem("marthington_affiliate_demo_v1");

    expect(session.user).toMatchObject({ role: "owner", email: demoEmail, affiliateCode: "VIDEO204", isDemo: true });
    expect(session.business).toMatchObject({ _id: "local-demo-business", name: "Video Demo Market" });
    expect(storedState).not.toContain("discard-this-demo-password");
    expect(loginAffiliateDemo({ email: demoEmail, password: "any-non-empty-value" }).user.email).toBe(demoEmail);
  });

  it("provides ten sample businesses and the published subscription commission example", async () => {
    registerAffiliateDemo({
      name: "Video Demo Partner",
      email: demoEmail,
      password: "discard-this-demo-password"
    });

    const dashboard = await requestAffiliateDemo("/affiliates/dashboard");
    const payoutHistory = await requestAffiliateDemo("/affiliates/payouts");

    expect(dashboard.affiliate.currentRate).toBe(10);
    expect(dashboard.affiliate.earned).toBe(78000);
    expect(dashboard.referrals).toHaveLength(10);
    expect(dashboard.referrals.every((entry) => entry.ownerEmail.endsWith(".test"))).toBe(true);
    expect(dashboard.referrals.filter((entry) => entry.billingCycle === "yearly")).toHaveLength(5);
    expect(dashboard.referrals.filter((entry) => entry.billingCycle === "monthly")).toHaveLength(2);
    expect(dashboard.referrals.filter((entry) => !entry.isPro)).toHaveLength(3);
    expect(dashboard.referrals.filter((entry) => entry.billingCycle === "yearly").reduce((sum, entry) => sum + entry.commissionEarned, 0)).toBe(75000);
    expect(dashboard.referrals.filter((entry) => entry.billingCycle === "monthly").reduce((sum, entry) => sum + entry.commissionEarned, 0)).toBe(3000);
    expect(dashboard.affiliate.commissionSchedule).toMatchObject({
      monthlySubscriptionPrice: 15000,
      yearlySubscriptionPrice: 150000,
      yearlySavings: 30000,
      subscriptionCommissionRate: 10
    });
    expect(payoutHistory.withdrawalHistory).toHaveLength(0);
  });

  it("simulates payout actions locally and rejects unsupported API calls", async () => {
    registerAffiliateDemo({
      name: "Video Demo Partner",
      email: demoEmail,
      password: "discard-this-demo-password"
    });

    const result = await requestAffiliateDemo("/affiliates/payouts", {
      method: "POST",
      body: JSON.stringify({ amount: 1000 })
    });

    expect(result.message).toContain("No payout was sent or requested");
    expect((await requestAffiliateDemo("/affiliates/dashboard")).affiliate.available).toBe(77000);
    await expect(requestAffiliateDemo("/auth/forgot-password", { method: "POST" }))
      .rejects.toThrow("No live service was contacted");
  });

  it("serves public landing-page pricing without requiring a demo login", async () => {
    await expect(requestAffiliateDemo("/billing/pricing")).resolves.toEqual({ data: {} });
  });

  it("provides one local demo session across BMS and Storefront", async () => {
    registerAffiliateDemo({
      name: "Video Demo Partner",
      email: demoEmail,
      password: "discard-this-demo-password"
    });

    const bmsSession = await requestAffiliateDemo("/auth/modes/bms", { method: "POST" });
    const business = await requestAffiliateDemo("/business");
    const products = await requestAffiliateDemo("/products?limit=20");
    const storeSession = await requestAffiliateDemo("/shop/customers/link", { method: "POST" });
    const storefront = await requestAffiliateDemo("/shop/?page=1&limit=24");

    expect(bmsSession.user).toMatchObject({ role: "owner", isDemo: true });
    expect(business._id).toBe("local-demo-business");
    expect(products.products).toHaveLength(4);
    expect(products.pagination.totalProducts).toBe(4);
    expect(storeSession.token).toBe("local-demo-shop-session");
    expect(storefront.products).toHaveLength(4);
    expect(storefront.products[0].business.name).toBe("Video Demo Market");
  });

  it("keeps BMS edits and simulated Storefront orders local", async () => {
    registerAffiliateDemo({
      name: "Video Demo Partner",
      email: demoEmail,
      password: "discard-this-demo-password"
    });

    await requestAffiliateDemo("/products", {
      method: "POST",
      body: JSON.stringify({ name: "Sample Demo Product", sellingPrice: 12000, costPrice: 8000, stock: 5, category: "Demo" })
    });
    const order = await requestAffiliateDemo("/shop/orders", {
      method: "POST",
      body: JSON.stringify({ addressId: "demo-address-home", items: [{ productId: "demo-product-rice", quantity: 1 }] })
    });
    const products = await requestAffiliateDemo("/products");

    expect(order.demo).toBe(true);
    expect(order.message).toContain("No payment was started");
    expect(products.products.some((product) => product.name === "Sample Demo Product")).toBe(true);
    await expect(requestAffiliateDemo("/payment/initialize", { method: "POST" }))
      .rejects.toThrow("No live service was contacted");
  });
});
