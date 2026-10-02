import Business from "../businesses/business.model.js";

const runSubscriptionCheck = async () => {
  try {
    const now = new Date();

    // 🔥 FIND EXPIRED ACTIVE SUBSCRIPTIONS
    const expiredBusinesses = await Business.find({
      plan: "pro",
      "subscription.status": "active",
      "subscription.expiresAt": { $lte: now }
    });

    for (const biz of expiredBusinesses) {
      await Business.findByIdAndUpdate(biz._id, {
        plan: "free",
        "subscription.status": "expired"
      });

      console.log(`⬇️ Downgraded: ${biz.name}`);
    }

  } catch (err) {
    console.error("SUBSCRIPTION JOB ERROR:", err.message);
  }
};

export default runSubscriptionCheck;