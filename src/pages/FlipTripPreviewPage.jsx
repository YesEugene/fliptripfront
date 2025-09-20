import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { generatePreview, generateSmartItinerary, createCheckoutSession } from '../services/api';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import './FlipTripPreviewPage.css';

export default function FlipTripPreviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [email, setEmail] = useState('');
  
  // Extract form data from URL params
  const formData = {
    city: searchParams.get('city') || 'Barcelona',
    audience: searchParams.get('audience') || 'him',
    interests: searchParams.get('interests')?.split(',') || [],
    budget: searchParams.get('budget') || '800',
    date: searchParams.get('date') || '2025-10-14'
  };

  useEffect(() => {
    generatePreviewData();
  }, []);

  const generatePreviewData = async () => {
    try {
      setLoading(true);
      // Use smart itinerary for preview to get consistent titles
      const data = await generateSmartItinerary(formData);
      setPreview(data);
    } catch (err) {
      console.error('Preview generation error:', err);
      setError('Error generating preview');
      // Fallback data based on form parameters
      const generateFallbackContent = () => {
        const city = formData.city;
        const audience = formData.audience;
        const interests = formData.interests;
        
        // Generate title based on interests and audience
        let title = `${city} Adventure`;
        if (interests.includes('Romantic')) {
          title = `Romantic Day in ${city}`;
        } else if (interests.includes('Foodie')) {
          title = `${city} Foodie Experience`;
        } else if (interests.includes('Culture & Arts')) {
          title = `Cultural Journey in ${city}`;
        } else if (interests.includes('Adventure')) {
          title = `Adventure in ${city}`;
        } else if (interests.includes('Relaxation')) {
          title = `Relaxing Day in ${city}`;
        }
        
        // Generate subtitle based on audience and interests
        let subtitle = `A perfect day in ${city} tailored for ${audience}. `;
        if (interests.includes('Romantic')) {
          subtitle += `Romantic strolls, intimate dining, and magical moments await.`;
        } else if (interests.includes('Foodie')) {
          subtitle += `Culinary delights, local flavors, and gastronomic adventures.`;
        } else if (interests.includes('Culture & Arts')) {
          subtitle += `Museums, galleries, and cultural landmarks to explore.`;
        } else if (interests.includes('Adventure')) {
          subtitle += `Thrilling activities and exciting experiences await.`;
        } else if (interests.includes('Relaxation')) {
          subtitle += `Peaceful moments, spa treatments, and serene experiences.`;
        } else {
          subtitle += `Personalized itinerary crafted just for you.`;
        }
        
        return { title, subtitle };
      };
      
      setPreview(generateFallbackContent());
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToPayment = async () => {
    if (!email) {
      alert('Please enter email');
      return;
    }
    
    try {
      setLoading(true);
      const sessionData = await createCheckoutSession({
        ...formData,
        email
      });
      
      // Redirect to Stripe Checkout
      window.location.href = sessionData.url;
    } catch (error) {
      console.error('Payment error:', error);
      alert('Error creating payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '20px 16px'
  };

  const contentStyle = {
    maxWidth: '750px',
    margin: '0 auto',
    padding: '0 20px'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '24px'
  };

  const logoStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#e11d48',
    marginBottom: '8px'
  };

  const taglineStyle = {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '24px'
  };

  const titleStyle = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '24px',
    textAlign: 'center'
  };

  const previewCardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    marginBottom: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  const previewImageStyle = {
    width: '100%',
    height: '200px',
    objectFit: 'cover'
  };

  const previewOverlayStyle = {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.3), transparent)',
    padding: '20px',
    color: 'white'
  };

  const previewTitleStyle = {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '12px',
    lineHeight: '1.3',
    color: 'white'
  };

  const tagsStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px'
  };

  const tagStyle = {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(4px)'
  };

  const previewDescriptionStyle = {
    fontSize: '14px',
    lineHeight: '1.4',
    color: '#1e293b',
    backgroundColor: 'white',
    padding: '16px',
    margin: '0'
  };

  const emailSectionStyle = {
    marginBottom: '24px'
  };

  const emailLabelStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '10px'
  };

  const emailInputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box'
  };

  const benefitsSectionStyle = {
    marginBottom: '24px'
  };

  const benefitsTitleStyle = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '12px'
  };

  const benefitItemStyle = {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '8px',
    paddingLeft: '16px',
    position: 'relative'
  };

  const bulletStyle = {
    position: 'absolute',
    left: '0',
    top: '0',
    color: '#e11d48'
  };

  const priceSectionStyle = {
    textAlign: 'center',
    marginBottom: '24px'
  };

  const priceStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '4px'
  };

  const priceSubtextStyle = {
    fontSize: '14px',
    color: '#64748b'
  };

  const payButtonStyle = {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#e11d48',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const loadingStyle = {
    textAlign: 'center',
    padding: '48px 20px'
  };

  const loadingSpinnerStyle = {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #e11d48',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  };

  if (loading) {
    return (
      <div style={{...containerStyle, backgroundColor: '#ffffff'}}>
        <div style={contentStyle}>
          <div style={loadingStyle}>
            <div style={loadingSpinnerStyle}></div>
            <div style={{ fontSize: '16px', color: '#374151' }}>Designing your perfect journey...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ color: '#ef4444', fontSize: '18px', marginBottom: '16px' }}>Ошибка</div>
            <div style={{ color: '#64748b', marginBottom: '24px' }}>{error}</div>
            <button onClick={handleBack} style={payButtonStyle}>
              Вернуться назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fliptrip-preview-container">
      {/* Header with Logo */}
      <div className="fliptrip-preview-header">
        {/* Logo and Back Button Row */}
        <div className="fliptrip-preview-header-row">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="fliptrip-preview-back-button"
          >
            <span className="fliptrip-preview-back-arrow">←</span>
            Back
          </button>
          
          {/* Centered Logo */}
          <img 
            src={FlipTripLogo} 
            alt="FlipTrip" 
            className="fliptrip-preview-logo"
          />
          
          {/* Empty div for balance */}
          <div className="fliptrip-preview-spacer"></div>
        </div>
      </div>

      <div className="fliptrip-preview-content">
        <h1 style={titleStyle}>Your unique day plan is ready!</h1>

        {/* Preview Card */}
        <div style={previewCardStyle}>
          <div style={{ position: 'relative' }}>
            <img 
              src={`https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=200&fit=crop`} 
              alt={formData.city}
              style={previewImageStyle}
            />
            <div style={previewOverlayStyle}>
              <div style={previewTitleStyle}>
                {preview?.meta?.creative_title || `${formData.city} Adventure`}
              </div>
              <div style={tagsStyle}>
                <span style={{...tagStyle, backgroundColor: 'rgba(225, 29, 72, 0.8)'}}>
                  {formData.city}
                </span>
                <span style={{...tagStyle, backgroundColor: 'rgba(59, 130, 246, 0.8)'}}>
                  {new Date(formData.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <span style={{...tagStyle, backgroundColor: 'rgba(34, 197, 94, 0.8)'}}>
                  {formData.interests.join(', ')}
                </span>
                <span style={{...tagStyle, backgroundColor: 'rgba(225, 29, 72, 0.8)'}}>
                  Budget: €{formData.budget}
                </span>
              </div>
            </div>
          </div>
          <div style={previewDescriptionStyle}>
            {preview?.meta?.creative_subtitle || `Morning with aromatic espresso in the old quarter, light rhythm of cycling along the sea and evening with a glass of wine — a day where ${formData.city} reveals itself from its cozy and lively side.`}
          </div>
        </div>

        {/* Email Input */}
        <div style={emailSectionStyle}>
          <label style={emailLabelStyle}>E-mail</label>
          <input
            type="email"
            placeholder="traveler@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={emailInputStyle}
          />
        </div>

        {/* Benefits */}
        <div style={benefitsSectionStyle}>
          <div style={benefitsTitleStyle}>After payment you will receive the full itinerary:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>🎯</span>
              <span style={{ color: '#374151' }}>Personalized itinerary based on your interests</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>📍</span>
              <span style={{ color: '#374151' }}>Detailed daily plan with addresses</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>💡</span>
              <span style={{ color: '#374151' }}>Recommendations on what to do and what not to do</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>📄</span>
              <span style={{ color: '#374151' }}>PDF file for download and offline use</span>
            </div>
          </div>
        </div>

        {/* Price */}
        <div style={priceSectionStyle}>
          <div style={priceStyle}>$16</div>
          <div style={priceSubtextStyle}>One-time payment</div>
        </div>

        {/* Pay Button */}
        <button
          onClick={handleContinueToPayment}
          disabled={loading}
          style={{
            ...payButtonStyle,
            backgroundColor: loading ? '#cbd5e1' : '#3E85FC',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
          onMouseOver={(e) => {
            if (!loading) {
              e.target.style.backgroundColor = '#2563eb';
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              e.target.style.backgroundColor = '#3E85FC';
            }
          }}
        >
          {loading ? 'Creating payment...' : 'Proceed to payment'}
        </button>
      </div>
    </div>
  );
}
