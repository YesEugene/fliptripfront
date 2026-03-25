import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createCheckoutSession } from '../services/api';

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Extract data from URL params
  const itineraryId = searchParams.get('itineraryId');
  const tourId = searchParams.get('tourId'); // Tour ID from database (for creator tours)
  const email = searchParams.get('email');
  const formData = {
    city: searchParams.get('city') || 'Barcelona',
    audience: searchParams.get('audience') || 'him',
    interests: searchParams.get('interests')?.split(',') || [],
    date: searchParams.get('date') || new Date().toISOString().slice(0, 10),
    budget: searchParams.get('budget') || '500',
    itineraryId: itineraryId,
    tourId: tourId, // Pass tourId to checkout session
    email: email
  };

  const handlePayment = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('💳 Creating checkout session with:', formData);
      const response = await createCheckoutSession(formData);
      console.log('✅ Checkout session created, redirecting to:', response.url);
      // Redirect to Stripe Checkout immediately
      window.location.href = response.url;
    } catch (err) {
      console.error('❌ Payment error:', err);
      setError('Ошибка при создании платежа');
      setLoading(false);
    }
  };

  // Auto-create checkout session if itineraryId and email are present
  useEffect(() => {
    if (itineraryId && email) {
      handlePayment();
    } else {
      setLoading(false);
      setError('Missing itinerary ID or email');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itineraryId, email]);

  const handleBack = () => {
    navigate(-1);
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#eff6ff',
    padding: '32px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    padding: '48px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center'
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '16px'
  };

  const subtitleStyle = {
    fontSize: '18px',
    color: '#6b7280',
    marginBottom: '32px'
  };

  const priceStyle = {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: '8px'
  };

  const priceSubtextStyle = {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '32px'
  };

  const featuresStyle = {
    textAlign: 'left',
    marginBottom: '32px'
  };

  const featureStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
    fontSize: '16px',
    color: '#374151'
  };

  const iconStyle = {
    marginRight: '12px',
    fontSize: '20px'
  };

  const buttonStyle = {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '18px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '16px'
  };

  const backButtonStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    fontWeight: '500',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const loadingStyle = {
    ...buttonStyle,
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  };

  // Show loading screen while redirecting
  if (loading && itineraryId && email) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: '18px', color: '#6b7280', marginBottom: '16px' }}>
            Redirecting to payment...
          </div>
          {error && (
            <div style={{ color: '#ef4444', marginBottom: '16px' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Оплата</h1>
        <p style={subtitleStyle}>
          Ваш персонализированный план готов к покупке
        </p>

        <div style={priceStyle}>€12</div>
        <div style={priceSubtextStyle}>Одноразовая оплата</div>

        <div style={featuresStyle}>
          <div style={featureStyle}>
            <span style={iconStyle}>🎯</span>
            Персонализированный маршрут под ваши интересы
          </div>
          <div style={featureStyle}>
            <span style={iconStyle}>📱</span>
            PDF файл для скачивания и офлайн использования
          </div>
          <div style={featureStyle}>
            <span style={iconStyle}>⭐</span>
            Проверенные места и рекомендации
          </div>
          <div style={featureStyle}>
            <span style={iconStyle}>🌍</span>
            Детальный план дня с адресами и советами
          </div>
        </div>

        {error && (
          <div style={{ color: '#ef4444', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={loading}
          style={loading ? loadingStyle : buttonStyle}
          onMouseOver={(e) => {
            if (!loading) {
              e.target.style.backgroundColor = '#2563eb';
              e.target.style.transform = 'scale(1.02)';
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              e.target.style.backgroundColor = '#3b82f6';
              e.target.style.transform = 'scale(1)';
            }
          }}
        >
          {loading ? 'Обработка...' : '💳 Оплатить €12'}
        </button>

        <button
          onClick={handleBack}
          style={backButtonStyle}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f9fafb';
            e.target.style.borderColor = '#d1d5db';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.borderColor = '#e5e7eb';
          }}
        >
          ← Назад к превью
        </button>

        <div style={{ marginTop: '24px', fontSize: '14px', color: '#9ca3af' }}>
          <div>Город: {formData.city}</div>
          <div>Дата: {formData.date}</div>
          <div>Интересы: {Array.isArray(formData.interests) ? formData.interests.join(', ') : formData.interests}</div>
        </div>
      </div>
    </div>
  );
}