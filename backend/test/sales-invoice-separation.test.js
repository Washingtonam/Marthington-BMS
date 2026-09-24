import test from "node:test";
import assert from "node:assert/strict";

import { shouldCreateInvoiceForSale } from "../src/modules/sales/sales.utils.js";
import { buildInvoiceListQuery } from "../src/modules/invoices/invoice.controller.js";

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

test("invoice list excludes POS-linked invoices while retaining dedicated invoices", () => {
  const query = buildInvoiceListQuery({
    businessId: "business-1",
    branchQuery: { branch: "branch-1" },
    filters: { transactionType: "outgoing" }
  });

  assert.deepEqual(query, {
    business: "business-1",
    linkedSale: null,
    branch: "branch-1",
    transactionType: "outgoing"
  });
});

test("invoice list query supports dedicated invoice search fields", () => {
  const query = buildInvoiceListQuery({
    businessId: "business-1",
    filters: { search: "Jane" }
  });

  assert.deepEqual(query.$or, [
    { invoiceNumber: { $regex: "Jane", $options: "i" } },
    { customerName: { $regex: "Jane", $options: "i" } },
    { customerPhone: { $regex: "Jane", $options: "i" } },
    { customerEmail: { $regex: "Jane", $options: "i" } }
  ]);
});