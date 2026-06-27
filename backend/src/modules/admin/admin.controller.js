import Business from "../businesses/business.model.js";
import User from "../users/user.model.js";
import Sale from "../sales/sale.model.js";
import Product from "../products/product.model.js";

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
  getBusinessDetails
};