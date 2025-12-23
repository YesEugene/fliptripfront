/**
 * GuideDashboardPage - Guide Dashboard (B2B)
 * Module: guide-dashboard
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../auth/services/authService';
import { getGuideTours, deleteTour } from '../../tours-database';
import { getGuideProfile, updateGuideProfile } from '../../../modules/guide-profile';
import AvailabilityManager from '../components/AvailabilityManager';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

export default function GuideDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tours'); // 'tours', 'profile', 'statistics'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [availabilityTour, setAvailabilityTour] = useState(null); // Tour for which to manage availability
  
  // Profile state
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileData, setProfileData] = useState({
    name: '',
    avatar: '',
    bio: '',
    socialLinks: {
      instagram: '',
      facebook: '',
      twitter: '',
      website: ''
    }
  });

  // Statistics state
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    loadGuideTours();
    loadProfile();
    
    // Handle window resize for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load statistics when Statistics tab is active
  useEffect(() => {
    if (activeTab === 'statistics') {
      loadStatistics();
    }
  }, [activeTab]);

  const loadGuideTours = async () => {
    try {
      setLoading(true);
      const data = await getGuideTours();
      if (data.success) {
        setTours(data.tours || []);
      }
    } catch (error) {
      console.error('Error loading guide tours:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('❌ No auth token found');
        throw new Error('Not authenticated');
      }

      // Use correct backend URL
      const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';
      console.log('📊 Loading statistics from:', `${API_BASE_URL}/api/guide-stats`);
      
      const response = await fetch(`${API_BASE_URL}/api/guide-stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Statistics response status:', response.status);

      const data = await response.json();
      console.log('📊 Statistics data:', data);

      if (!response.ok || !data.success) {
        console.error('❌ Statistics API error:', data.error || data);
        throw new Error(data.error || 'Failed to fetch statistics');
      }

      console.log('✅ Statistics loaded:', {
        stats: data.stats,
        notificationsCount: data.recentNotifications?.length || 0,
        bookingsCount: data.recentBookings?.length || 0
      });

      setStats(data.stats);
      setNotifications(data.recentNotifications || []);
      setRecentBookings(data.recentBookings || []);
    } catch (error) {
      console.error('❌ Error loading statistics:', error);
      // Set empty state on error
      setStats(null);
      setNotifications([]);
      setRecentBookings([]);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleDeleteTour = async (tourId, tourTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${tourTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTour(tourId);
      // Reload tours after deletion
      loadGuideTours();
    } catch (error) {
      console.error('Error deleting tour:', error);
      alert('Failed to delete tour. Please try again.');
    }
  };

  // Load profile data
  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      const profile = await getGuideProfile();
      if (profile) {
        setProfileData({
          name: profile.name || '',
          avatar: profile.avatar || '',
          bio: profile.bio || '',
          socialLinks: profile.socialLinks || {
            instagram: '',
            facebook: '',
            twitter: '',
            website: ''
          }
        });
      } else {
        // Initialize with user name if profile doesn't exist
        const currentUser = getCurrentUser();
        if (currentUser) {
          setProfileData(prev => ({
            ...prev,
            name: currentUser.name || ''
          }));
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      // Profile might not exist yet, that's okay
      const currentUser = getCurrentUser();
      if (currentUser) {
        setProfileData(prev => ({
          ...prev,
          name: currentUser.name || ''
        }));
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle avatar change
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setProfileError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setProfileError('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({
          ...prev,
          avatar: reader.result // base64 string
        }));
        setProfileError('');
      };
      reader.onerror = () => {
        setProfileError('Error reading image file');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle social link change
  const handleSocialLinkChange = (platform, value) => {
    setProfileData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  // Handle profile save
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);

    try {
      const result = await updateGuideProfile(profileData);
      if (result.success) {
        setProfileSuccess('Profile updated successfully!');
        setTimeout(() => {
          setProfileSuccess('');
        }, 3000);
      }
    } catch (err) {
      setProfileError(err.message || 'Error updating profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Helper function to get location count from tour structure
  const getLocationCount = (tour) => {
    // Count locations from daily_plan structure
    if (tour.daily_plan && Array.isArray(tour.daily_plan)) {
      let locationCount = 0;
      tour.daily_plan.forEach(day => {
        if (day.blocks && Array.isArray(day.blocks)) {
          day.blocks.forEach(block => {
            if (block.items && Array.isArray(block.items)) {
              locationCount += block.items.length;
            }
          });
        }
      });
      return locationCount;
    }
    // Try to get from tour_days structure (if API returns it)
    if (tour.tour_days && Array.isArray(tour.tour_days)) {
      let locationCount = 0;
      tour.tour_days.forEach(day => {
        if (day.tour_blocks && Array.isArray(day.tour_blocks)) {
          day.tour_blocks.forEach(block => {
            if (block.tour_items && Array.isArray(block.tour_items)) {
              locationCount += block.tour_items.length;
            }
          });
        }
      });
      return locationCount;
    }
    return 0;
  };

  // Helper function to format duration (same logic as homepage)
  // If tour is 1 day, show hours. If more than 1 day, show days.
  const formatDuration = (tour) => {
    // Use duration object from API response
    if (tour.duration && tour.duration.type && tour.duration.value) {
      const { type, value } = tour.duration;
      
      // If it's a single day tour, show hours instead
      if (type === 'days' && value === 1) {
        // Calculate hours from daily_plan or use default
        let totalHours = 0;
        if (tour.daily_plan && Array.isArray(tour.daily_plan)) {
          tour.daily_plan.forEach(day => {
            if (day.blocks && Array.isArray(day.blocks)) {
              totalHours += day.blocks.length * 3; // Estimate 3 hours per block
            }
          });
        }
        // Use calculated hours or default to 6 hours
        const hours = totalHours > 0 ? Math.max(3, Math.min(totalHours, 12)) : 6;
        return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      }
      
      // For multi-day tours, show days
      if (type === 'days' && value > 1) {
        return `${value} ${value === 1 ? 'day' : 'days'}`;
      }
      
      // For hours (single day tours that are already in hours)
      if (type === 'hours') {
        return `${value} ${value === 1 ? 'hour' : 'hours'}`;
      }
    }
    
    // Fallback: try legacy format
    if (tour.duration_value && tour.duration_type) {
      const value = tour.duration_value;
      const type = tour.duration_type;
      
      // If single day, show hours
      if (type === 'days' && value === 1) {
        return '6 hours'; // Default for single day
      }
      
      // Format normally
      if (type === 'days') {
        return `${value} ${value === 1 ? 'day' : 'days'}`;
      }
      if (type === 'hours') {
        return `${value} ${value === 1 ? 'hour' : 'hours'}`;
      }
    }
    
    return '0 hours';
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header - Full width */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        width: '100%',
        margin: 0,
        padding: 0
      }}>
        <div style={{
          maxWidth: '100%',
          width: '100%',
          margin: '0 auto',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <img src={FlipTripLogo} alt="FlipTrip" style={{ height: '40px' }} />
          </Link>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ color: '#374151', fontSize: '16px', fontWeight: '500' }}>
              {user.name || 'User'}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px', width: '100%' }}>
        {/* Title */}
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: '#111827',
          marginBottom: '24px'
        }}>
          Guide dashboard
        </h1>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('tours')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'tours' ? '#111827' : 'white',
              color: activeTab === 'tours' ? 'white' : '#111827',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'tours' ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'tours') {
                e.target.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'tours') {
                e.target.style.backgroundColor = 'white';
              }
            }}
          >
            My tours
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'profile' ? '#111827' : 'white',
              color: activeTab === 'profile' ? 'white' : '#111827',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'profile' ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'profile') {
                e.target.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'profile') {
                e.target.style.backgroundColor = 'white';
              }
            }}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'statistics' ? '#111827' : 'white',
              color: activeTab === 'statistics' ? 'white' : '#111827',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'statistics' ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'statistics') {
                e.target.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'statistics') {
                e.target.style.backgroundColor = 'white';
              }
            }}
          >
            Statistics
          </button>
          </div>
          
          {/* Action buttons - visible only on My tours tab */}
          {activeTab === 'tours' && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/guide/tours/create')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#3b82f6';
                }}
              >
                Create new trip
              </button>
              <button
                onClick={() => navigate('/guide/tours/visualizer')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#10b981';
                }}
              >
                Trip Visualizer
              </button>
            </div>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'tours' && (
          <>
            {/* Total tours count */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ 
                color: '#6b7280', 
                fontSize: '16px',
                margin: 0
              }}>
                Total tours: {tours.length}
              </p>
            </div>

            {/* Tours Grid */}
            {loading ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                color: '#6b7280'
              }}>
                Loading...
              </div>
            ) : tours.length === 0 ? (
              <div style={{ 
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '20px' }}>
                  No tours yet. Create your first tour!
                </p>
                <Link
                  to="/guide/tours/create"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '16px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                >
                  + Create Tour
                </Link>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
              }}>
                {tours.map((tour) => {
                  const locationCount = getLocationCount(tour);
                  return (
                    <div 
                      key={tour.id} 
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        transition: 'box-shadow 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
                    >
                      {/* Tour Title */}
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        color: '#111827',
                        margin: 0,
                        lineHeight: '1.3'
                      }}>
                        {tour.title || 'Untitled Tour'}
                      </h3>

                      {/* Tour Details */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <p style={{ 
                          color: '#6b7280', 
                          fontSize: '14px',
                          margin: 0
                        }}>
                          {tour.city || 'No city'}
                        </p>
                        <p style={{ 
                          color: '#6b7280', 
                          fontSize: '14px',
                          margin: 0
                        }}>
                          {locationCount} {locationCount === 1 ? 'location' : 'locations'}
                        </p>
                        <p style={{ 
                          color: '#6b7280', 
                          fontSize: '14px',
                          margin: 0
                        }}>
                          {formatDuration(tour)}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px',
                        marginTop: 'auto',
                        flexWrap: 'wrap'
                      }}>
                        <Link
                          to={`/itinerary?tourId=${tour.id}&full=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1,
                            minWidth: '80px',
                            padding: '10px 16px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: '500',
                            textAlign: 'center',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                        >
                          View
                        </Link>
                        <Link
                          to={`/guide/tours/edit/${tour.id}`}
                          style={{
                            flex: 1,
                            minWidth: '80px',
                            padding: '10px 16px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: '500',
                            textAlign: 'center',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteTour(tour.id, tour.title)}
                          style={{
                            flex: 1,
                            minWidth: '80px',
                            padding: '10px 16px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                        >
                          Delete
                        </button>
                        {/* Manage Availability button - only for tours with guide */}
                        {(tour.withGuide || tour.default_format === 'with_guide' || tour.format === 'guided') && (
                          <button
                            onClick={() => setAvailabilityTour(tour)}
                            style={{
                              flex: 1,
                              minWidth: '80px',
                              padding: '10px 16px',
                              backgroundColor: '#8b5cf6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#7c3aed'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#8b5cf6'}
                          >
                            Availability
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSave}>
            {/* Error/Success Messages */}
            {profileError && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div style={{
                backgroundColor: '#d1fae5',
                color: '#065f46',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                {profileSuccess}
              </div>
            )}

            {/* Profile Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: isMobile ? '16px' : '20px',
              marginBottom: '24px'
            }}>
              {/* Profile Photo Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: isMobile ? '16px' : '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#111827',
                  marginBottom: '20px'
                }}>
                  Profile photo
                </h2>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: isMobile ? '16px' : '20px',
                  flexWrap: 'wrap',
                  flexDirection: isMobile ? 'column' : 'row'
                }}>
                  <div style={{
                    width: isMobile ? '80px' : '100px',
                    height: isMobile ? '80px' : '100px',
                    borderRadius: '50%',
                    backgroundColor: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '2px solid #d1d5db',
                    flexShrink: 0
                  }}>
                    {profileData.avatar ? (
                      <img 
                        src={profileData.avatar} 
                        alt="Avatar" 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover' 
                        }} 
                      />
                    ) : (
                      <span style={{ fontSize: '40px', color: '#9ca3af' }}>👤</span>
                    )}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: isMobile ? '100%' : '150px', width: isMobile ? '100%' : 'auto' }}>
                    <label style={{
                      display: 'inline-block',
                      padding: isMobile ? '10px 16px' : '10px 20px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: isMobile ? '13px' : '14px',
                      marginBottom: '8px',
                      width: isMobile ? '100%' : 'auto',
                      textAlign: isMobile ? 'center' : 'left'
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                      />
                      Choose photo
                    </label>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                      JPG, PNG or GIF. Max size 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Information Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: isMobile ? '16px' : '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#111827',
                  marginBottom: '20px'
                }}>
                  Personal information
                </h2>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    color: '#111827'
                  }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    placeholder="Your name"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', margin: 0 }}>
                    This name will be displayed in tour previews and your profile
                  </p>
                </div>
              </div>

              {/* About Me Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: isMobile ? '16px' : '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                gridColumn: isMobile ? 'span 1' : 'span 2'
              }}>
                <h2 style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#111827',
                  marginBottom: '20px'
                }}>
                  About me
                </h2>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    color: '#111827'
                  }}>
                    Biography
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    placeholder="Share your story and expertise with potential travelers."
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Social Media & Links Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: isMobile ? '16px' : '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                gridColumn: isMobile ? 'span 1' : 'span 2'
              }}>
                <h2 style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#111827',
                  marginBottom: '20px'
                }}>
                  Social Media & Links
                </h2>
                
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: isMobile ? '12px' : '16px'
                }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500',
                      color: '#111827'
                    }}>
                      Instagram
                    </label>
                    <input
                      type="text"
                      value={profileData.socialLinks.instagram}
                      onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                      placeholder="@yourname"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500',
                      color: '#111827'
                    }}>
                      Facebook
                    </label>
                    <input
                      type="text"
                      value={profileData.socialLinks.facebook}
                      onChange={(e) => handleSocialLinkChange('facebook', e.target.value)}
                      placeholder="@yourname"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500',
                      color: '#111827'
                    }}>
                      Twitter (X)
                    </label>
                    <input
                      type="text"
                      value={profileData.socialLinks.twitter}
                      onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                      placeholder="@yourname"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500',
                      color: '#111827'
                    }}>
                      Website
                    </label>
                    <input
                      type="text"
                      value={profileData.socialLinks.website}
                      onChange={(e) => handleSocialLinkChange('website', e.target.value)}
                      placeholder="yourwebsite.com"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '12px',
              marginTop: '20px'
            }}>
              <button
                type="submit"
                disabled={profileSaving}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: profileSaving ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: profileSaving ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!profileSaving) {
                    e.target.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!profileSaving) {
                    e.target.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                {profileSaving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileError('');
                  setProfileSuccess('');
                  loadProfile(); // Reset to saved values
                }}
                style={{
                  padding: '14px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {activeTab === 'statistics' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {statsLoading ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '40px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading statistics...</p>
              </div>
            ) : stats ? (
              <>
                {/* Guided Tours Statistics */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#111827' }}>
                    Guided Tours (with Guide)
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        Total Bookings
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
                        {stats.bookings.guided || 0}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        Confirmed
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                        {stats.bookings.confirmedGuided || 0}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        Revenue
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
                        {Object.entries(stats.revenue.byCurrency).map(([currency, _]) => (
                          <div key={currency}>
                            {currency} {(stats.revenue.guided || 0).toFixed(2)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* PDF Purchases Statistics */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#111827' }}>
                    PDF Purchases (Self-guided)
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        Total Purchases
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
                        {stats.bookings.selfGuided || 0}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        Revenue
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>
                        {Object.entries(stats.revenue.byCurrency).map(([currency, _]) => (
                          <div key={currency}>
                            {currency} {(stats.revenue.selfGuided || 0).toFixed(2)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Card */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px'
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      Total Revenue
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
                      {Object.entries(stats.revenue.byCurrency).map(([currency, amount]) => (
                        <div key={currency}>
                          {currency} {amount.toFixed(2)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      Unread Notifications
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: stats.notifications.unread > 0 ? '#ef4444' : '#1f2937' }}>
                      {stats.notifications.unread}
                    </div>
                  </div>
                </div>

                {/* Notifications Section */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>
                    Recent Notifications
                  </h3>
                  {notifications.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>No notifications yet</p>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px',
                      maxHeight: '320px',
                      overflowY: 'auto',
                      paddingRight: '8px'
                    }}>
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          style={{
                            padding: '16px',
                            borderRadius: '8px',
                            backgroundColor: notification.is_read ? '#f9fafb' : '#eff6ff',
                            borderLeft: notification.is_read ? '3px solid transparent' : '3px solid #3b82f6'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                            <div style={{ fontWeight: '600', color: '#111827' }}>
                              {notification.title}
                            </div>
                            {!notification.is_read && (
                              <span style={{
                                backgroundColor: '#ef4444',
                                color: 'white',
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '12px'
                              }}>
                                NEW
                              </span>
                            )}
                          </div>
                          <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
                            {notification.message}
                          </div>
                          <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                            {new Date(notification.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Bookings Section */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>
                    Recent Bookings
                  </h3>
                  {recentBookings.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>No bookings yet</p>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px',
                      maxHeight: '320px',
                      overflowY: 'auto',
                      paddingRight: '8px'
                    }}>
                      {recentBookings.map((booking) => (
                        <div
                          key={booking.id}
                          style={{
                            padding: '16px',
                            borderRadius: '8px',
                            backgroundColor: '#f9fafb',
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <div style={{ fontWeight: '600', color: '#111827' }}>
                                  {booking.tour_title}
                                </div>
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: booking.tour_type === 'guided' ? '#dbeafe' : '#f3f4f6',
                                  color: booking.tour_type === 'guided' ? '#1e40af' : '#6b7280',
                                  fontWeight: '500'
                                }}>
                                  {booking.tour_type === 'guided' ? 'Guided' : 'PDF'}
                                </span>
                              </div>
                              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                                {booking.customer_name} • {new Date(booking.tour_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: '600', color: '#111827' }}>
                                {booking.currency} {booking.total_price}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                backgroundColor: booking.status === 'confirmed' ? '#d1fae5' : 
                                                booking.status === 'pending' ? '#fef3c7' : 
                                                booking.status === 'cancelled' ? '#fee2e2' : '#e0e7ff',
                                color: booking.status === 'confirmed' ? '#065f46' : 
                                       booking.status === 'pending' ? '#92400e' : 
                                       booking.status === 'cancelled' ? '#991b1b' : '#3730a3',
                                display: 'inline-block',
                                marginTop: '4px'
                              }}>
                                {booking.status}
                              </div>
                            </div>
                          </div>
                          <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                            {booking.tour_type === 'guided' ? `Group size: ${booking.group_size} • ` : ''}
                            Created: {new Date(booking.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '40px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <p style={{ color: '#6b7280', fontSize: '16px' }}>
                  Failed to load statistics
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Availability Manager Modal */}
      {availabilityTour && (
        <AvailabilityManager
          tour={availabilityTour}
          onClose={() => setAvailabilityTour(null)}
        />
      )}
    </div>
  );
}
