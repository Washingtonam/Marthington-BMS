import Sale from "../sales/sale.model.js";
import Product from "../products/product.model.js";

const getReports = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const sales = await Sale.find({ business: businessId })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    const products = await Product.find({ business: businessId });

    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0));
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay())); // Start of current week
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter Logic
    const todaySales = sales.filter(s => new Date(s.createdAt) >= todayStart);
    const weeklySales = sales.filter(s => new Date(s.createdAt) >= weekStart);
    const monthlySales = sales.filter(s => new Date(s.createdAt) >= monthStart);

    // Revenue Calculations
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const monthlyRevenue = monthlySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const monthlyProfit = monthlySales.reduce((sum, s) => sum + (s.totalProfit || 0), 0);

    // Inventory Value
    const inventoryValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);

    // 🔥 STAFF PERFORMANCE (Now with specific Time breakdown)
    const staffMap = {};
    sales.forEach((sale) => {
      const name = sale.createdBy?.name || "Unknown";
      const saleDate = new Date(sale.createdAt);

      if (!staffMap[name]) {
        staffMap[name] = { name, totalSales: 0, totalRevenue: 0, todaySales: 0, weeklySales: 0 };
      }

      staffMap[name].totalSales += 1;
      staffMap[name].totalRevenue += sale.totalAmount;

      if (saleDate >= todayStart) staffMap[name].todaySales += 1;
      if (saleDate >= weekStart) staffMap[name].weeklySales += 1;
    });

    res.json({
      overview: { todayRevenue, monthlyRevenue, monthlyProfit, inventoryValue },
      staffPerformance: Object.values(staffMap).sort((a, b) => b.totalRevenue - a.totalRevenue),
      lowStockProducts: products.filter((p) => p.stock <= 5),
      recentSales: sales.slice(0, 20)
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default { getReports };