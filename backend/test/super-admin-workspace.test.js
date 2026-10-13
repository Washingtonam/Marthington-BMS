import test from "node:test";
import assert from "node:assert/strict";
import Business from "../src/modules/businesses/business.model.js";
import User from "../src/modules/users/user.model.js";
import { ensureSuperAdminWorkspace } from "../src/modules/businesses/business.controller.js";

const runHandler = async (userId = "admin-id") => {
  let statusCode;
  let responseBody;
  await ensureSuperAdminWorkspace(
    { user: { id: userId, accountRole: "super_admin" } },
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
      }
    }
  );
  return { statusCode, responseBody };
};

test("provisions and links a business workspace for an unlinked super admin", { concurrency: false }, async () => {
  const originalUserFindById = User.findById;
  const originalUserFindOneAndUpdate = User.findOneAndUpdate;
  const originalBusinessFindById = Business.findById;
  const originalBusinessCreate = Business.create;
  let createdPayload;

  User.findById = () => ({ select: async () => ({
    _id: "admin-id",
    name: "Platform Admin",
    email: "admin@example.com",
    role: "super_admin",
    business: null
  }) });
  Business.findById = () => null;
  Business.create = async (payload) => {
    createdPayload = payload;
    return { _id: "workspace-id" };
  };
  User.findOneAndUpdate = (filter, update, options) => ({
    populate: async () => {
      assert.deepEqual(filter, { _id: "admin-id", role: "super_admin", business: null });
      assert.deepEqual(update, { $set: { business: "workspace-id" } });
      assert.equal(options.new, true);
      return {
        business: {
          _id: "workspace-id",
          name: "Platform Admin's Business",
          email: "admin@example.com",
          industryType: "retail"
        }
      };
    }
  });

  try {
    const result = await runHandler();
    assert.equal(result.statusCode, 201);
    assert.equal(createdPayload.name, "Platform Admin's Business");
    assert.equal(createdPayload.email, "admin@example.com");
    assert.equal(createdPayload.owner, "admin-id");
    assert.equal(result.responseBody.business._id, "workspace-id");
  } finally {
    User.findById = originalUserFindById;
    User.findOneAndUpdate = originalUserFindOneAndUpdate;
    Business.findById = originalBusinessFindById;
    Business.create = originalBusinessCreate;
  }
});

test("replaces a stale linked business reference", { concurrency: false }, async () => {
  const originalUserFindById = User.findById;
  const originalUserFindOneAndUpdate = User.findOneAndUpdate;
  const originalBusinessFindById = Business.findById;
  const originalBusinessCreate = Business.create;
  let updateFilter;

  User.findById = () => ({ select: async () => ({
    _id: "admin-id",
    name: "Platform Admin",
    email: "admin@example.com",
    role: "super_admin",
    business: "deleted-business-id"
  }) });
  Business.findById = async () => null;
  Business.create = async () => ({ _id: "replacement-id" });
  User.findOneAndUpdate = (filter) => {
    updateFilter = filter;
    return {
      populate: async () => ({
        business: { _id: "replacement-id", name: "Platform Admin's Business" }
      })
    };
  };

  try {
    const result = await runHandler();
    assert.equal(result.statusCode, 201);
    assert.deepEqual(updateFilter, {
      _id: "admin-id",
      role: "super_admin",
      business: "deleted-business-id"
    });
    assert.equal(result.responseBody.business._id, "replacement-id");
  } finally {
    User.findById = originalUserFindById;
    User.findOneAndUpdate = originalUserFindOneAndUpdate;
    Business.findById = originalBusinessFindById;
    Business.create = originalBusinessCreate;
  }
});

test("uses the workspace created by a concurrent switch request", { concurrency: false }, async () => {
  const originalUserFindById = User.findById;
  const originalUserFindOneAndUpdate = User.findOneAndUpdate;
  const originalBusinessFindById = Business.findById;
  const originalBusinessCreate = Business.create;
  const originalBusinessFindByIdAndDelete = Business.findByIdAndDelete;
  let userReadCount = 0;

  User.findById = () => ({
    select: async () => {
      userReadCount += 1;
      return userReadCount === 1
        ? { _id: "admin-id", name: "Admin", email: "admin@example.com", role: "super_admin", business: null }
        : { business: "concurrent-workspace" };
    }
  });
  Business.findById = async (id) => id === "concurrent-workspace"
    ? { _id: id, name: "Existing workspace" }
    : null;
  Business.create = async () => ({ _id: "duplicate-workspace" });
  User.findOneAndUpdate = () => ({ populate: async () => null });
  Business.findByIdAndDelete = async (id) => {
    assert.equal(id, "duplicate-workspace");
  };

  try {
    const result = await runHandler();
    assert.equal(result.statusCode, 200);
    assert.equal(result.responseBody.business._id, "concurrent-workspace");
  } finally {
    User.findById = originalUserFindById;
    User.findOneAndUpdate = originalUserFindOneAndUpdate;
    Business.findById = originalBusinessFindById;
    Business.create = originalBusinessCreate;
    Business.findByIdAndDelete = originalBusinessFindByIdAndDelete;
  }
});

test("does not provision a workspace for a non-super-admin", { concurrency: false }, async () => {
  const originalBusinessCreate = Business.create;
  let statusCode;
  let responseBody;
  Business.create = () => {
    throw new Error("Workspace creation should not run");
  };

  try {
    await ensureSuperAdminWorkspace(
      { user: { id: "owner-id", accountRole: "owner" } },
      {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          responseBody = body;
        }
      }
    );

    assert.equal(statusCode, 403);
    assert.deepEqual(responseBody, { message: "Access denied" });
  } finally {
    Business.create = originalBusinessCreate;
  }
});
