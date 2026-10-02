import express from "express";
import protect from "../../middlewares/auth.middleware.js";
import payoutController from "./payout.controller.js";

const router = express.Router();

router.post("/", protect, payoutController.createPayoutRequest);
router.get("/", protect, payoutController.getPayoutRequests);

export default router;
