import test from "node:test";
import assert from "node:assert/strict";
import { calculateServiceEnd, parseServiceStart } from "../src/modules/sales/serviceSchedule.js";

test("service end time applies duration unit and quantity", () => {
  const start = new Date("2026-06-01T10:00:00.000Z");
  assert.equal(
    calculateServiceEnd(start, 30, "minutes", 2).toISOString(),
    "2026-06-01T11:00:00.000Z"
  );
  assert.equal(
    calculateServiceEnd(start, 2, "hours", 1).toISOString(),
    "2026-06-01T12:00:00.000Z"
  );
  assert.equal(
    calculateServiceEnd(start, 3, "days", 1).toISOString(),
    "2026-06-04T10:00:00.000Z"
  );
});

test("blank service start uses sale time and invalid input is rejected", () => {
  const saleTime = new Date("2026-06-01T10:00:00.000Z");
  assert.equal(parseServiceStart("", saleTime).toISOString(), saleTime.toISOString());
  assert.throws(() => parseServiceStart("not-a-date", saleTime), /Invalid service start date/);
});
