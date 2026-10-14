import test from "node:test";
import assert from "node:assert/strict";

import { buildReportWhatsAppParameters } from "../src/utils/reportWhatsApp.js";

test("report WhatsApp template parameters include recipient and a compact report summary", () => {
  const parameters = buildReportWhatsAppParameters({
    subscription: { recipientName: "Amina", frequency: "daily" },
    businessName: "Amina Stores",
    periodLabel: "Daily report for Oct 13, 2026",
    snapshot: {
      overview: {
        revenue: 125000,
        expenses: 25000,
        netProfit: 100000
      }
    }
  });

  assert.deepEqual(parameters, [
    "Amina",
    "daily",
    "Amina Stores",
    "Daily report for Oct 13, 2026",
    "NGN 125,000",
    "NGN 25,000",
    "NGN 100,000"
  ]);
});
