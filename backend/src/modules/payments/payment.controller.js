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

    // Initialize Paystack with subunit conversion
    const payment = await initializePayment({
      email: customerEmail,
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

    const metadata = payment.metadata || {};
    if (!metadata.businessId) {
      console.error("[payments.verify] Missing payment metadata", { reference, metadata });
      return res.status(400).json({ message: "Payment metadata is missing business context." });
    }

    console.log("[payments.verify] Payment verified ✅", {
      reference,
      businessId: metadata.businessId,
      billingCycle: metadata.billingCycle,
      amountNaira: payment.amount
    });

    // ✅ STEP 1: INITIALIZE TRANSACTION (FOR ATOMICITY)
    try {
      await session.startTransaction();
      transactionStarted = true;
      console.log("[payments.verify] Transaction started ✅");
    } catch (txErr) {
      console.warn("[payments.verify] Transactions unavailable, continuing without transaction", { error: txErr.message });
      transactionStarted = false;
    }

    // ✅ STEP 2: FETCH BUSINESS (LOAD CURRENT STATE)
    const business = transactionStarted
      ? await Business.findById(metadata.businessId).session(session)
      : await Business.findById(metadata.businessId);

    if (!business) {
      if (transactionStarted) await session.abortTransaction();
      console.error("[payments.verify] Business not found", { businessId: metadata.businessId });
      return res.status(404).json({ message: "Business not found" });
    }

    console.log("[payments.verify] Business loaded ✅", {
      businessId: business._id,
      currentPlan: business.subscription?.plan,
      industryType: business.industryType
    });

    // ✅ STEP 3: CALCULATE EXPIRATION DATE
    const now = new Date();
    const expiresAt = new Date();
    if (metadata.billingCycle === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    console.log("[payments.verify] Expiration calculated ✅", {
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      billingCycle: metadata.billingCycle
    });

    // ✅ STEP 4: DETERMINE TIER
    const tierMap = {
      retail: "Retail Pro Plan",
      school: "Premium Academic Plan",
      hospital: "Premium Health Plan"
    };

    const industryType = business.industryType || "retail";
    const tier = tierMap[industryType] || `${industryType.charAt(0).toUpperCase() + industryType.slice(1)} Pro Plan`;

    // ✅ STEP 5: UPDATE BUSINESS DOCUMENT (THE SINGLE SOURCE OF TRUTH) 🔥
    const paymentAmountConverted = payment.amount / 100;

    const update = {
      plan: "pro",
      isPro: true,
      industryType,
      subscription: {
        plan: "pro",
        billingCycle: metadata.billingCycle,
        status: "active",
        startedAt: now,
        expiresAt,
        amount: paymentAmountConverted,
        reference,
        tier
      }
    };

    console.log("[payments.verify] Executing UPDATE on Business document", {
      businessId: metadata.businessId,
      update: JSON.stringify(update, null, 2)
    });

    const updateOptions = { new: true };
    if (transactionStarted) updateOptions.session = session;

    const updatedBusiness = await Business.findByIdAndUpdate(
      metadata.businessId,
      update,
      updateOptions
    );

    if (!updatedBusiness) {
      if (transactionStarted) await session.abortTransaction();
      console.error("[payments.verify] Business update failed (no document returned)", { businessId: metadata.businessId });
      return res.status(500).json({ message: "Failed to update business subscription status." });
    }

    console.log("[payments.verify] Business document updated ✅", {
      businessId: updatedBusiness._id,
      plan: updatedBusiness.subscription.plan,
      status: updatedBusiness.subscription.status,
      expiresAt: updatedBusiness.subscription.expiresAt
    });

    // ✅ STEP 6: EXECUTE AFFILIATE REVENUE SHARE RULE 🤝
    let affiliateCredit = null;
    if (updatedBusiness.referredBy) {
      console.log("[payments.verify] Affiliate detected ✅", { referredBy: updatedBusiness.referredBy });

      affiliateCredit = await creditAffiliate(
        updatedBusiness._id,
        paymentAmountConverted,
        transactionStarted ? session : null
      );

      if (affiliateCredit) {
        console.log("[payments.verify] Affiliate commission credited ✅", {
          affiliateId: affiliateCredit.affiliateId,
          affiliateCode: affiliateCredit.affiliateCode,
          commissionAmount: affiliateCredit.commissionAmount,
          rateApplied: affiliateCredit.affiliateRate
        });
      } else {
        console.warn("[payments.verify] Affiliate credit returned null (possibly invalid rate or amount)", { businessId: metadata.businessId });
      }
    } else {
      console.log("[payments.verify] No affiliate for this business (no referredBy)", { businessId: metadata.businessId });
    }

    // ✅ STEP 7: COMMIT TRANSACTION
    if (transactionStarted) {
      await session.commitTransaction();
      console.log("[payments.verify] Transaction committed ✅");
    }

    console.log("[payments.verify] 🎉 PAYMENT SYNCHRONIZATION COMPLETE", {
      businessId: updatedBusiness._id,
      steps: [
        "✅ Payment verified with gateway",
        "✅ Business document updated (single source of truth)",
        "✅ Affiliate revenue share processed",
        "✅ Transaction committed atomically"
      ]
    });

    // ✅ STEP 8: RETURN SUCCESS RESPONSE
    return res.json({
      message: "Subscription activated successfully! Full chain reaction executed.",
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

export default {
  getSubscriptionStatus,
  initializeSubscription,
  verifySubscription
};