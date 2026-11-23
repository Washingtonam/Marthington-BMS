import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("../api/client.js", () => ({
  default: vi.fn().mockResolvedValue({
    data: {
      monthly: { ngn: 15000 },
      yearly: { ngn: 150000 }
    },
    commissionRate: 10,
    planAccess: {
      free: { products: 20, staff: 1, posProducts: 500, features: {} },
      pro: { products: null, staff: null, posProducts: null, features: {} }
    }
  })
}));

import Landing from "../pages/Landing.jsx";

describe("public landing page", () => {
  afterEach(cleanup);

  it("shows product previews, assistant controls, and an agent call to action", async () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Smart POS & digital receipts" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Executive, multi-sector view" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Partner wallet & conversions" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Delegate the work. Keep control." })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "The Referral Partnership Program" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Services and Capabilities" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "POS & sales" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Daily reports" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Financial & inventory reports" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Staff & permissions" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Branch management" })).toBeTruthy();
    expect(await screen.findByText(/Earn 10% on qualifying subscription payments/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Partners" }).getAttribute("href")).toBe("/login?next=%2Fpartners%2Fdashboard");
    expect(screen.getAllByRole("link", { name: "Storefronts" }).every((link) => link.getAttribute("href") === "/shop")).toBe(true);
    expect(screen.getAllByRole("link", { name: /Become a Partner/ }).every((link) => link.getAttribute("href") === "/affiliate-register")).toBe(true);
  });

  it("switches between retail, school, and hospital workspace previews", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Point of Sale Terminal" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Schools" }));
    expect(screen.getByRole("tab", { name: "Schools" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("heading", { name: "Academic Overview" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Hospitals" }));
    expect(screen.getByRole("tab", { name: "Hospitals" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("heading", { name: "Clinical Hub Terminal" })).toBeTruthy();
  });

  it("carries an optional referral code into workspace registration links", () => {
    render(
      <MemoryRouter initialEntries={["/?ref=AGENT-42"]}>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getAllByRole("link", { name: /Start Free|Start Free, Then Upgrade to Pro/ })
      .every((link) => link.getAttribute("href") === "/register?ref=AGENT-42")).toBe(true);
  });
});
