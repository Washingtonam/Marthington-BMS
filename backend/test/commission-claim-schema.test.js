import test from "node:test";
import assert from "node:assert/strict";
import CommissionClaim from "../src/modules/affiliates/commissionClaim.model.js";

test("commission claim schema restricts claim kinds and review states", () => {
  assert.deepEqual(
    CommissionClaim.schema.path("kind").enumValues,
    ["cpa", "direct_referral_bonus", "payout_milestone"]
  );
  assert.deepEqual(
    CommissionClaim.schema.path("status").enumValues,
    ["pending", "approved", "rejected"]
  );
  assert.equal(CommissionClaim.schema.path("amount").options.min, 0);
  assert.ok(CommissionClaim.schema.indexes().some(([fields, options]) =>
    fields.claimKey === 1 && options.unique
  ));
});
