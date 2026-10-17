import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminBusinessView from "../pages/AdminBusinessView.jsx";

const mockRequest = vi.fn();
const mockNavigate = vi.fn();
const mockStartImpersonation = vi.fn();
const mockRefreshBusiness = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../api/client.js", () => ({
  default: (...args) => mockRequest(...args),
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    startImpersonation: mockStartImpersonation,
    refreshBusiness: mockRefreshBusiness,
  }),
}));

describe("Admin business details", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mockRequest.mockReset();
    mockNavigate.mockReset();
    mockStartImpersonation.mockReset();
    mockRefreshBusiness.mockReset();
    mockRequest.mockImplementation((path) => {
      if (path === "/admin/business/business1") {
        return Promise.resolve({
          business: {
            _id: "business1",
            name: "Test Business",
            status: "active",
            subscription: { plan: "free", status: "trial" },
          },
          products: [],
          sales: [],
          users: [
            {
              _id: "user1",
              name: "Ada User",
              email: "ada@example.com",
              role: "staff",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ message: "User password updated." });
    });
  });

  it("allows resetting a selected tenant user's password from the staff tab", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/business/business1"]}>
        <Routes>
          <Route path="/admin/business/:id" element={<AdminBusinessView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Test Business" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Staff/ }));
    fireEvent.click(screen.getByRole("button", { name: "Set password" }));
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password-123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "new-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/admin/business/business1/users/user1/password",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ password: "new-password-123" }),
        })
      );
    });
    expect((await screen.findByRole("status")).textContent).toContain("User password updated.");
  });
});
