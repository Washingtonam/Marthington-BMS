import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PartnerCommission from "../pages/PartnerCommission.jsx";
import PartnerGuides from "../pages/PartnerGuides.jsx";

vi.mock("../api/affiliates.js", () => ({
  getAffiliateDashboard: vi.fn(),
  getCommissionClaims: vi.fn(),
  submitCpaClaim: vi.fn()
}));
vi.mock("../api/userGuide.js", () => ({
  getUserGuide: vi.fn()
}));

import { getAffiliateDashboard, getCommissionClaims, submitCpaClaim } from "../api/affiliates.js";
import { getUserGuide } from "../api/userGuide.js";

describe("agent feature pages", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("submits CPA claims for referred businesses and shows approval status", async () => {
    getAffiliateDashboard.mockResolvedValue({
      affiliate: {
        currentRate: 20,
        commissionSchedule: {
          cpaActions: [{ name: "Verified business signup", flatFee: 750, active: true }]
        }
      },
      referrals: [{ businessId: "business-1", businessName: "Northwind Traders" }]
    });
    getCommissionClaims.mockResolvedValue({ claims: [] });
    submitCpaClaim.mockResolvedValue({
      claim: {
        _id: "claim-1",
        title: "Verified business signup",
        amount: 750,
        status: "pending",
        evidence: "Business completed verification",
        business: { name: "Northwind Traders" }
      }
    });

    render(<PartnerCommission />);

    fireEvent.change(await screen.findByLabelText("CPA action"), {
      target: { value: "verified-business-signup" }
    });
    fireEvent.change(screen.getByLabelText("Referred business"), {
      target: { value: "business-1" }
    });
    fireEvent.change(screen.getByLabelText("Evidence or context"), {
      target: { value: "Business completed verification" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));

    await waitFor(() => expect(submitCpaClaim).toHaveBeenCalledWith({
      action: "verified-business-signup",
      businessId: "business-1",
      evidence: "Business completed verification"
    }));
    expect(await screen.findByText("pending")).toBeTruthy();
    expect(screen.getByText("Your CPA claim was submitted for administrator review.")).toBeTruthy();
  });

  it("shows configured subscription and supplemental commission terms", async () => {
    getCommissionClaims.mockResolvedValue({ claims: [] });
    getAffiliateDashboard.mockResolvedValue({
      affiliate: {
        currentRate: 18,
        commissionSchedule: {
          directReferralBonus: { amount: 1200, description: "For direct referrals" },
          cpaActions: [{ name: "Verified signup", description: "Complete onboarding", flatFee: 600, active: true }],
          payoutMilestones: [{ name: "Growth milestone", thresholdAmount: 50000, rewardAmount: 2500 }]
        }
      }
    });

    render(<PartnerCommission />);

    expect(await screen.findByText("18%")).toBeTruthy();
    expect(screen.getByText("Verified signup")).toBeTruthy();
    expect(screen.getByText("₦600")).toBeTruthy();
    expect(screen.getByText("₦1,200")).toBeTruthy();
    expect(screen.getByText("Growth milestone")).toBeTruthy();
  });

  it("renders agent tutorials published through the platform guide", async () => {
    getUserGuide.mockResolvedValue({
      guide: {
        agentTutorials: [{
          id: "campaign-review",
          title: "Review a campaign",
          category: "Analytics",
          summary: "Compare your channels.",
          steps: ["Open the dashboard.", "Compare tracked traffic."]
        }]
      }
    });

    render(<MemoryRouter><PartnerGuides /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Review a campaign" })).toBeTruthy();
    expect(screen.getByText("Compare tracked traffic.")).toBeTruthy();
  });
});
