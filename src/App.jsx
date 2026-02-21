import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import FlipTripPreviewPage from './pages/FlipTripPreviewPage';
import PaymentPage from './pages/PaymentPage';
import SuccessPage from './pages/SuccessPage';
import ItineraryPage from './pages/ItineraryPage';
import ExampleTripPage from './pages/ExampleTripPage';

// Auth Module
import { LoginPage, RegisterPage, ProtectedRoute } from './modules/auth';

// User Dashboard Module
import { UserDashboardPage } from './modules/user-dashboard';

// Guide Dashboard Module
import { GuideDashboardPage, CreateTourPage, ProfileSettingsPage, TripVisualizerPage } from './modules/guide-dashboard';
// EditTourPage removed - editing now done in Trip Visualizer

// Admin Dashboard Module
import { AdminDashboardPage, AdminLocationsPage, AdminToursPage, AdminUsersPage, AdminLoginPage } from './modules/admin-dashboard';

import './index.css';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/preview" element={<FlipTripPreviewPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/success.html" element={<SuccessPage />} />
          <Route path="/itinerary" element={<ItineraryPage />} />
          <Route path="/example/:city" element={<ExampleTripPage />} />
          
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
          
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;// FORCE REDEPLOY: Frontend restored to working commit 836ed64
// RESTORE: Back to working frontend
