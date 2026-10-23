import test from "node:test";
import assert from "node:assert/strict";
import Product from "../src/modules/products/product.model.js";
import Business from "../src/modules/businesses/business.model.js";
import ShopOrder from "../src/modules/shop/shopOrder.model.js";
import {
  createShopOrder,
  getShopAdminProducts,
  updateOwnerStorefrontProduct
} from "../src/modules/shop/shop.controller.js";

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test("owner storefront edits are scoped to the authenticated business", async (t) => {
  let query;
  t.mock.method(Product, "findOne", async (filter) => {
    query = filter;
    return null;
  });
  const res = createResponse();

  await updateOwnerStorefrontProduct({
    user: { businessId: "owner-business" },
    params: { id: "another-business-product" },
    body: { shopSalePrice: "7500" }
  }, res);

  assert.deepEqual(query, { _id: "another-business-product", business: "owner-business" });
  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /your business catalogue/);
});

test("owners cannot save a discount at or above the BMS price", async (t) => {
  const product = {
    _id: "product-id",
    name: "Gift set",
    price: 10000,
    shopSalePrice: 0,
    shopPriceMode: "discount",
    save: t.mock.fn()
  };
  t.mock.method(Product, "findOne", async () => product);
  const res = createResponse();

  await updateOwnerStorefrontProduct({
    user: { businessId: "owner-business" },
    params: { id: "product-id" },
    body: { shopSalePrice: "10000", shopPriceMode: "discount" }
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /discount price must be lower/i);
  assert.equal(product.save.mock.callCount(), 0);
});

test("owners can save a replacement price above the BMS price", async (t) => {
  const product = {
    _id: "product-id",
    name: "Gift set",
    category: "Gifts",
    price: 10000,
    shopSalePrice: 0,
    shopPriceMode: "discount",
    stock: 3,
    shopImage: "",
    shopDescription: "",
    save: t.mock.fn(async () => {})
  };
  t.mock.method(Product, "findOne", async () => product);
  const res = createResponse();

  await updateOwnerStorefrontProduct({
    user: { businessId: "owner-business" },
    params: { id: "product-id" },
    body: { shopSalePrice: "12000", shopPriceMode: "override" }
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(product.shopSalePrice, 12000);
  assert.equal(product.shopPriceMode, "override");
  assert.equal(res.body.product.shopPriceMode, "override");
  assert.equal(product.save.mock.callCount(), 1);
});

test("checkout rejects a cart price that does not match the configured storefront price", async (t) => {
  const product = {
    _id: "0123456789abcdef01234567",
    business: "business-id",
    name: "Gift set",
    category: "Gifts",
    price: 10000,
    shopSalePrice: 7500,
    shopPriceMode: "discount"
  };
  t.mock.method(Product, "find", () => ({ lean: async () => [product] }));
  t.mock.method(Business, "find", () => ({
    select: () => ({ lean: async () => [{ _id: "business-id", name: "Market Goods" }] })
  }));
  const orderCreate = t.mock.method(ShopOrder, "create", async () => {
    throw new Error("Order should not be created for a stale cart price.");
  });
  const res = createResponse();

  await createShopOrder({
    shopCustomer: {
      _id: "customer-id",
      name: "Customer",
      email: "customer@example.com",
      phone: "08000000000",
      addresses: { id: () => ({ recipientName: "Customer", phone: "08000000000" }) }
    },
    body: {
      addressId: "address-id",
      items: [{ productId: product._id, quantity: 1, expectedPrice: 10000 }]
    }
  }, res);

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /price changed/i);
  assert.equal(orderCreate.mock.callCount(), 0);
});

test("admin product listing filters for products with storefront images", async (t) => {
  let countFilter;
  let findFilter;
  t.mock.method(Product, "countDocuments", async (filter) => {
    countFilter = filter;
    return 1;
  });
  t.mock.method(Product, "find", (filter) => {
    findFilter = filter;
    return {
      select: () => ({
        populate: () => ({
          sort: () => ({
            skip: () => ({
              limit: () => ({
                lean: async () => []
              })
            })
          })
        })
      })
    };
  });
  const res = createResponse();

  await getShopAdminProducts({ query: { imageStatus: "present" } }, res);

  const expectedFilter = { shopImage: { $nin: ["", null], $exists: true } };
  assert.deepEqual(countFilter, expectedFilter);
  assert.deepEqual(findFilter, expectedFilter);
  assert.equal(res.statusCode, 200);
});

test("admin product listing filters products by source business", async (t) => {
  const businessId = "0123456789abcdef01234567";
  let countFilter;
  let findFilter;
  t.mock.method(Product, "countDocuments", async (filter) => {
    countFilter = filter;
    return 0;
  });
  t.mock.method(Product, "find", (filter) => {
    findFilter = filter;
    return {
      select: () => ({
        populate: () => ({
          sort: () => ({
            skip: () => ({
              limit: () => ({
                lean: async () => []
              })
            })
          })
        })
      })
    };
  });
  const res = createResponse();

  await getShopAdminProducts({ query: { businessId } }, res);

  assert.deepEqual(countFilter, { business: businessId });
  assert.deepEqual(findFilter, { business: businessId });
  assert.equal(res.statusCode, 200);
});

test("admin product listing rejects malformed source business identifiers", async (t) => {
  const countDocuments = t.mock.method(Product, "countDocuments", async () => 0);
  const res = createResponse();

  await getShopAdminProducts({ query: { businessId: "not-an-object-id" } }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /valid source business/i);
  assert.equal(countDocuments.mock.callCount(), 0);
});
