import test from "node:test";
import assert from "node:assert/strict";

import {
  canManageGlobalCatalog,
  chooseMergeStock,
  chooseMergeStockFromProducts,
  chooseMergeFieldFromProducts,
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

test("multi-product stock policies sum all quantities or select any product", () => {
  const products = [
    { _id: "one", stock: 5 },
    { _id: "two", stock: 3 },
    { _id: "three", stock: 4 }
  ];
  assert.equal(chooseMergeStockFromProducts(products, "sum", "one"), 12);
  assert.equal(chooseMergeStockFromProducts(products, "three", "one"), 4);
});

test("multi-product price policies choose any selected product and weight cost by stock", () => {
  const products = [
    { _id: "one", price: 20, costPrice: 10 },
    { _id: "two", price: 22, costPrice: 12 },
    { _id: "three", price: 18, costPrice: 8 }
  ];
  assert.equal(chooseMergeFieldFromProducts(products, "three", "price"), 18);
  assert.equal(chooseMergeFieldFromProducts(products, "highest", "price"), 22);
  assert.equal(chooseMergeFieldFromProducts(products, "weighted-average", "costPrice", [5, 3, 4]), 9.83);
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
