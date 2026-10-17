import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PartnerLayout from "../components/PartnerLayout.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: { role: "affiliate", name: "Partner", email: "partner@example.com", affiliateCode: "PARTNER" },
    logout: vi.fn()
  })
}));
vi.mock("../components/AdminModeToggle.jsx", () => ({ default: () => <div>Mode</div> }));

describe("partner layout appearance", () => {
  afterEach(() => {
    cleanup();
    localStorage.removeItem("theme");
    localStorage.removeItem("partner-theme");
    document.documentElement.classList.remove("dark", "light");
  });

  it("uses the shared BMS color mode instead of a separate partner default", () => {
    localStorage.setItem("theme", "light");
    localStorage.setItem("partner-theme", "dark");
    const { container } = render(<MemoryRouter><PartnerLayout /></MemoryRouter>);

    expect(container.querySelector("[data-partner-theme]").getAttribute("data-partner-theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("persists partner mode changes to the shared preference", () => {
    localStorage.setItem("theme", "light");
    render(<MemoryRouter><PartnerLayout /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /Dark mode/ }));
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("provides all partner routes with active-state styling", () => {
    render(<MemoryRouter initialEntries={["/partners/commission"]}><PartnerLayout /></MemoryRouter>);

    const commissionLink = screen.getByRole("link", { name: /Commission Tiers & Structure/ });
    expect(commissionLink.getAttribute("href")).toBe("/partners/commission");
    expect(commissionLink.className).toContain("bg-emerald-50");
    expect(screen.getByText("Agent Portal")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Guides & Tutorials/ }).getAttribute("href")).toBe("/partners/guides");
    expect(screen.getByRole("link", { name: /Dashboard/ }).getAttribute("href")).toBe("/partners/dashboard");
    expect(screen.getByRole("link", { name: /Live Conversions/ }).getAttribute("href")).toBe("/partners/conversions");
    expect(screen.getByRole("link", { name: /Withdrawals & Payouts/ }).getAttribute("href")).toBe("/partners/withdrawals");
    expect(screen.getByRole("link", { name: /Link History/ }).getAttribute("href")).toBe("/partners/link-history");
    expect(screen.getByRole("link", { name: /Profile & Settings/ }).getAttribute("href")).toBe("/partners/profile");
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
  });
});
