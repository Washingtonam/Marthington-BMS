import Business from "../modules/businesses/business.model.js";
import { isPlanFeatureEnabled } from "../modules/subscriptions/planAccess.js";

const requirePlanFeature = (feature) => async (req, res, next) => {
  try {
    const business = await Business.findById(req.user?.businessId);
    if (!business) return res.status(404).json({ message: "Business not found" });

    if (!(await isPlanFeatureEnabled(business, feature))) {
      return res.status(403).json({
        message: `${feature} is not available on your current plan.`
      });
    }

    return next();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export default requirePlanFeature;
