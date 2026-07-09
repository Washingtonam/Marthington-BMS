import User from "../users/user.model.js";
import PayoutRequest from "./payoutRequest.model.js";

const createPayoutRequest = async (req, res) => {
  try {
    const affiliateId = req.user?._id;
    if (!affiliateId) return res.status(401).json({ message: "Unauthorized" });

    const { amount } = req.body;
    const amountNum = Number(amount || 0);

    if (!amountNum || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid payout amount" });
    }

    // Check if affiliate has completed bank details
    const affiliate = await User.findById(affiliateId);
    if (!affiliate) return res.status(404).json({ message: "Affiliate not found" });
    
    if (!affiliate.paymentDetails?.bankName || !affiliate.paymentDetails?.accountNumber || !affiliate.paymentDetails?.accountName) {
      return res.status(400).json({ message: "Please complete your bank details in your profile before requesting a payout" });
    }

    // Atomically decrement walletBalance only if sufficient funds
    const updatedAffiliate = await User.findOneAndUpdate(
      { _id: affiliateId, walletBalance: { $gte: amountNum } },
      { $inc: { walletBalance: -amountNum } },
      { new: true }
    );

    if (!updatedAffiliate) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    const payout = await PayoutRequest.create({
      affiliate: affiliateId,
      affiliateCode: affiliate.affiliateCode || "",
      amountRequested: amountNum,
      paymentDetails: {
        bankName: affiliate.paymentDetails?.bankName || "",
        accountNumber: affiliate.paymentDetails?.accountNumber || "",
        accountName: affiliate.paymentDetails?.accountName || ""
      },
      status: "pending"
    });

    return res.status(201).json({ message: "Payout request created", payout });
  } catch (err) {
    console.error("PAYOUT REQUEST ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

const getPayoutRequests = async (req, res) => {
  try {
    const affiliateId = req.user?._id;
    if (!affiliateId) return res.status(401).json({ message: "Unauthorized" });

    const requests = await PayoutRequest.find({ affiliate: affiliateId }).sort({ createdAt: -1 }).lean();

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default {
  createPayoutRequest,
  getPayoutRequests
};
