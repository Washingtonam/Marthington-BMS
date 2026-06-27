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

    const totalConversions = conversions.length;
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
      commission: Number(item.commissionEarned || 0)
    }));

    res.json({
      affiliate: {
        affiliateCode: affiliate.affiliateCode,
        walletBalance,
        totalEarned: Number(affiliate.totalEarned || 0),
        totalConversions
      },
      conversions: formattedConversions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default {
  getAffiliateDashboard
};
