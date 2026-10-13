import cron from "node-cron";
import EmailCampaign from "../modules/admin/emailCampaign.model.js";
import EmailCampaignDelivery from "../modules/admin/emailCampaignDelivery.model.js";
import EmailPreference from "../modules/admin/emailPreference.model.js";
import Business from "../modules/businesses/business.model.js";
import User from "../modules/users/user.model.js";
import { sendCampaignEmail, sendSubscriptionEmail } from "../utils/emailService.js";

export const filterCampaignRecipients = (recipients, selectedRecipients) => {
  if (!Array.isArray(selectedRecipients)) return recipients;
  const selectedEmails = new Set(selectedRecipients.map((email) => String(email).toLowerCase()));
  return recipients.filter((recipient) => selectedEmails.has(String(recipient.email || "").toLowerCase()));
};

const audienceQuery = (campaign, optedOutIds) => {
  const query = {
    isActive: { $ne: false },
    _id: { $nin: optedOutIds }
  };
  if (campaign.audienceType === "owners") query.role = "owner";
  if (campaign.audienceType === "staff") query.role = { $in: ["manager", "cashier", "staff"] };
  if (campaign.audienceType === "affiliates") query.role = "affiliate";
  if (campaign.audienceType === "business_users") query.business = campaign.business;
  return query;
};

const getSubscriptionBusinessQuery = (audienceType, now) => {
  const withinDays = (days) => ({
    "subscription.plan": "pro",
    "subscription.status": "active",
    "subscription.expiresAt": {
      $gte: now,
      $lte: new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    }
  });

  if (audienceType === "subscription_active_pro") {
    return {
      "subscription.plan": "pro",
      "subscription.status": "active",
      $or: [
        { "subscription.expiresAt": null },
        { "subscription.expiresAt": { $gte: now } }
      ]
    };
  }
  if (audienceType === "subscription_expiring_7") return withinDays(7);
  if (audienceType === "subscription_expiring_30") return withinDays(30);
  if (audienceType === "subscription_trial") {
    return {
      "subscription.status": "trial",
      $or: [
        { "subscription.expiresAt": null },
        { "subscription.expiresAt": { $gte: now } }
      ]
    };
  }
  if (audienceType === "subscription_expired") {
    return {
      $or: [
        { "subscription.status": "expired" },
        { "subscription.expiresAt": { $lt: now } }
      ]
    };
  }
  return {};
};

export const getSubscriptionRecipients = async (audienceType, now = new Date()) => {
  const businesses = await Business.find(getSubscriptionBusinessQuery(audienceType, now))
    .select("name owner subscription")
    .populate("owner", "name email isActive")
    .lean();
  const grouped = new Map();

  businesses.forEach((business) => {
    const owner = business.owner;
    const email = String(owner?.email || "").trim().toLowerCase();
    if (!email || owner?.isActive === false) return;

    const group = grouped.get(email) || {
      _id: owner._id,
      email,
      name: owner.name || "",
      businesses: []
    };
    group.businesses.push(business);
    grouped.set(email, group);
  });

  return [...grouped.values()].map((group) => {
    const businessesForOwner = group.businesses;
    const uniqueNames = [...new Set(businessesForOwner.map((business) => business.name).filter(Boolean))];
    const subscriptions = businessesForOwner.map((business) => business.subscription || {});
    const billingCycles = [...new Set(subscriptions.map((subscription) => subscription.billingCycle).filter(Boolean))];
    const expiries = [...new Set(subscriptions.map((subscription) => subscription.expiresAt).filter(Boolean)
      .map((expiry) => new Date(expiry).toLocaleDateString()))];

    return {
      _id: group._id,
      email: group.email,
      name: group.name,
      variables: {
        businessName: uniqueNames.join(", ") || "your business",
        ownerName: group.name || "there",
        planName: [...new Set(subscriptions.map((subscription) => subscription.tier || subscription.plan).filter(Boolean))].join(", "),
        billingCycle: billingCycles.length === 1 ? billingCycles[0] : billingCycles.length ? "varies by business" : "",
        expiryDate: expiries.length === 1 ? expiries[0] : expiries.length ? "varies by business" : ""
      }
    };
  });
};

