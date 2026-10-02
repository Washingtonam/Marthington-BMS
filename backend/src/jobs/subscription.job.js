import Business from "../modules/businesses/business.model.js";

const runSubscriptionCheck = async () => {
  try {
    const now = new Date();

    const expiredBusinesses = await Business.find({
      "subscription.plan": "pro",
      "subscription.expiresAt": { $lte: now }
    });

    for (const biz of expiredBusinesses) {
      await Business.findByIdAndUpdate(biz._id, {
        subscription: {
          plan: "free",
          billingCycle: null,
          startedAt: null,
          expiresAt: null
        }
      });

      console.log(`Downgraded: ${biz.name}`);
    }

  } catch (err) {
    console.error("SUBSCRIPTION JOB ERROR:", err.message);
  }
};

export default runSubscriptionCheck;