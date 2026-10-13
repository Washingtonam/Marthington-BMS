import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PLAN_ACCESS,
  normalizePlanAccess,
  validatePlanAccess
} from "../src/modules/subscriptions/planAccess.js";

test("plan access defaults retain the current free and pro limits", () => {
  assert.equal(DEFAULT_PLAN_ACCESS.free.products, 20);
  assert.equal(DEFAULT_PLAN_ACCESS.free.staff, 1);
  assert.equal(DEFAULT_PLAN_ACCESS.pro.products, null);
  assert.equal(DEFAULT_PLAN_ACCESS.pro.staff, null);
});

test("plan access normalization fills missing settings from the defaults", () => {
  const normalized = normalizePlanAccess({ free: { products: 40 } });
  assert.equal(normalized.free.products, 40);
  assert.equal(normalized.free.staff, 1);
  assert.equal(normalized.pro.posProducts, null);
  assert.equal(normalized.free.features.invoices, false);
});

test("plan access validation accepts positive limits and unlimited values", () => {
  assert.equal(validatePlanAccess(DEFAULT_PLAN_ACCESS), null);
  assert.equal(validatePlanAccess({
    ...DEFAULT_PLAN_ACCESS,
    free: { ...DEFAULT_PLAN_ACCESS.free, products: 40, posProducts: null }
  }), null);
});

test("plan access validation rejects invalid limits and feature flags", () => {
  assert.match(validatePlanAccess({
    ...DEFAULT_PLAN_ACCESS,
    free: { ...DEFAULT_PLAN_ACCESS.free, products: 0 }
  }), /positive whole number/);
  assert.match(validatePlanAccess({
    ...DEFAULT_PLAN_ACCESS,
    pro: { ...DEFAULT_PLAN_ACCESS.pro, features: { ...DEFAULT_PLAN_ACCESS.pro.features, invoices: "yes" } }
  }), /must be true or false/);
  assert.match(validatePlanAccess({
    ...DEFAULT_PLAN_ACCESS,
    free: { ...DEFAULT_PLAN_ACCESS.free, posProducts: 5001 }
  }), /system maximum of 5000/);
});
