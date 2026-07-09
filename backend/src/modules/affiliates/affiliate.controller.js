import User from "../users/user.model.js";
import Business from "../businesses/business.model.js";
import AffiliatePayout from "./affiliatePayout.model.js";

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
      conversions: formattedConversions
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

    const affiliate = await User.findById(req.user._id)
      .select("name email phone address paymentDetails affiliateCode totalEarned walletBalance")
      .lean();

    if (!affiliate || affiliate.role !== "affiliate") {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ affiliate });
  } catch (err) {
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
      return res.status(400).json({ message: "All fields are required" });
    }

    const update = {
      phone: phone.trim(),
      address: address.trim(),
      paymentDetails: {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim()
      }
    };

    const affiliate = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true
    }).select("name email phone address paymentDetails affiliateCode totalEarned walletBalance");

    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate not found" });
    }

    res.json({ message: "Profile updated successfully", affiliate });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default {
  getAffiliateDashboard,
  getAffiliateProfile,
  updateAffiliateProfile
};
