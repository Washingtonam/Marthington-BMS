import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import affiliateController from "./affiliate.controller.js";

const router = express.Router();

router.get("/dashboard", protect, affiliateController.getAffiliateDashboard);

export default router;
