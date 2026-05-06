import Business from "../businesses/business.model.js";

// 🔥 GET CURRENT SUBSCRIPTION
const getSubscription = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);

    res.json({
      plan: business.plan,
      subscription: business.subscription,
      trialEndsAt: business.trialEndsAt
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🔥 ADMIN UPDATE SUBSCRIPTION
const updateSubscription = async (req, res) => {
  try {
    const { plan, planType, durationDays } = req.body;

    if (!["free", "pro"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    if (plan === "free") {
      business.plan = "free";
      business.subscription.status = "expired";
      await business.save();

      return res.json({ message: "Downgraded to free" });
    }

    // 🔥 UPGRADE (MANUAL)
    const now = new Date();
    const expires = new Date();

    expires.setDate(now.getDate() + (durationDays || 30));

    business.plan = "pro";
    business.subscription = {
      status: "active",
      planType: planType || "monthly",
      startedAt: now,
      expiresAt: expires,
      amount: 0, // manual override
      reference: "admin_override"
    };

    await business.save();

    res.json({
      message: "Subscription updated manually",
      business
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export default {
  getSubscription,
  updateSubscription
};