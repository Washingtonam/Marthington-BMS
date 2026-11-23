// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import request from "../api/client.js";

vi.mock("../api/client.js", () => ({
  default: vi.fn((path) => {
    if (path === "/payments/status") return Promise.resolve({ plan: "free", status: "active", daysLeft: 0 });
    if (path === "/billing/pricing") {
      return Promise.resolve({
        data: { yearly: { ngn: 150000 } },
        planAccess: {
          free: { products: 20, staff: 1, posProducts: 500, features: {} },
          pro: {
            products: null,
            staff: null,
            posProducts: null,
            features: { invoices: true, logoUpload: true, customReceiptThemes: true, businessChat: true }
          }
        }
      });
    }
    return Promise.resolve({});
  })
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ refreshBusiness: vi.fn() })
}));

import Billing from "../pages/Billing.jsx";

describe("billing plan comparison", () => {
  afterEach(() => {
    cleanup();
    request.mockClear();
  });

  it("shows Free and Pro limits, permissions, and NGN annual pricing", async () => {
    render(<Billing />);

    expect(await screen.findByRole("heading", { name: "Free Mode" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Pro Mode" })).toBeTruthy();
    expect(screen.getByText(/Up to 20 products/)).toBeTruthy();
    expect(screen.getByText(/POS product listing up to 500 items/)).toBeTruthy();
    expect(screen.getByText(/Reports remain subject to staff permissions/)).toBeTruthy();
    expect(screen.getByText(/₦150,000/)).toBeTruthy();
    expect(document.body.textContent).not.toContain("USD");
  });
});
