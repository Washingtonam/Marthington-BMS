import axios from "axios";

const PAYSTACK_SECRET =
  process.env.PAYSTACK_SECRET_KEY;

// ======================================
// INITIALIZE PAYMENT
// ======================================

export const initializePayment =
  async ({
    email,
    amount,
    metadata
  }) => {

    const response =
      await axios.post(
        "https://api.paystack.co/transaction/initialize",

        {
          email,

          amount,

          metadata
        },

        {
          headers: {
            Authorization:
              `Bearer ${PAYSTACK_SECRET}`
          }
        }
      );

    return response.data.data;
  };

// ======================================
// VERIFY PAYMENT
// ======================================

export const verifyPayment =
  async (reference) => {

    const response =
      await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,

        {
          headers: {
            Authorization:
              `Bearer ${PAYSTACK_SECRET}`
          }
        }
      );

    return response.data.data;
  };