import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({
  children,
  allowedRoles = [],
  routeKey,
}) => {
  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  if (!token || !user) {
    return <Navigate to="/login" />;
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/unauthorized" />;
  }

  // Secondary doctor page access restriction
  if (user.role === "Doctor" && user.opd_id && user.is_head === false) {
    const allowedKeys = ["dashboard", "doctorPanel", "treatmentDashboard"];
    if (routeKey && !allowedKeys.includes(routeKey)) {
      return <Navigate to="/unauthorized" />;
    }
  }

  return children;
};

export default ProtectedRoute;