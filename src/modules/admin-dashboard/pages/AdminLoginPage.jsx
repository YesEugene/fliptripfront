/**
 * Admin Login Page
 * Private admin login page with hardcoded credentials
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

// Hardcoded admin credentials
const ADMIN_EMAIL = 'yes.stroynov@gmail.com';
const ADMIN_PASSWORD = 'fliptrip13';

export default function AdminLoginPage() {
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

    // Check hardcoded credentials
    if (formData.email !== ADMIN_EMAIL || formData.password !== ADMIN_PASSWORD) {
      setError('Invalid credentials');
      setLoading(false);
      return;
    }

    // Create admin user object and token
    const adminUser = {
      id: 'admin-1',
      name: 'Admin',
      email: ADMIN_EMAIL,
      role: 'admin'
    };

    // Generate simple token
    const token = Buffer.from(JSON.stringify({
      userId: adminUser.id,
      role: 'admin',
      timestamp: Date.now()
    })).toString('base64');

    // Save to localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(adminUser));

    // Redirect to admin dashboard
    navigate('/admin/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1f2937',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src={FlipTripLogo} 
            alt="FlipTrip" 
            style={{ height: '60px', marginBottom: '20px' }}
          />
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
            Admin Login
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
            Administrator Access Only
          </p>
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
              Password
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
              backgroundColor: loading ? '#9ca3af' : '#1f2937',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '20px'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

