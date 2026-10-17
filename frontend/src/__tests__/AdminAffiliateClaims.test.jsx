import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminAffiliateNetwork from "../pages/AdminAffiliateNetwork.jsx";

const { mockRequest, mockGetCommissionClaims, mockProcessCommissionClaim } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
  mockGetCommissionClaims: vi.fn(),
  mockProcessCommissionClaim: vi.fn()
}));

vi.mock("../api/client.js", () => ({ default: mockRequest }));
vi.mock("../api/admin.js", () => ({
  getCommissionClaims: mockGetCommissionClaims,
  processCommissionClaim: mockProcessCommissionClaim
}));

describe("admin supplemental commission review", () => {
  beforeEach(() => {
    mockRequest.mockReset().mockResolvedValue({ affiliates: [], globalRate: 20, stats: {} });
    mockGetCommissionClaims.mockReset().mockResolvedValue({
      claims: [{
        _id: "claim-1",
        kind: "cpa",
        title: "Verified signup",
        amount: 750,
        status: "pending",
        evidence: "Business completed the verified signup",
        createdAt: "2026-10-17T12:00:00.000Z",
        affiliate: { name: "Amina Bello", affiliateCode: "AMINA01" },
        business: { name: "Bello Stores" }
      }]
    });
    mockProcessCommissionClaim.mockReset().mockResolvedValue({ message: "Commission claim approved." });
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows pending claim evidence and confirms wallet credit on approval", async () => {
    render(<AdminAffiliateNetwork />);

    expect(await screen.findByText("Business completed the verified signup")).toBeTruthy();
    expect(screen.getByText("Amina Bello · AMINA01 · Bello Stores")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Approve & credit" }));

    await waitFor(() => expect(mockProcessCommissionClaim).toHaveBeenCalledWith("claim-1", "approve", ""));
    await waitFor(() => expect(screen.queryByText("Verified signup")).toBeNull());
  });
});
