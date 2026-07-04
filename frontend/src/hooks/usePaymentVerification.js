import { useState } from "react";
import request from "../api/client.js";

/**
 * 🔥 Hook: Payment Verification
 * Handles Paystack payment verification with instant UI refresh
 * 
 * Usage:
 * const { verifyPayment, isVerifying, message, error } = usePaymentVerification(onSuccess);
 * 
 * // In useEffect when reference query param detected:
 * if (reference) {
 *   verifyPayment(reference);
 * }
 */
export const usePaymentVerification = (onSuccess) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const verifyPayment = async (reference) => {
    try {
      if (!reference) {
        throw new Error("No payment reference provided");
      }

      setIsVerifying(true);
      setMessage("Verifying your transaction with Paystack...");
      setError("");

      console.log("[usePaymentVerification] Verifying with reference:", reference);

      // ✅ POST to backend verify-redirect endpoint
      const response = await request("/payments/verify-redirect", {
        method: "POST",
        body: JSON.stringify({ reference })
      });

      console.log("[usePaymentVerification] Verification successful:", response);

      setMessage("🎉 Upgrade successful! Your Pro features are now active.");

      // ✅ Call success callback (typically refreshBusiness)
      if (onSuccess && typeof onSuccess === "function") {
        await onSuccess();
      }

      setIsVerifying(false);
      return response;

    } catch (err) {
      console.error("[usePaymentVerification] Verification failed:", err);
      const errorMsg = err.message || "Payment verification failed. Please contact support.";
      setError(errorMsg);
      setMessage(`❌ ${errorMsg}`);
      setIsVerifying(false);
      throw err;
    }
  };

  return {
    verifyPayment,
    isVerifying,
    message,
    error
  };
};

export default usePaymentVerification;
