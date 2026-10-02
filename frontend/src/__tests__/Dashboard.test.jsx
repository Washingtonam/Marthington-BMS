import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard.jsx";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  getAnalytics: vi.fn(),
  useAuth: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mocks.navigate,
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
    mocks.navigate.mockReset();
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
      if (path === "/invoices/outstanding-summary") {
        return {
          receivables: {
            people: [{ _id: "customer-1", name: "Mina Cole", balanceDue: 1200, invoiceCount: 1 }],
            totalBalanceDue: 1200,
            invoiceCount: 1,
            peopleCount: 1,
          },
          payables: {
            people: [{ _id: "supplier-1", name: "North Star Supply", balanceDue: 800, invoiceCount: 2 }],
            totalBalanceDue: 800,
            invoiceCount: 2,
            peopleCount: 1,
          },
        };
      }
      if (path === "/expenses?status=pending") return { expenses: [{ _id: "expense-1" }] };
      return {};
    });
  });

  it("shows customer receivables, supplier payables, and pending approvals", async () => {
    renderDashboard();

    expect(await screen.findByText("Sales profit before expenses · all time")).toBeTruthy();
    expect(screen.getByText("Approved expense records · all time")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Customers owing us" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Suppliers we owe" })).toBeTruthy();
    expect(screen.getAllByText("Mina Cole").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("North Star Supply")).toBeTruthy();
    expect(screen.getAllByText("₦1,200").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("1 customers · 1 open invoice")).toBeTruthy();
    expect(screen.getByText("2 open invoices")).toBeTruthy();
    expect(screen.getAllByText("Sale #R-104").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /expense approvals \(1\)/i })).toBeTruthy();

    screen.getByRole("button", { name: /Mina Cole.*1 open invoice.*₦1,200/ }).click();
    expect(mocks.navigate).toHaveBeenCalledWith("/app/customers/customer-1");
    screen.getByRole("button", { name: /North Star Supply.*2 open invoices.*₦800/ }).click();
    expect(mocks.navigate).toHaveBeenCalledWith("/app/suppliers/supplier-1");
  });

  it("renders compact quick actions with badges and unified module launchers", async () => {
    mocks.request.mockImplementation(async (path) => {
      if (path === "/sales?limit=10") return { sales: [{ _id: "sale-1", receiptId: "R-104", customerName: "Mina Cole", totalAmount: 1800, createdAt: "2026-09-29T10:00:00.000Z" }] };
      if (path === "/sales?paymentStatus=pending&limit=1") return { sales: [], pagination: { total: 115 } };
      if (path === "/invoices/outstanding-summary") return { receivables: { people: [], peopleCount: 0, totalBalanceDue: 0, invoiceCount: 0 }, payables: { people: [], peopleCount: 0, totalBalanceDue: 0, invoiceCount: 0 } };
      if (path === "/expenses?status=pending") return { expenses: [{ _id: "expense-1" }] };
      return {};
    });

    renderDashboard();

    expect(await screen.findByRole("heading", { name: /quick workflows|quick actions/i })).toBeTruthy();
    expect(screen.getByText("115")).toBeTruthy();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /module launchers|module launcher/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /inventory/i })).toBeTruthy();
  });

  it("omits debt sections when there are no outstanding balances", async () => {
    mocks.request.mockImplementation(async (path) => {
      if (path === "/sales?limit=10") return { sales: [] };
      if (path === "/sales?paymentStatus=pending&limit=1") return { sales: [], pagination: { total: 0 } };
      if (path === "/invoices/outstanding-summary") {
        return {
          receivables: { people: [], peopleCount: 0, totalBalanceDue: 0, invoiceCount: 0 },
          payables: { people: [], peopleCount: 0, totalBalanceDue: 0, invoiceCount: 0 },
        };
      }
      if (path === "/expenses?status=pending") return { expenses: [] };
      return {};
    });

    renderDashboard();

    expect(await screen.findByRole("heading", { name: "Recent activity" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Customers owing us" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Suppliers we owe" })).toBeNull();
  });
});
