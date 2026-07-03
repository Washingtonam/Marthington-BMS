import express from "express";

import protect from "../../middlewares/auth.middleware.js";

import paymentController from "./payment.controller.js";

const router = express.Router();

// ======================================
// PAYSTACK WEBHOOK (PUBLIC - NO AUTH)
// ======================================
// Must be defined FIRST and with express.raw() to capture raw body
router.post(
  "/paystack/webhook",
  express.raw({ type: "application/json" }),
  // Custom middleware to parse raw body and attach it
  (req, res, next) => {
    req.rawBody = req.body;
    req.body = JSON.parse(req.body.toString());
    next();
  },
  paymentController.handlePaystackWebhook
);

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