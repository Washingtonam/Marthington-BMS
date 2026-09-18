import cron from "node-cron";
import EmailCampaign from "../modules/admin/emailCampaign.model.js";
import EmailCampaignDelivery from "../modules/admin/emailCampaignDelivery.model.js";
import EmailPreference from "../modules/admin/emailPreference.model.js";
import User from "../modules/users/user.model.js";
import { sendCampaignEmail } from "../utils/emailService.js";

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

export const sendDueEmailCampaigns = async (now = new Date()) => {
  const campaigns = await EmailCampaign.find({
    status: "scheduled",
    scheduledFor: { $lte: now }
  }).lean();
  let processed = 0;

  for (const candidate of campaigns) {
    const campaign = await EmailCampaign.findOneAndUpdate(
      { _id: candidate._id, status: "scheduled" },
      { status: "sending" },
      { new: true }
    ).lean();
    if (!campaign) continue;

    const optedOut = await EmailPreference.find({ marketingOptOut: true }).select("user").lean();
    const optedOutIds = optedOut.map((item) => item.user);
    const recipients = await User.find(audienceQuery(campaign, optedOutIds))
      .select("name email")
      .lean();
    const previousDeliveries = await EmailCampaignDelivery.find({
      campaign: campaign._id,
      status: "sent"
    }).select("recipientEmail").lean();
    const alreadySent = new Set(previousDeliveries.map((delivery) => delivery.recipientEmail));
    const pendingRecipients = recipients.filter((recipient) => recipient.email && !alreadySent.has(recipient.email));
    let deliveredCount = 0;
    let failedCount = 0;

    for (const recipient of pendingRecipients) {
      try {
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
        await EmailCampaignDelivery.findOneAndUpdate(
          { campaign: campaign._id, recipientEmail: recipient.email },
          {
            campaign: campaign._id,
            recipient: recipient._id,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
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
            recipient: recipient._id,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
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
      recipientCount: recipients.filter((recipient) => recipient.email).length,
      deliveredCount: alreadySent.size + deliveredCount,
      failedCount
    });
    processed += 1;
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