export const processEmailCampaignById = async (campaignId, now = new Date()) => {
  const campaign = await EmailCampaign.findOneAndUpdate(
    { _id: campaignId, status: "scheduled" },
    { status: "sending" },
    { new: true }
  ).lean();
  if (!campaign) return false;

  try {
    const subscriptionCampaign = campaign.audienceType.startsWith("subscription_");
    let recipients;

    if (subscriptionCampaign) {
      recipients = await getSubscriptionRecipients(campaign.audienceType, now);
    } else {
      const optedOut = await EmailPreference.find({ marketingOptOut: true }).select("user").lean();
      const optedOutIds = optedOut.map((item) => item.user);
      recipients = await User.find(audienceQuery(campaign, optedOutIds))
        .select("name email")
        .lean();
    }

    const previousDeliveries = await EmailCampaignDelivery.find({
      campaign: campaign._id,
      status: "sent"
    }).select("recipientEmail").lean();
    const alreadySent = new Set(previousDeliveries.map((delivery) => delivery.recipientEmail));
    const eligibleRecipients = filterCampaignRecipients(recipients, campaign.selectedRecipients);
    const pendingRecipients = eligibleRecipients.filter((recipient) => recipient.email && !alreadySent.has(recipient.email));
    let deliveredCount = 0;
    let failedCount = 0;

    for (const recipient of pendingRecipients) {
      try {
        if (subscriptionCampaign) {
          await sendSubscriptionEmail({
            recipientEmail: recipient.email,
            subject: campaign.subject,
            previewText: campaign.previewText,
            bodyText: campaign.bodyHtml,
            variables: recipient.variables
          });
        } else {
          const sent = await sendCampaignEmail({
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            subject: campaign.subject,
            previewText: campaign.previewText,
            bodyHtml: campaign.bodyHtml,
            footerText: campaign.footerText,
            footerAddress: campaign.footerAddress,
            userId: recipient._id
          });
          if (!sent) throw new Error("Email transporter unavailable or delivery failed");
        }

        await EmailCampaignDelivery.findOneAndUpdate(
          { campaign: campaign._id, recipientEmail: recipient.email },
          {
            campaign: campaign._id,
            recipient: recipient._id || null,
            recipientEmail: recipient.email,
            recipientName: recipient.name || "",
            status: "sent",
            errorMessage: "",
            sentAt: now
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        deliveredCount += 1;
      } catch (error) {
        await EmailCampaignDelivery.findOneAndUpdate(
          { campaign: campaign._id, recipientEmail: recipient.email },
          {
            campaign: campaign._id,
            recipient: recipient._id || null,
            recipientEmail: recipient.email,
            recipientName: recipient.name || "",
            status: "failed",
            errorMessage: error.message
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        ).catch(() => {});
        failedCount += 1;
      }
    }

    await EmailCampaign.findByIdAndUpdate(campaign._id, {
      status: failedCount > 0 ? "failed" : "sent",
      sentAt: failedCount > 0 ? null : now,
      recipientCount: eligibleRecipients.length,
      deliveredCount: alreadySent.size + deliveredCount,
      failedCount
    });
    return true;
  } catch (error) {
    await EmailCampaign.findByIdAndUpdate(campaign._id, {
      status: "failed",
      sentAt: null,
      failedCount: campaign.recipientCount || 0
    });
    throw error;
  }
};

export const sendDueEmailCampaigns = async (now = new Date()) => {
  const campaigns = await EmailCampaign.find({
    status: "scheduled",
    scheduledFor: { $lte: now }
  }).select("_id").lean();
  let processed = 0;

  for (const campaign of campaigns) {
    if (await processEmailCampaignById(campaign._id, now)) processed += 1;
  }

  return { processed };
};

export const startEmailCampaignCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const result = await sendDueEmailCampaigns();
      if (result.processed) console.log(`Email campaign job: ${result.processed} campaign(s) processed`);
    } catch (error) {
      console.error("Email campaign job failed:", error.message);
    }
  });
  console.log("Email campaign scheduler started (every minute)");
};

export default startEmailCampaignCron;
