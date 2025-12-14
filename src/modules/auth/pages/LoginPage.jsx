/**
 * LoginPage - Страница входа
 * Модуль: auth
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(formData.email, formData.password);
      
      // Редирект в зависимости от роли
      if (data.user.role === 'guide') {
        navigate('/guide/dashboard');
      } else {
        navigate('/user/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Ошибка входа. Проверьте данные.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src={FlipTripLogo} 
            alt="FlipTrip" 
            style={{ height: '60px', marginBottom: '20px' }}
          />
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
            Вход в аккаунт
          </h1>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Пароль
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '20px'
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
          Нет аккаунта?{' '}
          <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
}

