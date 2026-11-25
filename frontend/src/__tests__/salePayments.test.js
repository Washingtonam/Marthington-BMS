import { describe, expect, it } from "vitest";
import {
  aggregateSalePayments,
  getSalePaymentBreakdown,
  isValidSalePaymentBreakdown,
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

  it("validates exact, distinct, positive tender allocations to cents", () => {
    expect(isValidSalePaymentBreakdown([
      { method: "cash", amount: "150" },
      { method: "bank_transfer", amount: "350.00" }
    ], 500)).toBe(true);

    expect(isValidSalePaymentBreakdown([
      { method: "cash", amount: "150.001" },
      { method: "bank_transfer", amount: "349.999" }
    ], 500)).toBe(false);
    expect(isValidSalePaymentBreakdown([
      { method: "cash", amount: "150" },
      { method: "cash", amount: "350" }
    ], 500)).toBe(false);
    expect(isValidSalePaymentBreakdown([
      { method: "cash", amount: "0" },
      { method: "bank_transfer", amount: "500" }
    ], 500)).toBe(false);
    expect(isValidSalePaymentBreakdown([
      { method: "cash", amount: "150" },
      { method: "bank_transfer", amount: "349" }
    ], 500)).toBe(false);
  });

  it("keeps unrelated Other sales separate from a corrected mixed-tender sale", () => {
    expect(aggregateSalePayments([
      {
        totalAmount: 500,
        paymentMethod: "split",
        paymentBreakdown: [
          { method: "cash", amount: 150 },
          { method: "bank_transfer", amount: 350 }
        ]
      },
      { totalAmount: 100, paymentMethod: "other" }
    ])).toEqual({ cash: 150, card: 0, bank_transfer: 350, credit: 0, other: 100 });
  });
});
