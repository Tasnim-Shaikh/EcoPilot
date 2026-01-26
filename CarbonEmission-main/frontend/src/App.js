import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from './components/ui/sonner';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import UserDashboard from './pages/UserDashboard';
import EcoChatPage from './pages/EcoChatPage';
import PromptAnalyticsPage from './pages/PromptAnalyticsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import BadgesPage from './pages/BadgesPage';
import AIRecommenderPage from './pages/AIRecommenderPage';
import AdminDashboard from './pages/AdminDashboard';
import ManageAccessPage from './pages/ManageAccessPage';
import DepartmentAnalyticsPage from './pages/DepartmentAnalyticsPage';
import AdminESGReportPage from "./pages/AdminESGReportPage";
import ManageUsers from "./pages/ManageUsers";

import './App.css';

const ProtectedRoute = ({ children, adminOnly }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <div className="App">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                {/* User Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <UserDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ecochat"
                  element={
                    <ProtectedRoute>
                      <EcoChatPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <PromptAnalyticsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leaderboard"
                  element={
                    <ProtectedRoute>
                      <LeaderboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/badges"
                  element={
                    <ProtectedRoute>
                      <BadgesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recommender"
                  element={
                    <ProtectedRoute>
                      <AIRecommenderPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/manage-access"
                  element={
                    <ProtectedRoute adminOnly>
                      <ManageAccessPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics"
                  element={
                    <ProtectedRoute adminOnly>
                      <DepartmentAnalyticsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/esg-report"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminESGReportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/manage-users"
                  element={
                    <ProtectedRoute adminOnly>
                      <ManageUsers />
                    </ProtectedRoute>
                  }
                />
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <Toaster position="top-right" />
            </div>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
