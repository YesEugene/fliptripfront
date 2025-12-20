/**
 * GuideDashboardPage - Guide Dashboard (B2B)
 * Module: guide-dashboard
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../auth/services/authService';
import { getGuideTours, deleteTour } from '../../tours-database';
import { getGuideProfile, updateGuideProfile } from '../../../modules/guide-profile';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

export default function GuideDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tours'); // 'tours', 'profile', 'statistics'
  
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

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    loadGuideTours();
    loadProfile();
  }, []);

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
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
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
          flexWrap: 'wrap'
        }}>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
              {/* Profile Photo Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
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
                  gap: '20px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    width: '100px',
                    height: '100px',
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
                  
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '14px',
                      marginBottom: '8px'
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
                padding: '24px',
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
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                gridColumn: 'span 2'
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
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                gridColumn: 'span 2'
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
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px'
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
              gap: '12px',
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
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              Statistics will be displayed here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
