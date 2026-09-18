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

export const getReportSnapshot = async (subscription, businessId) => {
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
    ? buildDailyAnalysisSnapshot({ sales, transactions })
    : buildReportSnapshot({
      sales,
      products,
      transactions,
      period: subscription.frequency === "weekly" ? "7" : subscription.frequency === "monthly" ? "month" : "30"
    });

  return { snapshot, counts: { sales: sales.length, transactions: transactions.length, products: products.length } };
};

export default getReportSnapshot;
