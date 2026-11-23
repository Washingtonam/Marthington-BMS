import assert from "node:assert/strict";
import test from "node:test";
import { calculateAffiliateCommission } from "../src/modules/affiliates/affiliate.utils.js";

test("the configured 10 percent partner rate earns 15000 on 150000", () => {
  assert.equal(calculateAffiliateCommission(150000, 10), 15000);
});
