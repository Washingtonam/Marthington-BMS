import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("../api/client.js", () => ({
  default: vi.fn().mockResolvedValue({
    data: {
      monthly: { ngn: 15000 },
      yearly: { ngn: 150000 }
    }
  })
}));

import Pricing from "../pages/Pricing.jsx";

describe("public pricing page", () => {
  afterEach(cleanup);

  it("compares Free and Pro, explains the ROI, and answers key FAQs", async () => {
    render(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>
    );

    expect(await screen.findByText("₦150,000")).toBeTruthy();
    expect(screen.getByText("Less than ₦415/day to run your entire business")).toBeTruthy();
    expect(screen.getByText("Unlimited products and unlimited staff accounts with strict role-based permissions")).toBeTruthy();
    expect(screen.getByRole("table").querySelectorAll("tbody tr")).toHaveLength(9);
    expect(screen.getByRole("heading", { name: "Why upgrade to Pro?" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Is my business data secure?" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "How do I set up multiple branches?" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "How does Pro renewal work?" })).toBeTruthy();
  });
});
