import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import { AuthProvider, useAuth } from "./context/AuthContext";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import HODDashboard from "./pages/HODDashboard";
import Welcome from "./pages/Welcome";
import CreateBooking from "./pages/CreateBooking"
import AdminTimeTableInput from "./pages/AdminTimeTableInput";
import ViewTimetable from "./pages/ViewTimetable";
import LabAssistantDashboard from "./pages/LabAssistantDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ChangePassword from "./pages/ChangePassword";
import ResetPassword from "./pages/ResetPassword";
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" />;
}

function App() {
  return (
    <AuthProvider>
      <Routes>

        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/lab" element={<ProtectedRoute><LabAssistantDashboard /></ProtectedRoute>} />
        {/* <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} /> */}
        <Route path="/teacher-dashboard/*" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher-dashboard/create" element={<ProtectedRoute><CreateBooking /></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin-dashboard/input-timetable" element={<ProtectedRoute><AdminTimeTableInput /></ProtectedRoute>} />
        <Route path="/hod-dashboard" element={<ProtectedRoute><HODDashboard /></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
        <Route path="/view-timetable" element={<ProtectedRoute><ViewTimetable /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;