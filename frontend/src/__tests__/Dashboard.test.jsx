import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard.jsx";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  getAnalytics: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("../api/client.js", () => ({ default: mocks.request }));
vi.mock("../api/analytics.js", () => ({ getAnalytics: mocks.getAnalytics }));
vi.mock("../context/AuthContext.jsx", () => ({ useAuth: mocks.useAuth }));
vi.mock("../utils/salesEvents.js", () => ({ subscribeToSalesUpdates: () => () => {} }));

const renderDashboard = () => render(<MemoryRouter><Dashboard /></MemoryRouter>);

describe("Dashboard", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({
      business: {},
      industryType: "retail",
      user: { role: "owner" },
    });
    mocks.getAnalytics.mockResolvedValue({
      metrics: {
        totalRevenue: 1800,
        grossProfit: 900,
        totalOperatingExpenses: 250,
        totalProfit: 650,
      },
      salesTrend: [],
    });
    mocks.request.mockImplementation(async (path) => {
      if (path === "/sales?limit=10") {
        return {
          sales: [{
            _id: "sale-1",
            receiptId: "R-104",
            customerName: "Mina Cole",
            totalAmount: 1800,
            createdAt: "2026-09-29T10:00:00.000Z",
          }],
        };
      }
      if (path === "/sales?paymentStatus=pending&limit=1") {
        return { sales: [], pagination: { total: 0 } };
      }
      if (path === "/staff") return [{ _id: "staff-1", name: "Nia Okafor", isActive: true }];
      if (path === "/customers") return [{ _id: "customer-1", name: "Mina Cole", isActive: true }];
      if (path === "/expenses?status=pending") return { expenses: [{ _id: "expense-1" }] };
      return {};
    });
  });

  it("shows financial context, actual recent sales, people, and pending approvals", async () => {
    renderDashboard();

    expect(await screen.findByText("Sales profit before expenses · all time")).toBeTruthy();
    expect(screen.getByText("Approved expense records · all time")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Active team accounts" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Active customer accounts" })).toBeTruthy();
    expect(screen.getByText("Nia Okafor")).toBeTruthy();
    expect(screen.getAllByText("Mina Cole")).toHaveLength(2);
    expect(screen.getByText("Sale #R-104")).toBeTruthy();
    expect(screen.getByRole("button", { name: /expense approvals \(1\)/i })).toBeTruthy();
  });

  it("omits active people sections when there are no active accounts", async () => {
    mocks.request.mockImplementation(async (path) => {
      if (path === "/sales?limit=10") return { sales: [] };
      if (path === "/sales?paymentStatus=pending&limit=1") return { sales: [], pagination: { total: 0 } };
      if (path === "/staff" || path === "/customers") return [];
      if (path === "/expenses?status=pending") return { expenses: [] };
      return {};
    });

    renderDashboard();

    expect(await screen.findByRole("heading", { name: "Recent activity" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Active team accounts" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Active customer accounts" })).toBeNull();
  });
});
