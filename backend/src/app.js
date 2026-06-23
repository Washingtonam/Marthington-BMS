import cors from "cors";
import express from "express";

import authRoutes from "./modules/auth/auth.routes.js";
import productRoutes from "./modules/products/product.routes.js";
import salesRoutes from "./modules/sales/sales.routes.js";
import userRoutes from "./modules/users/users.routes.js";
import businessRoutes from "./modules/businesses/business.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import subscriptionRoutes from "./modules/subscriptions/subscription.routes.js";
import serviceRoutes from "./modules/services/service.routes.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import staffRoutes from "./modules/staff/staff.routes.js";
import invoiceRoutes from "./modules/invoices/invoice.routes.js";
import customerRoutes from "./modules/customers/customer.routes.js";
import schoolRoutes from "./modules/schools/school.routes.js";
import hospitalRoutes from "./modules/hospitals/hospital.routes.js";
import billingRoutes from "./modules/billing/billing.routes.js";

// 🔥 ADD THIS
import paymentRoutes from "./modules/payments/payment.routes.js";
import expenseRoutes from "./modules/expenses/expense.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/users", userRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/staff", staffRoutes);
// 🔥 PAYMENT ROUTE (VERY IMPORTANT)
app.use("/api/payments", paymentRoutes);
// 🔥 SUBSCRIPTION ROUTE
app.use("/api/subscription", subscriptionRoutes);
// 🔥 SERVICE ROUTE
app.use("/api/services", serviceRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/hospitals", hospitalRoutes);
// 🔥 ANALYTICS ROUTE
app.use("/api/analytics", analyticsRoutes);
// 🔥 REPORTS ROUTE
app.use("/api/reports", reportsRoutes);
// 🔥 BILLING ROUTE
app.use("/api/billing", billingRoutes);
// 🔥 INVOICE ROUTE
app.use("/api/invoices", invoiceRoutes);
// 🔥 CUSTOMER ROUTE
app.use("/api/customers", customerRoutes);
// 🔥 EXPENSES ROUTE
app.use("/api/expenses", expenseRoutes);
// HEALTH CHECK
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});


// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

export default app;