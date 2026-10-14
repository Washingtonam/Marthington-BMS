// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import request from "../api/client.js";
import AdminRevenue from "../pages/AdminRevenue.jsx";

vi.mock("../api/client.js", () => ({ default: vi.fn() }));
vi.mock("recharts", () => ({
  Area: () => null,
  AreaChart: () => null,
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null
}));

const revenue = {
  tenantSales: {
    total: 125000,
    saleCount: 14,
    changePercent: 12.5,
    trend: [{ _id: "2026-06-01", amount: 125000, count: 14 }],
    topBusinesses: [{ businessId: "b1", businessName: "Northwind", amount: 125000, saleCount: 14 }]
  },
  platform: {
    activeSubscriptions: 2,
    activeSubscriptionDetails: [
      {
        businessId: "b1",
        businessName: "Northwind",
        ownerName: "Ada Owner",
        ownerEmail: "ada@example.com",
        billingCycle: "monthly",
        amount: 15000,
        currency: "NGN",
        expiresAt: "2026-12-01T00:00:00.000Z"
      },
      {
        businessId: "b2",
        businessName: "Legacy Clinic",
        ownerName: "Lee Owner",
        amount: 80,
        currency: null,
        expiresAt: null
      }
    ],
    unrecordedCurrencySubscriptions: 1,
    unrecordedCurrencyDetails: [{
      businessId: "b2",
      businessName: "Legacy Clinic",
      ownerName: "Lee Owner",
      amount: 80,
      currency: null,
      expiresAt: null
    }],
    captured: {
      NGN: { gross: 15000, commissions: 3000, net: 12000, count: 1 },
      USD: { gross: 10, commissions: 0, net: 10, count: 1 }
    },
    previousCaptured: {
      NGN: { gross: 12000, commissions: 0, net: 12000, count: 1 },
      USD: { gross: 0, commissions: 0, net: 0, count: 0 }
    },
    monthlyRunRate: { NGN: 12000, USD: 10 },
    unrecordedCurrencySubscriptions: 1,
    trend: [{ date: "2026-06-01", currency: "NGN", gross: 15000, commissions: 3000, net: 12000 }],
    latestPayments: [{
      businessName: "Northwind",
      reference: "pay-1",
      billingCycle: "monthly",
      gateway: "paystack",
      currency: "NGN",
      amount: 15000,
      paidAt: "2026-06-01T12:00:00.000Z"
    }],
    capturedPayments: [{
      businessName: "Northwind",
      reference: "pay-1",
      billingCycle: "monthly",
      gateway: "paystack",
      currency: "NGN",
      amount: 15000,
      affiliateCommission: 3000,
      paidAt: "2026-06-01T12:00:00.000Z"
    }],
    historyNotice: "Historical receipt tracking note."
  }
};

describe("admin revenue dashboard", () => {
  afterEach(() => {
    cleanup();
    request.mockReset();
  });

  it("separates tenant sales from platform receipts and loads the selected range", async () => {
    request.mockResolvedValue(revenue);
    render(<MemoryRouter><AdminRevenue /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Sales generated across tenants" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Subscription receipts and run-rate" })).toBeTruthy();
    expect(screen.getAllByText("Northwind").length).toBeGreaterThan(0);
    expect(screen.getByText("Historical receipt tracking note.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Active paid subscriptions/ }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Active paid subscriptions" })).toBeTruthy();
    expect(screen.getByText("Legacy Clinic")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));

    fireEvent.click(screen.getByRole("button", { name: /Subscription cash received · NGN/ }));
    expect(await screen.findByRole("heading", { name: "Subscription cash received · NGN" })).toBeTruthy();
    expect(screen.getByText(/Verified subscription payment receipts captured during last 30 days/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));

    fireEvent.change(screen.getByRole("combobox", { name: "Revenue reporting period" }), {
      target: { value: "90d" }
    });
    await waitFor(() => {
      expect(request).toHaveBeenLastCalledWith("/admin/revenue?range=90d");
    });
  });
});
