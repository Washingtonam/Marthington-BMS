import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsers from "../pages/AdminUsers.jsx";

const mockRequest = vi.fn();

vi.mock("../api/client.js", () => ({
  default: (...args) => mockRequest(...args)
}));

describe("Admin users", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockImplementation((path) => {
      if (path.startsWith("/admin/users?")) {
        return Promise.resolve({
          users: [
            {
              _id: "user-1",
              name: "Ada Owner",
              email: "ada@example.com",
              role: "owner",
              business: { name: "Ada's Business" },
              isActive: true
            },
            {
              _id: "admin-1",
              name: "Current Admin",
              email: "admin@example.com",
              role: "super_admin",
              isCurrentUser: true,
              isActive: true
            }
          ]
        });
      }
      if (path === "/admin/users/user-1/role") {
        return Promise.resolve({ user: { role: "super_admin" } });
      }
      return Promise.resolve({});
    });
  });

  it("shows users and allows a super admin to promote another account", async () => {
    render(<AdminUsers />);

    expect(await screen.findByText("Ada Owner")).toBeTruthy();
    expect(screen.getByText("Ada's Business")).toBeTruthy();
    expect(screen.getByLabelText("Role for Current Admin").disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Role for Ada Owner"), {
      target: { value: "super_admin" }
    });

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith("/admin/users/user-1/role", {
        method: "PATCH",
        body: JSON.stringify({ role: "super_admin" })
      });
    });
    expect((await screen.findByRole("status")).textContent).toContain("Updated Ada Owner's role to super admin.");
    expect(screen.getByLabelText("Role for Ada Owner").value).toBe("super_admin");
  });

  it("displays a server error when a role update is rejected", async () => {
    mockRequest.mockImplementation((path) => {
      if (path.startsWith("/admin/users?")) {
        return Promise.resolve({
          users: [{ _id: "user-1", name: "Ada Owner", email: "ada@example.com", role: "owner", isActive: true }]
        });
      }
      return Promise.reject(new Error("The last active super admin cannot be demoted"));
    });
    render(<AdminUsers />);

    fireEvent.change(await screen.findByLabelText("Role for Ada Owner"), {
      target: { value: "super_admin" }
    });

    expect((await screen.findByRole("alert")).textContent).toContain("The last active super admin cannot be demoted");
  });
});
