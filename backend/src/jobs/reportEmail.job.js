import jwt from "jsonwebtoken";
import Business from "../modules/businesses/business.model.js";
import ReportSubscription from "../modules/admin/reportSubscription.model.js";
import ReportDeliveryLog from "../modules/admin/reportDeliveryLog.model.js";
import { getReportSnapshot } from "../modules/admin/reportSnapshot.js";
import { sendReportEmail } from "../utils/emailService.js";
import cron from "node-cron";

export const getLocalScheduleParts = (date, timezone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    hour12: false
  }).formatToParts(date).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: parts.weekday
  };
};

export const isSubscriptionDue = (subscription, date = new Date()) => {
  let local;
  try {
    local = getLocalScheduleParts(date, subscription.timezone || "Africa/Lagos");
  } catch {
    return false;
  }

  const [configuredHour, configuredMinute] = String(subscription.sendTime || "18:00").split(":").map(Number);
  const [localHour, localMinute] = local.time.split(":").map(Number);
  if ((localHour * 60) + localMinute < (configuredHour * 60) + configuredMinute) return false;
  if (subscription.frequency === "weekly") {
    const configuredDay = Number.isInteger(subscription.weeklyDay) ? subscription.weeklyDay : 1;
    const localWeekday = new Date(`${local.date}T00:00:00Z`).getUTCDay();
    if (localWeekday !== configuredDay) return false;
  }
  if (subscription.frequency === "monthly") {
    const configuredDay = subscription.monthlyDay ?? "last";
    if (configuredDay === "last") {
      const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      let nextLocal;
      try {
        nextLocal = getLocalScheduleParts(nextDay, subscription.timezone || "Africa/Lagos");
      } catch {
        return false;
      }
      if (nextLocal.date === local.date) return false;
    } else if (Number(local.date.slice(-2)) !== Number(configuredDay)) {
      return false;
    }
  }

  if (!subscription.lastSentAt) return true;
  try {
    return getLocalScheduleParts(subscription.lastSentAt, subscription.timezone || "Africa/Lagos").date !== local.date;
  } catch {
    return true;
  }
};

export const shouldCreateAutomaticReportSubscription = (business, hasExistingSchedule) => (
  !hasExistingSchedule &&
  business?.status !== "deleted" &&
  business?.subscription?.plan === "pro" &&
  business?.subscription?.status === "active" &&
  business?.reportNotificationsEnabled !== false &&
  Boolean(business?.owner?._id) &&
  Boolean(business?.owner?.email || business?.email)
);

const unsubscribeUrlFor = (subscriptionId) => {
  const token = jwt.sign(
    { subscriptionId: subscriptionId.toString(), purpose: "report-unsubscribe" },
    process.env.JWT_SECRET,
    { expiresIn: "10y" }
  );
  const apiUrl = String(process.env.PUBLIC_API_URL || process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${apiUrl}/api/report-subscriptions/unsubscribe?token=${encodeURIComponent(token)}`;
};

export const sendDueReportSubscriptions = async (now = new Date()) => {
  const eligibleBusinesses = await Business.find({
    status: { $ne: "deleted" },
    "subscription.plan": "pro",
    "subscription.status": "active",
    reportNotificationsEnabled: { $ne: false }
  }).populate("owner", "name email").lean();

  for (const business of eligibleBusinesses) {
    const existingSchedule = await ReportSubscription.findOne({ business: business._id });
    if (!shouldCreateAutomaticReportSubscription(business, Boolean(existingSchedule))) continue;

    try {
      await ReportSubscription.create({
        recipientEmail: business.owner.email || business.email,
        recipientName: business.owner.name || "",
        business: business._id,
        reportType: "overview",
        reportSections: ["summary", "sales", "expenses", "inventory", "staff", "paymentMethods"],
        frequency: "daily",
        sendTime: "18:00",
        weeklyDay: 1,
        monthlyDay: "last",
        timezone: "Africa/Lagos",
        status: "enabled",
        createdBy: business.owner._id,
        updatedBy: business.owner._id
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }

  const subscriptions = await ReportSubscription.find({
    status: "enabled",
    business: { $exists: true, $ne: null }
  }).lean();
  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    if (!isSubscriptionDue(subscription, now)) continue;

    try {
      const business = await Business.findById(subscription.business)
        .select("name address phone email website supportEmail supportPhone logo reportNotificationsEnabled")
        .lean();
      if (!business) throw new Error("Business not found");
      if (business.reportNotificationsEnabled === false) continue;

      const { snapshot, periodLabel } = await getReportSnapshot(subscription, subscription.business);
      const delivered = await sendReportEmail({
        recipientEmail: subscription.recipientEmail,
        recipientName: subscription.recipientName,
        businessName: business.name,
        businessProfile: business,
        reportType: subscription.reportType,
        frequency: subscription.frequency,
        periodLabel,
        snapshot,
        unsubscribeUrl: unsubscribeUrlFor(subscription._id)
      });

      if (!delivered) throw new Error("Email transporter unavailable or delivery failed");

      await ReportSubscription.findByIdAndUpdate(subscription._id, { lastSentAt: now, lastError: "" });
      await ReportDeliveryLog.create({
        subscription: subscription._id,
        business: subscription.business,
        recipientEmail: subscription.recipientEmail,
        reportType: subscription.reportType,
        frequency: subscription.frequency,
        status: "sent",
        sentAt: now
      });
      sent += 1;
    } catch (error) {
      await ReportSubscription.findByIdAndUpdate(subscription._id, { lastError: error.message });
      await ReportDeliveryLog.create({
        subscription: subscription._id,
        business: subscription.business,
        recipientEmail: subscription.recipientEmail,
        reportType: subscription.reportType,
        frequency: subscription.frequency,
        status: "failed",
        errorMessage: error.message
      });
      failed += 1;
    }
  }

  return { sent, failed };
};

export const startReportEmailCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const result = await sendDueReportSubscriptions();
      if (result.sent || result.failed) console.log(`Report email job: ${result.sent} sent, ${result.failed} failed`);
    } catch (error) {
      console.error("Report email job failed:", error.message);
    }
  });
  console.log("Report email scheduler started (every minute)");
};

export default startReportEmailCron;
