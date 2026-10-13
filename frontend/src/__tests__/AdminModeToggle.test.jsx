import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import AdminModeToggle from "../components/AdminModeToggle.jsx";

const { mockUseAuth, mockEnsureWorkspace } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockEnsureWorkspace: vi.fn(),
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => mockUseAuth(),
}));

const CurrentPath = () => {
  const { pathname } = useLocation();
  return <span>{pathname}</span>;
};

const renderToggle = (initialPath = "/admin") => render(
  <MemoryRouter initialEntries={[initialPath]}>
    <AdminModeToggle />
    <CurrentPath />
    <Routes>
      <Route path="/admin" element={<div>Admin panel</div>} />
      <Route path="/app" element={<div>BMS panel</div>} />
    </Routes>
  </MemoryRouter>
);

describe("AdminModeToggle", () => {
  const stopImpersonation = vi.fn();

  afterEach(() => cleanup());

  beforeEach(() => {
    stopImpersonation.mockReset();
    mockEnsureWorkspace.mockReset().mockResolvedValue({ _id: "own-business" });
    mockUseAuth.mockReturnValue({
      user: { role: "super_admin", business: null },
      stopImpersonation,
      ensureSuperAdminWorkspace: mockEnsureWorkspace,
    });
  });

  it("marks the current mode and switches to the BMS workspace", async () => {
    renderToggle();

    expect(screen.getByRole("button", { name: "Super Admin" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "My BMS" }));

    expect(stopImpersonation).toHaveBeenCalledOnce();
    expect(mockEnsureWorkspace).toHaveBeenCalledOnce();
    expect(await screen.findByText("/app")).toBeTruthy();
    expect(screen.getByText("BMS panel")).toBeTruthy();
  });

  it("switches from the BMS workspace back to the admin panel", () => {
    renderToggle("/app");

    expect(screen.getByRole("button", { name: "My BMS" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Super Admin" }));

    expect(screen.getByText("/admin")).toBeTruthy();
    expect(screen.getByText("Admin panel")).toBeTruthy();
  });
});
