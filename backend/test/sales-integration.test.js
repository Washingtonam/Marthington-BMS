import test, { after, before, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import app from "../src/app.js";
import Branch from "../src/modules/branches/branch.model.js";
import BranchInventory from "../src/modules/branches/branchInventory.model.js";
import Business from "../src/modules/businesses/business.model.js";
import SystemSettings from "../src/modules/admin/systemSettings.model.js";
import { migrateAffiliateRateToTenPercent } from "../src/modules/admin/affiliateRateMigration.js";
import Product from "../src/modules/products/product.model.js";
import Sale, { ensureSaleIndexes } from "../src/modules/sales/sale.model.js";
import Transaction from "../src/modules/transactions/transaction.model.js";
import User from "../src/modules/users/user.model.js";

const jwtSecret = "sales-integration-test-secret";
const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

let mongo;
let server;
let serverPort;

const request = ({ path, token, method = "GET", body, headers = {} }) => new Promise((resolve, reject) => {
  const serializedBody = body === undefined ? null : JSON.stringify(body);
  const req = http.request({
    hostname: "127.0.0.1",
    port: serverPort,
    path,
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(serializedBody ? { "Content-Type": "application/json" } : {}),
      ...(serializedBody ? { "Content-Length": Buffer.byteLength(serializedBody) } : {}),
      ...headers
    }
  }, (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => {
      const text = Buffer.concat(chunks).toString();
      resolve({
        statusCode: res.statusCode,
        body: text ? JSON.parse(text) : null
      });
    });
  });

  req.on("error", reject);
  if (serializedBody) req.write(serializedBody);
  req.end();
});

const createCashier = ({ business, branch, email, permissions = {} }) => User.create({
  name: "Integration Cashier",
  email,
  password: "integration-test-password",
  role: "cashier",
  business: business._id,
  branch: branch?._id || null,
  permissions: {
    canMakeSale: true,
    canViewSales: true,
    canManagePayments: true,
    canViewBranchInventory: true,
    ...permissions
  }
});

const createTenant = async (name) => {
  const business = await Business.create({
    name,
    status: "active",
    subscription: {
      plan: "pro",
      status: "active",
      expiresAt: future
    }
  });
  const branch = await Branch.create({
    business: business._id,
    name: `${name} branch`
  });
  const user = await createCashier({
    business,
    branch,
    email: `${name.toLowerCase()}-cashier@example.test`
  });
  business.owner = user._id;
  await business.save();

  const product = await Product.create({
    name: `${name} product`,
    price: 100,
    costPrice: 40,
    stock: 10,
    business: business._id
  });
  await BranchInventory.create({
    business: business._id,
    branch: branch._id,
    product: product._id,
    quantity: 10,
    createdBy: user._id
  });

  return {
    business,
    branch,
    user,
    product,
    token: jwt.sign({ id: user._id.toString() }, jwtSecret)
  };
};

const salePayload = (tenant, overrides = {}) => ({
  items: [{
    itemType: "product",
    product: tenant.product._id.toString(),
    quantity: 1,
    sellingPrice: 100
  }],
  paymentMethod: "split",
  paymentBreakdown: [
    { method: "cash", amount: 40 },
    { method: "bank_transfer", amount: 60, reference: "TRANSFER-TEST-1" }
  ],
  branch: tenant.branch._id.toString(),
  ...overrides
});

const createSale = (tenant, overrides = {}, headers = {}) => request({
  path: "/api/sales",
  method: "POST",
  token: tenant.token,
  body: salePayload(tenant, overrides),
  headers
});

