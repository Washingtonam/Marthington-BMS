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

    expect(session.user).toMatchObject({ role: "affiliate", email: demoEmail, affiliateCode: "VIDEO204" });
    expect(storedState).not.toContain("discard-this-demo-password");
    expect(loginAffiliateDemo({ email: demoEmail, password: "any-non-empty-value" }).user.email).toBe(demoEmail);
  });

  it("provides labelled sample referrals, published terms, and local-only payout history", async () => {
    registerAffiliateDemo({
      name: "Video Demo Partner",
      email: demoEmail,
      password: "discard-this-demo-password"
    });

    const dashboard = await requestAffiliateDemo("/affiliates/dashboard");
    const payoutHistory = await requestAffiliateDemo("/affiliates/payouts");

    expect(dashboard.affiliate.currentRate).toBe(20);
    expect(dashboard.referrals).toHaveLength(3);
    expect(dashboard.referrals.every((entry) => entry.ownerEmail.endsWith(".test"))).toBe(true);
    expect(payoutHistory.withdrawalHistory).toHaveLength(1);
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
    expect((await requestAffiliateDemo("/affiliates/dashboard")).affiliate.available).toBe(11500);
    await expect(requestAffiliateDemo("/auth/forgot-password", { method: "POST" }))
      .rejects.toThrow("No live service was contacted");
  });

  it("serves public landing-page pricing without requiring a demo login", async () => {
    await expect(requestAffiliateDemo("/billing/pricing")).resolves.toEqual({ data: {} });
  });
});
