import { describe, expect, it } from "vitest";
import {
  buildCustomerFollowUpMessage,
  buildTransactionWhatsAppMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber
} from "../utils/whatsappMessages.js";

describe("WhatsApp customer messages", () => {
  it("normalizes Nigerian phone numbers for click-to-chat links", () => {
    expect(normalizeWhatsAppNumber("080 1234 5678")).toBe("2348012345678");
    expect(normalizeWhatsAppNumber("+234 801 234 5678")).toBe("2348012345678");
    expect(buildWhatsAppUrl("08012345678", "Hello")).toContain("https://wa.me/2348012345678?");
  });

  it("creates a transaction message with items, total, and payment status", () => {
    const message = buildTransactionWhatsAppMessage({
      recordType: "invoice",
      businessName: "Marthington",
      customerName: "Ada",
      record: {
        invoiceNumber: "INV-001",
        totalAmount: 4500,
        amountPaid: 1500,
        balanceDue: 3000,
        items: [{ name: "Paper", quantity: 3, price: 1500, total: 4500 }]
      }
    });

    expect(message).toContain("Hello Ada");
    expect(message).toContain("Reference: INV-001");
    expect(message).toContain("Paper × 3");
    expect(message).toContain("Payment status: Partially Paid");
  });

  it("creates a concise follow-up asking about repeat purchase or availability", () => {
    const message = buildCustomerFollowUpMessage({
      businessName: "Marthington",
      customerName: "Ada",
      record: { items: [{ name: "Paper" }, { name: "Ink" }] }
    });

    expect(message).toContain("checking in about Paper, Ink");
    expect(message).toContain("purchase it again or check current availability");
  });
});
