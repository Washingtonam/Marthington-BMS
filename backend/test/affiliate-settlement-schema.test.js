import test from "node:test";
import assert from "node:assert/strict";
import PayoutRequest from "../src/modules/affiliates/payoutRequest.model.js";
import WithdrawalHistory from "../src/modules/affiliates/withdrawalHistory.model.js";
import AffiliatePayout from "../src/modules/affiliates/affiliatePayout.model.js";

test("affiliate settlement records use the canonical withdrawal history contract", () => {
  assert.deepEqual(
    PayoutRequest.schema.path("status").enumValues,
    ["pending", "approved", "paid", "rejected"]
  );
  assert.ok(WithdrawalHistory.schema.path("payoutRequestId"));
  assert.ok(
    WithdrawalHistory.schema.indexes().some(
      ([fields, options]) => fields.payoutRequestId === 1 && options.unique && options.sparse
    )
  );
  assert.equal(AffiliatePayout.schema.path("business").options.default, null);
});