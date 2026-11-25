import { describe, expect, it } from "vitest";
import {
  aggregateSalePayments,
  getSalePaymentBreakdown,
  saleUsesPaymentMethod
} from "../utils/salePayments.js";

describe("sale payment breakdown helpers", () => {
  it("uses persisted tender amounts and keeps legacy sales compatible", () => {
    expect(aggregateSalePayments([
      {
        totalAmount: 100,
        paymentMethod: "split",
        paymentBreakdown: [
          { method: "cash", amount: 40 },
          { method: "bank_transfer", amount: 60 }
        ]
      },
      { totalAmount: 25, paymentMethod: "card" }
    ])).toEqual({ cash: 40, card: 25, bank_transfer: 60, credit: 0, other: 0 });
  });

  it("does not invent a tender breakdown for legacy split records without one", () => {
    expect(getSalePaymentBreakdown({ totalAmount: 10, paymentMethod: "split" })).toEqual([]);
  });

  it("matches split sales against each tender and totals tender amounts by method", () => {
    const sale = {
      totalAmount: 100,
      paymentMethod: "split",
      paymentBreakdown: [
        { method: "cash", amount: 40 },
        { method: "bank_transfer", amount: 60 }
      ]
    };

    expect(saleUsesPaymentMethod(sale, "cash")).toBe(true);
    expect(saleUsesPaymentMethod(sale, "bank_transfer")).toBe(true);
    expect(saleUsesPaymentMethod(sale, "card")).toBe(false);
    expect(aggregateSalePayments([sale])).toEqual({
      cash: 40,
      card: 0,
      bank_transfer: 60,
      credit: 0,
      other: 0
    });
  });
});
