import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ForgotPassword from "../pages/ForgotPassword.jsx";
import ResetPassword from "../pages/ResetPassword.jsx";

const { mockRequestPasswordReset, mockResetPassword } = vi.hoisted(() => ({
  mockRequestPasswordReset: vi.fn(),
  mockResetPassword: vi.fn()
}));

vi.mock("../api/auth.js", () => ({
  requestPasswordReset: mockRequestPasswordReset,
  resetPassword: mockResetPassword
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("password reset pages", () => {
  it("submits an email and displays the generic confirmation", async () => {
    mockRequestPasswordReset.mockResolvedValue({
      message: "If an account exists for that email, a password reset link will be sent."
    });
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith("owner@example.com");
      expect(screen.getByRole("status").textContent).toMatch(/If an account exists/);
    });
    expect(screen.getByRole("link", { name: "Back to login" }).getAttribute("href")).toBe("/login");
  });

  it("checks password confirmation before submitting a reset", async () => {
    render(
      <MemoryRouter initialEntries={["/reset-password?token=valid-token"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "password-one" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "password-two" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Passwords do not match.");
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("submits the reset token and new password", async () => {
    mockResetPassword.mockResolvedValue({ message: "Password reset successfully. You can now log in." });
    render(
      <MemoryRouter initialEntries={["/reset-password?token=secure-reset-token"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-secure-password" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        token: "secure-reset-token",
        newPassword: "new-secure-password"
      });
      expect(screen.getByRole("status").textContent).toMatch(/reset successfully/i);
    });
  });
});
