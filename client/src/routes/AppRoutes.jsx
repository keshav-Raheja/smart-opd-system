import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import Patients from "../pages/Patients";
import PatientProfile from "../pages/PatientProfile";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Appointments from "../pages/Appointments";
import Unauthorized from "../pages/Unauthorized";
import DoctorPanel from "../pages/DoctorPanel";
import TreatmentDashboard from "../pages/TreatmentDashboard";
import AIReportSupport from "../pages/AIReportSupport";
import Billing from "../pages/Billing";
import FeeConfig from "../pages/FeeConfig";
import MyFeeConfig from "../pages/MyFeeConfig";
import OpdManagement from "../pages/OpdManagement";
import StaffManagement from "../pages/StaffManagement";
import Landing from "../pages/Landing";
import MainLayout from "../layouts/MainLayout";

import { ROLES } from "../config/roles";
import ProtectedRoute from "./ProtectedRoute";

// Conditionally render Dashboard for authenticated users, otherwise render public Landing page
const HomeRoute = () => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (token && user) {
    return (
      <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_STAFF]}>
        <MainLayout>
          <Dashboard />
        </MainLayout>
      </ProtectedRoute>
    );
  }
  return <Landing />;
};

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Root Route: Serves Dashboard to logged in users, Landing to public */}
        <Route path="/" element={<HomeRoute />} />

        {/* /dashboard alias */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_STAFF]}>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Patients */}
        <Route
          path="/patients"
          element={
            <ProtectedRoute routeKey="patients" allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]}>
              <MainLayout>
                <Patients />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Patient Profile */}
        <Route
          path="/patients/:id"
          element={
            <ProtectedRoute>
              <PatientProfile />
            </ProtectedRoute>
          }
        />

        {/* Appointments */}
        <Route
          path="/appointments"
          element={
            <ProtectedRoute routeKey="appointments" allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]}>
              <MainLayout>
                <Appointments />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Doctor Panel */}
        <Route
          path="/doctor-panel"
          element={
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
              <MainLayout>
                <DoctorPanel />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Treatment Tracker */}
        <Route
          path="/treatments"
          element={
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
              <MainLayout>
                <TreatmentDashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Staff Management */}
        <Route
          path="/staff-management"
          element={
            <ProtectedRoute routeKey="staffManagement" allowedRoles={[ROLES.DOCTOR, ROLES.ADMIN]}>
              <MainLayout>
                <StaffManagement />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* AI Report Support — accessible to all authenticated users */}
        <Route
          path="/ai-support"
          element={
            <ProtectedRoute routeKey="aiSupport" allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_STAFF]}>
              <MainLayout>
                <AIReportSupport />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Billing — Receptionist + Admin + Doctor */}
        <Route
          path="/billing"
          element={
            <ProtectedRoute routeKey="billing" allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]}>
              <MainLayout>
                <Billing />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Fee Config — Admin only */}
        <Route
          path="/fee-config"
          element={
            <ProtectedRoute routeKey="feeConfig" allowedRoles={[ROLES.ADMIN]}>
              <MainLayout>
                <FeeConfig />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* My Fee Config — Doctor only */}
        <Route
          path="/my-fees"
          element={
            <ProtectedRoute routeKey="myFeeConfig" allowedRoles={[ROLES.DOCTOR]}>
              <MainLayout>
                <MyFeeConfig />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* OPD Management — Admin only */}
        <Route
          path="/opd-management"
          element={
            <ProtectedRoute routeKey="opdManagement" allowedRoles={[ROLES.ADMIN]}>
              <MainLayout>
                <OpdManagement />
              </MainLayout>
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;