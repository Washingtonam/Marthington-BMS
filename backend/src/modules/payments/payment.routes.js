import express from "express";

import protect from "../../middlewares/auth.middleware.js";

import paymentController from "./payment.controller.js";

const router = express.Router();

// ======================================
// STATUS
// ======================================

router.get(
  "/status",
  protect,
  paymentController.getSubscriptionStatus
);

// ======================================
// INITIALIZE
// ======================================

router.post(
  "/initialize",
  protect,
  paymentController.initializeSubscription
);

// ======================================
// VERIFY
// ======================================

router.get(
  "/verify",
  paymentController.verifySubscription
);

export default router;