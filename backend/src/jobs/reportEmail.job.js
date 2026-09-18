import jwt from "jsonwebtoken";
import Business from "../modules/businesses/business.model.js";
import Sale from "../modules/sales/sale.model.js";
import Product from "../modules/products/product.model.js";
import Transaction from "../modules/transactions/transaction.model.js";
import ReportSubscription from "../modules/admin/reportSubscription.model.js";
import ReportDeliveryLog from "../modules/admin/reportDeliveryLog.model.js";
import { buildDailyAnalysisSnapshot, buildReportSnapshot } from "../modules/reports/reports.controller.js";
import { sendReportEmail } from "../utils/emailService.js";
import cron from "node-cron";

const salesFilter = (businessId) => ({
  $and: [
    { $or: [{ business: businessId }, { businessId }] },
    { $or: [{ industryType: "retail" }, { industryType: { $exists: false } }] },
    { isDeleted: { $ne: true } }
  ]
});

export const getLocalScheduleParts = (date, timezone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
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

  if (local.time !== subscription.sendTime) return false;
  if (subscription.frequency === "weekly" && local.weekday !== "Mon") return false;

  if (!subscription.lastSentAt) return true;
  try {
    return getLocalScheduleParts(subscription.lastSentAt, subscription.timezone || "Africa/Lagos").date !== local.date;
  } catch {
    return true;
  }
};

const getReportSnapshot = async (subscription, businessId) => {
  const sales = await Sale.find(salesFilter(businessId))
    .select("items totalAmount totalProfit paymentMethod paymentReference branch createdBy createdAt receiptId customerName status")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .lean();
  const transactions = await Transaction.find({
    businessId,
    transactionType: "expense",
    $or: [{ postingType: "debit" }, { postingType: { $exists: false } }],
    status: "posted",
    isDeleted: { $ne: true }
  }).lean();

  if (subscription.reportType === "daily-analysis") {
    return buildDailyAnalysisSnapshot({ sales, transactions });
  }

  const products = await Product.find({ business: businessId }).lean();
  return buildReportSnapshot({ sales, products, transactions, period: "30" });
};

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
  const subscriptions = await ReportSubscription.find({
    status: "enabled",
    business: { $exists: true, $ne: null }
  }).lean();
  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    if (!isSubscriptionDue(subscription, now)) continue;

    try {
      const business = await Business.findById(subscription.business).select("name").lean();
      if (!business) throw new Error("Business not found");

      const snapshot = await getReportSnapshot(subscription, subscription.business);
      const delivered = await sendReportEmail({
        recipientEmail: subscription.recipientEmail,
        recipientName: subscription.recipientName,
        businessName: business.name,
        reportType: subscription.reportType,
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
