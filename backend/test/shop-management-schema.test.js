import test from "node:test";
import assert from "node:assert/strict";
import Notification from "../src/modules/notifications/notification.model.js";
import Product from "../src/modules/products/product.model.js";
import ShopDeliveryArea from "../src/modules/shop/shopDeliveryArea.model.js";
import ShopOrder from "../src/modules/shop/shopOrder.model.js";

test("shop products support admin curation without changing BMS product fields", () => {
  assert.equal(Product.schema.path("shopFeatured").options.default, false);
  assert.equal(Product.schema.path("shopVisible").options.default, true);
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
