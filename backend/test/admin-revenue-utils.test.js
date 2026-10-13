import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRevenueWindow,
  calculatePercentChange,
  resolveRevenueRange
} from "../src/modules/admin/adminRevenue.utils.js";

test("admin revenue ranges are limited to supported periods", () => {
  assert.equal(resolveRevenueRange("30d"), "30d");
  assert.equal(resolveRevenueRange("12m"), "12m");
  assert.equal(resolveRevenueRange("all"), null);
});

test("revenue windows compare equal current and previous periods", () => {
  const now = new Date("2026-06-30T00:00:00.000Z");
  const window = buildRevenueWindow("30d", now);
  assert.equal(window.end.toISOString(), now.toISOString());
  assert.equal(window.end.getTime() - window.start.getTime(), 30 * 24 * 60 * 60 * 1000);
  assert.equal(window.start.getTime() - window.previousStart.getTime(), 30 * 24 * 60 * 60 * 1000);
  assert.equal(calculatePercentChange(120, 100), 20);
  assert.equal(calculatePercentChange(10, 0), null);
});
