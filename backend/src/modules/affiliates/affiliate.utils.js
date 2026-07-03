import User from "../users/user.model.js";
import Business from "../businesses/business.model.js";
import SystemSettings from "../admin/systemSettings.model.js";
import AffiliatePayout from "./affiliatePayout.model.js";

export const creditAffiliate = async (businessId, paymentAmount, session = null) => {
  if (!businessId) {
    throw new Error("businessId is required to credit affiliate commission.");
  }

  const amount = Number(paymentAmount || 0);
  if (!amount || amount <= 0) {
    return null;
  }

  const business = await Business.findById(businessId).session(session).lean();
  if (!business || !business.referredBy) {
    return null;
  }

  const affiliate = await User.findOne({
    affiliateCode: business.referredBy,
    role: "affiliate"
  }).session(session).lean();

  if (!affiliate) {
    return null;
  }

  const settings = await SystemSettings.findOne().session(session).lean();
  const affiliateRate = Number(settings?.globalAffiliateRate ?? 20);
  const commissionAmount = Number((amount * affiliateRate) / 100);

  if (!commissionAmount || commissionAmount <= 0) {
    return null;
  }

  await User.updateOne(
    { _id: affiliate._id },
    {
      $inc: {
        walletBalance: commissionAmount,
        totalEarned: commissionAmount
      }
    },
    { session }
  );

  await AffiliatePayout.create(
    [
      {
        affiliateCode: affiliate.affiliateCode,
        affiliate: affiliate._id,
        business: business._id,
        businessName: business.name || "Unknown Business",
        industry: business.industryType || "N/A",
        amountPaid: amount,
        commissionEarned: commissionAmount,
        rateApplied: affiliateRate,
        status: "credited",
        transactionDate: new Date()
      }
    ],
    { session }
  );

  return {
    affiliateId: affiliate._id,
    affiliateCode: affiliate.affiliateCode,
    businessId: business._id,
    commissionAmount,
    affiliateRate
  };
};
