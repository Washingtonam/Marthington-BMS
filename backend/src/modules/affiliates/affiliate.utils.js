import User from "../users/user.model.js";
import Business from "../businesses/business.model.js";
import SystemSettings from "../admin/systemSettings.model.js";
import AffiliatePayout from "./affiliatePayout.model.js";
import CommissionClaim from "./commissionClaim.model.js";
import {
  getCommissionScheduleItemKey,
  getEligibleCommissionMilestones
} from "./commissionSchedule.js";

const createAutomatedClaim = async (claim, session) => {
  try {
    await CommissionClaim.updateOne(
      { claimKey: claim.claimKey },
      { $setOnInsert: claim },
      { upsert: true, session, runValidators: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
};

export const creditAffiliate = async (businessId, paymentAmount, session = null, paymentReference = null) => {
  if (!businessId) {
    console.error("[creditAffiliate] ❌ businessId is required");
    throw new Error("businessId is required to credit affiliate commission.");
  }

  const amount = Number(paymentAmount || 0);
  if (!amount || amount <= 0) {
    console.warn("[creditAffiliate] ⚠️  Payment amount is zero or invalid", { paymentAmount });
    return null;
  }

  console.log("[creditAffiliate] Starting affiliate credit process", { businessId, paymentAmount: amount });

  // ✅ STEP 1: LOAD BUSINESS & CHECK FOR REFERRAL
  const business = await Business.findById(businessId).session(session).lean();
  if (!business) {
    console.warn("[creditAffiliate] ⚠️  Business not found", { businessId });
    return null;
  }

  if (!business.referredBy) {
    console.log("[creditAffiliate] ℹ️  No referral code (referredBy) found", { businessId });
    return null;
  }

  if (paymentReference) {
    const existingCredit = await AffiliatePayout.findOne({ paymentReference }).session(session).lean();
    if (existingCredit) {
      return {
        affiliateId: existingCredit.affiliate,
        affiliateCode: existingCredit.affiliateCode,
        businessId: existingCredit.business,
        commissionAmount: Number(existingCredit.commissionEarned || 0),
        affiliateRate: Number(existingCredit.rateApplied || 0),
        alreadyCredited: true
      };
    }
  }

  console.log("[creditAffiliate] ✅ Business has referral code", {
    businessId,
    referredBy: business.referredBy
  });

  // ✅ STEP 2: LOCATE AFFILIATE USER
  const affiliate = await User.findOne({
    affiliateCode: business.referredBy
  }).session(session).lean();

  if (!affiliate) {
    console.warn("[creditAffiliate] ⚠️  Affiliate user not found with code", {
      businessId,
      affiliateCode: business.referredBy
    });
    return null;
  }

  console.log("[creditAffiliate] ✅ Affiliate user located", {
    affiliateId: affiliate._id,
    affiliateCode: affiliate.affiliateCode,
    currentWallet: affiliate.walletBalance,
    totalEarned: affiliate.totalEarned
  });

  // ✅ STEP 3: FETCH GLOBAL AFFILIATE RATE
  const settings = await SystemSettings.findOne().session(session).lean();
  const affiliateRate = Number(settings?.globalAffiliateRate ?? 20);
  const schedule = settings?.commissionSchedule || {};

  console.log("[creditAffiliate] ✅ Global affiliate rate fetched", { affiliateRate: `${affiliateRate}%` });

  const previousBusinessPayment = await AffiliatePayout.findOne({
    business: business._id,
    status: "credited"
  }).session(session).lean();
  const bonusAmount = Number(schedule.directReferralBonus?.amount || 0);
  if (!previousBusinessPayment && bonusAmount > 0) {
    await createAutomatedClaim({
      claimKey: `direct-bonus:${affiliate._id}:${business._id}`,
      affiliate: affiliate._id,
      affiliateCode: affiliate.affiliateCode,
      business: business._id,
      kind: "direct_referral_bonus",
      title: "Direct referral bonus",
      description: schedule.directReferralBonus.description || "Bonus for a referred business's first paid subscription.",
      amount: bonusAmount,
      evidence: `First paid subscription: ${paymentReference || business._id}`
    }, session);
  }

  // ✅ STEP 4: CALCULATE COMMISSION
  const commissionAmount = Number((amount * affiliateRate) / 100);

  if (!commissionAmount || commissionAmount <= 0) {
    console.warn("[creditAffiliate] ⚠️  Calculated commission is zero or invalid", {
      paymentAmount: amount,
      affiliateRate,
      calculatedCommission: commissionAmount
    });
    return null;
  }

  console.log("[creditAffiliate] ✅ Commission calculated", {
    paymentAmount: amount,
    affiliateRate: `${affiliateRate}%`,
    commissionAmount
  });

  // ✅ STEP 5: INCREMENT AFFILIATE WALLET (ATOMIC $inc OPERATION)
  console.log("[creditAffiliate] 💰 Incrementing affiliate wallet...", {
    affiliateId: affiliate._id,
    incrementAmount: commissionAmount
  });

  const walletUpdateResult = await User.updateOne(
    { _id: affiliate._id },
    {
      $inc: {
        walletBalance: commissionAmount,
        totalEarned: commissionAmount
      }
    },
    { session }
  );

  console.log("[creditAffiliate] ✅ Affiliate wallet incremented", {
    affiliateId: affiliate._id,
    modifiedCount: walletUpdateResult.modifiedCount,
    commissionAmount
  });

  // ✅ STEP 6: CREATE TRANSACTION LEDGER RECORD
  console.log("[creditAffiliate] 📋 Creating transaction ledger...");

  const payoutRecord = {
    affiliateCode: affiliate.affiliateCode,
    affiliate: affiliate._id,
    business: business._id,
    paymentReference: paymentReference || null,
    businessName: business.name || "Unknown Business",
    industry: business.industryType || "N/A",
    amountPaid: amount,
    commissionEarned: commissionAmount,
    rateApplied: affiliateRate,
    status: "credited",
    transactionDate: new Date()
  };

  const ledgerResult = await AffiliatePayout.create([payoutRecord], { session });

  const newConfirmedEarnings = Number(affiliate.totalEarned || 0) + commissionAmount;
  for (const milestone of getEligibleCommissionMilestones(newConfirmedEarnings, schedule.payoutMilestones)) {
    const threshold = Number(milestone.thresholdAmount);
    const reward = Number(milestone.rewardAmount);
    const milestoneKey = getCommissionScheduleItemKey(milestone);
    if (!milestoneKey) continue;
    await createAutomatedClaim({
      claimKey: `milestone:${affiliate._id}:${milestoneKey}`,
      affiliate: affiliate._id,
      affiliateCode: affiliate.affiliateCode,
      kind: "payout_milestone",
      actionKey: milestoneKey,
      title: milestone.name,
      description: milestone.description || `Confirmed earnings reached ₦${threshold.toLocaleString()}.`,
      amount: reward,
      evidence: `Confirmed earnings after this subscription commission: ₦${newConfirmedEarnings.toLocaleString()}.`
    }, session);
  }

  console.log("[creditAffiliate] ✅ Transaction ledger created", {
    payoutId: ledgerResult[0]?._id,
    affiliateCode: affiliate.affiliateCode,
    commissionEarned: commissionAmount,
    status: "credited"
  });

  console.log("[creditAffiliate] 🎉 AFFILIATE CREDIT COMPLETE", {
    affiliateId: affiliate._id,
    affiliateCode: affiliate.affiliateCode,
    businessId,
    commissionAmount,
    rateApplied: `${affiliateRate}%`,
    steps: [
      "✅ Business referral verified",
      "✅ Affiliate user located",
      "✅ Global rate fetched",
      "✅ Commission calculated",
      "✅ Wallet incremented atomically",
      "✅ Ledger record created"
    ]
  });

  return {
    affiliateId: affiliate._id,
    affiliateCode: affiliate.affiliateCode,
    businessId: business._id,
    commissionAmount,
    affiliateRate
  };
};
