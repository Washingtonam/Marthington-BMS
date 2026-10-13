// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import request from "../api/client.js";
import SaleDetails from "../pages/SaleDetails.jsx";

vi.mock("../api/client.js", () => ({
  default: vi.fn()
}));

describe("sale receipt seller title", () => {
  afterEach(() => {
    cleanup();
    request.mockReset();
  });

  it.each([
    ["owner", "Owner"],
    ["manager", "Manager"],
    ["cashier", "Staff"],
    ["staff", "Staff"]
  ])("shows %s as %s without exposing the seller's name", async (role, title) => {
    request.mockResolvedValue({
      receiptId: "RCP-100",
      createdAt: "2026-01-01T12:00:00.000Z",
      createdBy: { name: "Private Seller Name", role },
      business: { name: "Northwind" },
      items: [],
      totalAmount: 0
    });

    render(
      <MemoryRouter initialEntries={["/app/sales/sale-1"]}>
        <Routes>
          <Route path="/app/sales/:id" element={<SaleDetails />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(title)).toBeTruthy();
    expect(screen.queryByText("Private Seller Name")).toBeNull();
  });
});
