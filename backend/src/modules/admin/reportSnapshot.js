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
  let result = new Date(Date.UTC(year, month - 1, day));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = localParts(result, timezone);
    const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    result = new Date(result.getTime() - (asUtc - result.getTime()));
  }
  return result;
};

const addDays = (date, amount) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
};

export const getCompletedReportRange = (now = new Date(), timezone = "Africa/Lagos", frequency = "daily") => {
  const currentDate = getLocalDate(now, timezone);
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

export const getReportSnapshot = async (subscription, businessId) => {
  const timezone = subscription.timezone || "Africa/Lagos";
  const dateRange = getCompletedReportRange(new Date(), timezone, subscription.frequency || "daily");
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

  const products = subscription.reportType === "daily-analysis"
    ? []
    : await Product.find({ business: businessId }).lean();

  const snapshot = subscription.reportType === "daily-analysis"
    ? buildDailyAnalysisSnapshot({ sales, transactions, date: dateRange.endLocalDate, dateRange })
    : buildReportSnapshot({
      sales,
      products,
      transactions,
      dateRange
    });

  return {
    snapshot,
    periodLabel: formatReportPeriodLabel(dateRange, subscription.frequency || "daily"),
    counts: { sales: sales.length, transactions: transactions.length, products: products.length }
  };
};

export default getReportSnapshot;
