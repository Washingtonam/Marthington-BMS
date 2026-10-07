import Sale from "../sales/sale.model.js";
import Product from "../products/product.model.js";
import Transaction from "../transactions/transaction.model.js";
import { buildDailyAnalysisSnapshot, buildReportSnapshot } from "../reports/reports.controller.js";

export const salesFilter = (businessId) => ({
  $and: [
    { $or: [{ business: businessId }, { businessId }] },
    { $or: [{ industryType: "retail" }, { industryType: { $exists: false } }] },
    { isDeleted: { $ne: true } }
  ]
});

export const getLocalDate = (date = new Date(), timezone = "Africa/Lagos") => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const localParts = (date, timezone) => new Intl.DateTimeFormat("en-US", {
  timeZone: timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
}).formatToParts(date).reduce((result, part) => {
  result[part.type] = part.value;
  return result;
}, {});

const localDateToUtc = (date, timezone) => {
  const [year, month, day] = date.split("-").map(Number);
  const targetTime = Date.UTC(year, month - 1, day);
  let result = new Date(targetTime);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = localParts(result, timezone);
    const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const adjustedTime = targetTime - (asUtc - result.getTime());
    if (adjustedTime === result.getTime()) break;
    result = new Date(adjustedTime);
  }
  return result;
};

const addDays = (date, amount) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
};

export const getCompletedReportRange = (now = new Date(), timezone = "Africa/Lagos", frequency = "daily", reportDay = "previous") => {
  const currentDate = getLocalDate(now, timezone);
  if (frequency === "daily") {
    const reportDate = addDays(currentDate, reportDay === "previous" ? -1 : 0);
    const nextDate = addDays(reportDate, 1);
    return {
      startDate: localDateToUtc(reportDate, timezone),
      endDate: localDateToUtc(nextDate, timezone),
      startLocalDate: reportDate,
      endLocalDate: reportDate
    };
  }
  const endDate = frequency === "monthly"
    ? `${currentDate.slice(0, 8)}01`
    : addDays(currentDate, 0);
  const startDate = frequency === "monthly"
    ? `${addDays(endDate, -1).slice(0, 8)}01`
    : addDays(endDate, frequency === "weekly" ? -7 : -1);
  const exclusiveEndDate = localDateToUtc(endDate, timezone);
  return {
    startDate: localDateToUtc(startDate, timezone),
    endDate: exclusiveEndDate,
    startLocalDate: startDate,
    endLocalDate: addDays(endDate, -1)
  };
};

export const formatReportPeriodLabel = (range, frequency) => {
  const formatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
  const start = formatter.format(new Date(`${range.startLocalDate}T00:00:00Z`));
  const end = formatter.format(new Date(`${range.endLocalDate}T00:00:00Z`));
  const title = frequency === "monthly" ? "Monthly" : frequency === "weekly" ? "Weekly" : "Daily";
  return frequency === "daily" ? `${title} report for ${start}` : `${title} report: ${start} - ${end}`;
};

export const getReportSnapshot = async (subscription, businessId, now = new Date()) => {
  const timezone = subscription.timezone || "Africa/Lagos";
  const dateRange = getCompletedReportRange(
    now,
    timezone,
    subscription.frequency || "daily",
    subscription.reportDay || "current"
  );
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

  const Invoice = (await import("../invoices/invoice.model.js")).default;
  const invoices = await Invoice.find({
    business: businessId,
    status: { $in: ["draft", "sent", "partial", "overdue"] },
    balanceDue: { $gt: 0 }
  }).select("invoiceNumber customerName customer totalAmount amountPaid balanceDue paymentStatus status dueDate createdAt").lean();

  const products = subscription.reportType === "daily-analysis"
    ? []
    : await Product.find({ business: businessId }).lean();

  const snapshot = subscription.reportType === "daily-analysis"
    ? buildDailyAnalysisSnapshot({ sales, transactions, date: dateRange.endLocalDate, dateRange })
    : buildReportSnapshot({
      sales,
      products,
      transactions,
      invoices,
      dateRange
    });

  return {
    snapshot,
    periodLabel: formatReportPeriodLabel(dateRange, subscription.frequency || "daily"),
    counts: { sales: sales.length, transactions: transactions.length, products: products.length }
  };
};

export default getReportSnapshot;
