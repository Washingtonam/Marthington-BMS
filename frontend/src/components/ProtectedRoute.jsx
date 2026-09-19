import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ProtectedRoute = ({ children, requiredRole, requiredIndustry }) => {
  const { isAuthenticated, user, industryType } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === "affiliate" && requiredRole !== "affiliate") {
    return <Navigate to="/partners/dashboard" replace />;
  }

  if (user?.role === "super_admin" && requiredRole !== "super_admin") {
    return <Navigate to="/admin" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/app" replace />;
  }

  if (requiredIndustry && industryType !== requiredIndustry) {
    return <Navigate to="/app" replace />;
  }

  return children;
};

export default ProtectedRoute;
