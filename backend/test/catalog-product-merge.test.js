import test from "node:test";
import assert from "node:assert/strict";

import {
  canManageGlobalCatalog,
  chooseMergeStock,
  chooseMergeValue
} from "../src/modules/catalog/catalogMergeUtils.js";

test("stock merge policies preserve, replace, or add quantities", () => {
  assert.equal(chooseMergeStock(5, 3, "sum"), 8);
  assert.equal(chooseMergeStock(5, 3, "primary"), 5);
  assert.equal(chooseMergeStock(5, 3, "secondary"), 3);
});

test("price merge policies select the requested value", () => {
  assert.equal(chooseMergeValue(10, 14, "primary"), 10);
  assert.equal(chooseMergeValue(10, 14, "secondary"), 14);
  assert.equal(chooseMergeValue(10, 14, "highest"), 14);
  assert.equal(chooseMergeValue(10, 14, "lowest"), 10);
});

test("weighted average cost uses available stock weights and handles empty stock", () => {
  assert.equal(chooseMergeValue(10, 20, "weighted-average", 3, 1), 12.5);
  assert.equal(chooseMergeValue(10, 20, "weighted-average", 0, 0), 15);
});

test("missing prices retain the value that exists", () => {
  assert.equal(chooseMergeValue(null, 12, "primary"), 12);
  assert.equal(chooseMergeValue(12, null, "secondary"), 12);
});

test("only privileged users or users managing products and all branch inventory can merge globally", () => {
  assert.equal(canManageGlobalCatalog({ role: "owner" }), true);
  assert.equal(canManageGlobalCatalog({ role: "super_admin" }), true);
  assert.equal(canManageGlobalCatalog({
    role: "manager",
    permissions: { canManageProducts: true, canManageAllBranchInventory: true }
  }), true);
  assert.equal(canManageGlobalCatalog({
    role: "manager",
    permissions: { canManageProducts: true, canManageBranchInventory: true }
  }), false);
  assert.equal(canManageGlobalCatalog({
    role: "cashier",
    permissions: { canManageAllBranchInventory: true }
  }), false);
});
