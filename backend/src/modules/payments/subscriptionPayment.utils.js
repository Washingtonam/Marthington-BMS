import SubscriptionPayment from "./subscriptionPayment.model.js";

export const recordSubscriptionPayment = async (payment, session = null) => {
  const options = { upsert: true };
  if (session) options.session = session;

  await SubscriptionPayment.updateOne(
    { reference: payment.reference },
    {
      $setOnInsert: {
        business: payment.business,
        businessName: payment.businessName || "",
        reference: payment.reference,
        billingCycle: payment.billingCycle,
        gateway: payment.gateway,
        currency: payment.currency === "USD" ? "USD" : "NGN",
        amount: Number(payment.amount),
        affiliateCommission: Number(payment.affiliateCommission || 0),
        paidAt: payment.paidAt || new Date()
      }
    },
    options
  );
};
