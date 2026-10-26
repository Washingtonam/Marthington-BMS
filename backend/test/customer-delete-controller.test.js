import test from "node:test";
import assert from "node:assert/strict";

import Customer from "../src/modules/customers/customer.model.js";
import Sale from "../src/modules/sales/sale.model.js";
import Invoice from "../src/modules/invoices/invoice.model.js";
import customerController from "../src/modules/customers/customer.controller.js";

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const createCustomer = (overrides = {}) => ({
  _id: "customer-id",
  branch: "branch-id",
  outstandingBalance: 0,
  ...overrides
});

test("customer deletion checks records and removes only within the customer's business and branch", { concurrency: false }, async (t) => {
  let customerQuery;
  let saleQuery;
  let invoiceQuery;
  let deleteQuery;
  t.mock.method(Customer, "findOne", async (query) => {
    customerQuery = query;
    return createCustomer();
  });
  t.mock.method(Sale, "countDocuments", async (query) => {
    saleQuery = query;
    return 0;
  });
  t.mock.method(Invoice, "countDocuments", async (query) => {
    invoiceQuery = query;
    return 0;
  });
  t.mock.method(Customer, "deleteOne", async (query) => {
    deleteQuery = query;
    return { deletedCount: 1 };
  });
  const res = createResponse();

  await customerController.deleteCustomer({
    params: { id: "customer-id" },
    user: { role: "owner", businessId: "business-id" }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(customerQuery, { _id: "customer-id", business: "business-id" });
  assert.deepEqual(saleQuery, { business: "business-id", customer: "customer-id", branch: "branch-id" });
  assert.deepEqual(invoiceQuery, {
    business: "business-id",
    customer: "customer-id",
    branch: "branch-id",
    transactionType: "outgoing"
  });
  assert.deepEqual(deleteQuery, {
    _id: "customer-id",
    business: "business-id",
    branch: "branch-id",
    $and: [
      {
        $or: [
          { outstandingBalance: { $lte: 0 } },
          { outstandingBalance: { $exists: false } }
        ]
      },
      {
        $or: [
          { balance: { $lte: 0 } },
          { balance: { $exists: false } }
        ]
      }
    ]
  });
});

test("customer deletion rejects outstanding balances and linked transaction records", { concurrency: false }, async (t) => {
  let deleteCalls = 0;
  let saleCount = 0;
  let invoiceCount = 0;
  let customerData = createCustomer({ outstandingBalance: 25 });
  t.mock.method(Customer, "findOne", async () => customerData);
  t.mock.method(Sale, "countDocuments", async () => saleCount);
  t.mock.method(Invoice, "countDocuments", async () => invoiceCount);
  t.mock.method(Customer, "deleteOne", async () => {
    deleteCalls += 1;
    return { deletedCount: 1 };
  });

  const balanceResponse = createResponse();
  await customerController.deleteCustomer({
    params: { id: "customer-id" },
    user: { role: "owner", businessId: "business-id" }
  }, balanceResponse);
  assert.equal(balanceResponse.statusCode, 409);
  assert.equal(balanceResponse.body.outstandingBalance, 25);
  assert.equal(deleteCalls, 0);

  customerData = createCustomer({ balance: 25 });
  const legacyBalanceResponse = createResponse();
  await customerController.deleteCustomer({
    params: { id: "customer-id" },
    user: { role: "owner", businessId: "business-id" }
  }, legacyBalanceResponse);
  assert.equal(legacyBalanceResponse.statusCode, 409);
  assert.equal(legacyBalanceResponse.body.outstandingBalance, 25);
  assert.equal(deleteCalls, 0);

  customerData = createCustomer({ outstandingBalance: 0 });
  saleCount = 1;
  const saleResponse = createResponse();
  await customerController.deleteCustomer({
    params: { id: "customer-id" },
    user: { role: "owner", businessId: "business-id" }
  }, saleResponse);
  assert.equal(saleResponse.statusCode, 409);
  assert.equal(saleResponse.body.relatedRecords.sales, 1);
  assert.equal(deleteCalls, 0);

  saleCount = 0;
  invoiceCount = 1;
  const invoiceResponse = createResponse();
  await customerController.deleteCustomer({
    params: { id: "customer-id" },
    user: { role: "owner", businessId: "business-id" }
  }, invoiceResponse);
  assert.equal(invoiceResponse.statusCode, 409);
  assert.equal(invoiceResponse.body.relatedRecords.invoices, 1);
  assert.equal(deleteCalls, 0);
});

test("customer deletion rejects records outside the user's assigned branch", { concurrency: false }, async (t) => {
  let relatedRecordChecks = 0;
  t.mock.method(Customer, "findOne", async () => createCustomer({ branch: "other-branch" }));
  t.mock.method(Sale, "countDocuments", async () => {
    relatedRecordChecks += 1;
    return 0;
  });
  t.mock.method(Invoice, "countDocuments", async () => {
    relatedRecordChecks += 1;
    return 0;
  });

  const res = createResponse();
  await customerController.deleteCustomer({
    params: { id: "customer-id" },
    user: {
      role: "staff",
      businessId: "business-id",
      branchId: "assigned-branch",
      permissions: { canViewBranchInventory: true }
    }
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(relatedRecordChecks, 0);
});
