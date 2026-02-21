/**
 * Admin Tours Page
 * View and manage all tours
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTours, exportToCSV, getTourById, updateTour, getTags, moderateTour, deleteTours } from '../services/adminService';
import { getCurrentUser } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

export default function AdminToursPage() {
  const [user, setUser] = useState(null);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'approved', 'rejected', 'ai-tours'
  const [selectedTours, setSelectedTours] = useState([]); // For multi-select in AI Tours
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc' for date sorting in AI Tours
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingTourId, setRejectingTourId] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [moderating, setModerating] = useState(false);
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

  // Load cities on component mount - no longer needed, we use API search
  const loadCities = async () => {
    // No need to preload all cities - we'll search via API
    setCities([]);
  };

  // Handle city input change - search via API
  const handleCityInputChange = async (e) => {
    const value = e.target.value;
    setEditFormData({ ...editFormData, city: value });
    
    if (value.length > 1) {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';
        // Search cities via API
        const response = await fetch(`${API_BASE_URL}/api/admin-cities?search=${encodeURIComponent(value)}`);
        const data = await response.json();
        if (data.success && data.cities) {
          setCitySuggestions(data.cities);
          setShowCitySuggestions(data.cities.length > 0);
        } else {
          setCitySuggestions([]);
          setShowCitySuggestions(false);
        }
      } catch (err) {
        console.error('Error searching cities:', err);
        setCitySuggestions([]);
        setShowCitySuggestions(false);
      }
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
      
      // Load tours with filters (works for all tabs including 'pending' and 'ai-tours')
      const filters = {};
      if (searchTerm) {
        filters.search = searchTerm;
      }
      
      // CRITICAL: Handle AI Tours tab separately
      if (activeTab === 'ai-tours') {
        filters.source = 'user_generated';
      } else if (activeTab !== 'all') {
        filters.status = activeTab; // 'pending', 'approved', 'rejected', 'draft'
      }
      // Note: For 'all' tab and status tabs, backend automatically excludes user_generated tours
      
      const data = await getTours(filters);
      let loadedTours = data.tours || [];
      
      // Sort AI Tours by date if on AI Tours tab
      if (activeTab === 'ai-tours') {
        loadedTours = [...loadedTours].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0);
          const dateB = new Date(b.createdAt || b.created_at || 0);
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
      }
      
      // Log tour IDs for debugging
      console.log('Loaded tours:', loadedTours.map(t => ({ id: t.id, title: t.title, status: t.status, source: t.source })));
      setTours(loadedTours);
      
      // Clear selection when switching tabs
      if (activeTab !== 'ai-tours') {
        setSelectedTours([]);
      }
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

      // Reload cities list after successful tour update to include newly created city
      try {
        await loadCities();
      } catch (citiesErr) {
        console.error('Error reloading cities:', citiesErr);
      }

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
    loadTours();
  }, [activeTab, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadTours();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle tour selection for multi-select
  const handleTourSelect = (tourId) => {
    if (activeTab !== 'ai-tours') return; // Only allow selection in AI Tours tab
    
    setSelectedTours(prev => 
      prev.includes(tourId) 
        ? prev.filter(id => id !== tourId)
        : [...prev, tourId]
    );
  };

  // Handle select all / deselect all
  const handleSelectAll = () => {
    if (activeTab !== 'ai-tours') return;
    
    if (selectedTours.length === tours.length) {
      setSelectedTours([]);
    } else {
      setSelectedTours(tours.map(t => t.id));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedTours.length === 0) {
      alert('Please select at least one tour to delete');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${selectedTours.length} tour(s)? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      const result = await deleteTours(selectedTours);
      if (result.success || result.deleted > 0) {
        alert(`Successfully deleted ${result.deleted} tour(s)`);
        setSelectedTours([]);
        loadTours(); // Reload tours list
      } else {
        alert('Some tours failed to delete. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting tours:', err);
      alert('Error deleting tours: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if tour has format selected
  const hasTourFormat = (tour) => {
    // Check default_format field
    if (tour.default_format && (tour.default_format === 'self_guided' || tour.default_format === 'with_guide')) {
      return true;
    }
    
    // Check draft_data.tourSettings for tours created in Visualizer
    if (tour.draft_data && tour.draft_data.tourSettings) {
      const settings = tour.draft_data.tourSettings;
      if (settings.selfGuided === true || settings.withGuide === true) {
        return true;
      }
    }
    
    // Check legacy fields
    if (tour.format && (tour.format === 'self-guided' || tour.format === 'guided' || tour.format === 'self_guided' || tour.format === 'with_guide')) {
      return true;
    }
    
    if (tour.withGuide === true) {
      return true;
    }
    
    return false;
  };

  // Handle approve tour
  const handleApproveTour = async (tourId) => {
    // Validate tourId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!tourId || !uuidRegex.test(tourId)) {
      console.error('Invalid tourId format:', tourId, 'Type:', typeof tourId);
      alert('Error: Invalid tour ID format. Please refresh the page and try again.');
      return;
    }

    // Find tour in the list to check format
    const tour = tours.find(t => t.id === tourId);
    if (tour && !hasTourFormat(tour)) {
      alert('Cannot approve tour: Tour format (Self-guided or With Guide) must be selected in Tour Settings before approval.');
      return;
    }

    if (!window.confirm('Are you sure you want to approve this tour? It will be published and visible to all users.')) {
      return;
    }

    try {
      setModerating(true);
      console.log('Approving tour with ID:', tourId);
      await moderateTour(tourId, 'approve');
      alert('Tour approved successfully!');
      loadTours(); // Reload tours list
    } catch (err) {
      console.error('Error approving tour:', err);
      alert('Error approving tour: ' + err.message);
    } finally {
      setModerating(false);
    }
  };

  // Handle reject tour
  const handleRejectTour = async () => {
    if (!rejectingTourId) return;
    if (!rejectComment.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setModerating(true);
      await moderateTour(rejectingTourId, 'reject', rejectComment);
      alert('Tour rejected successfully!');
      setShowRejectModal(false);
      setRejectingTourId(null);
      setRejectComment('');
      loadTours(); // Reload tours list
    } catch (err) {
      console.error('Error rejecting tour:', err);
      alert('Error rejecting tour: ' + err.message);
    } finally {
      setModerating(false);
    }
  };

  // Open reject modal
  const handleRejectClick = (tourId) => {
    setRejectingTourId(tourId);
    setRejectComment('');
    setShowRejectModal(true);
  };

  if (!user) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div className="admin-full-width" style={{ minHeight: '100vh', backgroundColor: '#f9fafb', width: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px 32px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '24px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '100%',
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
      <div style={{ width: '100%', padding: '0 32px', boxSizing: 'border-box' }}>
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

        {/* Tabs */}
        <div style={{ 
          marginBottom: '24px',
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === 'all' ? '3px solid #3b82f6' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'all' ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              fontWeight: activeTab === 'all' ? '600' : '400',
              fontSize: '16px'
            }}
          >
            All Tours
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === 'pending' ? '3px solid #f59e0b' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'pending' ? '#f59e0b' : '#6b7280',
              cursor: 'pointer',
              fontWeight: activeTab === 'pending' ? '600' : '400',
              fontSize: '16px',
              position: 'relative'
            }}
          >
            Pending Moderation
            {tours.filter(t => t.status === 'pending').length > 0 && (
              <span style={{
                marginLeft: '8px',
                padding: '2px 8px',
                backgroundColor: '#f59e0b',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {tours.filter(t => t.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === 'approved' ? '3px solid #10b981' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'approved' ? '#10b981' : '#6b7280',
              cursor: 'pointer',
              fontWeight: activeTab === 'approved' ? '600' : '400',
              fontSize: '16px'
            }}
          >
            Approved
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === 'rejected' ? '3px solid #ef4444' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'rejected' ? '#ef4444' : '#6b7280',
              cursor: 'pointer',
              fontWeight: activeTab === 'rejected' ? '600' : '400',
              fontSize: '16px'
            }}
          >
            Rejected
          </button>
          <button
            onClick={() => setActiveTab('ai-tours')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderBottom: activeTab === 'ai-tours' ? '3px solid #8b5cf6' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'ai-tours' ? '#8b5cf6' : '#6b7280',
              cursor: 'pointer',
              fontWeight: activeTab === 'ai-tours' ? '600' : '400',
              fontSize: '16px',
              position: 'relative'
            }}
          >
            AI Tours
            {tours.filter(t => t.source === 'user_generated').length > 0 && (
              <span style={{
                marginLeft: '8px',
                padding: '2px 8px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {tours.filter(t => t.source === 'user_generated').length}
              </span>
            )}
          </button>
        </div>

        {/* Search and AI Tours Controls */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search tours..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
          
          {/* AI Tours specific controls */}
          {activeTab === 'ai-tours' && (
            <>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Sort by date:</span>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {sortOrder === 'asc' ? '↑ Oldest First' : '↓ Newest First'}
                </button>
              </div>
              
              {selectedTours.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  🗑️ Delete Selected ({selectedTours.length})
                </button>
              )}
              
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Total: {tours.length} tour{tours.length !== 1 ? 's' : ''}
              </div>
            </>
          )}
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
            overflow: 'hidden',
            width: '100%'
          }}>
            <div style={{
              overflowX: 'auto',
              width: '100%',
              WebkitOverflowScrolling: 'touch'
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                minWidth: '800px' // Минимальная ширина для корректного отображения на мобильных
              }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  {activeTab === 'ai-tours' && (
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedTours.length === tours.length && tours.length > 0}
                        onChange={handleSelectAll}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </th>
                  )}
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Title</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Guide</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>City</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tours.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'ai-tours' ? '7' : '6'} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      No tours found
                    </td>
                  </tr>
                ) : (
                  tours.map((tour) => (
                    <tr key={tour.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      {activeTab === 'ai-tours' && (
                        <td style={{ padding: '12px' }}>
                          <input
                            type="checkbox"
                            checked={selectedTours.includes(tour.id)}
                            onChange={() => handleTourSelect(tour.id)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                      )}
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
                          backgroundColor: 
                            tour.status === 'approved' ? '#d1fae5' :
                            tour.status === 'pending' ? '#fef3c7' :
                            tour.status === 'rejected' ? '#fee2e2' :
                            '#e5e7eb',
                          color: 
                            tour.status === 'approved' ? '#065f46' :
                            tour.status === 'pending' ? '#92400e' :
                            tour.status === 'rejected' ? '#991b1b' :
                            '#374151',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'capitalize'
                        }}>
                          {tour.status || 'draft'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>
                        {tour.created_at ? new Date(tour.created_at).toLocaleDateString() : 
                         tour.createdAt ? new Date(tour.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        display: 'flex', 
                        gap: '8px', 
                        flexWrap: 'nowrap',
                        whiteSpace: 'nowrap'
                      }}>
                        <Link
                          to={`/itinerary?tourId=${tour.id}&full=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'inline-block'
                          }}
                        >
                          👁️ View
                        </Link>
                        <Link
                          to={`/guide/tours/visualizer/${tour.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#fbbf24',
                            color: '#111827',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'inline-block'
                          }}
                          title="Edit tour in Visualizer (full editor)"
                        >
                          ✏️ Visualizer
                        </Link>
                        {tour.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveTour(tour.id)}
                              disabled={moderating}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: moderating ? '#9ca3af' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: moderating ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectClick(tour.id)}
                              disabled={moderating}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: moderating ? '#9ca3af' : '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: moderating ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}
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
                            {city.displayName || city.name}
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
                    <option value="pending">Pending Moderation</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
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

      {/* Reject Tour Modal */}
      {showRejectModal && (
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
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
              Reject Tour
            </h2>
            <p style={{ marginBottom: '16px', color: '#6b7280' }}>
              Please provide a reason for rejecting this tour. This comment will be visible to the tour creator.
            </p>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                marginBottom: '20px',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingTourId(null);
                  setRejectComment('');
                }}
                disabled={moderating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: moderating ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectTour}
                disabled={moderating || !rejectComment.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: moderating || !rejectComment.trim() ? '#9ca3af' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: moderating || !rejectComment.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                {moderating ? 'Rejecting...' : 'Reject Tour'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

