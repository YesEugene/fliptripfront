import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PaymentPage from './pages/PaymentPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import ItineraryPage from './pages/ItineraryPage';
import ExplorePage from './pages/ExplorePage';
import NotFoundPage from './pages/NotFoundPage';
import AboutPage from './pages/AboutPage';
import TourRedirectPage from './pages/TourRedirectPage';
import CleanUrlRedirectPage from './pages/CleanUrlRedirectPage';
import AuthOnboardingPage from './modules/auth/pages/AuthOnboardingPage';

// Auth Module
import { LoginPage, RegisterPage, ProtectedRoute } from './modules/auth';

// User Dashboard Module
import { UserDashboardPage } from './modules/user-dashboard';

// Guide Dashboard Module
import { GuideDashboardPage, CreateTourPage, ProfileSettingsPage, TripVisualizerPage } from './modules/guide-dashboard';
// EditTourPage removed - editing now done in Trip Visualizer

// Admin Dashboard Module
import { AdminDashboardPage, AdminLocationsPage, AdminToursPage, AdminUsersPage, AdminLoginPage, AdminRevenuePage } from './modules/admin-dashboard';

import { Analytics } from '@vercel/analytics/react';
import './index.css';

function App() {
  return (
    <Router>
      <Analytics />
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<ExplorePage />} />
          <Route path="/explore" element={<Navigate to="/" replace />} />
          {/* Legacy home kept for rollback/reference only. No links point here. */}
          <Route path="/_internal/legacy-home-2026" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/itinerary" element={<ItineraryPage />} />
          <Route path="/tour/:slug" element={<TourRedirectPage />} />
          <Route path="/tours/:city/:slug" element={<CleanUrlRedirectPage />} />
          <Route path="/join" element={<AuthOnboardingPage />} />
          <Route path="/become-local" element={<AuthOnboardingPage />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected User Routes */}
          <Route 
            path="/user/dashboard" 
            element={
              <ProtectedRoute requiredRole="user">
                <UserDashboardPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected Guide Routes */}
          <Route 
            path="/guide/dashboard" 
            element={
              <ProtectedRoute requiredRole="guide">
                <GuideDashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/guide/tours/create" 
            element={
              <ProtectedRoute requiredRole="guide">
                <CreateTourPage />
              </ProtectedRoute>
            } 
          />
          {/* EditTourPage route removed - editing now done in Trip Visualizer */}
          {/* <Route 
            path="/guide/tours/edit/:id" 
            element={
              <ProtectedRoute requiredRole="guide">
                <EditTourPage />
              </ProtectedRoute>
            } 
          /> */}
          <Route 
            path="/guide/settings" 
            element={
              <ProtectedRoute requiredRole="guide">
                <ProfileSettingsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/guide/tours/visualizer/:tourId?" 
            element={
              <ProtectedRoute requiredRole={['guide', 'admin']}>
                <TripVisualizerPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLoginPage />} />
          
          {/* Protected Admin Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/locations" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLocationsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/tours" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminToursPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminUsersPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/revenue" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminRevenuePage />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;// FORCE REDEPLOY: Frontend restored to working commit 836ed64
// RESTORE: Back to working frontend
