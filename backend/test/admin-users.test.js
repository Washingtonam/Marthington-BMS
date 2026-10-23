import test from "node:test";
import assert from "node:assert/strict";
import User from "../src/modules/users/user.model.js";
import adminController from "../src/modules/admin/admin.controller.js";

const callHandler = async (handler, req) => {
  let statusCode = 200;
  let responseBody;
  await handler(req, {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  });
  return { statusCode, responseBody };
};

test("lists all users with safe fields and marks the current admin", { concurrency: false }, async () => {
  const originalFind = User.find;
  let query;
  User.find = (filter) => {
    query = filter;
    return {
      select() { return this; },
      populate() { return this; },
      sort() { return this; },
      lean: async () => [{ _id: "user-1", name: "Ada", role: "owner" }]
    };
  };

  try {
    const result = await callHandler(adminController.listUsers, {
      query: {},
      user: { id: "user-1" }
    });
    assert.equal(result.statusCode, 200);
    assert.deepEqual(query, {});
    assert.equal(result.responseBody.users[0].isCurrentUser, true);
  } finally {
    User.find = originalFind;
  }
});

test("promotes a user to super admin", { concurrency: false }, async () => {
  const originalFindById = User.findById;
  const user = {
    _id: "target-user",
    name: "Ada Owner",
    email: "ada@example.com",
    role: "owner",
    business: "business-1",
    isActive: true,
    save: async () => {}
  };
  User.findById = () => ({ select: async () => user });

  try {
    const result = await callHandler(adminController.updateUserRole, {
      params: { userId: "target-user" },
      body: { role: "super_admin" },
      user: { id: "admin-user" }
    });
    assert.equal(result.statusCode, 200);
    assert.equal(user.role, "super_admin");
    assert.equal(result.responseBody.user.role, "super_admin");
  } finally {
    User.findById = originalFindById;
  }
});

test("rejects self role changes and invalid role values", { concurrency: false }, async () => {
  const originalFindById = User.findById;
  let lookupCount = 0;
  User.findById = () => {
    lookupCount += 1;
    return { select: async () => null };
  };

  try {
    const invalid = await callHandler(adminController.updateUserRole, {
      params: { userId: "other-user" },
      body: { role: "root" },
      user: { id: "admin-user" }
    });
    const selfChange = await callHandler(adminController.updateUserRole, {
      params: { userId: "admin-user" },
      body: { role: "owner" },
      user: { id: "admin-user" }
    });
    assert.equal(invalid.statusCode, 400);
    assert.equal(selfChange.statusCode, 400);
    assert.equal(lookupCount, 0);
  } finally {
    User.findById = originalFindById;
  }
});

test("does not demote the last active super admin", { concurrency: false }, async () => {
  const originalFindById = User.findById;
  const originalCountDocuments = User.countDocuments;
  const user = {
    _id: "target-admin",
    role: "super_admin",
    isActive: true,
    save: async () => assert.fail("Last super admin must not be demoted")
  };
  User.findById = () => ({ select: async () => user });
  User.countDocuments = async (filter) => {
    assert.deepEqual(filter, { role: "super_admin", isActive: { $ne: false } });
    return 1;
  };

  try {
    const result = await callHandler(adminController.updateUserRole, {
      params: { userId: "target-admin" },
      body: { role: "owner" },
      user: { id: "other-admin" }
    });
    assert.equal(result.statusCode, 400);
    assert.equal(user.role, "super_admin");
  } finally {
    User.findById = originalFindById;
    User.countDocuments = originalCountDocuments;
  }
});
