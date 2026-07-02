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

// ================= AFFILIATE SETTINGS =================
router.get(
  "/affiliate-settings",
  protect,
  onlyAdmin,
  adminController.getAffiliateSettings
);

router.put(
  "/affiliate-settings",
  protect,
  onlyAdmin,
  adminController.updateAffiliateSettings
);

// ================= AFFILIATE MANAGEMENT =================
router.get(
  "/affiliates",
  protect,
  onlyAdmin,
  adminController.listAffiliates
);

router.post(
  "/affiliates/:id/payout",
  protect,
  onlyAdmin,
  adminController.processAffiliatePayout
);

// =============== PAYOUTS ================
router.get(
  "/payout-requests",
  protect,
  onlyAdmin,
  adminController.listPayoutRequests
);

router.put(
  "/payout-requests/:id/approve",
  protect,
  onlyAdmin,
  adminController.approvePayoutRequest
);

router.put(
  "/payout-requests/:id/reject",
  protect,
  onlyAdmin,
  adminController.rejectPayoutRequest
);

export default router;