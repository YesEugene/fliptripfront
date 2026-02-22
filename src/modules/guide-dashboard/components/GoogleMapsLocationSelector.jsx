import React, { useState, useEffect, useRef } from 'react';

// Get API base URL
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '');
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (import.meta.env.PROD) {
    return 'https://fliptripbackend.vercel.app';
  }
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();

const GoogleMapsLocationSelector = ({ isOpen, onClose, onSelectLocation, city }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeDetails, setPlaceDetails] = useState(null);
  const [error, setError] = useState(null);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setPredictions([]);
      setSelectedPlace(null);
      setPlaceDetails(null);
      setError(null);
    }
  }, [isOpen]);

  // Search for places with debounce
  useEffect(() => {
    if (!isOpen) return;

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if query is too short
    if (searchQuery.trim().length < 3) {
      setPredictions([]);
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      await searchPlaces(searchQuery.trim());
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, isOpen]);

  const searchPlaces = async (query) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/google-places-autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          ...(city && { location: city }) // Optional: bias search to city
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if it's a billing error
        if (errorData.requiresBilling || response.status === 402) {
          throw new Error('Google Places API requires billing to be enabled. Please check your Google Cloud Console billing settings.');
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to search places');
      }

      const data = await response.json();
      setPredictions(data.predictions || []);
    } catch (err) {
      console.error('Error searching places:', err);
      setError(err.message || 'Failed to search places');
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlaceDetails = async (placeId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/google-places-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          place_id: placeId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if it's a billing error
        if (errorData.requiresBilling || response.status === 402) {
          throw new Error('Google Places API requires billing to be enabled. Please check your Google Cloud Console billing settings.');
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to get place details');
      }

      const data = await response.json();
      setPlaceDetails(data.place);
      setSelectedPlace(placeId);
    } catch (err) {
      console.error('Error fetching place details:', err);
      setError(err.message || 'Failed to get place details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlace = (placeId) => {
    fetchPlaceDetails(placeId);
  };

  const handleConfirmSelection = async () => {
    if (placeDetails) {
      // Try to find city in database if city_name and country_name are available
      let cityId = null;
      let cityName = null;
      
      if (placeDetails.city_name && placeDetails.country_name) {
        try {
          // Search for city in database
          const citySearchResponse = await fetch(`${API_BASE_URL}/api/admin-cities?search=${encodeURIComponent(placeDetails.city_name)}`);
          const citySearchData = await citySearchResponse.json();
          
          if (citySearchData.success && citySearchData.cities && citySearchData.cities.length > 0) {
            // Try to find exact match by city name and country
            const exactMatch = citySearchData.cities.find(city => 
              city.name.toLowerCase() === placeDetails.city_name.toLowerCase() &&
              city.country && city.country.toLowerCase() === placeDetails.country_name.toLowerCase()
            );
            
            if (exactMatch) {
              cityId = exactMatch.id;
              cityName = exactMatch.displayName || `${exactMatch.name}, ${exactMatch.country}`;
            } else {
              // If no exact match, use the first result (closest match)
              cityId = citySearchData.cities[0].id;
              cityName = citySearchData.cities[0].displayName || `${citySearchData.cities[0].name}${citySearchData.cities[0].country ? `, ${citySearchData.cities[0].country}` : ''}`;
            }
          }
        } catch (error) {
          console.error('Error searching for city:', error);
        }
      }
      
      // Prepare price_level - use numeric value if available
      // Google Places API returns price_level as 0-4, or null/undefined if not available
      let priceLevelValue = '';
      if (placeDetails.price_level_numeric !== null && placeDetails.price_level_numeric !== undefined) {
        priceLevelValue = String(placeDetails.price_level_numeric);
      }
      
      // Prepare approximate_cost - use from API if available
      const approximateCostValue = placeDetails.approximate_cost || placeDetails.approx_cost || '';
      
      console.log('🔍 Google Places data being sent:', {
        name: placeDetails.name,
        price_level_numeric: placeDetails.price_level_numeric,
        price_level_display: placeDetails.price_level,
        priceLevelValue,
        approximate_cost: placeDetails.approximate_cost,
        approx_cost: placeDetails.approx_cost,
        approximateCostValue,
        hasPriceLevel: priceLevelValue !== '',
        hasApproxCost: approximateCostValue !== ''
      });
      
      onSelectLocation({
        title: placeDetails.name || '',
        address: placeDetails.address || '',
        place_id: placeDetails.place_id || selectedPlace || null, // Save place_id for photo refresh
        price_level: priceLevelValue,
        price_level_display: placeDetails.price_level || '', // Keep display format for reference
        approximate_cost: approximateCostValue,
        approx_cost: approximateCostValue, // Support both field names
        rating: placeDetails.rating || null,
        user_ratings_total: placeDetails.user_ratings_total || null,
        photos: placeDetails.photos || (placeDetails.photo_url ? [placeDetails.photo_url] : []), // Use photos array
        photo: placeDetails.photo_url || (placeDetails.photos && placeDetails.photos.length > 0 ? placeDetails.photos[0] : null), // Keep for backward compatibility
        location: placeDetails.location,
        city_id: cityId, // City ID from database (if found)
        city_name: cityName, // City display name (if found)
        city_search_name: placeDetails.city_name, // Original city name from Google Places
        country_name: placeDetails.country_name // Country name from Google Places
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Find Location on Google Maps
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

        {/* Content */}
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1
        }}>
          {/* Search Input */}
          <div style={{ marginBottom: '20px' }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a place..."
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            {isLoading && (
              <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '14px' }}>
                Searching...
              </div>
            )}
            {error && (
              <div style={{ marginTop: '8px', color: '#ef4444', fontSize: '14px' }}>
                {error}
              </div>
            )}
          </div>

          {/* Search Results */}
          {predictions.length > 0 && !placeDetails && (
            <div>
              <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '500' }}>
                Search Results
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {predictions.map((prediction) => (
                  <button
                    key={prediction.place_id}
                    onClick={() => handleSelectPlace(prediction.place_id)}
                    style={{
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: selectedPlace === prediction.place_id ? '#eff6ff' : 'white',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPlace !== prediction.place_id) {
                        e.target.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPlace !== prediction.place_id) {
                        e.target.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      {prediction.main_text}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {prediction.secondary_text}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Place Details */}
          {placeDetails && (
            <div>
              <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '500' }}>
                Selected Location
              </h3>
              <div style={{
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#eff6ff'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '4px' }}>
                    {placeDetails.name}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '14px' }}>
                    {placeDetails.address}
                  </div>
                </div>
                
                {placeDetails.photo_url && (
                  <img
                    src={placeDetails.photo_url}
                    alt={placeDetails.name}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginBottom: '12px'
                    }}
                  />
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '14px' }}>
                  {placeDetails.rating && (
                    <div>
                      <span style={{ fontWeight: '500' }}>Rating: </span>
                      <span>{placeDetails.rating} ⭐ ({placeDetails.user_ratings_total} reviews)</span>
                    </div>
                  )}
                  {placeDetails.price_level && (
                    <div>
                      <span style={{ fontWeight: '500' }}>Price: </span>
                      <span>{placeDetails.price_level}</span>
                    </div>
                  )}
                  {placeDetails.approximate_cost && (
                    <div>
                      <span style={{ fontWeight: '500' }}>Cost: </span>
                      <span>{placeDetails.approximate_cost}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {searchQuery.trim().length < 3 && predictions.length === 0 && !placeDetails && (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
              <p>Start typing to search for places...</p>
              {city && (
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Searching in: {city}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSelection}
            disabled={!placeDetails}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: placeDetails ? '#3b82f6' : '#d1d5db',
              color: 'white',
              cursor: placeDetails ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Use This Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsLocationSelector;

