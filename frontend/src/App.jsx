import React, { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";

// ====================================
// CORE COMPONENTS
// ====================================
import AppLayout from "./components/AppLayout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// ====================================
// LAZY LOADED PAGES (Fixes Initialization Race)
// ====================================
const Landing = lazy(() => import("./pages/Landing.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Products = lazy(() => import("./pages/Products.jsx"));
const POS = lazy(() => import("./pages/POS.jsx"));
const Sales = lazy(() => import("./pages/Sales.jsx"));
const SaleDetails = lazy(() => import("./pages/SaleDetails.jsx"));
const Staff = lazy(() => import("./pages/Staff.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const Billing = lazy(() => import("./pages/Billing.jsx"));
const Invoices = lazy(() => import("./pages/Invoices.jsx"));
const VerifyPayment = lazy(() => import("./pages/VerifyPayment.jsx"));
const Customers = lazy(() => import("./pages/Customers.jsx"));
const Services = lazy(() => import("./pages/Services.jsx"));
const StaffReports = lazy(() => import("./pages/StaffReports.jsx"));
const InventoryReports = lazy(() => import("./pages/InventoryReports.jsx"));
const CustomerView = lazy(() => import("./pages/CustomerView.jsx"));
const PublicReceipt = lazy(() => import("./pages/PublicReceipt.jsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const AdminBusinessView = lazy(() => import("./pages/AdminBusinessView.jsx"));
const Expenses = lazy(() => import("./pages/Expenses.jsx"));
const SchoolDashboard = lazy(() => import("./pages/SchoolDashboard.jsx"));
const HospitalDashboard = lazy(() => import("./pages/HospitalDashboard.jsx"));

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
    <BrowserRouter>
      <AuthProvider>
        {/* Suspense handles the waiting period while a page is being downloaded */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* LANDING */}
            <Route path="/" element={<Landing />} />

            {/* AUTH */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* PUBLIC RECEIPT */}
            <Route path="/r/:id" element={<PublicReceipt />} />

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
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="pos" element={<POS />} />
              <Route path="sales" element={<Sales />} />
              <Route path="sales/:id" element={<SaleDetails />} />
              <Route path="staff" element={<Staff />} />
              <Route path="settings" element={<Settings />} />
              <Route path="reports" element={<Reports />} />
              <Route path="staff-reports" element={<StaffReports />} />
              <Route path="inventory-reports" element={<InventoryReports />} />
              <Route path="billing" element={<Billing />} />
              <Route path="verify-payment" element={<VerifyPayment />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="customers" element={<Customers />} />
              <Route path="services" element={<Services />} />
              <Route path="expenses" element={<Expenses />} />
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
              <Route path="billing-config" element={<Billing />} />
              <Route path="business/:id" element={<AdminBusinessView />} />
            </Route>

            {/* FALLBACK */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;