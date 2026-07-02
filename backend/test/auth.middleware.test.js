import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import protect from "../src/middlewares/auth.middleware.js";
import User from "../src/modules/users/user.model.js";
import Business from "../src/modules/businesses/business.model.js";

test("protect allows affiliate users without a linked business", async () => {
  process.env.JWT_SECRET = "test-secret";

  const originalFindById = User.findById;
  const originalBusinessFindById = Business.findById;

  const token = jwt.sign({ id: "user-1" }, process.env.JWT_SECRET);

  User.findById = () => ({
    populate: async () => ({
      _id: "user-1",
      email: "affiliate@example.com",
      name: "Affiliate User",
      role: "affiliate",
      isActive: true,
      permissions: {},
      business: null
    })
  });

  Business.findById = async () => null;

  const req = {
    headers: {
      authorization: `Bearer ${token}`
    }
  };

  let statusCode;
  let responseBody;
  let nextCalled = false;

  const res = {
    status(code) {
      statusCode = code;
      return {
        json(body) {
          responseBody = body;
        }
      };
    },
    json(body) {
      responseBody = body;
    }
  };

  try {
    await protect(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(statusCode, undefined);
    assert.equal(responseBody, undefined);
    assert.equal(req.user.businessId, null);
  } finally {
    User.findById = originalFindById;
    Business.findById = originalBusinessFindById;
  }
});
