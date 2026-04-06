import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import { getCurrentUser, logout } from '../modules/auth/services/authService';
import './ExplorePage.css';

function getDashboardPath(role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'guide') return '/guide/dashboard';
  return '/user/dashboard';
}

export default function NotFoundPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    document.title = 'Page Not Found | FlipTrip';
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  return (
    <main className="explore-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="explore-topbar">
        <div className="explore-topbar-inner">
          <Link to="/" className="explore-logo-link" aria-label="FlipTrip home">
            <img src={FlipTripLogo} alt="FlipTrip" className="explore-logo" />
          </Link>
          <div className="explore-auth-actions">
            {user ? (
              <>
                <button
                  type="button"
                  className="login-btn"
                  onClick={() => navigate(getDashboardPath(user.role))}
                >
                  {user.role === 'admin' ? 'Admin' : (user.name || 'Dashboard')}
                </button>
                <button
                  type="button"
                  className="become-local-btn"
                  onClick={() => { logout(); setUser(null); window.location.reload(); }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button type="button" className="become-local-btn" onClick={() => navigate('/become-local')}>
                  Become a Local
                </button>
                <button type="button" className="login-btn" onClick={() => navigate('/join?tab=traveler&mode=login')}>
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        maxWidth: 600,
        margin: '0 auto',
      }}>
        <span style={{ fontSize: 'clamp(72px, 14vw, 140px)', fontWeight: 800, lineHeight: 1, color: '#1c1c1b', fontFamily: "'Urbanist', Inter, system-ui, sans-serif" }}>
          404
        </span>
        <h1 style={{
          fontFamily: "'Urbanist', Inter, system-ui, sans-serif",
          fontSize: 'clamp(22px, 4vw, 34px)',
          fontWeight: 600,
          margin: '16px 0 0',
          color: '#1c1c1b',
        }}>
          This page wandered off the map
        </h1>
        <p style={{
          fontSize: 'clamp(14px, 2vw, 16px)',
          color: '#666',
          margin: '12px 0 32px',
          lineHeight: 1.5,
        }}>
          The page you're looking for doesn't exist or has been moved.
          <br />
          Let's get you back to exploring real city routes.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            background: '#1c1c1b',
            color: '#fff',
            border: 'none',
            padding: '14px 36px',
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: "'Urbanist', Inter, system-ui, sans-serif",
            cursor: 'pointer',
            letterSpacing: '0.5px',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Explore Trips
        </button>
      </div>

      <footer className="explore-footer">
        <img src={FlipTripLogo} alt="FlipTrip" className="explore-footer-logo" />
        <Link to="/about" style={{ color: 'inherit', textDecoration: 'inherit' }}><h4>About project</h4></Link>
        <Link to="/become-local" style={{ color: 'inherit', textDecoration: 'inherit' }}><h4>Locals</h4></Link>
        <span>© flip-trip 2026</span>
      </footer>
    </main>
  );
}
