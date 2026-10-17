import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Business from "../src/modules/businesses/business.model.js";
import Notification from "../src/modules/notifications/notification.model.js";
import SystemSettings from "../src/modules/admin/systemSettings.model.js";
import User from "../src/modules/users/user.model.js";
import CommissionClaim from "../src/modules/affiliates/commissionClaim.model.js";
import {
  createAgentCpaClaim,
  processAdminCommissionClaim
} from "../src/modules/affiliates/commissionClaims.controller.js";

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test("agents can submit only configured CPA claims for their attributed businesses", { concurrency: false }, async () => {
  const originals = {
    userFindById: User.findById,
    settingsFindOne: SystemSettings.findOne,
    businessFindOne: Business.findOne,
    claimCreate: CommissionClaim.create
  };
  const businessId = new mongoose.Types.ObjectId().toString();
  let savedClaims = [];

  User.findById = () => ({ select: async () => ({ _id: "agent-1", affiliateCode: "AGENT1" }) });
  SystemSettings.findOne = () => ({
    select: () => ({
      lean: async () => ({
        commissionSchedule: {
          cpaActions: [{ name: "Verified Signup", flatFee: 750, active: true }]
        }
      })
    })
  });
  Business.findOne = (query) => ({
    select: async () => query.referredBy === "AGENT1"
      ? { _id: query._id, name: "Referred business" }
      : null
  });
  CommissionClaim.create = async (docs) => {
    savedClaims = docs;
    return docs.map((claim) => ({ ...claim, _id: "claim-1", status: "pending" }));
  };

  try {
    const res = makeResponse();
    await createAgentCpaClaim({
      user: { _id: "agent-1" },
      body: {
        businessId,
        action: "verified-signup",
        evidence: "Verified account onboarding is complete."
      }
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(savedClaims[0].amount, 750);
    assert.equal(savedClaims[0].affiliate, "agent-1");
    assert.equal(savedClaims[0].business, businessId);

    const missingBusiness = makeResponse();
    Business.findOne = () => ({ select: async () => null });
    await createAgentCpaClaim({
      user: { _id: "agent-1" },
      body: {
        businessId,
        action: "verified-signup",
        evidence: "Verified account onboarding is complete."
      }
    }, missingBusiness);
    assert.equal(missingBusiness.statusCode, 404);
  } finally {
    User.findById = originals.userFindById;
    SystemSettings.findOne = originals.settingsFindOne;
    Business.findOne = originals.businessFindOne;
    CommissionClaim.create = originals.claimCreate;
  }
});

test("only approved supplemental claims credit the agent wallet transactionally", { concurrency: false }, async () => {
  const originals = {
    startSession: mongoose.startSession,
    claimFindOneAndUpdate: CommissionClaim.findOneAndUpdate,
    userUpdateOne: User.updateOne,
    notificationCreate: Notification.create
  };
  const calls = [];
  const session = {
    startTransaction: () => calls.push("start"),
    commitTransaction: async () => calls.push("commit"),
    abortTransaction: async () => calls.push("abort"),
    inTransaction: () => true,
    endSession: async () => calls.push("end")
  };
  mongoose.startSession = async () => session;
  CommissionClaim.findOneAndUpdate = async (_query, update) => {
    calls.push(update.$set.status);
    return {
      affiliate: "agent-1",
      amount: 750,
      title: "Verified Signup",
      status: update.$set.status
    };
  };
  User.updateOne = async (_query, update) => {
    calls.push(update.$inc.walletBalance);
    return { matchedCount: 1 };
  };
  Notification.create = async () => calls.push("notify");

  try {
    const approveResponse = makeResponse();
    await processAdminCommissionClaim({
      params: { id: new mongoose.Types.ObjectId().toString(), decision: "approve" },
      body: {},
      user: { _id: "admin-1" }
    }, approveResponse);
    assert.equal(approveResponse.statusCode, 200);
    assert.deepEqual(calls, ["start", "approved", 750, "notify", "commit", "end"]);

    calls.length = 0;
    const rejectResponse = makeResponse();
    await processAdminCommissionClaim({
      params: { id: new mongoose.Types.ObjectId().toString(), decision: "reject" },
      body: { note: "Evidence did not verify." },
      user: { _id: "admin-1" }
    }, rejectResponse);
    assert.equal(rejectResponse.statusCode, 200);
    assert.deepEqual(calls, ["start", "rejected", "notify", "commit", "end"]);
  } finally {
    mongoose.startSession = originals.startSession;
    CommissionClaim.findOneAndUpdate = originals.claimFindOneAndUpdate;
    User.updateOne = originals.userUpdateOne;
    Notification.create = originals.notificationCreate;
  }
});
