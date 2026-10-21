import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InvoicePDFTemplate from "../components/InvoicePDFTemplate.jsx";

const invoice = {
  business: { name: "Marthington", phone: "08012345678" },
  invoiceNumber: "INV-2026-0001",
  createdAt: "2026-10-21T00:00:00.000Z",
  customer: { name: "Sample Customer" },
  items: [
    {
      name: "Printer paper",
      quantity: 2,
      price: 1500,
      total: 3000,
      product: "product-id"
    }
  ],
  subtotal: 3000,
  totalAmount: 3000,
  amountPaid: 0,
  balanceDue: 3000,
  transactionType: "outgoing"
};

describe("InvoicePDFTemplate layouts", () => {
  it("keeps the itemized table in A4 mode", () => {
    const { container } = render(<InvoicePDFTemplate invoice={invoice} layoutMode="a4" />);

    expect(container.querySelector(".invoice-pdf-template--a4")).not.toBeNull();
    expect(container.querySelector(".invoice-items-table")).not.toBeNull();
    expect(container.querySelector(".thermal-items")).toBeNull();
    expect(container.textContent).toContain("Printer paper");
  });

  it.each(["58mm", "80mm"])("renders a stacked receipt for %s thermal paper", (width) => {
    const { container } = render(
      <InvoicePDFTemplate invoice={invoice} layoutMode="thermal" thermalPaperWidth={width} />
    );
    const template = container.querySelector(".invoice-pdf-template");

    expect(template.classList.contains(`invoice-pdf-template--${width}`)).toBe(true);
    expect(template.querySelector(".thermal-items")).not.toBeNull();
    expect(template.querySelector(".invoice-items-table")).toBeNull();
    expect(template.querySelector(".thermal-item-details span").textContent).toContain("2");
    expect(template.querySelector(".thermal-item-details span").textContent).toContain("1,500");
    expect(template.textContent.match(/₦3,000\.00/g)).toHaveLength(4);
  });
});
