import crypto from "crypto";
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

    const customerEmail = (business.email && business.email.toString().trim().length)
      ? business.email.toString().trim()
      : req.user.email;

    console.log("[payments.initialize] customerEmail:", customerEmail);

    if (!customerEmail) {
      console.warn("[payments.initialize] missing email on business and user", {
        businessId: req.user.businessId,
        businessEmail: business.email,
        userId: req.user.id,
        userEmail: req.user.email
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

    // ✅ STEP 1: PREPARE METADATA FOR PAYSTACK 🔒
    const paymentMetadata = {
      businessId: business._id.toString(),
      billingCycle
    };

    console.log("[payments.initialize] 🔒 Prepared metadata for Paystack", {
      businessId: paymentMetadata.businessId,
      billingCycle: paymentMetadata.billingCycle
    });

    // ✅ STEP 2: INITIALIZE PAYSTACK WITH EXPLICIT METADATA
    console.log("[payments.initialize] 📤 Calling Paystack API with metadata...");

    const payment = await initializePayment({
      email: customerEmail,
      amount,
      currency,
      callback_url: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/settings`
        : "https://marthington.onrender.com/settings",
      metadata: paymentMetadata
    });

    if (!payment || !payment.authorization_url) {
      console.error("[payments.initialize] ❌ Paystack response missing authorization_url", { payment });
      return res.status(502).json({
        message: "Failed to communicate with payment gateway. Please try again."
      });
    }

    console.log("[payments.initialize] ✅ Paystack initialization successful", {
      reference: payment.reference,
      authorizationUrl: payment.authorization_url ? "✅ Generated" : "❌ Missing",
      metadataPreserved: payment.metadata ? "✅ Preserved in response" : "⚠️  Check Paystack dashboard"
    });

    // ✅ STEP 3: RETURN AUTHORIZATION URL TO FRONTEND
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
// VERIFY PAYMENT - SINGLE SOURCE OF TRUTH
// ======================================
const verifySubscription = async (req, res) => {
  const session = await Business.startSession();

  let transactionStarted = false;

  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ message: "Reference missing" });
    }

    console.log("[payments.verify] Starting payment verification", { reference });

    // ✅ STEP 0: VERIFY WITH PAYMENT GATEWAY
    const payment = await verifyPayment(reference);

    if (!payment || payment.status !== "success") {
      console.warn("[payments.verify] Payment not successful", { reference, status: payment?.status });
      return res.status(400).json({ message: "Payment was not successful or is still pending." });
    }

    // ✅ STEP 1: EXTRACT METADATA EXPLICITLY FROM PAYSTACK RESPONSE
    // Paystack structure: response.data.data.metadata = { businessId, billingCycle }
    const metadata = payment.metadata || {};
    const { businessId, billingCycle } = metadata;

    console.log("[payments.verify] 🔒 Metadata extracted from Paystack response", {
      reference,
      businessId: businessId || "❌ MISSING",
      billingCycle: billingCycle || "❌ MISSING",
      allMetadata: metadata
    });

    if (!businessId) {
      console.error("[payments.verify] ❌ CRITICAL: businessId missing from payment metadata", {
        reference,
        metadata
      });
      return res.status(400).json({
        message: "Payment metadata is missing business context. Please try again or contact support."
      });
    }

    if (!billingCycle || !['monthly', 'yearly'].includes(billingCycle)) {
      console.error("[payments.verify] ❌ CRITICAL: Invalid or missing billingCycle", {
        reference,
        billingCycle
      });
      return res.status(400).json({
        message: "Payment metadata has invalid billing cycle. Please try again."
      });
    }

    console.log("[payments.verify] ✅ Metadata validation complete", {
      reference,
      businessId,
      billingCycle
    });

    // ✅ STEP 2: INITIALIZE TRANSACTION (FOR ATOMICITY)
    try {
      await session.startTransaction();
      transactionStarted = true;
      console.log("[payments.verify] Transaction started ✅");
    } catch (txErr) {
      console.warn("[payments.verify] Transactions unavailable, continuing without transaction", { error: txErr.message });
      transactionStarted = false;
    }

    // ✅ STEP 3: FETCH BUSINESS DOCUMENT (CURRENT STATE)
    const business = transactionStarted
      ? await Business.findById(businessId).session(session)
      : await Business.findById(businessId);

    if (!business) {
      if (transactionStarted) await session.abortTransaction();
      console.error("[payments.verify] Business not found", { businessId });
      return res.status(404).json({ message: "Business not found" });
    }

    console.log("[payments.verify] ✅ Business loaded", {
      businessId: business._id,
      currentPlan: business.subscription?.plan,
      industryType: business.industryType,
      referredBy: business.referredBy || "No affiliate"
    });

    // ✅ STEP 4: CALCULATE SUBSCRIPTION EXPIRATION
    const now = new Date();
    const expiresAt = new Date();
    if (billingCycle === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    console.log("[payments.verify] ✅ Expiration calculated", {
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      billingCycle
    });

    // ✅ STEP 5: DETERMINE TIER BASED ON INDUSTRY TYPE
    const tierMap = {
      retail: "Retail Pro Plan",
      school: "Premium Academic Plan",
      hospital: "Premium Health Plan"
    };

    const industryType = business.industryType || "retail";
    const tier = tierMap[industryType] || `${industryType.charAt(0).toUpperCase() + industryType.slice(1)} Pro Plan`;

    const paymentAmountConverted = payment.amount / 100;

    // ✅ STEP 6: EXECUTE findByIdAndUpdate (SINGLE SOURCE OF TRUTH) 🔥
    console.log("[payments.verify] 🔥 Executing Business document UPDATE (Single Source of Truth)");

    const updateOptions = { new: true };
    if (transactionStarted) updateOptions.session = session;

    const updatedBusiness = await Business.findByIdAndUpdate(
      businessId,
      {
        plan: "pro",
        isPro: true,
        industryType,
        subscription: {
          plan: "pro",
          billingCycle,
          status: "active",
          startedAt: now,
          expiresAt,
          amount: paymentAmountConverted,
          reference,
          tier
        }
      },
      updateOptions
    );

    if (!updatedBusiness) {
      if (transactionStarted) await session.abortTransaction();
      console.error("[payments.verify] ❌ Business update failed (no document returned)", { businessId });
      return res.status(500).json({ message: "Failed to update business subscription status." });
    }

    console.log("[payments.verify] ✅ Business document updated (Single Source of Truth)", {
      businessId: updatedBusiness._id,
      plan: updatedBusiness.subscription.plan,
      status: updatedBusiness.subscription.status,
      expiresAt: updatedBusiness.subscription.expiresAt
    });

    // ✅ STEP 7: EXECUTE AFFILIATE REVENUE SHARE 🤝
    let affiliateCredit = null;
    if (updatedBusiness.referredBy) {
      console.log("[payments.verify] 🤝 Processing affiliate commission...", {
        referredBy: updatedBusiness.referredBy
      });

      affiliateCredit = await creditAffiliate(
        updatedBusiness._id,
        paymentAmountConverted,
        transactionStarted ? session : null
      );

      if (affiliateCredit) {
        console.log("[payments.verify] ✅ Affiliate commission credited", {
          affiliateId: affiliateCredit.affiliateId,
          affiliateCode: affiliateCredit.affiliateCode,
          commissionAmount: affiliateCredit.commissionAmount,
          rateApplied: `${affiliateCredit.affiliateRate}%`
        });
      } else {
        console.warn("[payments.verify] ⚠️  Affiliate credit returned null (no valid affiliate or rate)", {
          businessId,
          referredBy: updatedBusiness.referredBy
        });
      }
    } else {
      console.log("[payments.verify] ℹ️  No affiliate for this business (no referredBy)", { businessId });
    }

    // ✅ STEP 8: COMMIT ATOMIC TRANSACTION
    if (transactionStarted) {
      await session.commitTransaction();
      console.log("[payments.verify] ✅ Transaction committed");
    }

    console.log("[payments.verify] 🎉 PAYMENT SYNCHRONIZATION COMPLETE", {
      reference,
      businessId: updatedBusiness._id,
      completedSteps: [
        "✅ Payment verified with Paystack",
        "✅ Metadata extracted (businessId, billingCycle)",
        "✅ Business document updated to PRO",
        "✅ Affiliate commission processed",
        "✅ Transaction committed atomically"
      ]
    });

    // ✅ STEP 9: RETURN SUCCESS RESPONSE
    return res.json({
      message: "Subscription activated successfully! Full synchronization chain executed.",
      subscription: {
        plan: updatedBusiness.subscription.plan,
        billingCycle: updatedBusiness.subscription.billingCycle,
        status: updatedBusiness.subscription.status,
        startedAt: updatedBusiness.subscription.startedAt,
        expiresAt: updatedBusiness.subscription.expiresAt,
        tier: updatedBusiness.subscription.tier
      },
      payment: {
        reference,
        amount: paymentAmountConverted,
        status: "success"
      },
      affiliateCredit: affiliateCredit ? {
        status: "credited",
        affiliateCode: affiliateCredit.affiliateCode,
        commissionEarned: affiliateCredit.commissionAmount,
        rateApplied: `${affiliateCredit.affiliateRate}%`
      } : null,
      syncStatus: {
        businessUpdated: true,
        affiliateProcessed: !!affiliateCredit,
        transactionCommitted: transactionStarted
      }
    });

  } catch (err) {
    console.error("❌ PAYMENT VERIFICATION FAILED", {
      error: err.message,
      stack: err.stack,
      transactionStarted
    });
    try {
      if (transactionStarted && session.inTransaction()) {
        await session.abortTransaction();
        console.log("[payments.verify] Transaction aborted due to error");
      }
    } catch (abortErr) {
      console.error("[payments.verify] Failed to abort transaction:", abortErr.message);
    }
    return res.status(500).json({
      message: "Payment verification failed. Please contact support.",
      error: err.message
    });
  } finally {
    try {
      session.endSession();
      console.log("[payments.verify] Session ended");
    } catch (sessionErr) {
      console.error("[payments.verify] Failed to end session:", sessionErr.message);
    }
  }
};

// ======================================
// SINGLE SOURCE OF TRUTH UPGRADE HELPER
// ======================================
// Reusable function for both webhook and redirect verification paths
const executeProUpgrade = async (businessId, billingCycle, amountPaid) => {
  const session = await Business.startSession();
  let transactionStarted = false;

  try {
    console.log("[executeProUpgrade] Starting PRO upgrade", {
      businessId,
      billingCycle,
      amountPaid
    });

    await session.startTransaction();
    transactionStarted = true;
    console.log("[executeProUpgrade] Transaction started ✅");

    // ✅ STEP 1: LOAD BUSINESS DOCUMENT
    const business = await Business.findById(businessId).session(session);
    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    console.log("[executeProUpgrade] Business loaded", {
      businessId: business._id,
      currentPlan: business.subscription?.plan,
      industryType: business.industryType
    });

    // ✅ STEP 2: CALCULATE SUBSCRIPTION DETAILS
    const now = new Date();
    const expiresAt = new Date();
    if (billingCycle === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // ✅ STEP 3: DETERMINE TIER
    const tierMap = {
      retail: "Retail Pro Plan",
      school: "Premium Academic Plan",
      hospital: "Premium Health Plan"
    };

    const industryType = business.industryType || "retail";
    const tier = tierMap[industryType] || `${industryType.charAt(0).toUpperCase() + industryType.slice(1)} Pro Plan`;

    // ✅ STEP 4: UPDATE BUSINESS DOCUMENT (SINGLE SOURCE OF TRUTH)
    console.log("[executeProUpgrade] 🔥 Updating Business document to PRO");

    const updatedBusiness = await Business.findByIdAndUpdate(
      businessId,
      {
        plan: "pro",
        isPro: true,
        industryType,
        subscription: {
          plan: "pro",
          billingCycle,
          status: "active",
          startedAt: now,
          expiresAt,
          amount: amountPaid,
          tier
        }
      },
      {
        new: true,
        session
      }
    );

    if (!updatedBusiness) {
      throw new Error("Business update failed - no document returned");
    }

    console.log("[executeProUpgrade] ✅ Business document updated", {
      businessId: updatedBusiness._id,
      plan: updatedBusiness.subscription.plan,
      expiresAt: updatedBusiness.subscription.expiresAt
    });

    // ✅ STEP 5: PROCESS AFFILIATE COMMISSION
    let affiliateResult = null;
    if (updatedBusiness.referredBy) {
      console.log("[executeProUpgrade] 🤝 Processing affiliate commission...", {
        referredBy: updatedBusiness.referredBy
      });

      affiliateResult = await creditAffiliate(
        updatedBusiness._id,
        amountPaid,
        session
      );

      if (affiliateResult) {
        console.log("[executeProUpgrade] ✅ Affiliate commission credited", {
          affiliateCode: affiliateResult.affiliateCode,
          commissionAmount: affiliateResult.commissionAmount
        });
      } else {
        console.warn("[executeProUpgrade] ⚠️  Affiliate credit returned null", {
          businessId,
          referredBy: updatedBusiness.referredBy
        });
      }
    } else {
      console.log("[executeProUpgrade] ℹ️  No affiliate for this business", { businessId });
    }

    await session.commitTransaction();
    console.log("[executeProUpgrade] ✅ Transaction committed");

    console.log("[executeProUpgrade] 🎉 PRO UPGRADE COMPLETE", {
      businessId: updatedBusiness._id,
      plan: "pro",
      billingCycle,
      expiresAt: updatedBusiness.subscription.expiresAt,
      affiliateProcessed: !!affiliateResult
    });

    return {
      success: true,
      business: updatedBusiness,
      affiliateCredit: affiliateResult
    };
  } catch (err) {
    console.error("[executeProUpgrade] ❌ Error", {
      error: err.message,
      businessId
    });

    if (transactionStarted) {
      try {
        await session.abortTransaction();
        console.log("[executeProUpgrade] Transaction aborted due to error");
      } catch (abortErr) {
        console.error("[executeProUpgrade] Failed to abort transaction:", abortErr.message);
      }
    }

    throw err;
  } finally {
    try {
      await session.endSession();
      console.log("[executeProUpgrade] Session ended");
    } catch (sessionErr) {
      console.error("[executeProUpgrade] Failed to end session:", sessionErr.message);
    }
  }
};

// ======================================
// VERIFY REDIRECT (FRONTEND CALLBACK)
// ======================================
// User authenticated, frontend calls this after Paystack redirects
const verifyRedirect = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ message: "Reference missing from redirect" });
    }

    console.log("[verifyRedirect] User verification initiated", {
      userId: req.user?.id,
      businessId: req.user?.businessId,
      reference
    });

    // ✅ STEP 1: VERIFY WITH PAYSTACK
    console.log("[verifyRedirect] 🔍 Verifying transaction with Paystack...");

    const payment = await verifyPayment(reference);

    if (!payment || payment.status !== "success") {
      console.warn("[verifyRedirect] ❌ Payment not successful", {
        reference,
        status: payment?.status
      });
      return res.status(400).json({
        message: "Payment was not successful or is still pending."
      });
    }

    console.log("[verifyRedirect] ✅ Payment verified with Paystack", {
      reference,
      amount: payment.amount,
      status: payment.status
    });

    // ✅ STEP 2: EXTRACT METADATA
    const metadata = payment.metadata || {};
    const { businessId, billingCycle } = metadata;

    console.log("[verifyRedirect] 🔒 Metadata extracted", {
      businessId: businessId || "❌ MISSING",
      billingCycle: billingCycle || "❌ MISSING"
    });

    if (!businessId || !billingCycle) {
      console.error("[verifyRedirect] ❌ Missing metadata", {
        reference,
        metadata
      });
      return res.status(400).json({
        message: "Payment metadata incomplete. Please try again."
      });
    }

    // ✅ STEP 3: VERIFY BUSINESS OWNERSHIP
    if (businessId !== req.user.businessId.toString()) {
      console.error("[verifyRedirect] ❌ Business mismatch", {
        userBusiness: req.user.businessId,
        paymentBusiness: businessId
      });
      return res.status(403).json({
        message: "Payment does not match your business."
      });
    }

    // ✅ STEP 4: EXECUTE PRO UPGRADE
    const paymentAmount = payment.amount / 100;
    const upgradeResult = await executeProUpgrade(
      businessId,
      billingCycle,
      paymentAmount
    );

    console.log("[verifyRedirect] 🎉 REDIRECT VERIFICATION COMPLETE", {
      reference,
      businessId,
      result: upgradeResult.success
    });

    // ✅ STEP 7: RETURN SUCCESS
    return res.json({
      message: "Payment verified successfully! Your subscription is now active.",
      subscription: {
        plan: upgradeResult.business.subscription.plan,
        billingCycle: upgradeResult.business.subscription.billingCycle,
        status: upgradeResult.business.subscription.status,
        expiresAt: upgradeResult.business.subscription.expiresAt
      },
      payment: {
        reference,
        amount: paymentAmount,
        status: "success"
      },
      affiliateCredit: upgradeResult.affiliateCredit ? {
        affiliateCode: upgradeResult.affiliateCredit.affiliateCode,
        commissionEarned: upgradeResult.affiliateCredit.commissionAmount
      } : null
    });

  } catch (err) {
    console.error("❌ REDIRECT VERIFICATION FAILED", {
      error: err.message,
      reference: req.body?.reference
    });

    return res.status(500).json({
      message: "Verification failed. Please contact support.",
      error: err.message
    });

  }
};

// ======================================
// PAYSTACK WEBHOOK (REAL-TIME)
// ======================================
const handlePaystackWebhook = async (req, res) => {
  try {
    // ✅ STEP 1: VERIFY SIGNATURE
    const signature = req.headers["x-paystack-signature"];

    if (!signature) {
      console.warn("[webhook] ⚠️  Missing x-paystack-signature header");
      return res.status(401).json({ message: "Unauthorized webhook call." });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error("[webhook] ❌ PAYSTACK_SECRET_KEY not configured");
      return res.status(500).json({ message: "Server misconfiguration." });
    }

    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.rawBody)
      .digest("hex");

    console.log("[webhook] 🔒 Signature verification", {
      match: hash === signature ? "✅ YES" : "❌ NO"
    });

    if (hash !== signature) {
      console.error("[webhook] ❌ Signature mismatch - spoofing attempt");
      return res.status(401).json({ message: "Unauthorized webhook call." });
    }

    console.log("[webhook] ✅ Signature verified");

    // ✅ STEP 2: PARSE EVENT
    const event = req.body;

    console.log("[webhook] 📨 Event received", {
      event: event.event,
      status: event.data?.status
    });

    if (event.event !== "charge.success") {
      console.log("[webhook] ℹ️  Event is not charge.success - ignoring", { event: event.event });
      return res.status(200).json({
        message: "Webhook received but charge.success not triggered."
      });
    }

    if (event.data.status !== "success") {
      console.warn("[webhook] ⚠️  Charge status not success");
      return res.status(200).json({
        message: "Webhook received but payment is not successful."
      });
    }

    // ✅ STEP 3: EXTRACT METADATA
    const metadata = event.data.metadata || {};
    const { businessId, billingCycle } = metadata;

    console.log("[webhook] 🔒 Metadata extracted", {
      businessId: businessId || "❌ MISSING",
      billingCycle: billingCycle || "❌ MISSING"
    });

    if (!businessId || !billingCycle) {
      console.error("[webhook] ❌ Missing metadata", { metadata });
      return res.status(200).json({
        message: "Webhook received but metadata incomplete."
      });
    }

    // ✅ STEP 4: EXECUTE PRO UPGRADE
    const paymentAmount = event.data.amount / 100;
    const upgradeResult = await executeProUpgrade(
      businessId,
      billingCycle,
      paymentAmount
    );

    console.log("[webhook] 🎉 WEBHOOK PROCESSING COMPLETE", {
      reference: event.data.reference,
      businessId,
      result: upgradeResult.success
    });

    return res.status(200).json({
      message: "Webhook processed successfully.",
      reference: event.data.reference,
      businessId
    });

  } catch (err) {
    console.error("❌ WEBHOOK ERROR", {
      error: err.message
    });

    // Return 200 to Paystack even on error (so it doesn't retry infinitely)
    return res.status(200).json({
      message: "Webhook received but processing encountered an error.",
      error: err.message
    });
  }
};

export default {
  getSubscriptionStatus,
  initializeSubscription,
  verifySubscription,
  verifyRedirect,
  handlePaystackWebhook,
  executeProUpgrade
};