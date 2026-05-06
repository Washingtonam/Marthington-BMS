import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import adminController from "./admin.controller.js";

const router = express.Router();

// 🔒 SUPER ADMIN ONLY
const onlyAdmin = (req, res, next) => {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({
      message: "Access denied"
    });
  }
  next();
};

// ================= OVERVIEW =================
router.get(
  "/overview",
  protect,
  onlyAdmin,
  adminController.getOverview
);

// ================= BUSINESS DETAILS =================
router.get(
  "/business/:id",
  protect,
  onlyAdmin,
  adminController.getBusinessDetails
);

// ================= SUBSCRIPTION CONTROL =================
router.put(
  "/business/:id/subscription",
  protect,
  onlyAdmin,
  adminController.updateSubscription
);

export default router;