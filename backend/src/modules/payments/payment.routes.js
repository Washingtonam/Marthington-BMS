import express from "express";

import protect from "../../middlewares/auth.middleware.js";

import paymentController from "./payment.controller.js";

const router = express.Router();

// ======================================
// PAYSTACK WEBHOOK (PUBLIC - NO AUTH)
// ======================================
router.post(
  "/paystack/webhook",
  (req, res, next) => {
    if (!req.rawBody) {
      if (req.body && typeof req.body !== "string") {
        req.rawBody = JSON.stringify(req.body);
      } else {
        req.rawBody = req.body;
      }
    }
    next();
  },
  paymentController.handlePaystackWebhook
);

// ======================================
// VERIFY REDIRECT (PROTECTED - FRONTEND CALLBACK)
// ======================================
// User authenticated - frontend calls this after Paystack redirects
router.post(
  "/verify-redirect",
  protect,
  paymentController.verifyRedirect
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
// VERIFY (LEGACY - QUERY PARAM)
// ======================================

router.get(
  "/verify",
  paymentController.verifySubscription
);

export default router;