// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "../api/client.js";
import { getServices } from "../api/services.js";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: {
      _id: "u1",
      role: "owner",
      branch: "b1",
      permissions: { canMakeSale: true, canViewSales: true }
    },
    business: {
      name: "Northwind",
      subscription: { status: "active" }
    }
  })
}));

vi.mock("../api/client.js", () => ({
  default: vi.fn((path) => {
    if (path === "/products?limit=5000&view=pos") {
      return Promise.resolve([
        { _id: "p1", name: "Laptop", category: "Tech", sellingPrice: 2500, stock: 10 },
        { _id: "p2", name: "Apple", category: "Tech", sellingPrice: 1200, stock: 8 },
        { _id: "p3", name: "Keyboard", category: "Tech", sellingPrice: 800, stock: 12 }
      ]);
    }
    if (path === "/sales") {
      return Promise.resolve({
        sale: {
          _id: "sale-1",
          receiptId: "RCP-100"
        }
      });
    }
    return Promise.resolve([]);
  })
}));

vi.mock("../api/services.js", () => ({
  getServices: vi.fn(async () => [])
}));

vi.mock("../api/branches.js", () => ({
  getBranches: vi.fn(async () => []),
  getBranchInventory: vi.fn(async () => [])
}));

vi.mock("../api/customers.js", () => ({
  getCustomers: vi.fn(async () => [])
}));

import POS from "../pages/POS.jsx";

