// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import request from "../api/client.js";
import SaleDetails from "../pages/SaleDetails.jsx";

vi.mock("../api/client.js", () => ({
  default: vi.fn()
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { role: "owner" } })
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

  it("allows an owner to backdate a service and displays the recalculated end time", async () => {
    const sale = {
      receiptId: "RCP-SVC",
      createdAt: "2026-01-01T12:00:00.000Z",
      business: { name: "Northwind" },
      items: [{
        itemType: "service",
        name: "Consultation",
        quantity: 1,
        sellingPrice: 100,
        duration: 60,
        durationUnit: "minutes",
        serviceStartedAt: "2026-01-01T12:00:00.000Z",
        serviceEndsAt: "2026-01-01T13:00:00.000Z"
      }],
      totalAmount: 100
    };
    const updatedSale = {
      items: [{
        ...sale.items[0],
        serviceStartedAt: "2025-12-15T09:00:00.000Z",
        serviceEndsAt: "2025-12-15T10:00:00.000Z"
      }]
    };
    request
      .mockResolvedValueOnce(sale)
      .mockResolvedValueOnce({ sale: updatedSale });

    render(
      <MemoryRouter initialEntries={["/app/sales/sale-service"]}>
        <Routes>
          <Route path="/app/sales/:id" element={<SaleDetails />} />
        </Routes>
      </MemoryRouter>
    );

    const startInput = await screen.findByLabelText("Consultation service start");
    fireEvent.change(startInput, { target: { value: "2025-12-15T09:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save service time" }));

    await waitFor(() => {
      expect(request).toHaveBeenNthCalledWith(2, "/sales/sale-service/service-schedule/0", {
        method: "PATCH",
        body: JSON.stringify({ serviceStartedAt: new Date("2025-12-15T09:00").toISOString() })
      });
      expect(screen.getByText(/Calculated end:.*12\/15\/2025/)).toBeTruthy();
    });
  });
});
