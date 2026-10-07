import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeReportDeliveryTime,
  normalizeReportScheduleTime
} from "../src/utils/reportDeliverySettings.js";

test("daily report delivery time keeps valid HH:MM values and falls back safely", () => {
  assert.equal(normalizeReportDeliveryTime("22:15"), "22:15");
  assert.equal(normalizeReportDeliveryTime("12:05"), "12:05");
  assert.equal(normalizeReportDeliveryTime("99:99"), "18:00");
  assert.equal(normalizeReportDeliveryTime(""), "18:00");
});

test("previous-day report schedules are restricted to morning delivery", () => {
  assert.equal(normalizeReportScheduleTime("06:30", "previous"), "06:30");
  assert.equal(normalizeReportScheduleTime("18:00", "previous"), "06:00");
  assert.equal(normalizeReportScheduleTime("", "previous"), "06:00");
  assert.equal(normalizeReportScheduleTime("18:00", "current"), "18:00");
});
