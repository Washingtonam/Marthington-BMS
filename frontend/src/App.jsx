import React, { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";

// ====================================
// CORE COMPONENTS
// ====================================
import AppShell from "./components/layout/AppShell.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import PartnerLayout from "./components/PartnerLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// ====================================
// LAZY LOADED PAGES (Fixes Initialization Race)
// ====================================
const Landing = lazy(() => import("./pages/Landing.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const AffiliateRegister = lazy(() => import("./pages/AffiliateRegister.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Products = lazy(() => import("./pages/Products.jsx"));
const POS = lazy(() => import("./pages/POS.jsx"));
const Sales = lazy(() => import("./pages/Sales.jsx"));
const SaleDetails = lazy(() => import("./pages/SaleDetails.jsx"));
const Staff = lazy(() => import("./pages/Staff.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const ReportsDetailPage = lazy(() => import("./pages/ReportsDetailPage.jsx"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const DeletedSales = lazy(() => import("./pages/DeletedSales.jsx"));
const Billing = lazy(() => import("./pages/Billing.jsx"));
const Invoices = lazy(() => import("./pages/Invoices.jsx"));
const VerifyPayment = lazy(() => import("./pages/VerifyPayment.jsx"));
const Customers = lazy(() => import("./pages/Customers.jsx"));
const Services = lazy(() => import("./pages/Services.jsx"));
const Suppliers = lazy(() => import("./pages/Suppliers.jsx"));
const SupplierDetail = lazy(() => import("./pages/SupplierDetail.jsx"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders.jsx"));
const Branches = lazy(() => import("./pages/Branches.jsx"));
const BranchInventory = lazy(() => import("./pages/BranchInventory.jsx"));
const StaffReports = lazy(() => import("./pages/StaffReports.jsx"));
const InventoryReports = lazy(() => import("./pages/InventoryReports.jsx"));
const FinancialReports = lazy(() => import("./pages/FinancialReports.jsx"));
const CustomerView = lazy(() => import("./pages/CustomerView.jsx"));
const PublicReceipt = lazy(() => import("./pages/PublicReceipt.jsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const AdminTenantDirectory = lazy(() => import("./pages/AdminTenantDirectory.jsx"));
const AdminAffiliateNetwork = lazy(() => import("./pages/AdminAffiliateNetwork.jsx"));
const AdminCommunications = lazy(() => import("./pages/AdminCommunications.jsx"));
const AdminCampaigns = lazy(() => import("./pages/AdminCampaigns.jsx"));
const AdminEmailRegistry = lazy(() => import("./pages/AdminEmailRegistry.jsx"));
const AdminBusinessView = lazy(() => import("./pages/AdminBusinessView.jsx"));
const AdminBillingSettings = lazy(() => import("./pages/AdminBillingSettings.jsx"));
const AdminOperationLogs = lazy(() => import("./pages/AdminOperationLogs.jsx"));
const Expenses = lazy(() => import("./pages/Expenses.jsx"));
const SchoolDashboard = lazy(() => import("./pages/SchoolDashboard.jsx"));
const HospitalDashboard = lazy(() => import("./pages/HospitalDashboard.jsx"));
const PartnersDashboard = lazy(() => import("./pages/PartnersDashboard.jsx"));
const PartnerProfile = lazy(() => import("./pages/PartnerProfile.jsx"));
const PartnersReferrals = lazy(() => import("./pages/PartnersReferrals.jsx"));
const PartnerDashboardHome = lazy(() => import("./pages/PartnerDashboardHome.jsx"));
const PartnerConversions = lazy(() => import("./pages/PartnerConversions.jsx"));
const PartnerWithdrawals = lazy(() => import("./pages/PartnerWithdrawals.jsx"));
const PartnerLinkHistory = lazy(() => import("./pages/PartnerLinkHistory.jsx"));
const AdminPayouts = lazy(() => import("./pages/AdminPayouts.jsx"));
const AdminPartnersLedger = lazy(() => import("./pages/AdminPartnersLedger.jsx"));
const UserGuide = lazy(() => import("./pages/UserGuide.jsx"));
const BudgetManagement = lazy(() => import("./pages/BudgetManagement.jsx"));
const BudgetAlerts = lazy(() => import("./pages/BudgetAlerts.jsx"));
const SupplierPerformance = lazy(() => import("./pages/SupplierPerformance.jsx"));
const CostTrendAnalysis = lazy(() => import("./pages/CostTrendAnalysis.jsx"));

const Students = () => (
  <div className="page-shell">
    <h1 className="text-3xl font-bold">Students List</h1>
    <p className="mt-3 text-sm text-gray-600">
      Track student enrollment, profiles, and class assignments.
    </p>
  </div>
);

const Tuition = () => (
  <div className="page-shell">
    <h1 className="text-3xl font-bold">Tuition Tracker</h1>
    <p className="mt-3 text-sm text-gray-600">
      Monitor tuition payments and billing for your school.
    </p>
  </div>
);

const Classes = () => (
  <div className="page-shell">
    <h1 className="text-3xl font-bold">Class Schedules</h1>
    <p className="mt-3 text-sm text-gray-600">
      Manage class timetables and session schedules.
    </p>
  </div>
);

const Patients = () => (
  <div className="page-shell">
    <h1 className="text-3xl font-bold">Patient Records</h1>
    <p className="mt-3 text-sm text-gray-600">
      Access patient history, charts, and care notes.
    </p>
  </div>
);

const Appointments = () => (
  <div className="page-shell">
    <h1 className="text-3xl font-bold">Appointment Book</h1>
    <p className="mt-3 text-sm text-gray-600">
      Schedule and track appointments for your clinic.
    </p>
  </div>
);

const MedicalInventory = () => (
  <div className="page-shell">
    <h1 className="text-3xl font-bold">Medical Inventory</h1>
    <p className="mt-3 text-sm text-gray-600">
      Manage medical stock and supplies for your hospital.
    </p>
  </div>
);

const AdminBusinesses = AdminTenantDirectory;
const AdminRevenue = () => (
  <section className="page-stack">
    <div className="page-heading">
      <div>
        <span className="text-sm uppercase tracking-[0.3em] text-slate-500">Super Admin</span>
        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Revenue</h1>
      </div>
      <p className="max-w-2xl text-sm text-slate-500">
        Review global revenue and high-level income trends.
      </p>
    </div>
  </section>
);

const AdminSubscriptions = () => (
  <section className="page-stack">
    <div className="page-heading">
      <div>
        <span className="text-sm uppercase tracking-[0.3em] text-slate-500">Super Admin</span>
        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Subscriptions</h1>
      </div>
      <p className="max-w-2xl text-sm text-slate-500">
        Manage tenant subscriptions, billing cycles, and plan states.
      </p>
    </div>
  </section>
);

const AdminUsers = () => (
  <section className="page-stack">
    <div className="page-heading">
      <div>
        <span className="text-sm uppercase tracking-[0.3em] text-slate-500">Super Admin</span>
        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Users</h1>
      </div>
      <p className="max-w-2xl text-sm text-slate-500">
        Manage platform users, roles, and access across all tenants.
      </p>
    </div>
  </section>
);

const AdminAnalytics = Reports;
const AdminSettings = Settings;

// Simple loading fallback
const PageLoader = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-2">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Marthington</p>
    </div>
  </div>
);

const App = () => {
  return (
    <HashRouter>
      <AuthProvider>
        {/* Suspense handles the waiting period while a page is being downloaded */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* LANDING */}
            <Route path="/" element={<Landing />} />

            {/* AUTH */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/affiliate-register" element={<AffiliateRegister />} />

            {/* PUBLIC RECEIPT */}
            <Route path="/r/:id" element={<PublicReceipt />} />

            {/* PARTNER DASHBOARD (STANDALONE) */}
            <Route
              path="/partners"
              element={
                <ProtectedRoute requiredRole="affiliate">
                  <PartnerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/partners/dashboard" replace />} />
              <Route path="dashboard" element={<PartnerDashboardHome />} />
              <Route path="conversions" element={<PartnerConversions />} />
              <Route path="withdrawals" element={<PartnerWithdrawals />} />
              <Route path="link-history" element={<PartnerLinkHistory />} />
              <Route path="profile" element={<PartnerProfile />} />
              <Route path="referrals" element={<Navigate to="/partners/conversions" replace />} />
            </Route>

            {/* ADMIN PAYOUTS */}
            <Route
              path="/admin/payouts"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <AdminPayouts />
                </ProtectedRoute>
              }
            />

            {/* ADMIN PARTNERS LEDGER */}
            <Route
              path="/admin/affiliates"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <AdminPartnersLedger />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/partners-ledger"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <AdminPartnersLedger />
                </ProtectedRoute>
              }
            />

            {/* CUSTOMER VIEW (STANDALONE) */}
            <Route 
              path="/app/customer-view" 
              element={
                <ProtectedRoute>
                  <CustomerView />
                </ProtectedRoute>
              } 
            />

            {/* ================= NORMAL APP ================= */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<ProtectedRoute requiredPermission="canViewDashboard"><Dashboard /></ProtectedRoute>} />
              <Route path="products" element={<ProtectedRoute requiredPermission="canViewProducts"><Products /></ProtectedRoute>} />
              <Route path="branches" element={<ProtectedRoute requiredPermission="canViewBranches"><Branches /></ProtectedRoute>} />
              <Route path="branches/inventory" element={<ProtectedRoute requiredPermission="canViewBranchInventory"><BranchInventory /></ProtectedRoute>} />
              <Route path="pos" element={<ProtectedRoute requiredPermission="canAccessPOS"><POS /></ProtectedRoute>} />
              <Route path="sales" element={<ProtectedRoute requiredPermission="canViewSales"><Sales /></ProtectedRoute>} />
              <Route path="sales/:id" element={<ProtectedRoute requiredPermission="canViewSales"><SaleDetails /></ProtectedRoute>} />
              <Route path="staff" element={<ProtectedRoute requiredPermission="canManageStaff"><Staff /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute requiredPermission="canManageSettings"><Settings /></ProtectedRoute>} />
              <Route path="analytics" element={<ProtectedRoute requiredPermission="canViewReports"><Analytics /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute requiredPermission="canViewReports"><Reports /></ProtectedRoute>} />
              <Route path="reports/detail" element={<ProtectedRoute requiredPermission="canViewReports"><ReportsDetailPage /></ProtectedRoute>} />
              <Route path="inventory" element={<ProtectedRoute requiredPermission="canViewBranchInventory"><BranchInventory /></ProtectedRoute>} />
              <Route path="deleted-sales" element={<DeletedSales />} />
              <Route path="staff-reports" element={<ProtectedRoute requiredPermission="canViewStaffReports"><StaffReports /></ProtectedRoute>} />
              <Route path="inventory-reports" element={<ProtectedRoute requiredPermission="canViewReports"><InventoryReports /></ProtectedRoute>} />
              <Route path="financial-reports" element={<ProtectedRoute requiredPermission="canViewFinancialReports"><FinancialReports /></ProtectedRoute>} />
              <Route path="billing" element={<ProtectedRoute requiredPermission="canManageBilling"><Billing /></ProtectedRoute>} />
              <Route path="user-guide" element={<UserGuide />} />
              <Route path="verify-payment" element={<VerifyPayment />} />
              <Route path="payments" element={<ProtectedRoute requiredPermission="canViewPayments"><VerifyPayment /></ProtectedRoute>} />
              <Route path="invoices" element={<ProtectedRoute requiredPermission="canViewInvoices"><Invoices /></ProtectedRoute>} />
              <Route path="customers" element={<ProtectedRoute requiredPermission="canViewCustomers"><Customers /></ProtectedRoute>} />
              <Route path="services" element={<ProtectedRoute requiredPermission="canViewProducts"><Services /></ProtectedRoute>} />
              <Route path="suppliers" element={<ProtectedRoute requiredPermission="canViewPurchaseOrders"><Suppliers /></ProtectedRoute>} />
              <Route path="suppliers/:id" element={<ProtectedRoute requiredPermission="canViewPurchaseOrders"><SupplierDetail /></ProtectedRoute>} />
              <Route path="supplier-performance" element={<ProtectedRoute requiredPermission="canViewPurchaseOrders"><SupplierPerformance /></ProtectedRoute>} />
              <Route path="purchase-orders" element={<ProtectedRoute requiredPermission="canViewPurchaseOrders"><PurchaseOrders /></ProtectedRoute>} />
              <Route path="expenses" element={<ProtectedRoute requiredPermission="canViewExpenses"><Expenses /></ProtectedRoute>} />
              <Route path="budget-management" element={<ProtectedRoute requiredPermission="canViewExpenses"><BudgetManagement /></ProtectedRoute>} />
              <Route path="budget-alerts" element={<ProtectedRoute requiredPermission="canViewExpenses"><BudgetAlerts /></ProtectedRoute>} />
              <Route path="cost-trends" element={<ProtectedRoute requiredPermission="canViewExpenses"><CostTrendAnalysis /></ProtectedRoute>} />
              <Route
                path="school-dashboard"
                element={
                  <ProtectedRoute requiredIndustry="school">
                    <SchoolDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="hospital-dashboard"
                element={
                  <ProtectedRoute requiredIndustry="hospital">
                    <HospitalDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="students" element={<Students />} />
              <Route path="tuition" element={<Tuition />} />
              <Route path="classes" element={<Classes />} />
              <Route path="patients" element={<Patients />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="medical-inventory" element={<MedicalInventory />} />
            </Route>

            {/* ================= ADMIN ================= */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="tenants" element={<AdminTenantDirectory />} />
              <Route path="businesses" element={<AdminBusinesses />} />
              <Route path="affiliate-network" element={<AdminAffiliateNetwork />} />
              <Route path="communications" element={<AdminCommunications />} />
              <Route path="campaigns" element={<AdminCampaigns />} />
              <Route path="email-registry" element={<AdminEmailRegistry />} />
              <Route path="revenue" element={<AdminRevenue />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="billing-settings" element={<AdminBillingSettings />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="operation-logs" element={<AdminOperationLogs />} />
              <Route path="business/:id" element={<AdminBusinessView />} />
            </Route>

            {/* FALLBACK */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;