describe("sales integration with an in-memory replica set", { concurrency: false }, () => {
  before(async () => {
    process.env.JWT_SECRET = jwtSecret;
    // The API tests exercise persistence, not unrelated legacy schema indexes.
    for (const model of Object.values(mongoose.models)) {
      model.schema.set("autoIndex", false);
    }
    mongo = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" }
    });
    process.env.MONGO_URI = mongo.getUri("marthington_bms_test");
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
    await ensureSaleIndexes();

    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.once("listening", resolve);
    });
    serverPort = server.address().port;
  });

  beforeEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({}))
    );
  });

  after(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  test("persists split tenders and posts one sale-revenue ledger entry", async () => {
    const tenant = await createTenant("Ledger");
    const created = await createSale(tenant);

    assert.equal(created.statusCode, 200);
    assert.equal(created.body.sale.paymentMethod, "split");

    const savedSale = await Sale.findById(created.body.sale._id).lean();
    assert.deepEqual(savedSale.paymentBreakdown.map(({ method, amount, reference }) => ({
      method,
      amount,
      reference
    })), [
      { method: "cash", amount: 40, reference: "" },
      { method: "bank_transfer", amount: 60, reference: "TRANSFER-TEST-1" }
    ]);

    const statusUpdate = () => request({
      path: `/api/sales/${savedSale._id}/status`,
      method: "PATCH",
      token: tenant.token,
      body: { status: "posted" }
    });
    assert.equal((await statusUpdate()).statusCode, 200);
    assert.equal((await statusUpdate()).statusCode, 200);

    const ledgerEntries = await Transaction.find({
      businessId: tenant.business._id,
      sourceModel: "Sale",
      sourceId: savedSale._id
    }).lean();
    assert.equal(ledgerEntries.length, 1);
    assert.equal(ledgerEntries[0].amount, 100);
    assert.equal(ledgerEntries[0].profit, 60);
    assert.deepEqual(ledgerEntries[0].paymentBreakdown.map(({ method, amount }) => ({ method, amount })), [
      { method: "cash", amount: 40 },
      { method: "bank_transfer", amount: 60 }
    ]);
  });

  test("replaces the legacy sparse operation index with the compatible partial index", async () => {
    await Sale.collection.dropIndex("business_1_clientOperationId_1");
    await Sale.collection.createIndex(
      { business: 1, clientOperationId: 1 },
      { unique: true, sparse: true }
    );

    await ensureSaleIndexes();

    const operationIdIndex = (await Sale.collection.indexes()).find(({ key }) => (
      key.business === 1 && key.clientOperationId === 1
    ));
    assert.equal(operationIdIndex.unique, true);
    assert.deepEqual(operationIdIndex.partialFilterExpression, {
      clientOperationId: { $type: "string" }
    });
  });

  test("migrates the saved affiliate rate to 10% and exposes it in public pricing", async () => {
    const commissionSchedule = { directReferralBonus: 2500 };
    await SystemSettings.create({
      globalAffiliateRate: 20,
      commissionSchedule
    });

    const updatedSettings = await migrateAffiliateRateToTenPercent();
    assert.equal(updatedSettings.globalAffiliateRate, 10);
    assert.deepEqual(updatedSettings.commissionSchedule, commissionSchedule);

    const pricingResponse = await request({ path: "/api/billing/pricing" });
    assert.equal(pricingResponse.statusCode, 200);
    assert.equal(pricingResponse.body.commissionRate, 10);
  });

  test("keeps legacy single-method sale records compatible", async () => {
    const tenant = await createTenant("Legacy");
    const first = await createSale(tenant, {
      paymentMethod: "cash",
      paymentBreakdown: []
    });
    const second = await createSale(tenant, {
      paymentMethod: "cash",
      paymentBreakdown: []
    });

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    const savedSales = await Sale.find({ business: tenant.business._id }).lean();
    assert.equal(savedSales.length, 2);
    assert.equal(savedSales[0].paymentMethod, "cash");
    assert.deepEqual(savedSales[0].paymentBreakdown, []);
    assert.equal(savedSales[1].paymentMethod, "cash");
    assert.deepEqual(savedSales[1].paymentBreakdown, []);
  });

  test("denies an unassigned branch and permits cross-branch sales only with the existing grant", async () => {
    const tenant = await createTenant("Branch");
    const otherBranch = await Branch.create({
      business: tenant.business._id,
      name: "Other branch"
    });
    await BranchInventory.create({
      business: tenant.business._id,
      branch: otherBranch._id,
      product: tenant.product._id,
      quantity: 10,
      createdBy: tenant.user._id
    });

    const denied = await createSale(tenant, { branch: otherBranch._id.toString() });
    assert.notEqual(denied.statusCode, 200);
    assert.match(denied.body.message, /assigned branch/i);
    assert.equal(await Sale.countDocuments({ business: tenant.business._id }), 0);

    tenant.user.permissions.canManageAllBranchInventory = true;
    await tenant.user.save();
    tenant.token = jwt.sign({ id: tenant.user._id.toString() }, jwtSecret);

    const allowed = await createSale(tenant, { branch: otherBranch._id.toString() });
    assert.equal(allowed.statusCode, 200);
    assert.equal(allowed.body.sale.branch.toString(), otherBranch._id.toString());

    const inventory = await BranchInventory.findOne({
      business: tenant.business._id,
      branch: otherBranch._id,
      product: tenant.product._id
    }).lean();
    assert.equal(inventory.quantity, 9);
  });

  test("enforces sale permission and isolates tenant sales, products, and offline bootstrap data", async () => {
    const tenant = await createTenant("TenantA");
    const otherTenant = await createTenant("TenantB");
    const ownSale = await createSale(tenant);
    const foreignSale = await createSale(otherTenant);
    assert.equal(ownSale.statusCode, 200);
    assert.equal(foreignSale.statusCode, 200);

    const salesResponse = await request({
      path: "/api/sales",
      token: tenant.token
    });
    assert.equal(salesResponse.statusCode, 200);
    assert.deepEqual(salesResponse.body.sales.map((sale) => sale._id), [ownSale.body.sale._id]);
    assert.equal(salesResponse.body.reconciliation.totalAmount, 100);

    const bootstrapResponse = await request({
      path: "/api/sync/bootstrap",
      token: tenant.token
    });
    assert.equal(bootstrapResponse.statusCode, 200);
    assert.equal(bootstrapResponse.body.business._id, tenant.business._id.toString());
    assert.deepEqual(bootstrapResponse.body.products.map((product) => product._id), [tenant.product._id.toString()]);
    assert.deepEqual(bootstrapResponse.body.sales.map((sale) => sale._id), [ownSale.body.sale._id]);

    const crossTenantSale = await createSale(tenant, {
      items: [{
        itemType: "product",
        product: otherTenant.product._id.toString(),
        quantity: 1,
        sellingPrice: 100
      }]
    });
    assert.notEqual(crossTenantSale.statusCode, 200);
    assert.match(crossTenantSale.body.message, /unauthorized product access/i);
    assert.equal(await Sale.countDocuments({ business: tenant.business._id }), 1);

    const restrictedUser = await createCashier({
      business: tenant.business,
      branch: tenant.branch,
      email: "restricted-cashier@example.test",
      permissions: { canMakeSale: false }
    });
    const restrictedResponse = await request({
      path: "/api/sales",
      method: "POST",
      token: jwt.sign({ id: restrictedUser._id.toString() }, jwtSecret),
      body: salePayload(tenant)
    });
    assert.equal(restrictedResponse.statusCode, 403);
    assert.equal(await Sale.countDocuments({ business: tenant.business._id }), 1);
  });

  test("concurrent and sequential offline retries with one operation ID create one sale", async () => {
    const tenant = await createTenant("Offline");
    const operationId = "offline-operation-1";
    const [first, retry] = await Promise.all([
      createSale(tenant, {}, { "X-Operation-Id": operationId }),
      createSale(tenant, {}, { "X-Operation-Id": operationId })
    ]);

    assert.equal(first.statusCode, 200);
    assert.equal(retry.statusCode, 200);
    assert.equal([first, retry].filter((response) => response.body.duplicate).length, 1);
    assert.equal(retry.body.sale._id, first.body.sale._id);
    const sequentialRetry = await createSale(tenant, {}, { "X-Operation-Id": operationId });
    assert.equal(sequentialRetry.statusCode, 200);
    assert.equal(sequentialRetry.body.duplicate, true);
    assert.equal(await Sale.countDocuments({
      business: tenant.business._id,
      clientOperationId: operationId
    }), 1);

    const inventory = await BranchInventory.findOne({
      business: tenant.business._id,
      branch: tenant.branch._id,
      product: tenant.product._id
    }).lean();
    assert.equal(inventory.quantity, 9);

    const statusResponse = await request({
      path: `/api/sales/${first.body.sale._id}/status`,
      method: "PATCH",
      token: tenant.token,
      body: { status: "posted" }
    });
    assert.equal(statusResponse.statusCode, 200);
    assert.equal(await Transaction.countDocuments({
      businessId: tenant.business._id,
      sourceModel: "Sale",
      sourceId: first.body.sale._id
    }), 1);
  });
});
