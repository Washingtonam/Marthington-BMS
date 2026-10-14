import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ProtectedRoute = ({ children, requiredRole, requiredIndustry, requiredPermission }) => {
  const { isAuthenticated, user, industryType, impersonatedBusiness } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === "affiliate" && user?.affiliateCode && requiredRole !== "affiliate") {
    return <Navigate to="/partners/dashboard" replace />;
  }

  if (user?.role === "super_admin" && !impersonatedBusiness && !user?.business && requiredRole !== "super_admin") {
    return <Navigate to="/admin" replace />;
  }

  const hasRequiredRole = requiredRole === "affiliate"
    ? Boolean(user?.affiliateCode)
    : user?.role === requiredRole;
  if (requiredRole && !hasRequiredRole) {
    return <Navigate to="/app" replace />;
  }

  if (requiredIndustry && industryType !== requiredIndustry) {
    return <Navigate to="/app" replace />;
  }

  const hasPermission = user?.role === "owner"
    || user?.role === "super_admin"
    || user?.permissions?.[requiredPermission] === true;

  if (requiredPermission && !hasPermission) {
    const fallbackPath = user?.permissions?.canAccessPOS === true
      ? "/app/pos"
      : "/app/user-guide";
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
