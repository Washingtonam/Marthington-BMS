import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import affiliateController from "./affiliate.controller.js";
import {
  agentClaimList,
  createAgentCpaClaim
} from "./commissionClaims.controller.js";

const router = express.Router();

router.post("/track-click", affiliateController.trackAffiliateClick);
router.post("/activate", protect, affiliateController.activateAgentMode);
router.get("/dashboard", protect, affiliateController.getAffiliateDashboard);
router.get("/profile", protect, affiliateController.getAffiliateProfile);
router.put("/profile", protect, affiliateController.updateAffiliateProfile);
router.get("/commission-claims", protect, agentClaimList);
router.post("/commission-claims", protect, createAgentCpaClaim);

export default router;
