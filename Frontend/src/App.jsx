import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import TicketsPage from "./pages/TicketsPage.jsx";
import TicketDetailPage from "./pages/TicketDetailPage.jsx";
import QueuePage from "./pages/QueuePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AssetsPage from "./pages/AssetsPage.jsx";
import KnowledgePage from "./pages/KnowledgePage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
        <Route path="/queues" element={<ProtectedRoute><QueuePage /></ProtectedRoute>} />
        <Route path="/assets" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
        <Route path="/knowledge" element={<ProtectedRoute><KnowledgePage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
