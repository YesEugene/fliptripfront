import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import './ExplorePage.css';

const REDIRECT_SECONDS = 5;

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const redirected = useRef(false);

  const city = searchParams.get('city') || '';
  const tour = searchParams.get('tour') || '';
  const tourCity = searchParams.get('tourCity') || '';
  const tourId = searchParams.get('tourId') || '';
  const value = searchParams.get('value') || '';
  const currency = searchParams.get('currency') || '';

  const redirectUrl = buildRedirectUrl(searchParams);

  useEffect(() => {
    document.title = 'Payment Successful | FlipTrip';
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!redirected.current) {
            redirected.current = true;
            window.location.href = redirectUrl;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [redirectUrl]);

  const handleViewTour = () => {
    if (!redirected.current) {
      redirected.current = true;
      window.location.href = redirectUrl;
    }
  };

  const priceDisplay = value && currency
    ? `${formatCurrency(value, currency)}`
    : null;

  return (
    <main className="explore-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="explore-topbar">
        <div className="explore-topbar-inner">
          <Link to="/" className="explore-logo-link" aria-label="FlipTrip home">
            <img src={FlipTripLogo} alt="FlipTrip" className="explore-logo" />
          </Link>
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
        maxWidth: 560,
        margin: '0 auto',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 style={{
          fontFamily: "'Urbanist', Inter, system-ui, sans-serif",
          fontSize: 'clamp(24px, 5vw, 36px)',
          fontWeight: 700,
          margin: '0 0 12px',
          color: '#1c1c1b',
        }}>
          Payment successful!
        </h1>

        <p style={{
          fontSize: 'clamp(14px, 2vw, 17px)',
          color: '#555',
          margin: '0 0 8px',
          lineHeight: 1.6,
        }}>
          {city
            ? `Your ${city} tour is ready.`
            : 'Your tour is ready.'}
        </p>

        {priceDisplay && (
          <p style={{ fontSize: '14px', color: '#888', margin: '0 0 32px' }}>
            Amount paid: <strong style={{ color: '#333' }}>{priceDisplay}</strong>
          </p>
        )}

        {!priceDisplay && (
          <div style={{ marginBottom: 32 }} />
        )}

        <button
          type="button"
          onClick={handleViewTour}
          style={{
            background: '#1c1c1b',
            color: '#fff',
            border: 'none',
            padding: '16px 48px',
            fontSize: '16px',
            fontWeight: 600,
            fontFamily: "'Urbanist', Inter, system-ui, sans-serif",
            cursor: 'pointer',
            letterSpacing: '0.4px',
            transition: 'opacity 0.2s',
            borderRadius: '4px',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          View Your Tour
        </button>

        <p style={{ fontSize: '13px', color: '#aaa', marginTop: 20 }}>
          Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
        </p>
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

function buildRedirectUrl(searchParams) {
  const tour = searchParams.get('tour') || '';
  const tourCity = searchParams.get('tourCity') || '';

  if (tour && tourCity) {
    return `/tours/${tourCity}/${tour}?paid=true`;
  }

  const tourId = searchParams.get('tourId') || '';
  const itineraryId = searchParams.get('itineraryId') || '';

  if (tourId) {
    return `/itinerary?tourId=${encodeURIComponent(tourId)}&paid=true`;
  }
  if (itineraryId) {
    return `/itinerary?itineraryId=${encodeURIComponent(itineraryId)}&paid=true`;
  }

  return '/';
}

function formatCurrency(amount, currency) {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${amount} ${currency}`;
  const upper = currency.toUpperCase();
  const symbols = { EUR: '€', USD: '$', GBP: '£' };
  const sym = symbols[upper];
  if (sym) return `${sym}${num}`;
  return `${num} ${upper}`;
}
