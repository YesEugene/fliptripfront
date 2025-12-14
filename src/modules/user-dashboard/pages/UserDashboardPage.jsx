/**
 * UserDashboardPage - Личный кабинет пользователя (B2C)
 * Модуль: user-dashboard
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, logout } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

export default function UserDashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

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
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
          Личный кабинет
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* Мои заказы */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              Мои заказы
            </h2>
            <p style={{ color: '#6b7280' }}>Здесь будут отображаться ваши заказанные туры</p>
          </div>

          {/* Избранное */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              Избранные туры
            </h2>
            <p style={{ color: '#6b7280' }}>Сохраняйте понравившиеся туры</p>
          </div>

          {/* Поиск туров */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              Найти тур
            </h2>
            <Link
              to="/"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Перейти к поиску
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

