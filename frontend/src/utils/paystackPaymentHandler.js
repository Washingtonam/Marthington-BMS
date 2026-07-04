import request from "../api/client.js";

/**
 * 🔥 Paystack Payment Handler Utility
 * 
 * Handles complete Paystack payment flow:
 * 1. Initialize payment with backend
 * 2. Redirect to Paystack checkout
 * 3. Handle post-payment callback
 */

/**
 * Initialize Paystack payment and redirect to checkout
 * 
 * @param {string} billingCycle - "monthly" or "yearly"
 * @param {string} currency - "NGN" or "USD" (default: "NGN")
 * @param {number} amount - Optional override amount (in kobo for NGN, cents for USD)
 * @returns {Promise<{authorizationUrl: string, reference: string}>}
 */
export const initializePaystackPayment = async (billingCycle, currency = "NGN", amount = null) => {
  try {
    console.log("[PaystackPaymentHandler] Initializing payment", {
      billingCycle,
      currency,
      amount
    });

    // ✅ Call backend to get Paystack checkout URL
    const response = await request("/payments/initialize", {
      method: "POST",
      body: JSON.stringify({
        billingCycle,
        currency,
        amount
      })
    });

    console.log("[PaystackPaymentHandler] Paystack initialization successful", {
      reference: response.reference,
      hasAuthorizationUrl: !!response.authorizationUrl
    });

    if (!response.authorizationUrl) {
      throw new Error("Could not get Paystack checkout URL from server");
    }

    // ✅ Redirect to Paystack checkout
    // Paystack will return to callback URL after payment
    window.location.href = response.authorizationUrl;

    return response;

  } catch (err) {
    console.error("[PaystackPaymentHandler] Initialization failed:", err.message);
    throw new Error(err.message || "Payment initialization failed. Please try again.");
  }
};

/**
 * Handle Paystack post-payment verification
 * Called after user is redirected back from Paystack
 * 
 * @param {string} reference - Paystack transaction reference
 * @param {Function} onSuccess - Callback after successful verification
 * @returns {Promise<object>} - Verification response from backend
 */
export const handlePaystackCallback = async (reference, onSuccess) => {
  try {
    if (!reference) {
      throw new Error("No payment reference in callback");
    }

    console.log("[PaystackPaymentHandler] Handling callback with reference:", reference);

    // ✅ POST to backend verify-redirect endpoint
    // This verifies with Paystack and updates business to PRO
    const response = await request("/payments/verify-redirect", {
      method: "POST",
      body: JSON.stringify({ reference })
    });

    console.log("[PaystackPaymentHandler] Callback verification successful", {
      plan: response.subscription?.plan,
      status: response.subscription?.status
    });

    // ✅ Business is now PRO in backend
    // Now refresh local UI state
    if (onSuccess && typeof onSuccess === "function") {
      await onSuccess();
    }

    return response;

  } catch (err) {
    console.error("[PaystackPaymentHandler] Callback verification failed:", err.message);
    throw new Error(
      err.message ||
      "Payment verification failed. Please contact support."
    );
  }
};

/**
 * Complete Paystack payment flow in one call (for simple use cases)
 * 
 * @param {string} billingCycle - "monthly" or "yearly"
 * @param {object} options - Additional options
 * @param {string} options.currency - Currency code (default: "NGN")
 * @param {number} options.amount - Override amount
 * @returns {Promise<void>}
 */
export const startPaystackPayment = async (billingCycle, options = {}) => {
  const { currency = "NGN", amount = null } = options;

  try {
    console.log("[PaystackPaymentHandler] Starting complete payment flow", {
      billingCycle,
      currency
    });

    // Initialize and redirect to checkout
    // (User will be redirected away, so we don't await return)
    await initializePaystackPayment(billingCycle, currency, amount);

  } catch (err) {
    console.error("[PaystackPaymentHandler] Payment flow failed:", err.message);
    throw err;
  }
};

export default {
  initializePaystackPayment,
  handlePaystackCallback,
  startPaystackPayment
};
