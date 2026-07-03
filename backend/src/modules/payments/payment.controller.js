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
    console.log("[payments.initialize] request body:", req.body);
    console.log("[payments.initialize] auth user:", {
      id: req.user?.id,
      businessId: req.user?.businessId,
      email: req.user?.email
    });

    const billingCycle = req.body.billingCycle || req.query.cycle;
    const currency = (req.body.currency || "NGN").toUpperCase();
    const requestedAmountRaw = req.body.amount;
    const requestedAmount = requestedAmountRaw != null ? Number(requestedAmountRaw) : null;

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

    if (requestedAmountRaw != null && (Number.isNaN(requestedAmount) || requestedAmount <= 0)) {
      return res.status(400).json({
        message: "Please provide a valid amount for the selected billing cycle."
      });
    }

    const business = await Business.findById(req.user.businessId);
    console.log("[payments.initialize] business lookup result:", {
      businessId: req.user.businessId,
      found: Boolean(business),
      email: business?.email,
      status: business?.status
    });

    if (!business) {
      return res.status(400).json({
        message: "Business account not found."
      });
    }

    const emailForPayment = business.email || req.user.email;
    if (!emailForPayment) {
      console.warn("[payments.initialize] missing email on business and user", {
        businessId: req.user.businessId,
        userId: req.user.id
      });
      return res.status(400).json({
        message: "Business email not found. Please add an email to your business profile."
      });
    }

    const amountInNaira = billingCycle === "yearly" ? 150000 : 15000;
    const expectedAmount = currency === "USD" ? (billingCycle === "yearly" ? 100 : 10) * 100 : amountInNaira * 100;

    if (requestedAmountRaw != null && requestedAmount !== expectedAmount) {
      console.warn("[payments.initialize] amount mismatch, using expected amount", {
        requestedAmount,
        expectedAmount,
        billingCycle,
        currency
      });
    }

    const amount = expectedAmount;

    // Initialize Paystack with subunit conversion
    const payment = await initializePayment({
      email: emailForPayment,
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
  const session = await Business.startSession();

  let transactionStarted = false;

  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ message: "Reference missing" });
    }

    const payment = await verifyPayment(reference);

    if (!payment || payment.status !== "success") {
      return res.status(400).json({ message: "Payment was not successful or is still pending." });
    }

    const metadata = payment.metadata || {};
    if (!metadata.businessId) {
      return res.status(400).json({ message: "Payment metadata is missing business context." });
    }

    console.log("[payments.verify] Upgrading Business ID:", metadata.businessId);

    // attempt to start transaction; if it fails (standalone MongoDB), we'll continue without a session
    try {
      await session.startTransaction();
      transactionStarted = true;
    } catch (txErr) {
      console.warn("[payments.verify] transactions not available, continuing without transaction:", txErr.message);
      transactionStarted = false;
    }

    // load business (attach session only if transactions started)
    const business = transactionStarted
      ? await Business.findById(metadata.businessId).session(session)
      : await Business.findById(metadata.businessId);

    if (!business) {
      if (transactionStarted) await session.abortTransaction();
      return res.status(404).json({ message: "Business not found" });
    }

    const now = new Date();
    const expiresAt = new Date();
    if (metadata.billingCycle === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const tierMap = {
      retail: "Retail Pro Plan",
      school: "Premium Academic Plan",
      hospital: "Premium Health Plan"
    };

    const industryType = business.industryType || "retail";
    const tier = tierMap[industryType] || `${industryType.charAt(0).toUpperCase() + industryType.slice(1)} Pro Plan`;

    const update = {
      plan: "pro",
      isPro: true,
      industryType,
      subscription: {
        ...business.subscription?.toObject?.(),
        plan: "pro",
        billingCycle: metadata.billingCycle,
        status: "active",
        startedAt: now,
        expiresAt,
        amount: payment.amount / 100,
        reference,
        tier
      }
    };

    console.log("[payments.verify] update payload:", { businessId: metadata.businessId, update });

    const updateOptions = { new: true };
    if (transactionStarted) updateOptions.session = session;

    const updatedBusiness = await Business.findByIdAndUpdate(metadata.businessId, update, updateOptions);

    if (!updatedBusiness) {
      if (transactionStarted) await session.abortTransaction();
      console.error("[payments.verify] Business update returned no document", { businessId: metadata.businessId });
      return res.status(500).json({ message: "Failed to update business subscription status." });
    }

    const affiliateCredit = await creditAffiliate(updatedBusiness._id, payment.amount / 100, transactionStarted ? session : null);

    if (transactionStarted) {
      await session.commitTransaction();
    }

    console.log("[payments.verify] affiliate credit result:", affiliateCredit);

    return res.json({ message: "Subscription activated successfully!", subscription: updatedBusiness.subscription, affiliateCredit: affiliateCredit || null });
  } catch (err) {
    console.error("❌ Payment Verification Error:", err);
    try {
      if (transactionStarted && session.inTransaction()) await session.abortTransaction();
    } catch (e) {
      console.error("[payments.verify] abortTransaction failed:", e);
    }
    return res.status(500).json({ message: err.message || "An error occurred while verifying your subscription." });
  } finally {
    try {
      session.endSession();
    } catch (e) {
      // ignore
    }
  }
};

export default {
  getSubscriptionStatus,
  initializeSubscription,
  verifySubscription
};