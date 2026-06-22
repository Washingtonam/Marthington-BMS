import Sale from "../sales/sale.model.js";
import Product from "../products/product.model.js";

const getAnalytics = async (req, res) => {
  try {

    const businessId = req.user.businessId;
    const industryType = req.user.industryType || "retail";

    if (industryType === "school") {
      return res.json({
        metrics: {
          studentCount: 0,
          feesCollected: 0,
          classes: 0
        },
        placeholders: {
          message: "School dashboard metrics are coming soon."
        },
        industryType
      });
    }

    if (industryType === "hospital") {
      return res.json({
        metrics: {
          patientCount: 0,
          appointmentsToday: 0,
          bedsAvailable: 0
        },
        placeholders: {
          message: "Hospital dashboard metrics are coming soon."
        },
        industryType
      });
    }

    // =========================
    // SALES
    // =========================

    const sales = await Sale.find({
      business: businessId
    });

    const products = await Product.find({
      business: businessId
    });

    // =========================
    // TOTALS
    // =========================

    const totalRevenue =
      sales.reduce(
        (sum, sale) =>
          sum + sale.totalAmount,
        0
      );

    const totalProfit =
      sales.reduce(
        (sum, sale) =>
          sum + (sale.totalProfit || 0),
        0
      );

    const totalSales =
      sales.length;

    const averageOrderValue =
      totalSales > 0
        ? totalRevenue / totalSales
        : 0;

    const inventoryValue =
      products.reduce(
        (sum, product) =>
          sum +
          (product.price || 0) *
            (product.stock || 0),
        0
      );

    // =========================
    // LOW STOCK
    // =========================

    const lowStockProducts =
      products.filter(
        (p) => p.stock <= 5
      );


    const criticalStock =
        products.filter(
            (p) => p.stock <= 2
        );

        const warningStock =
        products.filter(
            (p) =>
            p.stock > 2 &&
            p.stock <= 5
        );

    // =========================
    // TOP PRODUCTS
    // =========================

    const map = {};

    sales.forEach((sale) => {

      sale.items.forEach((item) => {

        if (!map[item.name]) {

          map[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }

        map[item.name].quantity +=
          item.quantity;

        map[item.name].revenue +=
          item.total;
      });
    });

    const topProducts =
      Object.values(map)
        .sort(
          (a, b) =>
            b.quantity -
            a.quantity
        )
        .slice(0, 5);

    // =========================
    // SALES TREND
    // =========================

    const salesTrendMap = {};

    sales.forEach((sale) => {

      const date =
        new Date(
          sale.createdAt
        ).toLocaleDateString();

      if (!salesTrendMap[date]) {
        salesTrendMap[date] = 0;
      }

      salesTrendMap[date] +=
        sale.totalAmount;
    });

    const salesTrend =
      Object.entries(
        salesTrendMap
      ).map(([date, revenue]) => ({
        date,
        revenue
      }));

    res.json({

      metrics: {

        totalRevenue,

        totalProfit,

        totalSales,

        averageOrderValue,

        inventoryValue,

        lowStockCount:
          lowStockProducts.length
      },

      topProducts,

      lowStockProducts,

      salesTrend
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};

export default {
  getAnalytics
};