import test from "node:test";
import assert from "node:assert/strict";
import Business from "../src/modules/businesses/business.model.js";
import User from "../src/modules/users/user.model.js";
import { ensureSuperAdminWorkspace } from "../src/modules/businesses/business.controller.js";

test("provisions and links a business workspace for an unlinked super admin", { concurrency: false }, async () => {
  const originalUserFindById = User.findById;
  const originalUserFindOneAndUpdate = User.findOneAndUpdate;
  const originalBusinessCreate = Business.create;
  let createdPayload;
  let statusCode;
  let responseBody;

  User.findById = () => ({
    populate: async () => ({
      _id: "admin-id",
      name: "Platform Admin",
      email: "admin@example.com",
      business: null
    })
  });
  Business.create = async (payload) => {
    createdPayload = payload;
    return { _id: "workspace-id" };
  };
  User.findOneAndUpdate = (filter, update, options) => ({
    populate: async () => {
      assert.deepEqual(filter, { _id: "admin-id", business: null });
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
    await ensureSuperAdminWorkspace(
      { user: { id: "admin-id", accountRole: "super_admin" } },
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

    assert.equal(statusCode, 201);
    assert.equal(createdPayload.name, "Platform Admin's Business");
    assert.equal(createdPayload.email, "admin@example.com");
    assert.equal(createdPayload.owner, "admin-id");
    assert.equal(responseBody.business._id, "workspace-id");
  } finally {
    User.findById = originalUserFindById;
    User.findOneAndUpdate = originalUserFindOneAndUpdate;
    Business.create = originalBusinessCreate;
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
