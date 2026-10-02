import test from "node:test";
import assert from "node:assert/strict";
import AffiliateClick from "../src/modules/affiliates/affiliateClick.model.js";

test("affiliate link clicks are tracked independently from conversion payouts", () => {
  assert.ok(AffiliateClick.schema.path("affiliateCode"));
  assert.ok(AffiliateClick.schema.path("referrer"));
  assert.ok(AffiliateClick.schema.path("clickedAt"));
  assert.ok(AffiliateClick.schema.path("userAgent"));
  assert.ok(
    AffiliateClick.schema.indexes().some(
      ([fields, options]) => {
        if (Array.isArray(fields)) {
          return fields[0] === "affiliateCode" && options?.unique !== true;
        }
        return fields?.affiliateCode === 1 && options?.unique !== true;
      }
    )
  );
});
