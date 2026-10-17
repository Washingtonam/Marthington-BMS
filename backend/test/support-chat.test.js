import test from "node:test";
import assert from "node:assert/strict";

import { escapeRegex, getAssistantAnswer, getBusinessGuideAnswer } from "../src/modules/supportChat/chatAssistant.js";

test("business guide answers direct users to the relevant dashboard areas", () => {
  assert.match(getBusinessGuideAnswer("How do I manage stock?"), /Products or Inventory/);
  assert.match(getBusinessGuideAnswer("How do I create invoices?"), /Invoices/);
  assert.match(getBusinessGuideAnswer("Where can I find customers?"), /Customers \/ CRM/);
});

test("assistant limits business-data answers to the user's permissions", async () => {
  const productAnswer = await getAssistantAnswer({
    businessId: "business-id",
    question: "How many products do we have?",
    permissions: { canViewProducts: false }
  });
  const customerAnswer = await getAssistantAnswer({
    businessId: "business-id",
    question: "Who are my top buyers?",
    permissions: { canViewCustomers: false }
  });
  const invoiceAnswer = await getAssistantAnswer({
    businessId: "business-id",
    question: "Which invoices are unpaid?",
    permissions: { canViewInvoices: false }
  });

  assert.match(productAnswer, /doesn’t have permission/);
  assert.match(customerAnswer, /doesn’t have permission/);
  assert.match(invoiceAnswer, /doesn’t have permission/);
});

test("product search terms are escaped before compiling a database regular expression", () => {
  assert.equal(escapeRegex("Vitamin C+ (large)"), "Vitamin C\\+ \\(large\\)");
});
