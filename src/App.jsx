import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './modules/auth/components/ProtectedRoute';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const ItineraryPage = lazy(() => import('./pages/ItineraryPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const TourRedirectPage = lazy(() => import('./pages/TourRedirectPage'));
const CleanUrlRedirectPage = lazy(() => import('./pages/CleanUrlRedirectPage'));
const AuthOnboardingPage = lazy(() => import('./modules/auth/pages/AuthOnboardingPage'));
const LoginPage = lazy(() => import('./modules/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('./modules/auth/pages/RegisterPage'));
const UserDashboardPage = lazy(() => import('./modules/user-dashboard/pages/UserDashboardPage'));
const GuideDashboardPage = lazy(() => import('./modules/guide-dashboard/pages/GuideDashboardPage'));
const CreateTourPage = lazy(() => import('./modules/guide-dashboard/pages/CreateTourPage'));
const ProfileSettingsPage = lazy(() => import('./modules/guide-dashboard/pages/ProfileSettingsPage'));
const TripVisualizerPage = lazy(() => import('./modules/guide-dashboard/pages/TripVisualizerPage'));
const AdminDashboardPage = lazy(() => import('./modules/admin-dashboard/pages/AdminDashboardPage'));
const AdminLocationsPage = lazy(() => import('./modules/admin-dashboard/pages/AdminLocationsPage'));
const AdminToursPage = lazy(() => import('./modules/admin-dashboard/pages/AdminToursPage'));
const AdminUsersPage = lazy(() => import('./modules/admin-dashboard/pages/AdminUsersPage'));
const AdminLoginPage = lazy(() => import('./modules/admin-dashboard/pages/AdminLoginPage'));
const AdminRevenuePage = lazy(() => import('./modules/admin-dashboard/pages/AdminRevenuePage'));

function RoutePageFallback() {
  return (
    <div
      className="route-page-fallback"
      aria-busy="true"
      aria-label="Loading page"
    />
  );
}

function App() {
  return (
    <Router>
      <Analytics />
      <div className="App">
        <Suspense fallback={<RoutePageFallback />}>
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
        </Suspense>
      </div>
    </Router>
  );
}

export default App;// FORCE REDEPLOY: Frontend restored to working commit 836ed64
// RESTORE: Back to working frontend
