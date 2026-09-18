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

// ================= BUSINESS CONTROL =================
router.put(
  "/business/:id/suspend",
  protect,
  onlyAdmin,
  adminController.suspendBusiness
);

router.put(
  "/business/:id/unsuspend",
  protect,
  onlyAdmin,
  adminController.unsuspendBusiness
);

router.delete(
  "/business/:id",
  protect,
  onlyAdmin,
  adminController.deleteBusiness
);

router.put(
  "/business/:id/archive",
  protect,
  onlyAdmin,
  adminController.archiveBusiness
);

router.put(
  "/business/:id/unarchive",
  protect,
  onlyAdmin,
  adminController.unarchiveBusiness
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

router.put(
  "/settings/admin-contact",
  protect,
  onlyAdmin,
  adminController.updateAdminContact
);

// ================= REPORT COMMUNICATIONS =================
router.get(
  "/report-subscriptions",
  protect,
  onlyAdmin,
  adminController.listReportSubscriptions
);

router.post(
  "/report-subscriptions",
  protect,
  onlyAdmin,
  adminController.createReportSubscription
);

router.patch(
  "/report-subscriptions/:id",
  protect,
  onlyAdmin,
  adminController.updateReportSubscription
);

router.post(
  "/report-subscriptions/:id/test",
  protect,
  onlyAdmin,
  adminController.sendReportSubscriptionTest
);

// ================= OUTREACH CAMPAIGNS =================
router.get("/email-campaigns", protect, onlyAdmin, adminController.listEmailCampaigns);
router.get("/email-campaigns/audience-count", protect, onlyAdmin, adminController.getEmailAudienceCount);
router.get("/email-registry", protect, onlyAdmin, adminController.listEmailRegistry);
router.patch("/email-registry/:userId/preference", protect, onlyAdmin, adminController.updateEmailPreference);
router.post("/email-campaigns", protect, onlyAdmin, adminController.createEmailCampaign);
router.patch("/email-campaigns/:id", protect, onlyAdmin, adminController.updateEmailCampaign);
router.post("/email-campaigns/:id/cancel", protect, onlyAdmin, adminController.cancelEmailCampaign);
router.post("/email-campaigns/:id/test", protect, onlyAdmin, adminController.sendCampaignTestEmail);

// ================= AFFILIATE MANAGEMENT =================
router.get(
  "/affiliates",
  protect,
  onlyAdmin,
  adminController.listAffiliates
);

// Operation logs (imports)
router.get(
  "/operation-logs",
  protect,
  onlyAdmin,
  adminController.listOperationLogs
);

router.post(
  "/operation-logs/:id/retry",
  protect,
  onlyAdmin,
  adminController.retryOperationLog
);

router.get(
  "/operation-logs/:id",
  protect,
  onlyAdmin,
  adminController.getOperationLog
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

router.post(
  "/payouts/:id/settle",
  protect,
  onlyAdmin,
  adminController.settlePayoutRequest
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

// =============== PARTNERS LEDGER ================
router.get(
  "/partners-ledger",
  protect,
  onlyAdmin,
  adminController.getPartnersLedger
);

// =============== SETTLE BALANCE ================
router.post(
  "/settle-payout",
  protect,
  onlyAdmin,
  adminController.settleBalance
);

router.get(
  "/affiliates/:id/payout-history",
  protect,
  onlyAdmin,
  adminController.getPartnerPayoutHistory
);

router.get(
  "/withdrawal-history",
  protect,
  onlyAdmin,
  adminController.getWithdrawalHistory
);

export default router;