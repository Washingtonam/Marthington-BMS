import test from "node:test";
import assert from "node:assert/strict";

import { getCompletedReportRange } from "../src/modules/admin/reportSnapshot.js";

test("daily report range can select the current local day or the previous local day", () => {
  const now = new Date("2026-10-07T17:30:00.000Z");
  const currentDay = getCompletedReportRange(now, "Africa/Lagos", "daily", "current");
  const previousDay = getCompletedReportRange(now, "Africa/Lagos", "daily", "previous");

  assert.equal(currentDay.startLocalDate, "2026-10-07");
  assert.equal(currentDay.endLocalDate, "2026-10-07");
  assert.equal(currentDay.startDate.toISOString(), "2026-10-06T23:00:00.000Z");
  assert.equal(currentDay.endDate.toISOString(), "2026-10-07T23:00:00.000Z");
  assert.equal(previousDay.startLocalDate, "2026-10-06");
  assert.equal(previousDay.endLocalDate, "2026-10-06");
  assert.equal(previousDay.startDate.toISOString(), "2026-10-05T23:00:00.000Z");
  assert.equal(previousDay.endDate.toISOString(), "2026-10-06T23:00:00.000Z");
});
