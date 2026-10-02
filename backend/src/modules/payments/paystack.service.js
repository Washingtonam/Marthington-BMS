import axios from "axios";

// Access the secret key from environment variables
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// Helper to validate the secret key exists before making calls
const validateConfig = () => {
  if (!PAYSTACK_SECRET) {
    throw new Error("Paystack Secret Key is missing in environment variables.");
  }
};

// ======================================
// INITIALIZE PAYMENT - METADATA EXPLICIT
// ======================================
export const initializePayment = async ({ email, amount, metadata, callback_url, currency = "NGN" }) => {
  try {
    validateConfig();

    // 🔥 EXPLICIT METADATA WRAPPING FOR PAYSTACK LIFECYCLE
    if (!metadata || typeof metadata !== 'object') {
      throw new Error("Metadata object is required and must be an object");
    }

    if (!metadata.businessId) {
      throw new Error("Metadata.businessId is required for transaction tracking");
    }

    if (!metadata.billingCycle) {
      throw new Error("Metadata.billingCycle is required for transaction tracking");
    }

    console.log("[paystack.initializePayment] 🔒 Explicit metadata validation ✅", {
      businessId: metadata.businessId,
      billingCycle: metadata.billingCycle,
      email,
      amount,
      currency
    });

    const payload = {
      email,
      amount, // Must be multiplied by 100 in the controller (in subunits)
      currency,
      callback_url,
      metadata: {
        businessId: metadata.businessId,
        billingCycle: metadata.billingCycle
      }
    };

    console.log("[paystack.initializePayment] 📤 Sending to Paystack API", {
      payload: JSON.stringify(payload, null, 2)
    });

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Paystack returns data in a nested 'data' object
    const transactionData = response.data.data;

    console.log("[paystack.initializePayment] ✅ Response from Paystack received", {
      reference: transactionData.reference,
      accessCode: transactionData.access_code,
      authorizationUrl: transactionData.authorization_url ? "✅ Present" : "❌ Missing",
      metadataPreserved: transactionData.metadata ? "✅ Yes" : "❌ No"
    });

    return transactionData;
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    console.error("❌ Paystack Initialization Error:", message);
    console.error("❌ Error Details:", error.response?.data || error);
    throw new Error(`Payment Initialization Failed: ${message}`);
  }
};

// ======================================
// VERIFY PAYMENT - METADATA EXPLICIT EXTRACTION
// ======================================
export const verifyPayment = async (reference) => {
  try {
    validateConfig();

    console.log("[paystack.verifyPayment] 🔍 Verifying transaction reference", { reference });

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    const transactionData = response.data.data;

    // 🔥 EXPLICIT METADATA EXTRACTION FROM RESPONSE
    const extractedMetadata = transactionData.metadata || {};
    const { businessId, billingCycle } = extractedMetadata;

    console.log("[paystack.verifyPayment] ✅ Transaction verified", {
      reference: transactionData.reference,
      status: transactionData.status,
      amount: transactionData.amount,
      amountInNaira: `${(transactionData.amount / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}`,
      metadataExtracted: {
        businessId: businessId ? "✅ Present" : "❌ Missing",
        billingCycle: billingCycle ? `✅ ${billingCycle}` : "❌ Missing"
      }
    });

    if (!businessId || !billingCycle) {
      console.error("❌ [paystack.verifyPayment] CRITICAL: Metadata keys missing from response", {
        reference,
        businessId: businessId || "MISSING",
        billingCycle: billingCycle || "MISSING",
        allMetadata: extractedMetadata
      });
    }

    return transactionData;
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    console.error("❌ Paystack Verification Error:", message);
    console.error("❌ Error Details:", error.response?.data || error);
    throw new Error(`Payment Verification Failed: ${message}`);
  }
};