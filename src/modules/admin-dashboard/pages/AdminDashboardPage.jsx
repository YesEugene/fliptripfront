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
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
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
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
          Admin Dashboard
        </h1>

        {/* Navigation Cards - Row 1 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginBottom: '24px'
        }}>
          {/* Flip Trips Card */}
          <Link
            to="/admin/tours"
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
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
            <div style={{ fontSize: '32px' }}>🌍</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                Flip Trips
              </h3>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>
                View and manage all trips
              </p>
              {stats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    Total trips: <strong style={{ color: '#1f2937' }}>{stats.tours?.total || stats.counts?.tours || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    Verified trips: <strong style={{ color: '#10b981' }}>{stats.tours?.approved || stats.tours?.verified || 0}</strong>
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
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
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
            <div style={{ fontSize: '32px' }}>📍</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                Locations
              </h3>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>
                Manage verified locations database
              </p>
              {stats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    Total locations: <strong style={{ color: '#1f2937' }}>{stats.counts?.locations || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    Verified locations: <strong style={{ color: '#10b981' }}>{stats.locationsByVerified?.verified || 0}</strong>
                  </div>
                </div>
              )}
            </div>
          </Link>

          {/* Users Card */}
          <Link
            to="/admin/users"
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
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
            <div style={{ fontSize: '32px' }}>👥</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                Users
              </h3>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>
                Manage users and access
              </p>
              {stats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    Total users: <strong style={{ color: '#1f2937' }}>{stats.users?.total || stats.counts?.users || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    Guides: <strong style={{ color: '#3b82f6' }}>{stats.users?.guides || stats.counts?.guides || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    Customers: <strong style={{ color: '#8b5cf6' }}>{stats.users?.customers || 0}</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    Admins: <strong style={{ color: '#ef4444' }}>{stats.users?.admins || 0}</strong>
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
            {/* Statistics Row 2: Revenue and Itineraries */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px',
              marginBottom: '24px'
            }}>
              {/* Revenue Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div style={{ fontSize: '32px' }}>💰</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                    Revenue
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>
                    Making money is awesome
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '14px', color: '#374151' }}>
                      Total revenue: <strong style={{ color: '#10b981', fontSize: '16px' }}>${(stats.revenue?.total || 0).toFixed(2)}</strong>
                    </div>
                    <div style={{ fontSize: '14px', color: '#374151' }}>
                      Total PDF sales: <strong style={{ color: '#8b5cf6' }}>${(stats.revenue?.pdf || 0).toFixed(2)}</strong> ({stats.sales?.pdf || 0} sales)
                    </div>
                    <div style={{ fontSize: '14px', color: '#374151' }}>
                      Total guided sales: <strong style={{ color: '#3b82f6' }}>${(stats.revenue?.guided || 0).toFixed(2)}</strong> ({stats.sales?.guided || 0} sales)
                    </div>
                  </div>
                </div>
              </div>

              {/* Itineraries Generated Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                  Itineraries generated
                </div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1f2937' }}>
                  {stats.counts?.itineraries || 0}
                </div>
              </div>
            </div>

            {/* Statistics Row 3: Additional Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '20px'
            }}>
              {/* Bookings Overview Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                  Bookings Overview
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Total: <strong style={{ color: '#1f2937' }}>{stats.bookings?.total || 0}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Confirmed: <strong style={{ color: '#10b981' }}>{stats.bookings?.confirmed || 0}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Pending: <strong style={{ color: '#f59e0b' }}>{stats.bookings?.pending || 0}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Completed: <strong style={{ color: '#3b82f6' }}>{stats.bookings?.completed || 0}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Cancelled: <strong style={{ color: '#ef4444' }}>{stats.bookings?.cancelled || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Tours Moderation Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                  Tours Moderation
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Approved: <strong style={{ color: '#10b981' }}>{stats.tours?.approved || 0}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Pending: <strong style={{ color: '#f59e0b' }}>{stats.tours?.pending || 0}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Draft: <strong style={{ color: '#6b7280' }}>{stats.tours?.draft || 0}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Rejected: <strong style={{ color: '#ef4444' }}>{stats.tours?.rejected || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                  Recent Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    New bookings today: <strong style={{ color: '#3b82f6' }}>{stats.activity?.newBookingsToday || 0}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    New users this week: <strong style={{ color: '#8b5cf6' }}>{stats.activity?.newUsersThisWeek || 0}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Revenue this month: <strong style={{ color: '#10b981' }}>${(stats.activity?.revenueThisMonth || stats.revenue?.thisMonth || 0).toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Communication Stats Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                  Communication
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Unread notifications: <strong style={{ color: '#ef4444' }}>{stats.activity?.unreadNotifications || 0}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Messages this week: <strong style={{ color: '#3b82f6' }}>{stats.activity?.messagesThisWeek || 0}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    Active conversations: <strong style={{ color: '#10b981' }}>{stats.activity?.activeConversations || 0}</strong>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

