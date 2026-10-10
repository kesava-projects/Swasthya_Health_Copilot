import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { AppLayout } from './layouts/AppLayout.js';

import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { DocumentsPage } from './pages/DocumentsPage.js';
import { DocumentReviewPage } from './pages/DocumentReviewPage.js';
import { ObservationsPage } from './pages/ObservationsPage.js';
import { TimelinePage } from './pages/TimelinePage.js';
import { HealthProfilePage } from './pages/HealthProfilePage.js';
import { ChatbotPage } from './pages/ChatbotPage.js';
import { RemindersPage } from './pages/RemindersPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Application Workspace */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/review/:id" element={<DocumentReviewPage />} />
            <Route path="/observations" element={<ObservationsPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/profile" element={<HealthProfilePage />} />
            <Route path="/chat" element={<ChatbotPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
