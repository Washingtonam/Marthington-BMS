import test from "node:test";
import assert from "node:assert/strict";

import { buildSupplierInvoiceExpense } from "../src/modules/invoices/supplierInvoiceExpense.utils.js";

test("supplier invoice creates a linked pending expense with bill details", () => {
  const invoice = {
    _id: "invoice-1",
    business: "business-1",
    branch: "branch-1",
    totalAmount: 125,
    balanceDue: 125,
    invoiceNumber: "INV-001",
    supplier: "supplier-1",
    notes: "Office materials",
    items: [{ name: "Paper", product: null }]
  };

  const expense = buildSupplierInvoiceExpense({
    invoice,
    userId: "user-1",
    expenseCategory: "utilities",
    expensePaymentMethod: "store_credit",
    expenseDate: "2026-09-20",
    expenseDescription: "Paper and supplies",
    expenseInventoryItems: [{ productId: "product-1", productName: "Paper", quantity: "5", unitCost: "25" }]
  });

  assert.equal(expense.business, invoice.business);
  assert.equal(expense.linkedInvoice, invoice._id);
  assert.equal(expense.supplier, invoice.supplier);
  assert.equal(expense.amount, invoice.totalAmount);
  assert.equal(expense.description, "Paper and supplies");
  assert.equal(expense.category, "utilities");
  assert.equal(expense.paymentMethod, "store_credit");
  assert.equal(expense.status, "pending");
  assert.equal(expense.inventoryItems[0].product, "product-1");
  assert.equal(expense.inventoryItems[0].quantity, 5);
  assert.equal(expense.inventoryItems[0].unitCost, 25);
});

test("supplier invoice expense defaults to inventory or miscellaneous category", () => {
  const baseInvoice = {
    _id: "invoice-2",
    business: "business-1",
    branch: null,
    totalAmount: 80,
    balanceDue: 0,
    invoiceNumber: "INV-002",
    supplier: "supplier-1",
    notes: "",
    items: [{ name: "Stock item", product: "product-2" }]
  };

  const inventoryExpense = buildSupplierInvoiceExpense({ invoice: baseInvoice, userId: "user-1" });
  const serviceExpense = buildSupplierInvoiceExpense({
    invoice: { ...baseInvoice, items: [{ name: "Repair service", product: null }] },
    userId: "user-1"
  });

  assert.equal(inventoryExpense.category, "inventory");
  assert.equal(inventoryExpense.paymentMethod, "cash");
  assert.equal(serviceExpense.category, "miscellaneous");
  assert.equal(serviceExpense.description, "Repair service");
});