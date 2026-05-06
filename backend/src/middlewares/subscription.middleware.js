import Business from "../modules/businesses/business.model.js";

const checkSubscription = async (req, res, next) => {
  try {
    const business = await Business.findById(req.user.businessId);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    const now = new Date();

    // 🔥 TRIAL CHECK
    if (business.subscription?.status === "trial") {
      if (business.trialEndsAt && new Date(business.trialEndsAt) < now) {
        business.subscription.status = "expired";
        business.plan = "free";
        await business.save();
      }
    }

    // 🔥 PAID PLAN CHECK
    if (business.subscription?.status === "active") {
      if (
        business.subscription.expiresAt &&
        new Date(business.subscription.expiresAt) < now
      ) {
        business.subscription.status = "expired";
        business.plan = "free";
        await business.save();
      }
    }

    // 🔥 FINAL STATE
    const isActive =
      business.plan === "pro" &&
      business.subscription?.status === "active";

    req.subscription = {
      active: isActive,
      plan: business.plan,
      expiresAt: business.subscription?.expiresAt || null
    };

    next();

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default checkSubscription;