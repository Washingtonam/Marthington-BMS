import request from "./client.js";

const analyticsFallback = {
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
  salesTrend: [],
  topProducts: [],
  lowStockProducts: []
};

export const getAnalytics = async (range = "all") => {
  try {
    const query = range && range !== "all" ? `?range=${encodeURIComponent(range)}` : "";
    const data = await request(`/analytics${query}`);
    return data?.data ?? data ?? analyticsFallback;
  } catch (err) {
    console.error("Analytics load failed:", err.message);
    return analyticsFallback;
  }
};
