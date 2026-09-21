import test from "node:test";
import assert from "node:assert/strict";

import { shouldCreateInvoiceForSale } from "../src/modules/sales/sales.utils.js";

test("completed non-credit sales do not create customer invoices", () => {
  for (const paymentMethod of ["cash", "card", "bank_transfer", "other"]) {
    assert.equal(shouldCreateInvoiceForSale(paymentMethod), false);
  }
});

test("credit sales retain an invoice for the outstanding receivable", () => {
  assert.equal(shouldCreateInvoiceForSale("credit"), true);
  assert.equal(shouldCreateInvoiceForSale("credit_sale"), true);
  assert.equal(shouldCreateInvoiceForSale("debt"), true);
});