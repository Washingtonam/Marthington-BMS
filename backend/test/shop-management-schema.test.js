import test from "node:test";
import assert from "node:assert/strict";
import Notification from "../src/modules/notifications/notification.model.js";
import Product from "../src/modules/products/product.model.js";
import Business from "../src/modules/businesses/business.model.js";
import ShopDeliveryArea from "../src/modules/shop/shopDeliveryArea.model.js";
import ShopCustomer from "../src/modules/shop/shopCustomer.model.js";
import ShopOrder from "../src/modules/shop/shopOrder.model.js";

test("shop products support admin curation without changing BMS product fields", () => {
  assert.equal(Product.schema.path("shopFeatured").options.default, false);
  assert.equal(Product.schema.path("shopVisible").options.default, true);
  assert.equal(Product.schema.path("shopDescription").options.default, "");
  assert.equal(Product.schema.path("shopDescription").options.maxlength, 1000);
  assert.equal(Product.schema.path("shopSalePrice").options.default, 0);
  assert.equal(Product.schema.path("shopSalePrice").options.min, 0);
  assert.ok(Product.schema.path("shopSalePrice").validators.some(
    (validator) => validator.validator === Number.isSafeInteger
  ));
});

test("shop delivery presets enforce a unique state and city and a whole-number fee", () => {
  assert.ok(ShopDeliveryArea.schema.indexes().some(
    ([fields, options]) => fields.stateKey === 1 && fields.cityKey === 1 && options.unique
  ));
  assert.ok(ShopDeliveryArea.schema.path("fee").validators.some(
    (validator) => validator.validator === Number.isSafeInteger
  ));
  assert.ok(ShopOrder.schema.path("deliveryAreaName"));
});

test("shop orders keep individual Paystack refund requests and partial-refund totals", () => {
  assert.ok(ShopOrder.schema.path("totalRefunded"));
  assert.ok(ShopOrder.schema.path("refunds"));
  assert.ok(ShopOrder.schema.path("refundInProgress"));
  const refundSchema = ShopOrder.schema.path("refunds").schema;
  assert.deepEqual(refundSchema.path("source").enumValues, ["products", "delivery_fee"]);
  assert.deepEqual(refundSchema.path("method").enumValues, ["paystack", "manual"]);
  assert.deepEqual(refundSchema.path("status").enumValues, ["initializing", "pending", "processed", "failed"]);
  assert.ok(ShopOrder.schema.path("paymentStatus").enumValues.includes("partially_refunded"));
});

test("shop orders track receipt and delivery email attempts for admin retry", () => {
  for (const field of ["receiptEmailStatus", "deliveryEmailStatus"]) {
    assert.equal(ShopOrder.schema.path(field).options.default, "not_sent");
    assert.deepEqual(ShopOrder.schema.path(field).enumValues, ["not_sent", "sending", "sent", "failed"]);
  }
  assert.ok(ShopOrder.schema.path("receiptEmailSentAt"));
  assert.ok(ShopOrder.schema.path("receiptEmailError"));
  assert.ok(ShopOrder.schema.path("deliveryEmailSentAt"));
  assert.ok(ShopOrder.schema.path("deliveryEmailError"));
});

test("shop delivery addresses store country, state, LGA, and delivery landmarks", () => {
  for (const field of ["country", "countryCode", "state", "localGovernment", "city", "nearestBusStop"]) {
    assert.ok(ShopOrder.schema.path(`deliveryAddress.${field}`), `Expected shop order address to include ${field}`);
  }
  const savedAddress = ShopCustomer.schema.path("addresses").schema;
  for (const field of ["country", "countryCode", "state", "localGovernment", "city", "nearestBusStop"]) {
    assert.ok(savedAddress.path(field), `Expected saved shopper address to include ${field}`);
  }
  for (const field of ["addressCountry", "addressCountryCode", "addressState", "addressLocalGovernment", "addressCity"]) {
    assert.ok(Business.schema.path(field), `Expected business location to include ${field}`);
  }
});

test("shop payment notifications are typed and idempotent per admin/order", () => {
  assert.ok(Notification.schema.path("type").enumValues.includes("shop_order_received"));
  assert.ok(Notification.schema.path("shopOrderId"));
  assert.ok(Notification.schema.indexes().some(
    ([fields, options]) =>
      fields.recipient === 1 &&
      fields.type === 1 &&
      fields.shopOrderId === 1 &&
      options.unique &&
      options.partialFilterExpression?.type === "shop_order_received"
  ));
});
