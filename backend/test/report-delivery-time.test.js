import test from "node:test";
import assert from "node:assert/strict";

import { normalizeReportDeliveryTime } from "../src/utils/reportDeliverySettings.js";

test("daily report delivery time keeps valid HH:MM values and falls back safely", () => {
  assert.equal(normalizeReportDeliveryTime("22:15"), "22:15");
  assert.equal(normalizeReportDeliveryTime("12:05"), "12:05");
  assert.equal(normalizeReportDeliveryTime("99:99"), "18:00");
  assert.equal(normalizeReportDeliveryTime(""), "18:00");
});
