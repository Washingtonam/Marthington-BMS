import { describe, expect, it } from "vitest";
import { buildInvoiceSummary } from "../utils/invoiceSummary.js";

describe("invoice summary", () => {
  it("totals collected, pending, and overdue amounts from loaded invoices", () => {
    const summary = buildInvoiceSummary([
      { status: "paid", paymentStatus: "Fully Paid", totalAmount: 1500, amountPaid: 1500, balanceDue: 0 },
      { status: "draft", paymentStatus: "Unpaid", totalAmount: 16000, amountPaid: 0, balanceDue: 16000 },
      { status: "overdue", paymentStatus: "Unpaid", totalAmount: 32000, amountPaid: 0, balanceDue: 32000, dueDate: "2026-09-01" },
      { status: "cancelled", paymentStatus: "Unpaid", totalAmount: 9000, amountPaid: 0, balanceDue: 9000 }
    ], new Date("2026-09-29T00:00:00.000Z"));

    expect(summary).toEqual({
      totalBalanceDue: 48000,
      totalAmount: 49500,
      totalCollected: 1500,
      pendingAmount: 48000,
      overdueAmount: 32000,
      paidCount: 1,
      pendingCount: 2,
      overdueCount: 1
    });
  });

  it("subtracts returned value from invoiced and collected totals", () => {
    const summary = buildInvoiceSummary([
      { status: "paid", paymentStatus: "Fully Paid", totalAmount: 1200, amountPaid: 1200, returnedAmount: 200, balanceDue: 0 }
    ]);

    expect(summary.totalAmount).toBe(1000);
    expect(summary.totalCollected).toBe(1000);
  });
});