// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminLayout from "../components/AdminLayout.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { role: "super_admin", email: "admin@example.com" }, logout: vi.fn() })
}));
vi.mock("../api/notifications.js", () => ({
  getNotifications: vi.fn(async () => ({ notifications: [], unreadCount: 0 })),
  markNotificationAsRead: vi.fn()
}));
vi.mock("../components/AdminModeToggle.jsx", () => ({ default: () => <div>Mode</div> }));

afterEach(cleanup);

describe("Admin layout navigation", () => {
  it("keeps the branded sidebar visible when opening the agent ledger", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<p>Admin home</p>} />
            <Route path="affiliates" element={<p>Agent ledger details</p>} />
            <Route path="wild-thoughts" element={<p>Wild thoughts workspace</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Super Admin")).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: /Agent ledger/ }));
    expect(await screen.findByText("Agent ledger details")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Super admin navigation" })).toBeTruthy();
    expect(screen.getByAltText("Marthington")).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: /Wild Thoughts/ }));
    expect(await screen.findByText("Wild thoughts workspace")).toBeTruthy();
  });

  it("opens and closes the responsive sidebar from the hamburger controls", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<p>Admin home</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Open admin sidebar" }));
    expect(screen.getByRole("navigation", { name: "Super admin navigation" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close sidebar" }));
    expect(screen.getByRole("button", { name: "Open admin sidebar" })).toBeTruthy();
  });
});
