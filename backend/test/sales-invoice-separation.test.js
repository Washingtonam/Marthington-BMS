import test from "node:test";
import assert from "node:assert/strict";

import { shouldCreateInvoiceForSale } from "../src/modules/sales/sales.utils.js";
import { buildInvoiceListQuery, getBulkInvoiceStatusEligibility, getCustomerOutstandingContribution } from "../src/modules/invoices/invoice.controller.js";

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
    $and: [
      {
        $or: [
          { source: "manual" },
          { source: { $exists: false }, linkedSale: null }
        ]
      },
      {
        $or: [
          { linkedSale: null },
          { linkedSale: { $exists: false } }
        ]
      }
    ],
    branch: "branch-1",
    transactionType: "outgoing"
  });
});

test("invoice list query supports dedicated invoice search fields", () => {
  const query = buildInvoiceListQuery({
    businessId: "business-1",
    filters: { search: "Jane" }
  });

  assert.deepEqual(query.$and[2].$or, [
    { invoiceNumber: { $regex: "Jane", $options: "i" } },
    { customerName: { $regex: "Jane", $options: "i" } },
    { customerPhone: { $regex: "Jane", $options: "i" } },
    { customerEmail: { $regex: "Jane", $options: "i" } }
  ]);
});

test("bulk invoice status eligibility protects paid, collected, and POS-linked invoices", () => {
  assert.equal(getBulkInvoiceStatusEligibility({ amountPaid: 0, fulfillmentStatus: "pending_pickup" }, "sent"), null);
  assert.match(getBulkInvoiceStatusEligibility({ status: "paid" }, "sent"), /Paid or cancelled/);
  assert.match(getBulkInvoiceStatusEligibility({ amountPaid: 100 }, "cancelled"), /Paid or collected/);
  assert.match(getBulkInvoiceStatusEligibility({ stockFinalized: true }, "cancelled"), /Paid or collected/);
  assert.match(getBulkInvoiceStatusEligibility({ linkedSale: "sale-1" }, "sent"), /POS-linked/);
});

test("cancelled invoices do not contribute to customer outstanding balance", () => {
  assert.equal(getCustomerOutstandingContribution({ status: "cancelled", balanceDue: 2400 }), 0);
  assert.equal(getCustomerOutstandingContribution({ status: "sent", balanceDue: 2400 }), 2400);
});