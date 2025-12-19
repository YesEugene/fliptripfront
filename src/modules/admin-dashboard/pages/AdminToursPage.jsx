/**
 * Admin Tours Page
 * View and manage all tours
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTours, exportToCSV, getTourById, updateTour, getTags } from '../services/adminService';
import { getCurrentUser } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

export default function AdminToursPage() {
  const [user, setUser] = useState(null);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTour, setEditingTour] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    city: '',
    status: 'draft',
    isPublished: false,
    tags: [],
    previewMediaUrl: ''
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loadingTour, setLoadingTour] = useState(false);
  const [savingTour, setSavingTour] = useState(false);
  
  // City autocomplete state
  const [cities, setCities] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    loadTours();
    loadCities();
  }, []);

  // Load cities on component mount
  const loadCities = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';
      const response = await fetch(`${API_BASE_URL}/api/admin-cities`);
      const data = await response.json();
      if (data.success && data.cities) {
        setCities(data.cities);
      }
    } catch (err) {
      console.error('Error loading cities:', err);
    }
  };

  // Handle city input change - show suggestions
  const handleCityInputChange = (e) => {
    const value = e.target.value;
    setEditFormData({ ...editFormData, city: value });
    
    if (value.length > 1) {
      const filtered = cities.filter(c => 
        c.name.toLowerCase().includes(value.toLowerCase())
      );
      setCitySuggestions(filtered);
      setShowCitySuggestions(filtered.length > 0);
    } else {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    }
  };

  // Handle city selection from suggestions
  const handleCitySelect = (city) => {
    setEditFormData({ ...editFormData, city: city.name, cityId: city.id });
    setCitySuggestions([]);
    setShowCitySuggestions(false);
  };

  const loadTours = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = {};
      if (searchTerm) {
        filters.search = searchTerm;
      }
      const data = await getTours(filters);
      setTours(data.tours || []);
    } catch (err) {
      console.error('Error loading tours:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    exportToCSV(tours, 'tours');
  };

  const handleEditClick = async (tourId) => {
    try {
      setLoadingTour(true);
      setError(null);
      const result = await getTourById(tourId);
      const tour = result.tour;
      
      setEditingTour(tour);
      setEditFormData({
        title: tour.title || '',
        description: tour.description || '',
        city: tour.city || '',
        cityId: tour.cityId || null,
        status: tour.status || 'draft',
        isPublished: tour.isPublished || false,
        tags: tour.tags || [],
        previewMediaUrl: tour.previewMediaUrl || ''
      });
      setShowEditModal(true);
    } catch (err) {
      console.error('Error loading tour:', err);
      alert('Error loading tour: ' + err.message);
    } finally {
      setLoadingTour(false);
    }
  };

  const handleSaveTour = async () => {
    try {
      if (!editFormData.title.trim()) {
        alert('Title is required');
        return;
      }

      setSavingTour(true);
      setError(null);

      await updateTour(editingTour.id, {
        title: editFormData.title,
        description: editFormData.description,
        city: editFormData.city,
        cityId: editFormData.cityId,
        status: editFormData.status,
        isPublished: editFormData.isPublished,
        tags: editFormData.tags,
        previewMediaUrl: editFormData.previewMediaUrl
      });

      alert('Tour updated successfully!');
      setShowEditModal(false);
      setEditingTour(null);
      loadTours(); // Reload tours list
    } catch (err) {
      console.error('Error updating tour:', err);
      alert('Error updating tour: ' + err.message);
    } finally {
      setSavingTour(false);
    }
  };

  const handleTagAdd = (tagName) => {
    const trimmedTag = tagName.trim();
    if (trimmedTag && !editFormData.tags.includes(trimmedTag)) {
      setEditFormData({
        ...editFormData,
        tags: [...editFormData.tags, trimmedTag]
      });
    }
    setTagInput('');
  };

  const handleTagRemove = (tagToRemove) => {
    setEditFormData({
      ...editFormData,
      tags: editFormData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  useEffect(() => {
    // Load available tags when edit modal opens
    if (showEditModal) {
      const loadTags = async () => {
        try {
          const result = await getTags();
          if (result.tags) {
            setAvailableTags(result.tags.map(t => t.name || t));
          }
        } catch (err) {
          console.error('Error loading tags:', err);
        }
      };
      loadTags();
    }
  }, [showEditModal]);

  // Close city suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.city-autocomplete-container')) {
        setShowCitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadTours();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (!user) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link to="/admin/dashboard">
            <img src={FlipTripLogo} alt="FlipTrip" style={{ height: '40px' }} />
          </Link>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Link
              to="/admin/dashboard"
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none'
              }}
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>
            Tours Management
          </h1>
          <button
            onClick={handleExport}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Export CSV
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Search tours..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
        </div>

        {/* Tours List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#6b7280' }}>Loading tours...</p>
          </div>
        ) : error ? (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            color: '#991b1b'
          }}>
            <p>Error: {error}</p>
            <button
              onClick={loadTours}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Title</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Guide</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>City</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tours.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      No tours found
                    </td>
                  </tr>
                ) : (
                  tours.map((tour) => (
                    <tr key={tour.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{tour.title || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>
                        {tour.guide?.name || tour.guide || 'N/A'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {tour.city?.name || tour.city || 'N/A'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: tour.status === 'published' ? '#d1fae5' : '#fee2e2',
                          color: tour.status === 'published' ? '#065f46' : '#991b1b',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'capitalize'
                        }}>
                          {tour.status || 'draft'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>
                        {tour.createdAt ? new Date(tour.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => handleEditClick(tour.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Tour Modal */}
      {showEditModal && (
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
          overflowY: 'auto',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
              Edit Tour
            </h2>

            {loadingTour ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>Loading tour...</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    placeholder="Tour Title"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Description
                  </label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      minHeight: '100px',
                      resize: 'vertical'
                    }}
                    placeholder="Tour Description"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    City
                  </label>
                  <div className="city-autocomplete-container" style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={editFormData.city}
                      onChange={handleCityInputChange}
                      onFocus={() => {
                        if (citySuggestions.length > 0) {
                          setShowCitySuggestions(true);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}
                      placeholder="City Name"
                    />
                    {showCitySuggestions && citySuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px'
                      }}>
                        {citySuggestions.map((city) => (
                          <div
                            key={city.id}
                            onClick={() => handleCitySelect(city)}
                            style={{
                              padding: '12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#f3f4f6';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'white';
                            }}
                          >
                            {city.name}
                            {city.country && (
                              <span style={{ color: '#6b7280', fontSize: '14px', marginLeft: '8px' }}>
                                {city.country.name || city.country}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editFormData.isPublished}
                      onChange={(e) => setEditFormData({ ...editFormData, isPublished: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: '600' }}>Published</span>
                  </label>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Preview Media URL
                  </label>
                  <input
                    type="text"
                    value={editFormData.previewMediaUrl}
                    onChange={(e) => setEditFormData({ ...editFormData, previewMediaUrl: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Tags
                  </label>
                  <div style={{ marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault();
                          handleTagAdd(tagInput.trim());
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}
                      placeholder="Type tag and press Enter"
                    />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {editFormData.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          backgroundColor: '#e0e7ff',
                          color: '#3730a3',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        {tag}
                        <button
                          onClick={() => handleTagRemove(tag)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3730a3',
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: 0,
                            marginLeft: '4px',
                            lineHeight: '1'
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  {availableTags.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                      <p style={{ marginBottom: '4px' }}>Available tags:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {availableTags
                          .filter(tag => !editFormData.tags.includes(tag))
                          .slice(0, 10)
                          .map((tag, index) => (
                            <button
                              key={index}
                              onClick={() => handleTagAdd(tag)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              {tag}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTour(null);
                      setEditFormData({
                        title: '',
                        description: '',
                        city: '',
                        status: 'draft',
                        isPublished: false,
                        tags: [],
                        previewMediaUrl: ''
                      });
                    }}
                    disabled={savingTour}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: savingTour ? 'not-allowed' : 'pointer',
                      opacity: savingTour ? 0.6 : 1
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTour}
                    disabled={savingTour || !editFormData.title.trim()}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (savingTour || !editFormData.title.trim()) ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      opacity: (savingTour || !editFormData.title.trim()) ? 0.6 : 1
                    }}
                  >
                    {savingTour ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

