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
// INITIALIZE PAYMENT
// ======================================
export const initializePayment = async ({ email, amount, metadata }) => {
  try {
    validateConfig();

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount, // Ensure this is already multiplied by 100 in the controller
        metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`, // Authorization must be a Bearer token
          "Content-Type": "application/json",
        },
      }
    );

    // Paystack returns data in a nested 'data' object
    return response.data.data;
  } catch (error) {
    // Log the specific error from Paystack for debugging
    const message = error.response?.data?.message || error.message;
    console.error("❌ Paystack Initialization Error:", message);
    throw new Error(`Payment Initialization Failed: ${message}`);
  }
};

// ======================================
// VERIFY PAYMENT
// ======================================
export const verifyPayment = async (reference) => {
  try {
    validateConfig();

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    return response.data.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    console.error("❌ Paystack Verification Error:", message);
    throw new Error(`Payment Verification Failed: ${message}`);
  }
};