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
import GuideDashboardIntro from './GuideDashboardIntro';
import '../../../pages/ExplorePage.css';
import './GuideDashboardPage.css';

/** First suitable image URL from visualizer blocks for dashboard card (fallback if preview_media_url empty). */
function extractTourCardImageFromBlocks(blocks) {
  if (!Array.isArray(blocks)) return null;
  const sorted = [...blocks].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  for (const b of sorted) {
    const c = b.content || {};
    if (b.block_type === 'photo' || b.block_type === 'photo_text') {
      const ph = c.photos || c.photo;
      const arr = Array.isArray(ph) ? ph : ph ? [ph] : [];
      const u = arr.find((x) => x && typeof x === 'string' && x.trim());
      if (u) return u.trim();
    }
  }
  for (const b of sorted) {
    if (b.block_type !== 'location') continue;
    const c = b.content || {};
    const main = c.mainLocation || (Array.isArray(c.locations) && c.locations[0]) || c;
    const photos = main?.photos || (main?.photo ? [main.photo] : []);
    const arr = Array.isArray(photos) ? photos : [];
    const u = arr.find((x) => x && typeof x === 'string' && x.trim());
    if (u) return u.trim();
  }
  return null;
}

export default function GuideDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('intro'); // 'intro', 'tours', 'profile', 'statistics'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [availabilityTour, setAvailabilityTour] = useState(null); // Tour for which to manage availability
  const [tourBlockCounts, setTourBlockCounts] = useState({}); // Cache for block counts
  const [tourLocationCounts, setTourLocationCounts] = useState({});
  const [tourCardImages, setTourCardImages] = useState({});
  
  // Profile state
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileData, setProfileData] = useState({
    name: '',
    avatar: '',
    bio: '',
    city: '',
    interests: '',
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
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
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
        const toursList = data.tours || [];
        setTours(toursList);
        
        // Load block counts, location counts, and card image (preview URL or first block image)
        const blockCounts = {};
        const locationCounts = {};
        const cardImages = {};
        for (const tour of toursList) {
          const previewUrl =
            (tour.preview_media_url && String(tour.preview_media_url).trim()) || null;
          try {
            const token = localStorage.getItem('authToken');
            if (token && tour.id) {
              const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://fliptripback.vercel.app';
              const response = await fetch(`${API_BASE_URL}/api/tour-content-blocks?tourId=${tour.id}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (response && response.ok) {
                const blocksData = await response.json();
                if (blocksData.success && blocksData.blocks) {
                  const blocks = blocksData.blocks;
                  locationCounts[tour.id] = blocks.filter((b) => b.block_type === 'location').length;
                  // Count blocks excluding 'title' (header) and 'divider'
                  const count = blocks.filter(block => 
                    block.block_type !== 'title' && block.block_type !== 'divider'
                  ).length;
                  // Add 1 for header block (hero block with image)
                  blockCounts[tour.id] = count + 1;
                  cardImages[tour.id] = previewUrl || extractTourCardImageFromBlocks(blocks);
                } else {
                  locationCounts[tour.id] = 0;
                  blockCounts[tour.id] = 0;
                  cardImages[tour.id] = previewUrl;
                }
              } else {
                locationCounts[tour.id] = 0;
                blockCounts[tour.id] = 0;
                cardImages[tour.id] = previewUrl;
              }
            } else {
              locationCounts[tour.id] = 0;
              blockCounts[tour.id] = 0;
              cardImages[tour.id] = previewUrl;
            }
          } catch (error) {
            console.warn(`Could not load blocks for tour ${tour.id}:`, error);
            blockCounts[tour.id] = 0;
            locationCounts[tour.id] = 0;
            cardImages[tour.id] = previewUrl;
          }
        }
        setTourBlockCounts(blockCounts);
        setTourLocationCounts(locationCounts);
        setTourCardImages(cardImages);
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
          city: profile.city || '',
          interests: profile.interests || '',
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

  // Helper function to get block count (excluding header and divider)
  const getBlockCount = async (tour) => {
    try {
      // Try to get blocks from tour_content_blocks
      const token = localStorage.getItem('authToken');
      if (!token || !tour.id) return 0;
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://fliptripback.vercel.app'}/api/tour-content-blocks?tourId=${tour.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success && data.blocks) {
          // Count blocks excluding 'title' (header) and 'divider'
          const count = data.blocks.filter(block => 
            block.block_type !== 'title' && block.block_type !== 'divider'
          ).length;
          // Add 1 for header block (hero block with image)
          return count + 1;
        }
      }
    } catch (error) {
      console.warn('Could not load blocks count:', error);
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

  const displayName = user.name || 'User';
  const avatarSrc = profileData?.avatar ? String(profileData.avatar).trim() : '';

  return (
    <main className="explore-page guide-dashboard">
      <header className="guide-dashboard-header">
        <div className="guide-dashboard-header-inner">
          <Link to="/" className="explore-logo-link" aria-label="FlipTrip home">
            <img src={FlipTripLogo} alt="FlipTrip" className="explore-logo" />
          </Link>
          <h1 className="guide-dashboard-header-title">Guide dashboard</h1>
          <div className="guide-dashboard-header-user">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="guide-dashboard-avatar" />
            ) : (
              <span className="guide-dashboard-avatar-fallback" aria-hidden>
                {displayName.trim().charAt(0).toUpperCase() || '?'}
              </span>
            )}
            <span className="guide-dashboard-user">{displayName}</span>
            <button type="button" className="guide-dashboard-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="guide-dashboard-main">
        <div className="guide-dashboard-toolbar">
          <div className="guide-dashboard-tabs" role="tablist" aria-label="Dashboard sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'intro'}
              className={`guide-dashboard-tab${activeTab === 'intro' ? ' guide-dashboard-tab--active' : ''}`}
              onClick={() => setActiveTab('intro')}
            >
              Intro
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'tours'}
              className={`guide-dashboard-tab${activeTab === 'tours' ? ' guide-dashboard-tab--active' : ''}`}
              onClick={() => setActiveTab('tours')}
            >
              My tours
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'profile'}
              className={`guide-dashboard-tab${activeTab === 'profile' ? ' guide-dashboard-tab--active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'statistics'}
              className={`guide-dashboard-tab${activeTab === 'statistics' ? ' guide-dashboard-tab--active' : ''}`}
              onClick={() => setActiveTab('statistics')}
            >
              Statistics
            </button>
          </div>

          {(activeTab === 'tours' || activeTab === 'intro') && (
            <div className="guide-dashboard-actions">
              <button
                type="button"
                className="guide-dashboard-btn-visualizer"
                onClick={() => navigate('/guide/tours/visualizer')}
              >
                Create trip guide
              </button>
            </div>
          )}
        </div>

        {activeTab === 'intro' && (
          <div className="guide-dashboard-intro-wrap">
            <GuideDashboardIntro />
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'tours' && (
          <>
            <p className="guide-dashboard-muted">Total tours: {tours.length}</p>

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
              <div className="guide-dashboard-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <p style={{ color: '#555', fontSize: '16px', marginBottom: '20px' }}>
                  No tours yet. Create your first tour!
                </p>
                <Link
                  to="/guide/tours/visualizer"
                  className="guide-dashboard-btn-visualizer"
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  Create trip guide
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
                  return (
                    <div 
                      key={tour.id} 
                      className="guide-dashboard-card"
                      style={{
                        padding: '0',
                        transition: 'box-shadow 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {/* Cover image (preview from tour or first block photo) */}
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '16 / 10',
                          background: '#f3f4f6',
                          overflow: 'hidden'
                        }}
                      >
                        {tourCardImages[tour.id] ? (
                          <img
                            src={tourCardImages[tour.id]}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#9ca3af',
                              fontSize: '13px',
                              fontFamily: "'Urbanist', Inter, system-ui, sans-serif"
                            }}
                          >
                            No cover image
                          </div>
                        )}
                      </div>

                      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                          <strong style={{ color: '#111827' }}>City:</strong> {tour.city?.name || tour.city || 'No city'}
                        </p>
                        <p style={{ 
                          color: '#6b7280', 
                          fontSize: '14px',
                          margin: 0
                        }}>
                          <strong style={{ color: '#111827' }}>Blocks:</strong> {tourBlockCounts[tour.id] || 0}
                        </p>
                        <p style={{ 
                          color: '#6b7280', 
                          fontSize: '14px',
                          margin: 0
                        }}>
                          <strong style={{ color: '#111827' }}>Locations:</strong>{' '}
                          {tourLocationCounts[tour.id] ?? 0}
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
                            backgroundColor: '#1c1c1b',
                            color: 'white',
                            borderRadius: '0',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: '600',
                            textAlign: 'center',
                            transition: 'opacity 0.2s',
                            fontFamily: "'Urbanist', Inter, system-ui, sans-serif"
                          }}
                          onMouseEnter={(e) => { e.target.style.opacity = '0.88'; }}
                          onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
                        >
                          View
                        </Link>
                        <Link
                          to={`/guide/tours/visualizer/${tour.id}`}
                          style={{
                            flex: 1,
                            minWidth: '80px',
                            padding: '10px 16px',
                            backgroundColor: 'transparent',
                            color: '#1c1c1b',
                            border: '1px solid #1c1c1b',
                            borderRadius: '0',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: '600',
                            textAlign: 'center',
                            transition: 'background 0.2s, color 0.2s',
                            fontFamily: "'Urbanist', Inter, system-ui, sans-serif"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#1c1c1b';
                            e.target.style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#1c1c1b';
                          }}
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
                        {(() => {
                          // Check if tour supports guide format from various sources
                          const supportsGuide = tour.withGuide || 
                                                tour.default_format === 'with_guide' || 
                                                tour.default_format === 'guided' ||
                                                tour.format === 'guided' ||
                                                tour.format === 'with_guide' ||
                                                (tour.draft_data && tour.draft_data.tourSettings && tour.draft_data.tourSettings.withGuide);
                          
                          return supportsGuide ? (
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
                          ) : null;
                        })()}
                      </div>
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

                <div style={{ marginTop: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    color: '#111827'
                  }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    placeholder="e.g. Lisbon, Rome, Barcelona..."
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
                    The city where you're based or where you create tours
                  </p>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    color: '#111827'
                  }}>
                    Interests
                  </label>
                  <input
                    type="text"
                    value={profileData.interests}
                    onChange={(e) => setProfileData({ ...profileData, interests: e.target.value })}
                    placeholder="e.g. Architecture, Food, History, Street Art..."
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
                    Your interests and areas of expertise, separated by commas
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

      <footer className="explore-footer">
        <img src={FlipTripLogo} alt="FlipTrip" className="explore-footer-logo" />
        <Link to="/about" style={{ color: 'inherit', textDecoration: 'inherit' }}><h4>About project</h4></Link>
        <Link to="/become-local" style={{ color: 'inherit', textDecoration: 'inherit' }}><h4>Locals</h4></Link>
        <span>© flip-trip 2026</span>
      </footer>

      {/* Availability Manager Modal */}
      {availabilityTour && (
        <AvailabilityManager
          tour={availabilityTour}
          onClose={() => setAvailabilityTour(null)}
        />
      )}
    </main>
  );
}
