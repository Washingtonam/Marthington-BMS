import Business from "../businesses/business.model.js";
import User from "../users/user.model.js";
import Sale from "../sales/sale.model.js";
import Product from "../products/product.model.js";
import SystemSettings from "./systemSettings.model.js";
import PayoutRequest from "../affiliates/payoutRequest.model.js";
import AffiliatePayout from "../affiliates/affiliatePayout.model.js";

// 🔥 NORMALIZER (SINGLE SOURCE OF TRUTH)
const formatBusiness = (business) => {
  const obj = business.toObject();

  const subPlan = obj.subscription?.plan;

  return {
    ...obj,
    plan: subPlan || "free",
    isPro: obj.isPro === true || subPlan === "pro",
    subscription: {
      ...obj.subscription,
      plan: subPlan || "free",
      status: obj.subscription?.status || "trial"
    }
  };
};

// 🔥 OVERVIEW (DASHBOARD)
const getOverview = async (req, res) => {
  try {
    const businessesCount = await Business.countDocuments();
    const usersCount = await User.countDocuments();
    const salesRecords = await Sale.find();

    const totalRevenue = salesRecords.reduce(
      (sum, sale) => sum + (sale.totalAmount || 0),
      0
    );

    const activeSubscriptions = await Business.countDocuments({
      "subscription.status": "active"
    });

    const industryCounts = {
      retail: 0,
      school: 0,
      hospital: 0
    };

    const salesSummary = await Sale.aggregate([
      {
        $group: {
          _id: "$business",
          totalSales: { $sum: "$totalAmount" },
          saleCount: { $sum: 1 }
        }
      }
    ]);

    const salesMap = salesSummary.reduce((map, item) => {
      map[item._id?.toString()] = {
        totalSales: item.totalSales,
        saleCount: item.saleCount
      };
      return map;
    }, {});

    const businessList = await Business.find()
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    const formattedBusinesses = businessList.map((business) => {
      const obj = formatBusiness(business);

      const industry = obj.industryType || "retail";
      if (industryCounts[industry] !== undefined) {
        industryCounts[industry] += 1;
      }

      const summary = salesMap[business._id.toString()] || {
        totalSales: 0,
        saleCount: 0
      };

      return {
        ...obj,
        ownerEmail: business.owner?.email || "",
        totalSalesRecord: summary.totalSales,
        saleCount: summary.saleCount,
        studentCount: obj.studentCount || 0,
        activePatientCount: obj.activePatientCount || 0
      };
    });

    res.json({
      stats: {
        totalRevenue,
        totalUsers: usersCount,
        activeSubscriptions,
        industryCounts,
        totalBusinesses: businessesCount
      },
      businesses: formattedBusinesses
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔥 ADMIN CONTROL (FULL FIX)
const updateSubscription = async (req, res) => {
  try {
    const {
      plan,
      billingCycle,
      duration,
      industryType,
      tier
    } = req.body;

    if (!["free", "pro"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    let update = {};

    if (industryType && ["retail", "school", "hospital"].includes(industryType)) {
      update.industryType = industryType;
    }

    if (plan === "free") {
      update.plan = "free";
      update.subscription = {
        plan: "free",
        billingCycle: null,
        status: "expired",
        startedAt: null,
        expiresAt: null,
        amount: 0,
        tier: tier || "",
        reference: "admin_downgrade"
      };
    } else {
      const now = new Date();

      let baseDate =
        business.subscription?.expiresAt &&
        business.subscription.expiresAt > now
          ? new Date(business.subscription.expiresAt)
          : now;

      const cycle = billingCycle || "monthly";
      const dur = duration || 1;

      if (cycle === "yearly") {
        baseDate.setFullYear(baseDate.getFullYear() + dur);
      } else {
        baseDate.setMonth(baseDate.getMonth() + dur);
      }

      update.plan = "pro";
      update.subscription = {
        plan: "pro",
        billingCycle: cycle,
        status: "active",
        startedAt: business.subscription?.startedAt || now,
        expiresAt: baseDate,
        amount: 0,
        tier: tier || business.subscription?.tier || "Premium Plan",
        reference: "admin_override"
      };
    }

    const updated = await Business.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    res.json({
      message: "Subscription updated successfully",
      business: formatBusiness(updated)
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAffiliateSettings = async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();

    if (!settings) {
      settings = await SystemSettings.create({ globalAffiliateRate: 20 });
    }

    res.json({
      message: "Affiliate settings fetched successfully",
      settings
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateAffiliateSettings = async (req, res) => {
  try {
    const { globalAffiliateRate } = req.body;

    if (typeof globalAffiliateRate !== "number" || globalAffiliateRate < 0 || globalAffiliateRate > 100) {
      return res.status(400).json({ message: "globalAffiliateRate must be a number between 0 and 100" });
    }

    let settings = await SystemSettings.findOne();

    if (!settings) {
      settings = await SystemSettings.create({ globalAffiliateRate });
    } else {
      settings.globalAffiliateRate = globalAffiliateRate;
      await settings.save();
    }

    res.json({
      message: "Affiliate settings updated successfully",
      settings
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= AFFILIATE ADMIN ACTIONS =================
const listAffiliates = async (req, res) => {
  try {
    const affiliates = await User.find({ role: "affiliate" })
      .select("name email affiliateCode walletBalance totalEarned createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const settings = await SystemSettings.findOne();
    const globalRate = Number(settings?.globalAffiliateRate ?? 20);

    const totalPaid = await AffiliatePayout.aggregate([
      { $group: { _id: null, total: { $sum: "$commissionEarned" } } }
    ]);

    const stats = {
      totalPartners: affiliates.length,
      pendingPayouts: await PayoutRequest.countDocuments({ status: "pending" }),
      totalPaidCommissions: (totalPaid[0] && totalPaid[0].total) || 0
    };

    res.json({ affiliates, globalRate, stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const processAffiliatePayout = async (req, res) => {
  try {
    const affiliateId = req.params.id;
    const affiliate = await User.findById(affiliateId);
    if (!affiliate) return res.status(404).json({ message: "Affiliate not found" });

    const amount = Number(affiliate.walletBalance || 0);
    if (amount <= 0) return res.status(400).json({ message: "No balance to payout" });

    // Create payout request record marked as paid and create an affiliate payout history
    const payout = await PayoutRequest.create({
      affiliate: affiliate._id,
      affiliateCode: affiliate.affiliateCode || "",
      amountRequested: amount,
      status: "paid",
      processedAt: new Date()
    });

    await AffiliatePayout.create({
      affiliate: affiliate._id,
      affiliateCode: affiliate.affiliateCode || "",
      business: null,
      businessName: affiliate.name || "",
      amountPaid: amount,
      commissionEarned: amount,
      rateApplied: 0,
      status: "credited",
      transactionDate: new Date()
    });

    // Zero out wallet
    affiliate.walletBalance = 0;
    await affiliate.save();

    res.json({ message: "Payout cleared", amount, payoutId: payout._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= PAYOUT REQUESTS =================
const listPayoutRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const q = {};
    if (status) q.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const total = await PayoutRequest.countDocuments(q);
    const requests = await PayoutRequest.find(q)
      .populate("affiliate", "name email affiliateCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({ total, page: Number(page), limit: Number(limit), requests });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const approvePayoutRequest = async (req, res) => {
  try {
    const id = req.params.id;
    const payout = await PayoutRequest.findById(id);
    if (!payout) return res.status(404).json({ message: "Payout request not found" });
    if (payout.status !== "pending") return res.status(400).json({ message: "Request already processed" });

    // mark paid
    payout.status = "paid";
    payout.processedAt = new Date();
    payout.adminNote = req.body.note || "";
    await payout.save();

    // create affiliate payout record for history
    const affiliate = await User.findById(payout.affiliate);

    await AffiliatePayout.create({
      affiliate: payout.affiliate,
      affiliateCode: payout.affiliateCode || affiliate?.affiliateCode || "",
      business: null,
      businessName: affiliate?.name || "",
      amountPaid: payout.amountRequested,
      commissionEarned: payout.amountRequested,
      rateApplied: 0,
      status: "credited",
      transactionDate: new Date()
    });

    res.json({ message: "Payout approved" , payout });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const rejectPayoutRequest = async (req, res) => {
  try {
    const id = req.params.id;
    const payout = await PayoutRequest.findById(id);
    if (!payout) return res.status(404).json({ message: "Payout request not found" });
    if (payout.status !== "pending") return res.status(400).json({ message: "Request already processed" });

    payout.status = "rejected";
    payout.processedAt = new Date();
    payout.adminNote = req.body.note || "Rejected by admin";
    await payout.save();

    // refund wallet
    if (payout.affiliate) {
      await User.findByIdAndUpdate(payout.affiliate, { $inc: { walletBalance: payout.amountRequested } });
    }

    res.json({ message: "Payout rejected", payout });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔥 BUSINESS DETAILS (FINAL FIX — NO MORE 500)
const getBusinessDetails = async (req, res) => {
  try {
    const businessId = req.params.id;

    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found"
      });
    }

    const products = await Product.find({ business: businessId })
      .select("name price stock createdAt") // ✅ FIXED
      .sort({ createdAt: -1 });

    const sales = await Sale.find({ business: businessId })
      .select("totalAmount createdAt")
      .sort({ createdAt: -1 })
      .limit(20);

    const users = await User.find({ business: businessId })
      .select("name email role createdAt");

    res.json({
      business: formatBusiness(business),
      products: products || [],
      sales: sales || [],
      users: users || []
    });

  } catch (err) {
    console.error("🔥 ADMIN BUSINESS ERROR:", err);
    res.status(500).json({
      message: "Failed to load business"
    });
  }
};

export default {
  getOverview,
  updateSubscription,
  getBusinessDetails,
  getAffiliateSettings,
  updateAffiliateSettings
  ,
  // affiliates
  listAffiliates,
  processAffiliatePayout,
  // payouts
  listPayoutRequests,
  approvePayoutRequest,
  rejectPayoutRequest
};
