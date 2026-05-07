import Business from "../businesses/business.model.js";

import {
  initializePayment,
  verifyPayment
} from "./paystack.service.js";

// ======================================
// GET SUBSCRIPTION STATUS
// ======================================

const getSubscriptionStatus =
  async (req, res) => {
    try {

      const business =
        await Business.findById(
          req.user.businessId
        );

      if (!business) {
        return res.status(404).json({
          message:
            "Business not found"
        });
      }

      const sub =
        business.subscription || {};

      const now =
        new Date();

      let daysLeft = 0;

      if (sub.expiresAt) {

        const diff =
          new Date(
            sub.expiresAt
          ) - now;

        daysLeft =
          Math.max(
            0,
            Math.ceil(
              diff /
                (
                  1000 *
                  60 *
                  60 *
                  24
                )
            )
          );
      }

      res.json({

        plan:
          sub.plan || "free",

        status:
          sub.status || "trial",

        billingCycle:
          sub.billingCycle,

        expiresAt:
          sub.expiresAt,

        daysLeft,

        isPro:
          sub.plan === "pro"
      });

    } catch (err) {

      res.status(500).json({
        message:
          err.message
      });

    }
  };

// ======================================
// INITIALIZE PAYSTACK
// ======================================

const initializeSubscription =
  async (req, res) => {
    try {

      const {
        billingCycle
      } = req.body;

      const business =
        await Business.findById(
          req.user.businessId
        );

      if (!business) {
        return res.status(404).json({
          message:
            "Business not found"
        });
      }

      const amount =
        billingCycle === "yearly"
          ? 150000
          : 15000;

      const payment =
        await initializePayment({

          email:
            business.email,

          amount:
            amount * 100,

          metadata: {

            businessId:
              business._id.toString(),

            billingCycle
          }
        });

      res.json({
        authorizationUrl:
          payment.authorization_url,

        reference:
          payment.reference
      });

    } catch (err) {

      res.status(500).json({
        message:
          err.message
      });

    }
  };

// ======================================
// VERIFY PAYMENT
// ======================================

const verifySubscription =
  async (req, res) => {
    try {

      const {
        reference
      } = req.query;

      if (!reference) {
        return res.status(400).json({
          message:
            "Reference missing"
        });
      }

      const payment =
        await verifyPayment(
          reference
        );

      if (
        payment.status !==
        "success"
      ) {
        return res.status(400).json({
          message:
            "Payment not successful"
        });
      }

      const metadata =
        payment.metadata;

      const business =
        await Business.findById(
          metadata.businessId
        );

      if (!business) {
        return res.status(404).json({
          message:
            "Business not found"
        });
      }

      const now =
        new Date();

      const expiresAt =
        new Date();

      if (
        metadata.billingCycle ===
        "yearly"
      ) {

        expiresAt.setFullYear(
          expiresAt.getFullYear() + 1
        );

      } else {

        expiresAt.setMonth(
          expiresAt.getMonth() + 1
        );
      }

      business.subscription = {

        plan: "pro",

        billingCycle:
          metadata.billingCycle,

        status: "active",

        startedAt: now,

        expiresAt,

        amount:
          payment.amount / 100,

        reference
      };

      await business.save();

      res.json({
        message:
          "Subscription activated",

        subscription:
          business.subscription
      });

    } catch (err) {

      res.status(500).json({
        message:
          err.message
      });

    }
  };

export default {

  getSubscriptionStatus,

  initializeSubscription,

  verifySubscription
};