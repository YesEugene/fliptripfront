import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { generatePreview } from '../services/api';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import './PreviewPage.css';

const CITY_IMAGES = {
  // Original cities
  "Barcelona": "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop",
  "Paris": "https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop",
  "London": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop",
  "Moscow": "https://images.unsplash.com/photo-1512496015851-a90fb38cd796?w=800&h=600&fit=crop",
  "Rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop",
  "Amsterdam": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop",
  "Berlin": "https://images.unsplash.com/photo-1587330979470-3595d7b3a19d?w=800&h=600&fit=crop",
  "Prague": "https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&h=600&fit=crop",
  
  // Additional popular cities
  "Lisbon": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&h=600&fit=crop",
  "Madrid": "https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?w=800&h=600&fit=crop",
  "Vienna": "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800&h=600&fit=crop",
  "Budapest": "https://images.unsplash.com/photo-1541963463532-d68292c34d19?w=800&h=600&fit=crop",
  "Florence": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop",
  "Venice": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
  "Athens": "https://images.unsplash.com/photo-1555993539-1732b0258077?w=800&h=600&fit=crop",
  "Istanbul": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=600&fit=crop",
  "Dublin": "https://images.unsplash.com/photo-1549918864-48ac978761a4?w=800&h=600&fit=crop",
  "Edinburgh": "https://images.unsplash.com/photo-1555501333-4c5c3e0b9c1a?w=800&h=600&fit=crop",
  "Stockholm": "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=800&h=600&fit=crop",
  "Copenhagen": "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&h=600&fit=crop",
  "Munich": "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&h=600&fit=crop",
  "Milan": "https://images.unsplash.com/photo-1513581166391-887a96ddeafd?w=800&h=600&fit=crop",
  "New York": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop",
  "Tokyo": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop",
  "Sydney": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
  "Dubai": "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&h=600&fit=crop",
};

export default function PreviewPage() {
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
    date: searchParams.get('date') || new Date().toISOString().slice(0, 10),
    budget: searchParams.get('budget') || '100'
  };

  useEffect(() => {
    generatePreviewData();
  }, []);

  const generatePreviewData = async () => {
    try {
      setLoading(true);
      const data = await generatePreview(formData);
      setPreview(data);
    } catch (err) {
      console.error('Preview generation error:', err);
      setError('Ошибка при генерации превью');
      // Fallback data
      setPreview({
        title: `Your Perfect Day in ${formData.city}`,
        subtitle: "A personalized itinerary crafted just for you, filled with authentic experiences and unforgettable moments."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }
    
    // Navigate to payment with form data and email
    const paymentData = {
      ...formData,
      email: email
    };
    const queryParams = new URLSearchParams(paymentData);
    navigate(`/payment?${queryParams.toString()}`);
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-xl text-gray-700">Crafting your perfect day plan...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Ошибка</div>
          <div className="text-gray-600">{error}</div>
          <button onClick={handleBack} className="btn-primary mt-4">
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  const cityImage = CITY_IMAGES[formData.city] || CITY_IMAGES["Barcelona"];

  return (
    <div className="preview-container">
      {/* Header with Logo and Back Button */}
      <div className="preview-header">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="preview-back-button"
        >
          <span className="preview-back-arrow">←</span>
          Back
        </button>
        
        {/* Centered Logo */}
        <div className="preview-logo-container">
          <img 
            src={FlipTripLogo} 
            alt="FlipTrip" 
            className="preview-logo"
          />
        </div>
        
        {/* Spacer for alignment */}
        <div className="preview-spacer"></div>
      </div>

      {/* Preview Card */}
      <div className="preview-card">
        {/* City Image with Overlay */}
        <div className="preview-city-image-container">
          <img
            src={cityImage}
            alt={formData.city}
            className="preview-city-image"
          />
          <div className="preview-image-overlay"></div>
          
          {/* Content Overlay */}
          <div className="preview-content-overlay">
            <div className="preview-tags">
              <span className="preview-tag preview-tag-city">
                {formData.city}
              </span>
              <span className="preview-tag preview-tag-date">
                {formData.date}
              </span>
              <span className="preview-tag preview-tag-interests">
                {formData.interests.join(', ')}
              </span>
              <span className="preview-tag preview-tag-budget">
                Budget: €{formData.budget}
              </span>
            </div>
            
            <h1 style={{
              fontSize: '36px',
              fontWeight: 'bold',
              marginBottom: '16px',
              lineHeight: '1.2'
            }}>
              {preview?.title || `Your Perfect Day in ${formData.city}`}
            </h1>
            <p style={{
              fontSize: '20px',
              color: '#e5e7eb',
              lineHeight: '1.6'
            }}>
              {preview?.subtitle || "A personalized itinerary crafted just for you, filled with authentic experiences and unforgettable moments."}
            </p>
          </div>
        </div>

        {/* Preview Info */}
        <div style={{ padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              Your unique day plan is ready!
            </h2>
            <p style={{ color: '#6b7280' }}>
              After payment you will receive the full itinerary:
            </p>
          </div>

          {/* Email Input */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#374151' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="traveler@email.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '16px',
                color: '#374151'
              }}
              required
            />
          </div>

          {/* Features with Icons */}
          <div style={{ marginBottom: '32px' }}>
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

          {/* Price and Continue Button */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '8px'
            }}>$16</div>
            <div style={{ color: '#6b7280', marginBottom: '24px' }}>One-time payment</div>
            
            <button
              onClick={handleContinue}
              style={{
                width: '100%',
                backgroundColor: '#3E85FC',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 28px',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#3E85FC'}
            >
              Proceed to payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