describe("POS checkout", () => {
  beforeEach(() => {
    cleanup();
    mockNavigate.mockReset();
    request.mockClear();
    getServices.mockReset();
    getServices.mockResolvedValue([]);
  });

  it("keeps the added order by default and sorts products by name in either direction", async () => {
    render(<POS />);

    const productNames = () => screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(await screen.findByText("Laptop")).toBeTruthy();
    expect(productNames()).toEqual(["Laptop", "Apple", "Keyboard"]);

    const sortProducts = screen.getByRole("combobox", { name: "Sort products" });
    fireEvent.change(sortProducts, { target: { value: "name-asc" } });
    expect(productNames()).toEqual(["Apple", "Keyboard", "Laptop"]);

    fireEvent.change(sortProducts, { target: { value: "name-desc" } });
    expect(productNames()).toEqual(["Laptop", "Keyboard", "Apple"]);

    fireEvent.change(sortProducts, { target: { value: "added" } });
    expect(productNames()).toEqual(["Laptop", "Apple", "Keyboard"]);
  });

  it("navigates to the receipt page with a print trigger after confirming the cart", async () => {
    render(<POS />);

    expect(await screen.findByText("Laptop")).toBeTruthy();
    fireEvent.click(screen.getByText("Laptop"));
    fireEvent.click(screen.getByRole("button", { name: /confirm & print/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/app/sales/sale-1",
        expect.objectContaining({
          state: expect.objectContaining({
            autoPrint: true,
            autoSend: false
          })
        })
      );
    });
  });

  it("keeps credit checkout on the existing single-method workflow", async () => {
    render(<POS />);

    fireEvent.click(await screen.findByText("Laptop"));
    fireEvent.click(screen.getByRole("button", { name: "Open cart" }));
    const paymentMethod = screen.getByDisplayValue("Cash");
    fireEvent.change(paymentMethod, { target: { value: "credit" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm & print/i }));

    await waitFor(() => {
      const salesCall = request.mock.calls.find(([path]) => path === "/sales");
      expect(JSON.parse(salesCall[1].body)).toMatchObject({ paymentMethod: "credit" });
      expect(JSON.parse(salesCall[1].body)).not.toHaveProperty("paymentBreakdown");
    });
  });

  it("requires an exact split balance and sends the tender breakdown", async () => {
    render(<POS />);
    fireEvent.click(await screen.findByText("Laptop"));
    fireEvent.click(screen.getByRole("button", { name: "Add split payment" }));

    const confirmButton = screen.getByRole("button", { name: /confirm & print/i });
    expect(confirmButton.disabled).toBe(true);
    expect(screen.getByLabelText("Payment 1 amount").value).toBe("2500");
    expect(screen.getByLabelText("Payment 2 amount").value).toBe("0");

    fireEvent.change(screen.getByLabelText("Payment 1 amount"), { target: { value: "01500" } });
    expect(screen.getByLabelText("Payment 1 amount").value).toBe("1500");
    expect(screen.getByLabelText("Payment 2 amount").value).toBe("1000");
    expect(confirmButton.disabled).toBe(false);
    expect(screen.getByRole("status").textContent).toContain("Fully Allocated");

    fireEvent.click(confirmButton);

    await waitFor(() => {
      const salesCall = request.mock.calls.find(([path]) => path === "/sales");
      expect(JSON.parse(salesCall[1].body)).toMatchObject({
        paymentMethod: "split",
        paymentBreakdown: [
          { method: "cash", amount: 1500, reference: "" },
          { method: "bank_transfer", amount: 1000, reference: "" }
        ]
      });
    });
  });

  it("adds a remainder row, removes it, and returns to a single payment method", async () => {
    render(<POS />);
    fireEvent.click(await screen.findByText("Laptop"));
    fireEvent.click(screen.getByRole("button", { name: "Add split payment" }));

    fireEvent.change(screen.getByLabelText("Payment 1 amount"), { target: { value: "1500" } });
    fireEvent.change(screen.getByLabelText("Payment 2 amount"), { target: { value: "500" } });
    const addSplitButton = screen.getByRole("button", { name: "Add split payment" });
    expect(addSplitButton.disabled).toBe(false);

    fireEvent.click(addSplitButton);
    expect(screen.getByLabelText("Payment 3 amount").value).toBe("500");
    expect(screen.getByRole("button", { name: "Add split payment" }).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Remove payment 3" }));
    expect(screen.queryByLabelText("Payment 3 amount")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Remaining: ₦500");

    fireEvent.click(screen.getByRole("button", { name: "Remove payment 2" }));
    expect(screen.getByRole("combobox", { name: "Payment method" }).value).toBe("cash");
    expect(screen.queryByLabelText("Payment 1 amount")).toBeNull();
    expect(screen.getByRole("button", { name: /confirm & print/i }).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /confirm & print/i }));
    await waitFor(() => {
      const salesCall = request.mock.calls.find(([path]) => path === "/sales");
      expect(JSON.parse(salesCall[1].body)).toMatchObject({ paymentMethod: "cash" });
      expect(JSON.parse(salesCall[1].body)).not.toHaveProperty("paymentBreakdown");
    });
  });

  it("toggles a slim reference field only for the selected non-cash tender", async () => {
    render(<POS />);
    fireEvent.click(await screen.findByText("Laptop"));
    fireEvent.click(screen.getByRole("button", { name: "Open cart" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Payment method" }), {
      target: { value: "bank_transfer" }
    });

    expect(screen.queryByLabelText("Payment reference")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add payment reference" }));
    expect(screen.getByLabelText("Payment reference")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Payment reference"), { target: { value: "TRX-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Hide payment reference" }));
    expect(screen.queryByLabelText("Payment reference")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /confirm & print/i }));
    await waitFor(() => {
      const salesCall = request.mock.calls.find(([path]) => path === "/sales");
      expect(JSON.parse(salesCall[1].body)).toMatchObject({
        paymentMethod: "bank_transfer",
        paymentReference: "TRX-123"
      });
    });
  });

  it("keeps a transfer reference with its tender when switching to split payment", async () => {
    render(<POS />);
    fireEvent.click(await screen.findByText("Laptop"));
    fireEvent.click(screen.getByRole("button", { name: "Open cart" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Payment method" }), {
      target: { value: "bank_transfer" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add payment reference" }));
    fireEvent.change(screen.getByLabelText("Payment reference"), { target: { value: "TRX-456" } });
    fireEvent.click(screen.getByRole("button", { name: "Add split payment" }));

    expect(screen.getByLabelText("Payment 1 reference").value).toBe("TRX-456");
    fireEvent.change(screen.getByLabelText("Payment 1 amount"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm & print/i }));

    await waitFor(() => {
      const salesCall = request.mock.calls.find(([path]) => path === "/sales");
      expect(JSON.parse(salesCall[1].body).paymentBreakdown).toMatchObject([
        { method: "bank_transfer", amount: 1000, reference: "TRX-456" },
        { method: "cash", amount: 1500, reference: "" }
      ]);
    });
  });

  it("blocks an underpaid split and shows the remaining balance", async () => {
    render(<POS />);
    fireEvent.click(await screen.findByText("Laptop"));
    fireEvent.click(screen.getByRole("button", { name: "Add split payment" }));
    fireEvent.change(screen.getByLabelText("Payment 1 amount"), { target: { value: "2000" } });
    fireEvent.change(screen.getByLabelText("Payment 2 amount"), { target: { value: "400" } });

    expect(screen.getByRole("button", { name: /confirm & print/i }).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("Remaining: ₦100");
  });

  it("blocks an overpaid split until tender amounts match the sale total", async () => {
    render(<POS />);
    fireEvent.click(await screen.findByText("Laptop"));
    fireEvent.click(screen.getByRole("button", { name: "Add split payment" }));
    fireEvent.change(screen.getByLabelText("Payment 1 amount"), { target: { value: "1600" } });
    fireEvent.change(screen.getByLabelText("Payment 2 amount"), { target: { value: "1000" } });

    expect(screen.getByRole("button", { name: /confirm & print/i }).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("Overpaid by: ₦100");
  });

  it("opens the cart modal and includes optional item serials and notes in checkout", async () => {
    render(<POS />);

    fireEvent.click(await screen.findByText("Laptop"));
    fireEvent.click(screen.getByRole("button", { name: "Open cart" }));

    expect(screen.getByRole("dialog", { name: "Cart checkout" })).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Laptop serial number" }), {
      target: { value: "SN-100" }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Laptop note" }), {
      target: { value: "Warranty included" }
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm & print/i }));

    await waitFor(() => {
      const salesCall = request.mock.calls.find(([path]) => path === "/sales");
      expect(salesCall).toBeTruthy();
      expect(JSON.parse(salesCall[1].body).items[0]).toMatchObject({
        serialNumber: "SN-100",
        note: "Warranty included"
      });
    });
  });

  it("converts a local service start time to ISO before checkout", async () => {
    getServices.mockResolvedValueOnce([{
      _id: "svc1",
      name: "Consultation",
      sellingPrice: 200,
      duration: 30,
      durationUnit: "minutes",
      frequency: "once"
    }]);
    render(<POS />);

    expect(await screen.findByText("Laptop")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "services" }));
    fireEvent.click(await screen.findByText("Consultation"));
    fireEvent.click(screen.getByRole("button", { name: "Open cart" }));
    fireEvent.change(screen.getByLabelText("Consultation start date and time"), {
      target: { value: "2025-12-15T09:00" }
    });
    expect(screen.getByText(/Estimated end:/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /confirm & print/i }));

    await waitFor(() => {
      const salesCall = request.mock.calls.find(([path]) => path === "/sales");
      expect(JSON.parse(salesCall[1].body).items[0].serviceStartedAt)
        .toBe(new Date("2025-12-15T09:00").toISOString());
    });
  });
});
