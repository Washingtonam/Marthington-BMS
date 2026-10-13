import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute.jsx";

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("ProtectedRoute super-admin business access", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  const renderAppRoute = () => render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route
          path="/app"
          element={<ProtectedRoute><div>Business dashboard</div></ProtectedRoute>}
        />
        <Route path="/admin" element={<div>Admin dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );

  it("allows a super admin to access their linked business workspace", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: "super_admin", business: { _id: "own-business" } },
      industryType: "retail",
      impersonatedBusiness: null,
    });

    renderAppRoute();

    expect(screen.getByText("Business dashboard")).toBeTruthy();
  });

  it("keeps unlinked super admins in the admin panel", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role: "super_admin", business: null },
      industryType: "retail",
      impersonatedBusiness: null,
    });

    renderAppRoute();

    expect(screen.getByText("Admin dashboard")).toBeTruthy();
  });
});
