/**
 * GuideDashboardPage - Личный кабинет гида (B2B)
 * Модуль: guide-dashboard
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
    return <div>Загрузка...</div>;
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
              Выйти
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>
            Панель гида
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
            + Создать тур
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* Мои туры */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              Мои туры
            </h2>
            {loading ? (
              <p style={{ color: '#6b7280' }}>Загрузка...</p>
            ) : (
              <>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                  Всего туров: {tours.length}
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
                          {tour.city} • {tour.duration.value} {tour.duration.type === 'hours' ? 'часов' : 'дней'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Статистика */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              Статистика
            </h2>
            <p style={{ color: '#6b7280' }}>Здесь будет отображаться статистика продаж</p>
          </div>

          {/* Настройки */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              Настройки
            </h2>
            <Link
              to="/guide/settings"
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Настройки профиля →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

