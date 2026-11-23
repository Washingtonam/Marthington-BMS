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

  it("shows the three platforms, grouped services, and the partner call to action", async () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Marthington BMS" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Marthington Storefronts" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Marthington Partners Portal" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Delegate the work. Keep control." })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "The Referral Partnership Program" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Services and Capabilities" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "POS & Sales" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Daily Reports" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Financial & Inventory Reports" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Staff & Permissions" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Branch Management" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Services & Scheduling" })).toBeTruthy();
    expect(screen.getByText("Less than ₦415/day to run your entire business")).toBeTruthy();
    expect(screen.getByRole("link", { name: /View Full Pricing & Compare Plans/ }).getAttribute("href")).toBe("/pricing");
    expect(await screen.findByText(/Earn 10% on qualifying subscription payments/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Partners" }).getAttribute("href")).toBe("#partners");
    expect(screen.getAllByRole("link", { name: "Storefronts" }).every((link) => link.getAttribute("href") === "/shop")).toBe(true);
    expect(screen.getAllByRole("link", { name: /Become a Partner/ }).every((link) => link.getAttribute("href") === "/affiliate-register")).toBe(true);

    const navItems = Array.from(screen.getByRole("navigation", { name: "Main navigation" }).querySelectorAll("a"))
      .map((link) => link.textContent.trim());
    expect(navItems).toEqual(["Services", "Platform", "Team", "Pricing", "Partners", "Storefronts", "Login", "Start Free"]);

    const sectionIds = Array.from(document.querySelectorAll("#services, #platform, #team, #pricing, #partners"))
      .map((section) => section.id);
    expect(sectionIds).toEqual(["services", "platform", "team", "pricing", "partners"]);
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

  it("smooth-scrolls navbar links to sections without changing routes", () => {
    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    const pricingSection = container.querySelector("#pricing");
    pricingSection.scrollIntoView = vi.fn();

    fireEvent.click(screen.getByRole("link", { name: "Pricing" }));

    expect(pricingSection.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
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
