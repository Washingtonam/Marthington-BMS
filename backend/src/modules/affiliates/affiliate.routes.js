import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import affiliateController from "./affiliate.controller.js";

const router = express.Router();

router.get("/dashboard", protect, affiliateController.getAffiliateDashboard);
router.get("/profile", protect, affiliateController.getAffiliateProfile);
router.put("/profile", protect, affiliateController.updateAffiliateProfile);

export default router;
