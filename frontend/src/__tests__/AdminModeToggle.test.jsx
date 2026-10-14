// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import AdminModeToggle from "../components/AdminModeToggle.jsx";

const { mockUseAuth, mockEnsureWorkspace, mockEnsureBms, mockActivateAgent, mockLinkShop, mockSaveShop } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockEnsureWorkspace: vi.fn(),
  mockEnsureBms: vi.fn(),
  mockActivateAgent: vi.fn(),
  mockLinkShop: vi.fn(),
  mockSaveShop: vi.fn()
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("../api/shop.js", () => ({
  linkMarketplaceAccount: mockLinkShop,
  saveShopSession: mockSaveShop
}));

const CurrentPath = () => {
  const { pathname } = useLocation();
  return <span>{pathname}</span>;
};

const renderSwitcher = (initialPath = "/admin") => render(
  <MemoryRouter initialEntries={[initialPath]}>
    <AdminModeToggle />
    <CurrentPath />
    <Routes>
      <Route path="/admin" element={<div>Admin panel</div>} />
      <Route path="/app" element={<div>BMS panel</div>} />
      <Route path="/partners/dashboard" element={<div>Agent dashboard</div>} />
      <Route path="/shop" element={<div>Storefront</div>} />
    </Routes>
  </MemoryRouter>
);

describe("AdminModeToggle", () => {
  const stopImpersonation = vi.fn();

  afterEach(() => cleanup());

  beforeEach(() => {
    stopImpersonation.mockReset();
    mockEnsureWorkspace.mockReset().mockResolvedValue({ _id: "own-business" });
    mockEnsureBms.mockReset().mockResolvedValue({ _id: "business" });
    mockActivateAgent.mockReset().mockResolvedValue({ affiliateCode: "AGENT123" });
    mockLinkShop.mockReset().mockResolvedValue({ token: "shop-session", customer: { id: "shopper" } });
    mockSaveShop.mockReset();
    mockUseAuth.mockReturnValue({
      user: { role: "super_admin", business: null },
      stopImpersonation,
      ensureSuperAdminWorkspace: mockEnsureWorkspace,
      ensureBmsWorkspace: mockEnsureBms,
      activateAgentMode: mockActivateAgent
    });
  });

  it("opens the Mode menu and switches to the BMS workspace", async () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole("button", { name: "Open mode switcher" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "BMS" }));

    expect(stopImpersonation).toHaveBeenCalledOnce();
    expect(mockEnsureWorkspace).toHaveBeenCalledOnce();
    expect(await screen.findByText("/app")).toBeTruthy();
    expect(screen.getByText("BMS panel")).toBeTruthy();
  });

  it("switches from BMS back to Super Admin", () => {
    renderSwitcher("/app");

    fireEvent.click(screen.getByRole("button", { name: "Open mode switcher" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Super Admin" }));

    expect(stopImpersonation).toHaveBeenCalledOnce();
    expect(screen.getByText("/admin")).toBeTruthy();
    expect(screen.getByText("Admin panel")).toBeTruthy();
  });

  it("activates the linked Agent profile before opening the dashboard", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: "owner" },
      stopImpersonation,
      ensureSuperAdminWorkspace: mockEnsureWorkspace,
      ensureBmsWorkspace: mockEnsureBms,
      activateAgentMode: mockActivateAgent
    });
    renderSwitcher("/app");

    fireEvent.click(screen.getByRole("button", { name: "Open mode switcher" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Agents" }));

    expect(mockActivateAgent).toHaveBeenCalledOnce();
    expect(await screen.findByText("Agent dashboard")).toBeTruthy();
  });

  it("stores a separate marketplace session before opening Storefront", async () => {
    mockUseAuth.mockReturnValue({
      user: { role: "owner" },
      stopImpersonation,
      ensureSuperAdminWorkspace: mockEnsureWorkspace,
      ensureBmsWorkspace: mockEnsureBms,
      activateAgentMode: mockActivateAgent
    });
    renderSwitcher("/app");

    fireEvent.click(screen.getByRole("button", { name: "Open mode switcher" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Storefront" }));

    expect(mockLinkShop).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(mockSaveShop).toHaveBeenCalledWith({ token: "shop-session", customer: { id: "shopper" } });
    });
    expect(await screen.findByText("/shop")).toBeTruthy();
  });
});
