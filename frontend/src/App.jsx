import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import AdminLayout from "./components/AdminLayout.jsx"; // 🔥 NEW
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CSVLink } from "react-csv";

// 🔥 LANDING
import Landing from "./pages/Landing.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Products from "./pages/Products.jsx";
import POS from "./pages/POS.jsx";
import Sales from "./pages/Sales.jsx";
import SaleDetails from "./pages/SaleDetails.jsx";
import Staff from "./pages/Staff.jsx";
import Settings from "./pages/Settings.jsx";
import Reports from "./pages/Reports.jsx";
import Billing from "./pages/Billing.jsx";
import Invoices from "./pages/Invoices.jsx";
import VerifyPayment from "./pages/VerifyPayment.jsx";
import Customers from "./pages/Customers.jsx";
import Services from "./pages/Services.jsx";
import StaffReports from "./pages/StaffReports.jsx";
import InventoryReports from "./pages/InventoryReports.jsx";


// 🔥 PUBLIC RECEIPT
import PublicReceipt from "./pages/PublicReceipt.jsx";

// 🔥 ADMIN
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminBusinessView from "./pages/AdminBusinessView.jsx";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* LANDING */}
          <Route path="/" element={<Landing />} />

          {/* AUTH */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* PUBLIC RECEIPT */}
          <Route path="/r/:id" element={<PublicReceipt />} />

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
            <Route path="billing" element={<Billing />} />
            <Route path="verify-payment" element={<VerifyPayment />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="customers" element={<Customers />} />
            <Route path="services" element={<Services />} />
            <Route path="staff-reports" element={<StaffReports />} />
            <Route path="inventory-reports" element={<InventoryReports />} />
          </Route>

          {/* ================= ADMIN ================= */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <AdminLayout /> {/* 🔥 THIS IS THE FIX */}
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="business/:id" element={<AdminBusinessView />} />
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;