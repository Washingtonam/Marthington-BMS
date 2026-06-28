import assert from "node:assert";
import { test } from "node:test";
import mongoose from "mongoose";
import User from "../users/user.model.js";
import Business from "../businesses/business.model.js";
import SystemSettings from "../admin/systemSettings.model.js";
import { creditAffiliate } from "./affiliate.utils.js";

const MONGO_URL = process.env.TEST_MONGO_URL || "mongodb://127.0.0.1:27017/marthington_test";

test("creditAffiliate credits the referring affiliate and creates a payout record", async () => {
  await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

  await User.deleteMany({});
  await Business.deleteMany({});
  await SystemSettings.deleteMany({});

  const affiliate = await User.create({
    name: "Referral Partner",
    email: "partner@example.com",
    password: "password",
    role: "affiliate",
    affiliateCode: "PARTNER01"
  });

  const business = await Business.create({
    name: "Referred Store",
    address: "Lagos",
    phone: "08011111111",
    industryType: "retail",
    referredBy: "PARTNER01"
  });

  await SystemSettings.create({ globalAffiliateRate: 20 });

  const result = await creditAffiliate(business._id, 15000);

  assert.equal(result.affiliateCode, "PARTNER01");
  assert.equal(result.commissionAmount, 3000);
  assert.equal(result.affiliateRate, 20);

  const updatedAffiliate = await User.findById(affiliate._id).lean();
  assert.equal(updatedAffiliate.walletBalance, 3000);
  assert.equal(updatedAffiliate.totalEarned, 3000);

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
