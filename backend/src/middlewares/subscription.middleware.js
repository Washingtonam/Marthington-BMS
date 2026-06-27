import Business from "../modules/businesses/business.model.js";
import User from "../modules/users/user.model.js";

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

    // 🔥 STAFF SUBSCRIPTION INHERITANCE
    if (
      req.user.role !== "owner" &&
      req.user.role !== "super_admin" &&
      business.owner
    ) {
      const owner = await User.findById(business.owner);
      if (owner) {
        const isPro =
          business.isPro === true ||
          (business.plan === "pro" &&
            business.subscription?.status === "active");

        req.subscription = {
          active: isPro,
          plan: business.plan,
          expiresAt: business.subscription?.expiresAt || null,
          ownerId: owner._id.toString()
        };
        req.isPremiumBusiness = req.subscription.active;
        return next();
      }
    }

    // 🔥 FINAL STATE
    const isPro =
      business.isPro === true ||
      (business.plan === "pro" &&
        business.subscription?.status === "active");

    req.subscription = {
      active: isPro,
      plan: business.plan,
      expiresAt: business.subscription?.expiresAt || null
    };
    req.isPremiumBusiness = isPro;

    next();

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default checkSubscription;