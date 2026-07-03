import Business from "../businesses/business.model.js";
import {
  initializePayment,
  verifyPayment
} from "./paystack.service.js";
import { creditAffiliate } from "../affiliates/affiliate.utils.js";

// ======================================
// GET SUBSCRIPTION STATUS
// ======================================
const getSubscriptionStatus = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found"
      });
    }

    const sub = business.subscription || {};
    const now = new Date();
    let daysLeft = 0;

    if (sub.expiresAt) {
      const diff = new Date(sub.expiresAt) - now;
      daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    res.json({
      plan: sub.plan || "free",
      status: sub.status || "trial",
      billingCycle: sub.billingCycle,
      expiresAt: sub.expiresAt,
      daysLeft,
      isPro: sub.plan === "pro"
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

// ======================================
// INITIALIZE PAYSTACK (PRO FIX)
// ======================================
const initializeSubscription = async (req, res) => {
  try {
    const billingCycle = req.body.billingCycle || req.query.cycle;
    const currency = (req.body.currency || "NGN").toUpperCase();
    const requestedAmount = Number(req.body.amount);

    if (!billingCycle || !['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({
        message: "Please provide a valid billing cycle (monthly or yearly)."
      });
    }

    if (!['NGN', 'USD'].includes(currency)) {
      return res.status(400).json({
        message: "Please provide a valid currency (NGN or USD)."
      });
    }

    const requestedAmount = Number(req.body.amount);
    if (!requestedAmount || Number.isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({
        message: "Please provide a valid amount for the selected billing cycle."
      });
    }

    const business = await Business.findById(req.user.businessId);

    if (!business || !business.email) {
      return res.status(400).json({
        message: "Business account or email not found."
      });
    }

    const amountInNaira = billingCycle === "yearly" ? 150000 : 15000;
    const expectedAmount = currency === "USD" ? (billingCycle === "yearly" ? 100 : 10) * 100 : amountInNaira * 100;

    if (requestedAmount !== expectedAmount) {
      return res.status(400).json({
        message: "The requested amount does not match the selected plan and currency."
      });
    }

    const amount = expectedAmount;

    // Initialize Paystack with subunit conversion
    const payment = await initializePayment({
      email: business.email,
      amount,
      currency,
      callback_url: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/settings`
        : "https://marthington.onrender.com/settings",
      metadata: {
        businessId: business._id.toString(),
        billingCycle
      }
    });

    if (!payment || !payment.authorization_url) {
      return res.status(502).json({
        message: "Failed to communicate with payment gateway. Please try again."
      });
    }

    res.json({
      authorizationUrl: payment.authorization_url,
      reference: payment.reference
    });

  } catch (err) {
    console.error("❌ Payment Initialization Error:", err.message);
    res.status(500).json({
      message: err.message || "Internal server error during payment setup."
    });
  }
};

// ======================================
// VERIFY PAYMENT
// ======================================
const verifySubscription = async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({
        message: "Reference missing"
      });
    }

    const payment = await verifyPayment(reference);

    if (!payment || payment.status !== "success") {
      return res.status(400).json({
        message: "Payment was not successful or is still pending."
      });
    }

    const metadata = payment.metadata;
    const business = await Business.findById(metadata.businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found"
      });
    }

    const now = new Date();
    const expiresAt = new Date();

    if (metadata.billingCycle === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // 🔥 Syncing both the subscription object and top-level plan field
    business.subscription = {
      plan: "pro",
      billingCycle: metadata.billingCycle,
      status: "active",
      startedAt: now,
      expiresAt,
      amount: payment.amount / 100, 
      reference
    };

    business.plan = "pro"; 

    await business.save();

    await creditAffiliate(business._id, payment.amount / 100);

    res.json({
      message: "Subscription activated successfully!",
      subscription: business.subscription
    });

  } catch (err) {
    console.error("❌ Payment Verification Error:", err.message);
    res.status(500).json({
      message: err.message || "An error occurred while verifying your subscription."
    });
  }
};

export default {
  getSubscriptionStatus,
  initializeSubscription,
  verifySubscription
};