import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Customer from "../src/modules/customers/customer.model.js";
import Sale from "../src/modules/sales/sale.model.js";

test("WhatsApp follow-up consent defaults to opt-out", () => {
  const customer = new Customer({
    business: new mongoose.Types.ObjectId(),
    name: "Customer"
  });

  assert.equal(customer.whatsappFollowUpConsent, false);
  assert.equal(customer.whatsappFollowUpConsentAt, null);
});

test("sale follow-up reminders default to pending and have no completion date", () => {
  const sale = new Sale({
    business: new mongoose.Types.ObjectId(),
    receiptId: "RECEIPT1",
    items: [{ name: "Product", quantity: 1, sellingPrice: 100 }],
    totalAmount: 100
  });

  assert.equal(sale.followUpStatus, "pending");
  assert.equal(sale.followUpCompletedAt, null);
});
