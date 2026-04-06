import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, logout } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'https://fliptripback.vercel.app';

function getToken() {
  return localStorage.getItem('authToken') || '';
}

export default function UserDashboardPage() {
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfileEmail(currentUser.email || '');
    }
    fetchProfile();
    fetchOrders();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch(`${API_BASE}/api/user-profile`, {
        headers: { Authorization: getToken() }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setProfileName(data.user.name || '');
        setProfileEmail(data.user.email || '');
      }
    } catch {
      // fall back to localStorage data
    }
  }

  async function fetchOrders() {
    try {
      const res = await fetch(`${API_BASE}/api/user-orders`, {
        headers: { Authorization: getToken() }
      });
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
    } catch {
      // silent
    } finally {
      setOrdersLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/user-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: getToken()
        },
        body: JSON.stringify({ name: profileName, email: profileEmail })
      });
      const data = await res.json();
      if (data.success && data.user) {
        const stored = getCurrentUser();
        const updated = { ...stored, name: data.user.name, email: data.user.email };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
        setEditing(false);
        setSaveMsg({ type: 'ok', text: 'Profile updated' });
      } else {
        setSaveMsg({ type: 'err', text: data.error || 'Failed to update' });
      }
    } catch {
      setSaveMsg({ type: 'err', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
  }

  const cardStyle = {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
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

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
          My Dashboard
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* Profile card */}
          <div style={{ ...cardStyle, gridColumn: '1 / -1', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                Profile
              </h2>
              {!editing && (
                <button
                  onClick={() => { setEditing(true); setSaveMsg(null); }}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: 'transparent',
                    color: '#3b82f6',
                    border: '1px solid #3b82f6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            {saveMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                backgroundColor: saveMsg.type === 'ok' ? '#dcfce7' : '#fee2e2',
                color: saveMsg.type === 'ok' ? '#166534' : '#b91c1c'
              }}>
                {saveMsg.text}
              </div>
            )}

            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: saving ? 0.7 : 1
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setSaveMsg(null);
                      setProfileName(user.name || '');
                      setProfileEmail(user.email || '');
                    }}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: 'transparent',
                      color: '#6b7280',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>Name</span>
                  <div style={{ fontSize: '16px', color: '#111827', marginTop: '2px' }}>{profileName || '—'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>Email</span>
                  <div style={{ fontSize: '16px', color: '#111827', marginTop: '2px' }}>{profileEmail || '—'}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              My Orders
            </h2>
            {ordersLoading ? (
              <p style={{ color: '#6b7280' }}>Loading...</p>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: '#6b7280', marginBottom: '16px' }}>You haven't purchased any tours yet</p>
                <Link
                  to="/"
                  style={{
                    display: 'inline-block',
                    padding: '12px 28px',
                    backgroundColor: '#1c1c1b',
                    color: 'white',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                  }}
                >
                  Explore Tours
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {orders.map(order => (
                  <div key={order.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#1c1c1b', marginBottom: '4px' }}>
                        {order.tourTitle}
                      </div>
                      <div style={{ fontSize: '13px', color: '#888' }}>
                        {order.city}{order.city && ' · '}{order.tourType === 'guided' ? 'Guided' : 'Self-guided'} · {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#1c1c1b', whiteSpace: 'nowrap' }}>
                      {order.currency} {Number(order.totalPrice || 0).toFixed(2)}
                    </div>
                    {order.tourUrl && (
                      <Link
                        to={order.tourUrl}
                        style={{
                          padding: '8px 20px',
                          backgroundColor: '#1c1c1b',
                          color: '#fff',
                          textDecoration: 'none',
                          fontSize: '13px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        View Tour
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              Find a Tour
            </h2>
            <Link
              to="/"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#1c1c1b',
                color: 'white',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Explore Tours
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
