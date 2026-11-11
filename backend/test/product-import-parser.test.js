import test from "node:test";
import assert from "node:assert/strict";

import { parseProductImportRows } from "../src/modules/products/productImportParser.js";

test("parses standard product import columns and case/spacing variations", () => {
  const [product] = parseProductImportRows([{
    "Product Name": " Desk Lamp ",
    Category: "Lighting",
    SKU: "LAMP-1",
    Quantity: "4",
    "Selling Price": "3500",
    "Cost_Price": "2200"
  }]);

  assert.deepEqual(product, {
    rowNumber: 2,
    name: "Desk Lamp",
    category: "Lighting",
    sku: "LAMP-1",
    stock: 4,
    sellingPrice: 3500,
    costPrice: 2200
  });
});

test("allows new products with blank stock and prices", () => {
  const [product] = parseProductImportRows([{
    name: "New Item",
    sku: "NEW-1",
    stock: "",
    sellingPrice: "",
    costPrice: ""
  }]);

  assert.equal(product.stock, null);
  assert.equal(product.sellingPrice, null);
  assert.equal(product.costPrice, null);
});

test("supports price and stock aliases and skips blank rows", () => {
  const products = parseProductImportRows([
    { name: "", stock: 10 },
    { ItemName: "Notebook", price: 600, unitCost: 350, stockQuantity: 12 }
  ]);
  assert.equal(products.length, 1);
  assert.equal(products[0].rowNumber, 3);
  assert.equal(products[0].stock, 12);
  assert.equal(products[0].sellingPrice, 600);
  assert.equal(products[0].costPrice, 350);
});

test("rejects negative or non-numeric price and stock values", () => {
  assert.throws(
    () => parseProductImportRows([{ name: "Notebook", "Selling Price": -1 }]),
    /Invalid sellingPrice on row 2/
  );
  assert.throws(
    () => parseProductImportRows([{ name: "Notebook", quantity: "many" }]),
    /Invalid stock on row 2/
  );
});
