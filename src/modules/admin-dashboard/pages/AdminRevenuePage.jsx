import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBookings, syncStripeBookings } from '../services/adminService';
import { getCurrentUser, logout } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(amount, currency) {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency + ' ';
  return `${sym}${Number(amount || 0).toFixed(2)}`;
}

const STATUS_COLORS = {
  confirmed: '#10b981',
  paid: '#10b981',
  pending: '#f59e0b',
  completed: '#3b82f6',
  cancelled: '#ef4444',
  failed: '#ef4444',
};

export default function AdminRevenuePage() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setUser(getCurrentUser());
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBookings();
      setBookings(data || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const result = await syncStripeBookings();
      setSyncResult(result);
      if (result.created && result.created.length > 0) {
        await loadBookings();
      }
    } catch (err) {
      setSyncResult({ error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const totalRevenue = bookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const paidCount = bookings.filter(b => b.paymentStatus === 'paid').length;

  if (!user) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', width: '100%' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px 32px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link to="/">
            <img src={FlipTripLogo} alt="FlipTrip" style={{ height: '40px' }} />
          </Link>
          <Link to="/admin/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Dashboard
          </Link>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ color: '#6b7280' }}>Admin: {user.name || user.email}</span>
          <button
            onClick={() => { logout(); window.location.href = '/'; }}
            style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>Revenue & Purchases</h1>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: '10px 20px',
              backgroundColor: syncing ? '#9ca3af' : '#1f2937',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: syncing ? 'default' : 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            {syncing ? 'Syncing...' : 'Sync from Stripe'}
          </button>
        </div>

        {syncResult && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '8px',
            fontSize: '13px',
            backgroundColor: syncResult.error ? '#fee2e2' : '#d1fae5',
            color: syncResult.error ? '#991b1b' : '#065f46',
          }}>
            {syncResult.error
              ? `Sync error: ${syncResult.error}`
              : `Synced: ${syncResult.created?.length || 0} new bookings found. ${syncResult.skipped?.length || 0} skipped.`}
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '6px' }}>Total Revenue</div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#10b981' }}>{formatCurrency(totalRevenue, 'EUR')}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '6px' }}>Paid Purchases</div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#1f2937' }}>{paidCount}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '6px' }}>Total Bookings</div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#1f2937' }}>{bookings.length}</div>
          </div>
        </div>

        {/* Bookings table */}
        {loading ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>Loading bookings...</p>
        ) : error ? (
          <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', color: '#991b1b', marginBottom: '24px' }}>
            <p>Error: {error}</p>
            <button onClick={loadBookings} style={{ marginTop: '8px', padding: '6px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>No bookings yet.</p>
        ) : (
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>#</th>
                  <th style={{ padding: '14px 16px', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ padding: '14px 16px', color: '#6b7280', fontWeight: '600' }}>Tour</th>
                  <th style={{ padding: '14px 16px', color: '#6b7280', fontWeight: '600' }}>Customer</th>
                  <th style={{ padding: '14px 16px', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>Type</th>
                  <th style={{ padding: '14px 16px', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>Amount</th>
                  <th style={{ padding: '14px 16px', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>Payment</th>
                  <th style={{ padding: '14px 16px', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ padding: '14px 16px', color: '#6b7280', fontWeight: '600' }}>Guide</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, idx) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                  >
                    <td style={{ padding: '12px 16px', color: '#9ca3af' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{formatDate(b.createdAt)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '500', color: '#1f2937' }}>{b.tour?.title || '—'}</div>
                      {b.tour?.city && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{b.tour.city}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '500', color: '#1f2937' }}>{b.customer?.email || '—'}</div>
                      {b.customer?.name && b.customer.name !== '—' && (
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{b.customer.name}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: b.tourType === 'guided' || b.tourType === 'with-guide' ? '#dbeafe' : '#ede9fe',
                        color: b.tourType === 'guided' || b.tourType === 'with-guide' ? '#1d4ed8' : '#6d28d9',
                      }}>
                        {b.tourType === 'guided' || b.tourType === 'with-guide' ? 'Guided' : 'Self-guided'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {formatCurrency(b.totalPrice, b.currency)}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: b.paymentStatus === 'paid' ? '#d1fae5' : '#fef3c7',
                        color: STATUS_COLORS[b.paymentStatus] || '#6b7280',
                      }}>
                        {b.paymentStatus || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: b.status === 'confirmed' ? '#d1fae5' : b.status === 'cancelled' ? '#fee2e2' : '#f3f4f6',
                        color: STATUS_COLORS[b.status] || '#6b7280',
                      }}>
                        {b.status || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>
                      {b.guide ? (b.guide.name || b.guide.email) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
