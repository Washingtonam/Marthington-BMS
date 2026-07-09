import User from "../users/user.model.js";
import Business from "../businesses/business.model.js";
import AffiliatePayout from "./affiliatePayout.model.js";
import PayoutRequest from "./payoutRequest.model.js";
import WithdrawalHistory from "./withdrawalHistory.model.js";

const getAffiliateDashboard = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const affiliate = await User.findById(req.user._id).lean();

    if (!affiliate || affiliate.role !== "affiliate") {
      return res.status(403).json({ message: "Access denied" });
    }

    const conversions = await AffiliatePayout.find({ affiliate: req.user._id })
      .sort({ transactionDate: -1 })
      .lean();

    const referredBusinesses = await Business.find({ referredBy: affiliate.affiliateCode })
      .populate("owner", "name email")
      .lean();

    const businessConversionMap = new Map(
      conversions.map((item) => [item.business?.toString(), item])
    );

    const referralDetails = referredBusinesses.map((business) => {
      const payout = businessConversionMap.get(business._id?.toString());
      const plan = business.subscription?.plan || "free";
      const status = business.subscription?.status || "trial";
      const isPro = business.isPro === true || (plan === "pro" && status === "active");

      const referredAt = business._id?.getTimestamp
        ? new Date(business._id.getTimestamp()).toLocaleDateString("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })
        : "N/A";

      return {
        businessId: business._id?.toString() || "",
        businessName: business.name || "Unknown Business",
        ownerName: business.owner?.name || "Unknown Owner",
        ownerEmail: business.owner?.email || "",
        industry: business.industryType || "N/A",
        plan,
        subscriptionStatus: status,
        isPro,
        referredAt,
        converted: Boolean(payout),
        commissionEarned: Number(payout?.commissionEarned || 0),
        transactionDate: payout?.transactionDate
          ? new Date(payout.transactionDate).toLocaleDateString("en-NG", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            })
          : "N/A"
      };
    });

    const totalConversions = conversions.length;
    const totalReferrals = referredBusinesses.length;
    const totalLifetimeEarnings = conversions.reduce(
      (sum, item) => sum + Number(item.commissionEarned || 0),
      0
    );

    const walletBalance = Number(affiliate.walletBalance || 0);

    const formattedConversions = conversions.map((item) => ({
      businessName: item.businessName || "Unknown Business",
      industry: item.industry || "N/A",
      joinedAt: item.transactionDate
        ? new Date(item.transactionDate).toLocaleDateString("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })
        : "N/A",
      status: item.status === "credited" ? "Paid" : "Pending",
      commission: Number(item.commissionEarned || 0),
      amountPaid: Number(item.amountPaid || 0),
      rateApplied: Number(item.rateApplied || 0)
    }));

    const payoutRequests = await PayoutRequest.find({ partnerId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const withdrawalHistory = await WithdrawalHistory.find({ partnerId: req.user._id })
      .sort({ date: -1 })
      .lean();

    res.json({
      affiliate: {
        affiliateCode: affiliate.affiliateCode,
        walletBalance,
        totalEarned: Number(affiliate.totalEarned || 0),
        totalConversions,
        totalReferrals,
        totalLifetimeEarnings
      },
      referrals: referralDetails,
      conversions: formattedConversions,
      payoutRequests,
      withdrawalHistory
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAffiliateProfile = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const affiliate = await User.findById(req.user._id).lean();

    if (!affiliate) {
      return res.status(404).json({ message: "User not found" });
    }

    if (affiliate.role !== "affiliate") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Return profile data
    res.json({
      affiliate: {
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone || "",
        address: affiliate.address || "",
        affiliateCode: affiliate.affiliateCode,
        paymentDetails: affiliate.paymentDetails || {
          bankName: "",
          accountNumber: "",
          accountName: ""
        },
        totalEarned: affiliate.totalEarned || 0,
        walletBalance: affiliate.walletBalance || 0
      }
    });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

const updateAffiliateProfile = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { phone, address, bankName, accountNumber, accountName } = req.body;

    // Validate required fields
    if (!phone || !address || !bankName || !accountNumber || !accountName) {
      console.warn("UPDATE PROFILE - Missing required fields:", { phone: !!phone, address: !!address, bankName: !!bankName, accountNumber: !!accountNumber, accountName: !!accountName });
      return res.status(400).json({ message: "All fields are required" });
    }

    const update = {
      phone: phone.trim(),
      phoneNumber: phone.trim(),
      address: address.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
      paymentDetails: {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim()
      }
    };

    console.log("UPDATE PROFILE - Updating user:", req.user._id, "with data:", update);

    const affiliate = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true
    });

    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate not found" });
    }

    console.log("UPDATE PROFILE - Success for user:", affiliate._id);

    res.json({ 
      message: "Profile updated successfully", 
      affiliate: {
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        address: affiliate.address,
        affiliateCode: affiliate.affiliateCode,
        paymentDetails: affiliate.paymentDetails,
        totalEarned: affiliate.totalEarned,
        walletBalance: affiliate.walletBalance
      }
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

export default {
  getAffiliateDashboard,
  getAffiliateProfile,
  updateAffiliateProfile
};
