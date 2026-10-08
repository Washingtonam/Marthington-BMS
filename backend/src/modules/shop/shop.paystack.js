import axios from "axios";

export const initializeShopPayment = async ({ email, amount, reference, callbackUrl, metadata }) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error("Paystack is not configured.");
  }
  const response = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email,
      amount,
      currency: "NGN",
      reference,
      callback_url: callbackUrl,
      metadata
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
  return response.data.data;
};
