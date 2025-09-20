import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Top 20 most popular travel destinations
const TOP_TOP_CITIES = [
  'Barcelona', 'Paris', 'Amsterdam', 'Berlin', 'London', 
  'Rome', 'Madrid', 'Lisbon', 'New York', 'Tokyo',
  'Prague', 'Vienna', 'Venice', 'Florence', 'Moscow',
  'Istanbul', 'Dubai', 'Sydney', 'Singapore', 'Copenhagen'
];

const INTERESTS = [
  "History Buff", "Architecture", "Coffee Lover", "Wine & Cheese", 
  "Street Art", "Hidden Gems", "Markets", "Outdoors", "Cycling", 
  "Foodie", "Art & Culture", "Nightlife", "Photography", "Shopping", "Nature"
];

const AUDIENCES = [
  { value: "him", label: "Him" },
  { value: "her", label: "Her" },
  { value: "couples", label: "Couples" },
  { value: "kids", label: "Kids" }
];

export default function SimpleHomePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    city: "Barcelona",
    audience: "him",
    interests: [],
    date: new Date().toISOString().slice(0, 10),
    budgetFrom: "",
    budgetTo: ""
  });
  const [errors, setErrors] = useState({});

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
    
    if (errors.interests) {
      setErrors(prev => ({ ...prev, interests: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      newErrors.date = "Дата не может быть в прошлом";
    }
    
    const from = Number(formData.budgetFrom);
    const to = Number(formData.budgetTo);
    
    if (formData.budgetFrom && formData.budgetTo && from > to) {
      newErrors.budget = "Минимальный бюджет не может быть больше максимального";
    }
    
    if (formData.budgetFrom && from < 0) {
      newErrors.budget = "Бюджет не может быть отрицательным";
    }
    
    if (formData.budgetTo && to < 0) {
      newErrors.budget = "Бюджет не может быть отрицательным";
    }
    
    if (formData.interests.length === 0) {
      newErrors.interests = "Выберите хотя бы один интерес";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const queryParams = new URLSearchParams({
      city: formData.city,
      audience: formData.audience,
      interests: formData.interests.join(','),
      date: formData.date,
      budgetFrom: formData.budgetFrom,
      budgetTo: formData.budgetTo
    });
    
    navigate(`/preview?${queryParams.toString()}`);
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#eff6ff',
    padding: '32px 16px'
  };

  const contentStyle = {
    maxWidth: '1024px',
    margin: '0 auto'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '48px'
  };

  const titleStyle = {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: '16px'
  };

  const subtitleStyle = {
    fontSize: '20px',
    color: '#6b7280',
    maxWidth: '512px',
    margin: '0 auto'
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    padding: '32px',
    marginBottom: '32px'
  };

  const formGroupStyle = {
    marginBottom: '32px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '16px',
    boxSizing: 'border-box'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const buttonGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px'
  };

  const buttonStyle = {
    padding: '12px 16px',
    borderRadius: '12px',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const selectedButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#3b82f6',
    color: 'white',
    transform: 'scale(1.05)'
  };

  const unselectedButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f3f4f6',
    color: '#374151'
  };

  const interestGridStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  };

  const interestButtonStyle = {
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const selectedInterestStyle = {
    ...interestButtonStyle,
    backgroundColor: '#3b82f6',
    color: 'white',
    transform: 'scale(1.05)'
  };

  const unselectedInterestStyle = {
    ...interestButtonStyle,
    backgroundColor: '#f3f4f6',
    color: '#374151'
  };

  const budgetGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  };

  const submitButtonStyle = {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '20px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const errorStyle = {
    color: '#ef4444',
    fontSize: '14px',
    marginTop: '4px'
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h1 style={titleStyle}>Expiria</h1>
          <p style={subtitleStyle}>
            Создайте идеальный день в любом городе мира. Персонализированные маршруты, 
            подобранные специально для вас.
          </p>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} style={cardStyle}>
          {/* City Selection */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>🌍 Выберите город</label>
            <select
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              style={selectStyle}
            >
              {TOP_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Audience Selection */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>👥 Для кого планируем?</label>
            <div style={buttonGridStyle}>
              {AUDIENCES.map((audience) => (
                <button
                  key={audience.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, audience: audience.value }))}
                  style={formData.audience === audience.value ? selectedButtonStyle : unselectedButtonStyle}
                >
                  {audience.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interests/Tags */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>✨ Выберите ваши интересы</label>
            {errors.interests && (
              <div style={errorStyle}>{errors.interests}</div>
            )}
            <div style={interestGridStyle}>
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => handleInterestToggle(interest)}
                  style={formData.interests.includes(interest) ? selectedInterestStyle : unselectedInterestStyle}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>📅 Когда планируете поездку?</label>
            {errors.date && (
              <div style={errorStyle}>{errors.date}</div>
            )}
            <input
              type="date"
              value={formData.date}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, date: e.target.value }));
                if (errors.date) {
                  setErrors(prev => ({ ...prev, date: null }));
                }
              }}
              style={inputStyle}
            />
          </div>

          {/* Budget */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>💰 Ваш бюджет (€)</label>
            {errors.budget && (
              <div style={errorStyle}>{errors.budget}</div>
            )}
            <div style={budgetGridStyle}>
              <div>
                <input
                  type="number"
                  placeholder="От"
                  value={formData.budgetFrom}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, budgetFrom: e.target.value }));
                    if (errors.budget) {
                      setErrors(prev => ({ ...prev, budget: null }));
                    }
                  }}
                  style={inputStyle}
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="До"
                  value={formData.budgetTo}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, budgetTo: e.target.value }));
                    if (errors.budget) {
                      setErrors(prev => ({ ...prev, budget: null }));
                    }
                  }}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            style={submitButtonStyle}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#2563eb';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#3b82f6';
              e.target.style.transform = 'scale(1)';
            }}
          >
            🚀 Создать мой идеальный день
          </button>
        </form>
      </div>
    </div>
  );
}

