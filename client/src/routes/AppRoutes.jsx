import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import Patients from "../pages/Patients";
import PatientProfile from "../pages/PatientProfile";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Appointments from "../pages/Appointments";
import Unauthorized from "../pages/Unauthorized";
import DoctorPanel from "../pages/DoctorPanel";
import AIReportSupport from "../pages/AIReportSupport";
import Billing from "../pages/Billing";
import FeeConfig from "../pages/FeeConfig";
import MyFeeConfig from "../pages/MyFeeConfig";
import OpdManagement from "../pages/OpdManagement";
import StaffManagement from "../pages/StaffManagement";
import MainLayout from "../layouts/MainLayout";

import { ROLES } from "../config/roles";
import ProtectedRoute from "./ProtectedRoute";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Dashboard — Admin & Doctor see full analytics; all roles can access */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_STAFF]}>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

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
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]}>
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
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]}>
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

        {/* Staff Management */}
        <Route
          path="/staff-management"
          element={
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.ADMIN]}>
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
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_STAFF]}>
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
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]}>
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
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
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
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
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
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
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