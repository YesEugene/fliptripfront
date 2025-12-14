/**
 * GuideDashboardPage - Guide Dashboard (B2B)
 * Module: guide-dashboard
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, logout } from '../../auth/services/authService';
import { getGuideTours } from '../../tours-database';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

export default function GuideDashboardPage() {
  const [user, setUser] = useState(null);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    loadGuideTours();
  }, []);

  const loadGuideTours = async () => {
    try {
      setLoading(true);
      const data = await getGuideTours();
      if (data.success) {
        setTours(data.tours || []);
      }
    } catch (error) {
      console.error('Error loading guide tours:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  if (!user) {
    return <div>Loading...</div>;
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
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link to="/">
            <img src={FlipTripLogo} alt="FlipTrip" style={{ height: '40px' }} />
          </Link>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ color: '#6b7280' }}>{user.name}</span>
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>
            Guide Dashboard
          </h1>
          <Link
            to="/guide/tours/create"
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            + Create Tour
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* My Tours */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              My Tours
            </h2>
            {loading ? (
              <p style={{ color: '#6b7280' }}>Loading...</p>
            ) : (
              <>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                  Total Tours: {tours.length}
                </p>
                {tours.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    {tours.slice(0, 3).map((tour) => (
                      <div key={tour.id} style={{
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                          {tour.title}
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>
                          {tour.city} • {tour.duration.value} {tour.duration.type === 'hours' ? 'hours' : 'days'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Statistics */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              Statistics
            </h2>
            <p style={{ color: '#6b7280' }}>Sales statistics will be displayed here</p>
          </div>

          {/* Settings */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              Settings
            </h2>
            <Link
              to="/guide/settings"
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Profile Settings →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
