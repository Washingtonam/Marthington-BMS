import Business from "../businesses/business.model.js";
import Sale from "../sales/sale.model.js";
import Product from "../products/product.model.js";
import School from "../schools/School.js";
import Student from "../schools/Student.js";

const getAnalytics = async (req, res) => {
  try {
    const businessId = req.user?.businessId;

    const fallbackMetrics = {
      totalRevenue: 0,
      totalProfit: 0,
      totalSales: 0,
      averageOrderValue: 0,
      inventoryValue: 0,
      lowStockCount: 0,
      totalStudents: 0,
      tuitionCollected: 0,
      classes: 0,
      attendanceRate: 0,
      patientCount: 0,
      appointmentsToday: 0,
      bedsAvailable: 0
    };

    if (!businessId) {
      return res.json({
        metrics: fallbackMetrics,
        placeholders: {
          message: "Business information is not available for this account."
        },
        industryType: "retail"
      });
    const business = await Business.findById(businessId);
    const currentType = business?.industryType || "retail";

    if (currentType === "school") {
      const school = await School.findOne({ businessId });
      const studentCount = await Student.countDocuments({ businessId });
      const tuitionCollected = await Student.countDocuments({
        businessId,
        tuitionStanding: "paid"
      });

      return res.json({
        metrics: {
          totalStudents: studentCount,
          tuitionCollected,
          classes: school?.totalClasses?.length ?? 0,
          attendanceRate: 0
        },
        placeholders: {
          message: "School analytics are available for your academic dashboard."
        },
        industryType: currentType
      });
    }

    if (currentType === "hospital") {
      return res.json({
        metrics: {
          patientCount: 0,
          appointmentsToday: 0,
          bedsAvailable: 0
        },
        placeholders: {
          message: "Hospital dashboard metrics are coming soon."
        },
        industryType: currentType
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

    const salesTrend = Object.entries(salesTrendMap).map(([date, revenue]) => ({
      date,
      revenue
    }));

    return res.json({
      metrics: {
        totalRevenue,
        totalProfit,
        totalSales,
        averageOrderValue,
        inventoryValue,
        lowStockCount: lowStockProducts.length
      },
      topProducts,
      lowStockProducts,
      salesTrend,
      industryType: currentType
    });
  } catch (err) {
    return res.json({
      metrics: {
        totalRevenue: 0,
        totalProfit: 0,
        totalSales: 0,
        averageOrderValue: 0,
        inventoryValue: 0,
        lowStockCount: 0,
        totalStudents: 0,
        tuitionCollected: 0,
        classes: 0,
        attendanceRate: 0,
        patientCount: 0,
        appointmentsToday: 0,
        bedsAvailable: 0
      },
      placeholders: {
        message: "Unable to compute analytics at this time."
      },
      industryType: req.user?.industryType || "retail",
      error: err.message
    });
  }
};

export default {
  getAnalytics
};