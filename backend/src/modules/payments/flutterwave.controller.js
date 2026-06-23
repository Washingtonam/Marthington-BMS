import axios from "axios";
import Business from "../businesses/business.model.js";
import Pricing from "../subscriptions/Pricing.js";

const FLW_API_URL = "https://api.flutterwave.com/v3/payments";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://marthington.onrender.com";

const initializeFlutterwave = async (req, res) => {
  try {
    const { planType, currency = "NGN" } = req.body;
    const billingCycle = String(planType || "").toLowerCase();
    const normalizedCurrency = String(currency || "NGN").toUpperCase();
    const allowedCurrencies = ["NGN", "USD"];

    if (!billingCycle || !["monthly", "yearly"].includes(billingCycle)) {
      return res.status(400).json({
        message: "Please provide a valid planType (monthly or yearly)."
      });
    }

    if (!allowedCurrencies.includes(normalizedCurrency)) {
      return res.status(400).json({
        message: "Currency must be NGN or USD."
      });
    }

    const pricing = await Pricing.findOne({ tier: "pro" }).lean();

    if (!pricing || !pricing.prices) {
      return res.status(500).json({
        message: "Pricing configuration not found."
      });
    }

    const amount = billingCycle === "yearly"
      ? pricing.prices.yearly[normalizedCurrency.toLowerCase()]
      : pricing.prices.monthly[normalizedCurrency.toLowerCase()];

    if (!amount || isNaN(amount)) {
      return res.status(500).json({
        message: "Requested amount is not available for the selected currency."
      });
    }

    if (!req.user?.email) {
      return res.status(400).json({
        message: "Authenticated user email is required for payment initialization."
      });
    }

    const tx_ref = `marthington-${Date.now()}-${req.user.businessId}`;

    const payload = {
      tx_ref,
      amount,
      currency: normalizedCurrency,
      redirect_url: `${FRONTEND_URL}/settings`,
      customer: {
        email: req.user.email,
        name: req.user.name || "Marthington Customer"
      },
      meta: {
        businessId: req.user.businessId,
        billingCycle,
        currency: normalizedCurrency
      }
    };

    const response = await axios.post(FLW_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 15000
    });

    const link = response?.data?.data?.link;

    if (!link) {
      return res.status(502).json({
        message: "Flutterwave did not return a payment link."
      });
    }

    return res.json({
      url: link,
      link,
      tx_ref
    });
  } catch (err) {
    console.error("Flutterwave initialize error:", err?.response?.data || err.message);
    return res.status(500).json({
      message:
        err?.response?.data?.message ||
        err.message ||
        "Failed to initialize Flutterwave payment."
    });
  }
};

const flutterwaveWebhook = async (req, res) => {
  try {
    const incomingHash = req.headers["verif-hash"];

    if (!incomingHash || incomingHash !== process.env.FLW_SECRET_HASH) {
      return res.status(401).json({
        message: "Unauthorized webhook call."
      });
    }

    const event = req.body || {};
    const data = event.data || event;
    const status = String(data.status || "").toLowerCase();

    if (status !== "successful") {
      return res.status(200).json({
        message: "Webhook received but payment is not successful."
      });
    }

    const tx_ref = data.tx_ref;

    if (!tx_ref || !tx_ref.startsWith("marthington-")) {
      return res.status(400).json({
        message: "Invalid transaction reference."
      });
    }

    const parts = tx_ref.split("-");
    const businessId = parts.slice(2).join("-");

    if (!businessId) {
      return res.status(400).json({
        message: "Business ID could not be parsed from transaction reference."
      });
    }

    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business record not found."
      });
    }

    const meta = data.meta || {};
    const billingCycle = ["monthly", "yearly"].includes(meta.billingCycle)
      ? meta.billingCycle
      : "monthly";

    const amount = Number(data.amount || 0);
    const now = new Date();
    const expiresAt = new Date(now);

    if (billingCycle === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    business.isPro = true;
    business.plan = "pro";
    business.subscription = {
      plan: "pro",
      billingCycle,
      status: "active",
      startedAt: now,
      expiresAt,
      amount,
      reference: tx_ref
    };

    await business.save();

    return res.status(200).json({
      message: "Webhook processed successfully.",
      businessId,
      tx_ref
    });
  } catch (err) {
    console.error("Flutterwave webhook error:", err);
    return res.status(500).json({
      message: err.message || "Webhook processing failed."
    });
  }
};

export default {
  initializeFlutterwave,
  flutterwaveWebhook
};