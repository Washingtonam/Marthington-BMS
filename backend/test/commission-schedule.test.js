import test from "node:test";
import assert from "node:assert/strict";
import {
  commissionActionKey,
  defaultCommissionSchedule,
  getEligibleCommissionMilestones,
  getCommissionScheduleItemKey,
  validateCommissionSchedule
} from "../src/modules/affiliates/commissionSchedule.js";

test("default commission schedule leaves supplemental terms unpublished", () => {
  assert.deepEqual(defaultCommissionSchedule, {
    directReferralBonus: null,
    cpaActions: [],
    payoutMilestones: []
  });
});

test("commission schedule accepts valid published CPA, bonus, and milestone terms", () => {
  assert.equal(validateCommissionSchedule({
    directReferralBonus: { amount: 2500, description: "For a qualified direct referral" },
    cpaActions: [{ name: "Verified signup", description: "Completed onboarding", flatFee: 500, active: true }],
    payoutMilestones: [{ name: "First milestone", description: "Confirmed earnings target", thresholdAmount: 50000, rewardAmount: 3000 }]
  }), null);
});

test("commission schedule rejects invalid or unbounded terms", () => {
  assert.match(validateCommissionSchedule({
    directReferralBonus: null,
    cpaActions: [{ name: "Invalid", flatFee: -1 }],
    payoutMilestones: []
  }), /flatFee/);

  assert.match(validateCommissionSchedule({
    directReferralBonus: null,
    cpaActions: [],
    payoutMilestones: [{ name: "Invalid", thresholdAmount: 5000, rewardAmount: Number.NaN }]
  }), /rewardAmount/);

  assert.match(validateCommissionSchedule({
    directReferralBonus: null,
    cpaActions: [],
    payoutMilestones: Array.from({ length: 51 }, (_, index) => ({
      name: `Milestone ${index}`, thresholdAmount: 0, rewardAmount: 0
    }))
  }), /no more than 50/);

  assert.match(validateCommissionSchedule({
    directReferralBonus: null,
    cpaActions: [
      { name: "Qualified Signup", flatFee: 100 },
      { name: "qualified-signup", flatFee: 200 }
    ],
    payoutMilestones: []
  }), /must be unique/);
});

test("CPA action keys are normalized consistently for agent submissions", () => {
  assert.equal(commissionActionKey("  Qualified Business Signup! "), "qualified-business-signup");
  assert.equal(getCommissionScheduleItemKey({ id: "stable-cpa-id", name: "Old label" }), "stable-cpa-id");
  assert.equal(getCommissionScheduleItemKey({ id: "stable-cpa-id", name: "Renamed label" }), "stable-cpa-id");
});

test("milestone claims become eligible at the configured confirmed-earnings threshold", () => {
  const milestones = [
    { name: "First", thresholdAmount: 10000, rewardAmount: 500 },
    { name: "Second", thresholdAmount: 25000, rewardAmount: 1500 },
    { name: "Disabled", thresholdAmount: 0, rewardAmount: 1000 }
  ];
  assert.deepEqual(getEligibleCommissionMilestones(24999, milestones), [milestones[0]]);
  assert.deepEqual(getEligibleCommissionMilestones(25000, milestones), milestones.slice(0, 2));
});
