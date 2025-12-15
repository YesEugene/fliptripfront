/**
 * Location Form Modal Component
 * Create/Edit location form
 */

import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';

export default function LocationFormModal({ location, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    city_id: '',
    address: '',
    category: '',
    description: '',
    recommendations: '',
    price_level: '',
    avg_price_usd: '',
    website: '',
    phone: '',
    booking_url: '',
    verified: false,
    lat: '',
    lng: '',
    google_place_id: ''
  });
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(true);
  const [error, setError] = useState(null);

  const categories = [
    'restaurant', 'cafe', 'bar', 'museum', 'park', 'monument', 
    'theater', 'beach', 'market', 'shopping', 'nightlife', 'sports',
    'adventure', 'wellness', 'transport', 'accommodation', 'other'
  ];

  useEffect(() => {
    loadCities();
    if (location) {
      // Load location data for editing
      setFormData({
        name: location.name || '',
        city_id: location.city_id || location.city?.id || '',
        address: location.address || '',
        category: location.category || '',
        description: location.description || '',
        recommendations: location.recommendations || '',
        price_level: location.price_level?.toString() || '',
        avg_price_usd: location.avg_price_usd?.toString() || '',
        website: location.website || '',
        phone: location.phone || '',
        booking_url: location.booking_url || '',
        verified: location.verified || false,
        lat: location.lat?.toString() || '',
        lng: location.lng?.toString() || '',
        google_place_id: location.google_place_id || ''
      });
    }
  }, [location]);

  const loadCities = async () => {
    try {
      setLoadingCities(true);
      const response = await fetch(`${API_BASE_URL}/api/admin-cities`);
      const data = await response.json();
      if (data.success) {
        setCities(data.cities || []);
      }
    } catch (err) {
      console.error('Error loading cities:', err);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.city_id || !formData.category) {
        throw new Error('Name, City, and Category are required');
      }

      // Prepare data for API
      const locationData = {
        name: formData.name,
        city_id: formData.city_id || null,
        address: formData.address || null,
        category: formData.category,
        description: formData.description || null,
        recommendations: formData.recommendations || null,
        price_level: formData.price_level ? parseInt(formData.price_level) : null,
        avg_price_usd: formData.avg_price_usd ? parseFloat(formData.avg_price_usd) : null,
        website: formData.website || null,
        phone: formData.phone || null,
        booking_url: formData.booking_url || null,
        verified: formData.verified,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        google_place_id: formData.google_place_id || null
      };

      await onSave(locationData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '32px',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {location ? 'Edit Location' : 'Create Location'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#991b1b'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Name */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* City */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                City <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {loadingCities ? (
                <div style={{ padding: '10px', color: '#6b7280' }}>Loading cities...</div>
              ) : (
                <select
                  name="city_id"
                  value={formData.city_id}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                >
                  <option value="">Select a city</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>
                      {city.name} {city.country ? `(${city.country.name})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Category */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Category <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Description */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Recommendations */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Recommendations
              </label>
              <textarea
                name="recommendations"
                value={formData.recommendations}
                onChange={handleChange}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Price Level */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Price Level (1-4)
              </label>
              <select
                name="price_level"
                value={formData.price_level}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="">Not specified</option>
                <option value="1">1 - Inexpensive</option>
                <option value="2">2 - Moderate</option>
                <option value="3">3 - Expensive</option>
                <option value="4">4 - Very Expensive</option>
              </select>
            </div>

            {/* Average Price USD */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Average Price (USD)
              </label>
              <input
                type="number"
                name="avg_price_usd"
                value={formData.avg_price_usd}
                onChange={handleChange}
                step="0.01"
                min="0"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Website */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Booking URL */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Booking URL (for "Reserve Table" button)
              </label>
              <input
                type="url"
                name="booking_url"
                value={formData.booking_url}
                onChange={handleChange}
                placeholder="https://..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Coordinates */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Latitude
              </label>
              <input
                type="number"
                name="lat"
                value={formData.lat}
                onChange={handleChange}
                step="any"
                placeholder="e.g., 48.8566"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Longitude
              </label>
              <input
                type="number"
                name="lng"
                value={formData.lng}
                onChange={handleChange}
                step="any"
                placeholder="e.g., 2.3522"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Google Place ID */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Google Place ID
              </label>
              <input
                type="text"
                name="google_place_id"
                value={formData.google_place_id}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Verified */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                name="verified"
                checked={formData.verified}
                onChange={handleChange}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label style={{ fontWeight: '600', cursor: 'pointer' }}>
                Verified Location
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {loading ? 'Saving...' : (location ? 'Update Location' : 'Create Location')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

