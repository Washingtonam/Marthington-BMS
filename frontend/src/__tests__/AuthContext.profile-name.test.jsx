// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRequest = vi.fn();

vi.mock("../api/auth.js", () => ({
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn()
}));

vi.mock("../api/affiliateAuth.js", () => ({
  registerAffiliateUser: vi.fn()
}));

vi.mock("../api/business.js", () => ({
  getBusiness: vi.fn()
}));

vi.mock("../api/client.js", () => ({
  default: (...args) => mockRequest(...args)
}));

vi.mock("../api/offlineDb.js", () => ({
  db: { products: { clear: vi.fn() } }
}));

vi.mock("../components/AdminModeToggle.jsx", () => ({
  default: () => null
}));

vi.mock("../context/BrandingContext.jsx", () => ({
  useBranding: () => ({ businessName: "" })
}));

import { MemoryRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext.jsx";
import Topbar from "../components/layout/Topbar.jsx";

const ProfileNameUpdater = () => {
  const { updateProfileName } = useAuth();
  return (
    <button type="button" onClick={() => updateProfileName("Updated User")}>
      Update profile name
    </button>
  );
};

describe("BMS profile name propagation", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    localStorage.clear();
    localStorage.setItem("bms_user", JSON.stringify({
      name: "Original User",
      email: "user@example.com",
      role: "owner"
    }));
    mockRequest.mockReset();
    mockRequest.mockResolvedValue({
      name: "Updated User",
      message: "Name updated successfully."
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("updates the account menu and stored user without submitting an email change", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ProfileNameUpdater />
          <Topbar />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Original User")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Update profile name" }));

    await waitFor(() => {
      expect(screen.getByText("Updated User")).toBeTruthy();
      expect(JSON.parse(localStorage.getItem("bms_user")).name).toBe("Updated User");
    });
    expect(mockRequest).toHaveBeenCalledWith("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated User" })
    });
    expect(mockRequest.mock.calls[0][1].body).not.toContain("email");
  });
});
