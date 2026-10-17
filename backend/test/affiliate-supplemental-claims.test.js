import test from "node:test";
import assert from "node:assert/strict";
import User from "../src/modules/users/user.model.js";
import Business from "../src/modules/businesses/business.model.js";
import SystemSettings from "../src/modules/admin/systemSettings.model.js";
import AffiliatePayout from "../src/modules/affiliates/affiliatePayout.model.js";
import CommissionClaim from "../src/modules/affiliates/commissionClaim.model.js";
import { creditAffiliate } from "../src/modules/affiliates/affiliate.utils.js";

test("first paid referral creates one direct-bonus and each reached milestone claim", { concurrency: false }, async () => {
  const originals = {
    businessFindById: Business.findById,
    userFindOne: User.findOne,
    userUpdateOne: User.updateOne,
    settingsFindOne: SystemSettings.findOne,
    payoutFindOne: AffiliatePayout.findOne,
    payoutCreate: AffiliatePayout.create,
    claimUpdateOne: CommissionClaim.updateOne
  };
  const affiliate = {
    _id: "agent-1",
    affiliateCode: "AGENT1",
    totalEarned: 9000,
    walletBalance: 2000
  };
  const business = {
    _id: "business-1",
    referredBy: "AGENT1",
    name: "Referred business",
    industryType: "retail"
  };
  const settings = {
    globalAffiliateRate: 20,
    commissionSchedule: {
      directReferralBonus: { amount: 1500, description: "First paid referral" },
      cpaActions: [],
      payoutMilestones: [
        { name: "First milestone", thresholdAmount: 10000, rewardAmount: 500 },
        { name: "Second milestone", thresholdAmount: 25000, rewardAmount: 1000 }
      ]
    }
  };
  const claims = [];
  let paymentAlreadyCredited = false;

  Business.findById = () => ({ session: () => ({ lean: async () => business }) });
  User.findOne = () => ({ session: () => ({ lean: async () => affiliate }) });
  User.updateOne = async () => ({ matchedCount: 1 });
  SystemSettings.findOne = () => ({ session: () => ({ lean: async () => settings }) });
  AffiliatePayout.findOne = (query) => ({
    session: () => ({
      lean: async () => query.paymentReference && paymentAlreadyCredited ? {
        affiliate: affiliate._id,
        affiliateCode: affiliate.affiliateCode,
        business: business._id,
        commissionEarned: 1000,
        rateApplied: 20
      } : null
    })
  });
  AffiliatePayout.create = async ([record]) => {
    paymentAlreadyCredited = true;
    return [{ ...record, _id: "payout-1" }];
  };
  CommissionClaim.updateOne = async (filter, update) => {
    claims.push({ ...update.$setOnInsert, filter });
    return { upsertedCount: 1 };
  };

  try {
    const result = await creditAffiliate(business._id, 5000, null, "pay-ref-1");
    assert.equal(result.commissionAmount, 1000);
    assert.deepEqual(claims.map((claim) => claim.kind), [
      "direct_referral_bonus",
      "payout_milestone"
    ]);
    assert.equal(claims[0].amount, 1500);
    assert.equal(claims[1].amount, 500);

    const duplicateResult = await creditAffiliate(business._id, 5000, null, "pay-ref-1");
    assert.equal(duplicateResult.alreadyCredited, true);
    assert.equal(claims.length, 2);
  } finally {
    Business.findById = originals.businessFindById;
    User.findOne = originals.userFindOne;
    User.updateOne = originals.userUpdateOne;
    SystemSettings.findOne = originals.settingsFindOne;
    AffiliatePayout.findOne = originals.payoutFindOne;
    AffiliatePayout.create = originals.payoutCreate;
    CommissionClaim.updateOne = originals.claimUpdateOne;
  }
});
