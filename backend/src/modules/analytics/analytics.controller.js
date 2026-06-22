import mongoose from "mongoose";
import Business from "../businesses/business.model.js";
import Sale from "../sales/sale.model.js";
import Product from "../products/product.model.js";
import School from "../schools/School.js";
import Student from "../schools/Student.js";

const retailSalesFilter = (businessId) => ({
  business: businessId,
  $or: [
    { industryType: "retail" },
    { industryType: { $exists: false } }
  ]
});

const getAnalytics = async (req, res) => {
  try {
    // 1. Fetch business and check industry type safely
    const business = await Business.findById(req.user?.businessId).lean();
    const industry = business?.industryType?.trim() || "retail";

    if (industry !== "retail") {
      return res.status(200).json({
        success: true,
        data: {
          totalSales: 0,
          productsCount: 0
        }
      });
    }

    const businessObjectId = mongoose.Types.ObjectId(req.user.businessId);

    // 2. Original retail metrics calculation logic goes here...
    const sales = await Sale.find(retailSalesFilter(businessObjectId)).lean();
    const products = await Product.find({ business: businessObjectId }).lean();

    const totalSales = sales.length;
    const productsCount = products.length;

    const totalRevenue = sales.reduce(
      (sum, sale) => sum + (sale.totalAmount || 0),
      0
    );

    const totalProfit = sales.reduce(
      (sum, sale) => sum + (sale.totalProfit || 0),
      0
    );

    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    const inventoryValue = products.reduce(
      (sum, product) => sum + (Number(product.price) || 0) * (Number(product.stock) || 0),
      0
    );

    const lowStockCount = products.filter((product) => Number(product.stock) <= 5).length;

    const map = {};
    sales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        if (!item?.name) return;
        if (!map[item.name]) {
          map[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        map[item.name].quantity += Number(item.quantity) || 0;
        map[item.name].revenue += Number(item.total) || 0;
      });
    });

    const topProducts = Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const salesTrendMap = {};
    sales.forEach((sale) => {
      const date = new Date(sale.createdAt).toLocaleDateString();
      salesTrendMap[date] = (salesTrendMap[date] || 0) + (sale.totalAmount || 0);
    });

    const salesTrend = Object.entries(salesTrendMap).map(([date, revenue]) => ({ date, revenue }));

    return res.status(200).json({
      success: true,
      data: {
        totalSales,
        productsCount,
        totalRevenue,
        totalProfit,
        averageOrderValue,
        inventoryValue,
        lowStockCount,
        topProducts,
        salesTrend
      }
    });
  } catch (err) {
    console.error("Restoration analytics block failed:", err);
    return res.status(200).json({
      success: true,
      data: {
        totalSales: 0,
        productsCount: 0
      }
    });
  }
};

export default {
  getAnalytics
};