/**
 * Admin Dashboard Page
 * Main dashboard with statistics and overview
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/adminService';
import { getCurrentUser, logout } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

export default function AdminDashboardPage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardStats();
      setStats(data.stats);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  if (!user) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .admin-dashboard-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .admin-dashboard-grid-row-3 {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
        }
        @media (max-width: 480px) {
          .admin-dashboard-grid-row-3 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', width: '100%', margin: 0, padding: 0 }}>
        {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '10px',
        width: '100%'
      }}>
        <div style={{
          width: '100%',
          padding: '0 20px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link to="/">
            <img src={FlipTripLogo} alt="FlipTrip" style={{ height: '40px' }} />
          </Link>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ color: '#6b7280' }}>Admin: {user.name || user.email}</span>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ width: '100%', backgroundColor: '#f9fafb', minHeight: 'calc(100vh - 100px)' }}>
        <div style={{ width: '100%', padding: '20px', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px' }}>
            Admin Dashboard
          </h1>

        {/* Navigation Cards - Row 1: Flip Trips and Locations */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          marginBottom: '10px'
        }}
        className="admin-dashboard-grid"
        >
          {/* Flip Trips Card */}
          <Link
            to="/admin/tours"
            style={{
              backgroundColor: 'white',
              padding: '28px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              border: '2px solid transparent',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '20px', lineHeight: '1' }}>🌍</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '10px', color: '#1f2937', lineHeight: '1.3' }}>
                Flip Trips
              </h3>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5' }}>
                View and manage all trips
              </p>
              {stats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                    Total trips: <strong style={{ color: '#1f2937', fontWeight: '600' }}>{stats.tours?.total || stats.counts?.tours || 0}</strong>
                  </div>
                  <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                    Approved: <strong style={{ color: '#10b981', fontWeight: '600' }}>{stats.tours?.approved || 0}</strong>
                  </div>
                  <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                    Pending: <strong style={{ color: '#f59e0b', fontWeight: '600' }}>{stats.tours?.pending || 0}</strong>
                  </div>
                  <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                    Draft: <strong style={{ color: '#6b7280', fontWeight: '600' }}>{stats.tours?.draft || 0}</strong>
                  </div>
                  <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                    Rejected: <strong style={{ color: '#ef4444', fontWeight: '600' }}>{stats.tours?.rejected || 0}</strong>
                  </div>
                </div>
              )}
            </div>
          </Link>

          {/* Locations Card */}
          <Link
            to="/admin/locations"
            style={{
              backgroundColor: 'white',
              padding: '28px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              border: '2px solid transparent',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ fontSize: '20px', lineHeight: '1' }}>📍</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '10px', color: '#1f2937', lineHeight: '1.3' }}>
                Locations
              </h3>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5' }}>
                Manage verified locations database
              </p>
              {stats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                    Total locations: <strong style={{ color: '#1f2937', fontWeight: '600' }}>{stats.counts?.locations || 0}</strong>
                  </div>
                  <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                    Verified locations: <strong style={{ color: '#10b981', fontWeight: '600' }}>{stats.locationsByVerified?.verified || 0}</strong>
                  </div>
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* Statistics */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#6b7280' }}>Loading statistics...</p>
          </div>
        ) : error ? (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            color: '#991b1b',
            marginBottom: '24px'
          }}>
            <p>Error loading statistics: {error}</p>
            <button
              onClick={loadStats}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        ) : stats && stats.counts ? (
          <>
            {/* Statistics Row 2: Users and Revenue */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              marginBottom: '10px'
            }}
            className="admin-dashboard-grid"
            >
              {/* Users Card */}
              <Link
                to="/admin/users"
                style={{
                  backgroundColor: 'white',
                  padding: '28px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  border: '2px solid transparent',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{ fontSize: '20px', lineHeight: '1' }}>👥</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '10px', color: '#1f2937', lineHeight: '1.3' }}>
                    Users
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5' }}>
                    Manage users and access
                  </p>
                  {stats && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                        Total users: <strong style={{ color: '#1f2937', fontWeight: '600' }}>{stats.users?.total || stats.counts?.users || 0}</strong>
                      </div>
                      <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                        Guides: <strong style={{ color: '#3b82f6', fontWeight: '600' }}>{stats.users?.guides || stats.counts?.guides || 0}</strong>
                      </div>
                      <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                        Customers: <strong style={{ color: '#8b5cf6', fontWeight: '600' }}>{stats.users?.customers || 0}</strong>
                      </div>
                      <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                        Admins: <strong style={{ color: '#ef4444', fontWeight: '600' }}>{stats.users?.admins || 0}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </Link>

              {/* Revenue Card */}
              <div style={{
            backgroundColor: 'white',
            padding: '28px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '20px'
          }}>
            <div style={{ fontSize: '20px', lineHeight: '1' }}>💰</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '10px', color: '#1f2937', lineHeight: '1.3' }}>
                Revenue
              </h3>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5' }}>
                Making money is awesome
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                  Total revenue: <strong style={{ color: '#10b981', fontSize: '18px', fontWeight: '600' }}>${(stats.revenue?.total || 0).toFixed(2)}</strong>
                </div>
                <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                  Total PDF sales: <strong style={{ color: '#8b5cf6', fontWeight: '600' }}>${(stats.revenue?.pdf || 0).toFixed(2)}</strong> ({stats.sales?.pdf || 0} sales)
                </div>
                <div style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5' }}>
                  Total guided sales: <strong style={{ color: '#3b82f6', fontWeight: '600' }}>${(stats.revenue?.guided || 0).toFixed(2)}</strong> ({stats.sales?.guided || 0} sales)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Row 3: Additional Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px'
            }}
            className="admin-dashboard-grid admin-dashboard-grid-row-3"
            >
              {/* Funnel Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '14px', color: '#1f2937', lineHeight: '1.3' }}>
                  Funnel
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Visitors: <strong style={{ color: '#1f2937', fontWeight: '600' }}>{stats.funnel?.visitors || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Tour preview: <strong style={{ color: '#3b82f6', fontWeight: '600' }}>{stats.funnel?.tourPreview || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Itineraries generated: <strong style={{ color: '#8b5cf6', fontWeight: '600' }}>{stats.funnel?.itinerariesGenerated || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Full tour opened: <strong style={{ color: '#10b981', fontWeight: '600' }}>{stats.funnel?.fullTourOpened || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Bookings Overview Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '14px', color: '#1f2937', lineHeight: '1.3' }}>
                  Bookings Overview
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Total: <strong style={{ color: '#1f2937', fontWeight: '600' }}>{stats.bookings?.total || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Confirmed: <strong style={{ color: '#10b981', fontWeight: '600' }}>{stats.bookings?.confirmed || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Pending: <strong style={{ color: '#f59e0b', fontWeight: '600' }}>{stats.bookings?.pending || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Completed: <strong style={{ color: '#3b82f6', fontWeight: '600' }}>{stats.bookings?.completed || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Cancelled: <strong style={{ color: '#ef4444', fontWeight: '600' }}>{stats.bookings?.cancelled || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '14px', color: '#1f2937', lineHeight: '1.3' }}>
                  Recent Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    New bookings today: <strong style={{ color: '#3b82f6', fontWeight: '600' }}>{stats.activity?.newBookingsToday || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    New users this week: <strong style={{ color: '#8b5cf6', fontWeight: '600' }}>{stats.activity?.newUsersThisWeek || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Revenue this month: <strong style={{ color: '#10b981', fontWeight: '600' }}>${(stats.activity?.revenueThisMonth || stats.revenue?.thisMonth || 0).toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Communication Stats Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '14px', color: '#1f2937', lineHeight: '1.3' }}>
                  Communication
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Unread notifications: <strong style={{ color: '#ef4444', fontWeight: '600' }}>{stats.activity?.unreadNotifications || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Messages this week: <strong style={{ color: '#3b82f6', fontWeight: '600' }}>{stats.activity?.messagesThisWeek || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    Active conversations: <strong style={{ color: '#10b981', fontWeight: '600' }}>{stats.activity?.activeConversations || 0}</strong>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
        </div>
      </div>
      </div>
    </>
  );
}

