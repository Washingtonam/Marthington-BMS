import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminSubscriptions from "../pages/AdminSubscriptions.jsx";
import AdminSubscriptionEmailStudio from "../pages/AdminSubscriptionEmailStudio.jsx";
import AdminSubscriptionExpirations from "../pages/AdminSubscriptionExpirations.jsx";

const mockRequest = vi.fn();

vi.mock("../api/client.js", () => ({
  default: (...args) => mockRequest(...args)
}));

describe("Admin subscriptions", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockImplementation((path) => {
      if (path === "/admin/subscriptions") {
        return Promise.resolve({
          stats: {
            total: 1,
            active: 1,
            trial: 0,
            expired: 0,
            expiringIn7Days: 1,
            expiringIn30Days: 1
          },
          subscriptions: [{
            _id: "tenant-1",
            name: "Test Academy",
            ownerName: "Ada Owner",
            ownerEmail: "ada@example.com",
            industryType: "school",
            subscription: {
              plan: "pro",
              status: "active",
              billingCycle: "monthly",
              startedAt: "2026-01-01T00:00:00.000Z",
              expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              tier: "Premium Academic Plan"
            }
          }]
        });
      }
      return Promise.resolve({});
    });
  });

  it("shows subscription expiry analysis and lets an admin update a tenant plan", async () => {
    render(
      <MemoryRouter>
        <AdminSubscriptions />
      </MemoryRouter>
    );

    expect(await screen.findByRole("link", { name: "Test Academy" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /subscription email studio/i }).getAttribute("href"))
      .toBe("/admin/subscriptions/email-studio");
    expect(screen.getByRole("link", { name: /expiring in 7 days: 1 tenants/i })).toBeTruthy();
    expect(screen.getByText("3 days left")).toBeTruthy();
    expect(screen.getByRole("link", { name: /expiring in 7 days: 1 tenants/i }).getAttribute("href"))
      .toBe("/admin/subscriptions/expiring/7");
    expect(screen.getAllByRole("link", { name: "Test Academy" })[0].getAttribute("href"))
      .toBe("/admin/business/tenant-1");

    fireEvent.click(screen.getByRole("button", { name: "Actions for Test Academy" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit subscription" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Plan for Test Academy" }), {
      target: { value: "free" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "/admin/business/tenant-1/subscription",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ plan: "free", billingCycle: null, status: "expired" })
        })
      );
    });
    expect((await screen.findByRole("status")).textContent).toContain("Subscription for Test Academy was updated.");
  });

  it("paginates the compact subscription list", async () => {
    mockRequest.mockImplementation((path) => path === "/admin/subscriptions"
      ? Promise.resolve({
        stats: { total: 11, active: 0, trial: 11, expired: 0, expiringIn7Days: 0, expiringIn30Days: 0 },
        subscriptions: Array.from({ length: 11 }, (_, index) => ({
          _id: `tenant-${index + 1}`,
          name: `Tenant ${index + 1}`,
          ownerName: `Owner ${index + 1}`,
          subscription: { plan: "free", status: "trial" }
        }))
      })
      : Promise.resolve({}));

    render(<MemoryRouter><AdminSubscriptions /></MemoryRouter>);

    expect(await screen.findByRole("link", { name: "Tenant 1" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Tenant 11" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next subscriptions page" }));
    expect(await screen.findByRole("link", { name: "Tenant 11" })).toBeTruthy();
  });

  it("opens the subscription email studio as its own audience-aware page", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/subscriptions/email-studio?audience=subscription_expiring_7"]}>
        <AdminSubscriptionEmailStudio />
      </MemoryRouter>
    );

    const audience = await screen.findByRole("combobox", { name: "Subscription email audience" });
    expect(audience.value).toBe("subscription_expiring_7");
    expect(screen.getByRole("link", { name: /back to subscriptions/i })).toBeTruthy();
  });

  it("shows the matching expiring tenant count and links business names to their profiles", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/subscriptions/expiring/7"]}>
        <Routes>
          <Route path="/admin/subscriptions/expiring/:days" element={<AdminSubscriptionExpirations />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("1 matching")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Expiring in 7 days" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Test Academy" })[0].getAttribute("href"))
      .toBe("/admin/business/tenant-1");
    expect(screen.getByText(/\d+d \d+h \d+m|\d+h \d+m/)).toBeTruthy();
  });
});
