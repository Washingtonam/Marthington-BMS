import User from "../users/user.model.js";
import PayoutRequest from "./payoutRequest.model.js";
import WithdrawalHistory from "./withdrawalHistory.model.js";

const createPayoutRequest = async (req, res) => {
  try {
    const affiliateId = req.user?._id;
    if (!affiliateId) return res.status(401).json({ message: "Unauthorized" });

    const { amount } = req.body;
    const amountNum = Number(amount || 0);

    if (!amountNum || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid payout amount" });
    }

    const affiliate = await User.findById(affiliateId);
    if (!affiliate) return res.status(404).json({ message: "Affiliate not found" });

    const bankName = affiliate.bankName || affiliate.paymentDetails?.bankName || "";
    const accountNumber = affiliate.accountNumber || affiliate.paymentDetails?.accountNumber || "";
    const accountName = affiliate.accountName || affiliate.paymentDetails?.accountName || "";

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ message: "Please complete your bank details in your profile before requesting a payout" });
    }

    if (Number(affiliate.walletBalance || 0) < amountNum) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    const payout = await PayoutRequest.create({
      partnerId: affiliateId,
      affiliate: affiliateId,
      affiliateCode: affiliate.affiliateCode || "",
      amountRequested: amountNum,
      bankSnapshot: {
        bankName,
        accountNumber,
        accountName
      },
      paymentDetails: {
        bankName,
        accountNumber,
        accountName
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

    const requests = await PayoutRequest.find({ partnerId: affiliateId }).sort({ createdAt: -1 }).lean();
    const history = await WithdrawalHistory.find({ partnerId: affiliateId }).sort({ date: -1 }).lean();

    res.json({ requests, history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default {
  createPayoutRequest,
  getPayoutRequests
};
