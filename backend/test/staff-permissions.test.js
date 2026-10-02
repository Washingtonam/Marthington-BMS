import test from "node:test";
import assert from "node:assert/strict";

import { createStaff, updateStaff } from "../src/modules/users/users.controller.js";
import staffController from "../src/modules/staff/staff.controller.js";
import User from "../src/modules/users/user.model.js";
import Branch from "../src/modules/branches/branch.model.js";
import Business from "../src/modules/businesses/business.model.js";

const buildRes = () => {
  const response = {
    statusCode: null,
    body: null
  };

  return {
    response,
    status(code) {
      response.statusCode = code;
      return this;
    },
    json(payload) {
      response.body = payload;
      return this;
    }
  };
};

test("create staff rejects privilege escalation beyond a manager's permissions", async () => {
  const originalFindOne = User.findOne;
  const originalCreate = User.create;
  const originalCountDocuments = User.countDocuments;
  const originalFindById = Business.findById;

  User.findOne = async () => null;
  User.create = async (data) => ({ ...data, _id: "new-staff" });
  User.countDocuments = async () => 0;
  Business.findById = async () => ({ getLimits: () => ({ staff: 10 }) });

  try {
    const req = {
      user: {
        role: "manager",
        businessId: "business-1",
        permissions: {
          canInviteStaff: true,
          canManageSettings: false,
          canAccessPOS: true
        }
      },
      body: {
        name: "New Staff",
        email: "newstaff@example.com",
        password: "secret123",
        permissions: {
          canManageSettings: true,
          canAccessPOS: true
        }
      }
    };

    const res = buildRes();
    await staffController.createStaff(req, res);

    assert.equal(res.response.statusCode, 403);
    assert.match(res.response.body.message, /cannot grant permissions/i);
  } finally {
    User.findOne = originalFindOne;
    User.create = originalCreate;
    User.countDocuments = originalCountDocuments;
    Business.findById = originalFindById;
  }
});

test("update staff rejects privilege escalation beyond the actor's permissions", async () => {
  const originalFindById = User.findById;
  const originalSave = User.prototype.save;

  const existingUser = {
    business: { toString: () => "business-1" },
    permissions: {
      canViewProducts: true,
      canAccessPOS: true,
      canEditStaffPermissions: true
    },
    branch: null,
    save: async function () {
      return this;
    }
  };

  User.findById = async () => existingUser;
  User.prototype.save = async function () {
    return this;
  };

  try {
    const req = {
      user: {
        role: "manager",
        businessId: "business-1",
        permissions: {
          canEditStaffPermissions: true,
          canManageSettings: false,
          canAccessPOS: true
        }
      },
      params: { id: "staff-2" },
      body: {
        permissions: {
          canManageSettings: true,
          canEditStaffPermissions: true
        }
      }
    };

    const res = buildRes();
    await updateStaff(req, res);

    assert.equal(res.response.statusCode, 403);
    assert.match(res.response.body.message, /cannot grant permissions/i);
  } finally {
    User.findById = originalFindById;
    User.prototype.save = originalSave;
  }
});

test("owner can create and update staff with permissions missing from an older owner record", async () => {
  const originalFindOne = User.findOne;
  const originalCreate = User.create;
  const originalCountDocuments = User.countDocuments;
  const originalFindById = User.findById;
  const originalBranchFindOne = Branch.findOne;
  const originalBusinessFindById = Business.findById;

  User.findOne = async () => null;
  User.create = async (data) => ({ ...data, _id: "new-staff" });
  User.countDocuments = async () => 0;
  User.findById = async () => ({
    business: { toString: () => "business-1" },
    role: "manager",
    permissions: { canViewProducts: true },
    save: async function () { return this; }
  });
  Branch.findOne = async () => ({ _id: "branch-b", business: "business-1" });
  Business.findById = async () => ({ getLimits: () => ({ staff: 10 }) });

  try {
    const owner = {
      role: "owner",
      businessId: "business-1",
      branchId: null,
      permissions: { canInviteStaff: true }
    };

    const createResponse = buildRes();
    await staffController.createStaff({
      user: owner,
      body: {
        name: "New Manager",
        email: "manager@example.com",
        password: "secret123",
        role: "manager",
        branch: "branch-b",
        permissions: {
          canManageAllBranchInventory: true,
          canManageSettings: true
        }
      }
    }, createResponse);

    assert.notEqual(createResponse.response.statusCode, 403);

    const updateResponse = buildRes();
    await staffController.updateStaff({
      user: owner,
      params: { id: "staff-2" },
      body: {
        permissions: {
          canManageAllBranchInventory: true,
          canManageSettings: true
        }
      }
    }, updateResponse);

    assert.notEqual(updateResponse.response.statusCode, 403);
  } finally {
    User.findOne = originalFindOne;
    User.create = originalCreate;
    User.countDocuments = originalCountDocuments;
    User.findById = originalFindById;
    Branch.findOne = originalBranchFindOne;
    Business.findById = originalBusinessFindById;
  }
});

test("canonical staff update cannot modify an owner account", async () => {
  const originalFindById = User.findById;

  User.findById = async () => ({
    business: { toString: () => "business-1" },
    role: "owner"
  });

  try {
    const res = buildRes();
    await staffController.updateStaff({
      user: {
        role: "manager",
        businessId: "business-1",
        permissions: { canEditStaffPermissions: true }
      },
      params: { id: "owner-1" },
      body: { name: "Changed" }
    }, res);

    assert.equal(res.response.statusCode, 403);
    assert.match(res.response.body.message, /accounts can be managed here/i);
  } finally {
    User.findById = originalFindById;
  }
});

test("canonical staff update prevents assigning a manager outside the actor's branch", async () => {
  const originalFindById = User.findById;
  const originalBranchFindOne = Branch.findOne;

  User.findById = async () => ({
    business: { toString: () => "business-1" },
    role: "manager",
    branch: "branch-a",
    permissions: {},
    save: async function () { return this; }
  });
  Branch.findOne = async () => ({ _id: "branch-b", business: "business-1" });

  try {
    const res = buildRes();
    await staffController.updateStaff({
      user: {
        role: "manager",
        businessId: "business-1",
        branchId: "branch-a",
        permissions: { canEditStaffPermissions: true }
      },
      params: { id: "staff-1" },
      body: { branch: "branch-b" }
    }, res);

    assert.equal(res.response.statusCode, 403);
    assert.match(res.response.body.message, /own branch/i);
  } finally {
    User.findById = originalFindById;
    Branch.findOne = originalBranchFindOne;
  }
});
