import Sale from "../sales/sale.model.js";
import Product from "../products/product.model.js";

const getReports = async (req, res) => {

  try {

    const businessId =
      req.user.businessId;

    const sales =
      await Sale.find({
        business: businessId
      })
      .populate(
        "createdBy",
        "name"
      )
      .sort({
        createdAt: -1
      });

    const products =
      await Product.find({
        business: businessId
      });

    // =========================
    // DATES
    // =========================

    const now = new Date();

    const today =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

    const monthStart =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

    // =========================
    // TODAY REVENUE
    // =========================

    const todayRevenue =
      sales
        .filter(
          (sale) =>
            new Date(
              sale.createdAt
            ) >= today
        )
        .reduce(
          (sum, sale) =>
            sum +
            sale.totalAmount,
          0
        );

    // =========================
    // MONTHLY
    // =========================

    const monthlySales =
      sales.filter(
        (sale) =>
          new Date(
            sale.createdAt
          ) >= monthStart
      );

    const monthlyRevenue =
      monthlySales.reduce(
        (sum, sale) =>
          sum +
          sale.totalAmount,
        0
      );

    const monthlyProfit =
      monthlySales.reduce(
        (sum, sale) =>
          sum +
          (sale.totalProfit || 0),
        0
      );

    // =========================
    // INVENTORY VALUE
    // =========================

    const inventoryValue =
      products.reduce(
        (sum, product) =>
          sum +
          (product.price || 0) *
            (product.stock || 0),
        0
      );

    // =========================
    // STAFF PERFORMANCE
    // =========================

    const staffMap = {};

    sales.forEach((sale) => {

      const name =
        sale.createdBy?.name ||
        "Unknown";

      if (!staffMap[name]) {

        staffMap[name] = {
          name,
          sales: 0,
          revenue: 0
        };
      }

      staffMap[name].sales += 1;

      staffMap[name].revenue +=
        sale.totalAmount;
    });

    const staffPerformance =
      Object.values(staffMap);

    // =========================
    // LOW STOCK
    // =========================

    const lowStockProducts =
      products.filter(
        (p) => p.stock <= 5
      );

    res.json({

      overview: {

        todayRevenue,

        monthlyRevenue,

        monthlyProfit,

        inventoryValue
      },

      staffPerformance,

      lowStockProducts,

      recentSales:
        sales.slice(0, 20)
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};

export default {
  getReports
};