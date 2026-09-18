import express from "express";
import adminController from "./admin.controller.js";

const router = express.Router();

router.get("/unsubscribe", adminController.unsubscribeReportSubscription);
router.get("/unsubscribe-campaign", adminController.unsubscribeCampaignEmail);

export default router;