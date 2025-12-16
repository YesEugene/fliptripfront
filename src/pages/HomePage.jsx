import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import { isAuthenticated, getCurrentUser, logout } from '../modules/auth/services/authService';
import { getTours } from '../services/api';
import './HomePage.css';

// Top 20 most popular travel destinations
const TOP_CITIES = [
  'Barcelona', 'Paris', 'Amsterdam', 'Berlin', 'London', 
  'Rome', 'Madrid', 'Lisbon', 'New York', 'Tokyo',
  'Prague', 'Vienna', 'Venice', 'Florence', 'Moscow',
  'Istanbul', 'Dubai', 'Sydney', 'Singapore', 'Copenhagen'
];

const AUDIENCES = [
  { value: 'solo', label: 'Solo' },
  { value: 'couples', label: 'Couples' },
  { value: 'family', label: 'Family' },
  { value: 'kids', label: 'Kids' }
];

// Interests will be loaded from API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';

// Category name translations
const CATEGORY_NAMES = {
  'active': 'Active',
  'culture': 'Culture',
  'food': 'Food',
  'nature': 'Nature',
  'nightlife': 'Nightlife',
  'family': 'Family',
  'romantic': 'Romantic',
  'health': 'Health',
  'unique': 'Unique Experiences'
};

// Subcategory name translations
const SUBCATEGORY_NAMES = {
  'relaxation': 'Relaxation',
  'events': 'Events'
};

// Interest name translations
const INTEREST_NAMES = {
  'spa salons': 'SPA Salons',
  'yoga': 'Yoga',
  'hot springs': 'Hot Springs',
  'music festivals': 'Music Festivals',
  'local festivals': 'Local Festivals',
  'conferences': 'Conferences'
};

// POPULAR_TRIPS removed - will be loaded from database

export default function HomePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    city: "",
    audience: "",
    interest_ids: [], // Changed from interests to interest_ids (using IDs from DB)
    date_from: null,
    date_to: null,
    budget: ""
  });
  const [errors, setErrors] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false); // Modal state for filter panel
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // Date range state (single calendar for multi-date selection, max 2 days)
  const [selectedDates, setSelectedDates] = useState([]); // Array of selected dates (max 2)
  
  // Interests system state
  const [interestsStructure, setInterestsStructure] = useState(null);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [availableInterests, setAvailableInterests] = useState([]);
  const [allInterests, setAllInterests] = useState([]); // Store all interests for always-visible display
  
  // Tours from database
  const [tours, setTours] = useState([]);
  const [loadingTours, setLoadingTours] = useState(false);
  
  // Personalized trip preview (shown after filters are applied)
  const [personalizedTripPreview, setPersonalizedTripPreview] = useState(null);
  const [filtersApplied, setFiltersApplied] = useState(false);
  
  // Removed '' state - using simple dropdown only

  // Check authentication on mount
  useEffect(() => {
    try {
      const currentUser = getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  }, []);

  // Track window size for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load interests structure from API
  useEffect(() => {
    const loadInterests = async () => {
      try {
        setLoadingInterests(true);
        const response = await fetch(`${API_BASE_URL}/api/interests?full_structure=true`);
        const data = await response.json();
        if (data.success) {
          setInterestsStructure(data.categories || []);
          // Flatten all interests for easy access (skip subcategories - show all interests directly)
          const flattenedInterests = [];
          data.categories.forEach(category => {
            if (category.direct_interests) {
              category.direct_interests.forEach(interest => {
                flattenedInterests.push({ ...interest, category_id: category.id });
              });
            }
            // Also include interests from subcategories, but treat them as category interests
            if (category.subcategories) {
              category.subcategories.forEach(subcategory => {
                if (subcategory.interests) {
                  subcategory.interests.forEach(interest => {
                    flattenedInterests.push({ 
                      ...interest, 
                      category_id: category.id
                      // Don't store subcategory_id - we skip subcategories
                    });
                  });
                }
              });
            }
          });
          setAllInterests(flattenedInterests);
          // Initially show all interests
          setAvailableInterests(flattenedInterests);
        }
      } catch (err) {
        console.error('Error loading interests:', err);
      } finally {
        setLoadingInterests(false);
      }
    };
    loadInterests();
  }, []);

  // Sync selectedDates with formData
  useEffect(() => {
    if (formData.date_from) {
      const dates = [formData.date_from];
      if (formData.date_to && formData.date_to !== formData.date_from) {
        dates.push(formData.date_to);
        dates.sort();
      }
      setSelectedDates(dates);
    } else {
      setSelectedDates([]);
    }
  }, [formData.date_from, formData.date_to]);

  // Fictional creators for tours
  const creators = [
    { name: 'Michael Balinni', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80' },
    { name: 'Emma Tui', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&q=80' },
    { name: 'George Cloonie', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80' },
    { name: 'Sophie Laurent', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&q=80' },
    { name: 'Marco Rossi', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80' },
    { name: 'Luna Martinez', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&q=80' },
    { name: 'Alex Thompson', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&q=80' },
    { name: 'Isabella Chen', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&q=80' }
  ];

  // Assign random creator to each tour
  const getTourCreator = (tourId) => {
    const index = parseInt(tourId.replace(/-/g, '').substring(0, 8), 16) % creators.length;
    return creators[index];
  };

  // Load tours from database - filter by city and interests
  // Load all tours on initial load, filter when filters are applied
  useEffect(() => {
    const loadTours = async () => {
      try {
        setLoadingTours(true);
        const filters = {};
        // Apply city filter if filters are applied
        if (filtersApplied && formData.city) {
          filters.city = formData.city;
        }
        // Apply interest filter if filters are applied
        if (filtersApplied && formData.interest_ids && formData.interest_ids.length > 0 && allInterests.length > 0) {
          // Get interest names from IDs
          const interestNames = formData.interest_ids
            .map(id => {
              const interest = allInterests.find(i => i.id === id);
              return interest?.name;
            })
            .filter(Boolean);
          if (interestNames.length > 0) {
            filters.interests = interestNames;
          }
        }
        const result = await getTours(filters);
        if (result.success) {
          setTours(result.tours || []);
        }
      } catch (err) {
        console.error('Error loading tours:', err);
        setTours([]);
      } finally {
        setLoadingTours(false);
      }
    };
    // Load tours on mount and when filters change
    loadTours();
  }, [formData.city, formData.interest_ids, allInterests, filtersApplied]);

  // Update availableInterests when category or interest_ids change
  // Show all interests by default, or only interests from selected category
  useEffect(() => {
    if (!selectedCategory) {
      // No category selected - show all interests
      setAvailableInterests(allInterests);
      return;
    }

    // Category selected - show category interests + selected interests from other categories
    // Skip subcategories - show all interests from the category directly
    const categoryInterests = allInterests.filter(interest => 
      interest.category_id === selectedCategory
    );
    const selectedInterestsFromOtherCategories = allInterests.filter(interest => 
      interest.category_id !== selectedCategory && formData.interest_ids.includes(interest.id)
    );
    setAvailableInterests([...categoryInterests, ...selectedInterestsFromOtherCategories]);
  }, [formData.interest_ids, selectedCategory, allInterests]);

  // Random city images for header background
  const cityImages = [
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=600&fit=crop&q=80', // Paris
    'https://images.unsplash.com/photo-1539037116277-4db20889f2d2?w=1200&h=600&fit=crop&q=80', // Barcelona
    'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&h=600&fit=crop&q=80', // Amsterdam
    'https://images.unsplash.com/photo-1587330979470-3595ac045ab0?w=1200&h=600&fit=crop&q=80', // Berlin
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=600&fit=crop&q=80', // London
    'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=1200&h=600&fit=crop&q=80', // Rome
    'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&h=600&fit=crop&q=80', // Lisbon
    'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=600&fit=crop&q=80', // New York
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=600&fit=crop&q=80', // Tokyo
    'https://images.unsplash.com/photo-1541849546-216549ae216d?w=1200&h=600&fit=crop&q=80', // Prague
    'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1200&h=600&fit=crop&q=80', // Vienna
    'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=1200&h=600&fit=crop&q=80', // Venice
    'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?w=1200&h=600&fit=crop&q=80', // Florence
    'https://images.unsplash.com/photo-1513326738677-b964603b136d?w=1200&h=600&fit=crop&q=80', // Moscow
    'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&h=600&fit=crop&q=80', // Istanbul
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&h=600&fit=crop&q=80', // Dubai
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop&q=80', // Sydney
    'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&h=600&fit=crop&q=80', // Singapore
    'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1200&h=600&fit=crop&q=80', // Copenhagen
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=600&fit=crop&q=80&auto=format' // Generic beautiful city
  ];

  const [randomCityImage, setRandomCityImage] = useState('');

  // Select random city image on component mount
  React.useEffect(() => {
    const randomIndex = Math.floor(Math.random() * cityImages.length);
    setRandomCityImage(cityImages[randomIndex]);
  }, []);

  const handleCitySelect = (city) => {
    setFormData(prev => ({ ...prev, city }));
    setIsDropdownOpen(false);
    setShowFilterModal(true); // Open filter modal instead of showing filters inline
  };
  
  const handleCreatePersonalizedTrip = () => {
    setShowFilterModal(true); // Open filter modal
  };
  
  const handleCloseFilterModal = () => {
    setShowFilterModal(false);
  };
  
  const handleShowResults = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setShowFilterModal(false);
      setFiltersApplied(true);
      // Generate personalized trip preview
      const preview = {
        city: formData.city,
        title: `${formData.city} Adventure`,
        subtitle: `Personalized trip for ${formData.audience}`,
        image: randomCityImage
      };
      setPersonalizedTripPreview(preview);
      // Reload tours with filters
      // (tours will be reloaded automatically via useEffect)
    }
  };

  // Inline handlers used instead

  const handleAudienceChange = (audienceValue) => {
    setFormData(prev => ({ 
      ...prev, 
      audience: audienceValue,
      // Clear interests when switching audience
      interest_ids: []
    }));
    // Reset category selection
    setSelectedCategory(null);
    // Keep all interests visible
    setAvailableInterests(allInterests);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
  };

  const handleInterestToggle = (interestId) => {
    setFormData(prev => {
      const newInterestIds = prev.interest_ids.includes(interestId)
        ? prev.interest_ids.filter(id => id !== interestId)
        : [...prev.interest_ids, interestId];
      return { ...prev, interest_ids: newInterestIds };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.city) newErrors.city = "Please select a city.";
    if (!formData.audience) newErrors.audience = "Please select who this is for.";
    if (formData.interest_ids.length === 0) newErrors.interests = "Please select at least one interest.";
    if (!formData.budget || formData.budget === "" || parseInt(formData.budget) <= 0) newErrors.budget = "Please enter a valid budget.";
    if (selectedDates.length === 0) newErrors.date = "Please select a date.";
    
    // Check if dates are in the past
    if (selectedDates.length > 0) {
      const selectedDate = new Date(selectedDates[0]);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare only dates
      if (selectedDate < today) newErrors.date = "Please select a future date.";
    }
    
    // Check if more than 2 days selected
    if (selectedDates.length > 2) {
      newErrors.date = "Maximum 2 days allowed.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Build query params manually to handle interest_ids array
      const params = new URLSearchParams();
      params.append('city', formData.city);
      params.append('audience', formData.audience);
      if (selectedDates.length > 0) {
        params.append('date_from', selectedDates[0]);
        if (selectedDates.length > 1) {
          params.append('date_to', selectedDates[selectedDates.length - 1]);
        } else {
          params.append('date_to', selectedDates[0]); // If only one date selected, use same date for both
        }
      }
      params.append('budget', formData.budget);
      params.append('previewOnly', 'true');
      
      // Add each interest_id as separate parameter
      formData.interest_ids.forEach(id => {
        params.append('interest_ids', id);
      });
      
      navigate(`/itinerary?${params.toString()}`);
    }
  };

  const handleTourClick = (tour) => {
    // Navigate to tour preview page
    navigate(`/itinerary?tourId=${tour.id}&previewOnly=true`);
  };

              return (
                <div style={{ 
                  minHeight: '100vh', 
                  backgroundColor: 'white', 
                  margin: 0, 
                  padding: 0, 
                  position: 'relative',
                  maxWidth: '750px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  {/* Header Section with random city image - always show */}
                    <div className="red-header-section" style={{
                      backgroundImage: randomCityImage ? `url(${randomCityImage})` : 'none',
                      backgroundColor: randomCityImage ? 'transparent' : '#F04C31',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      height: '330px',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      alignItems: 'center',
                      padding: '0',
                      margin: '0',
                      width: '100vw',
                      left: '50%',
                      right: '50%',
                      marginLeft: '-50vw',
                      marginRight: '-50vw',
                      top: 0
                    }}>
                      {/* Dark overlay for better text readability */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        zIndex: 1
                      }} />
          
          {/* Mobile Logo and Auth - Aligned */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'stretch', // Changed from 'center' to 'stretch' to allow full width
            paddingTop: '15px', // Reduced from 30px to 15px (15px higher, total 25px from original)
            flex: 1,
            position: 'relative',
            zIndex: 2,
            width: '100%' // Ensure full width
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
            alignItems: 'center',
              width: '100%',
              paddingLeft: '20px', // Same padding as city form (left: '20px')
              paddingRight: '20px', // Same padding as city form (right: '20px')
              marginBottom: '20px',
              maxWidth: '750px', // Match the main container width
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              {/* Logo - Left aligned with same padding as city form */}
            <img 
              src={FlipTripLogo} 
              alt="FlipTrip" 
              style={{ 
                height: '60px',
                  width: 'auto'
                }}
              />
              {/* Auth buttons - Right aligned, same height as logo */}
              <div style={{ 
                display: 'flex', 
                gap: '12px',
                alignItems: 'center', // Ensure vertical alignment with logo
                height: '60px' // Match logo height for perfect alignment
              }}>
                {user ? (
                  <>
                    <Link
                      to={user.role === 'guide' ? '/guide/dashboard' : '/user/dashboard'}
                      style={{
                        color: 'white',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                      }}
                    >
                      {user.name}
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setUser(null);
                        window.location.reload();
                      }}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Выйти
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      style={{
                        color: 'white',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                      }}
                    >
                      Вход
                    </Link>
                    <Link
                      to="/register"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        textDecoration: 'none',
                        fontWeight: '600'
                      }}
                    >
                      Регистрация
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div style={{
              color: 'white',
              fontSize: '30px',
              fontWeight: 'bold',
              textAlign: 'center',
              lineHeight: '1.3',
              marginTop: '30px', // Added 30px top margin to move text down
              marginBottom: '40px',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              width: '100%',
              maxWidth: '750px',
              marginLeft: 'auto',
              marginRight: 'auto',
              paddingLeft: '20px',
              paddingRight: '20px'
            }}>
              Choose a city.<br />
              We'll craft your journey.
            </div>
          </div>

          {/* Mobile City Selection - Under text */}
          <div className="mobile-city-select" style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 40px)',
            maxWidth: '750px',
            zIndex: 1000,
            display: 'block'
          }}>
            <div style={{ position: 'relative', zIndex: 1000 }}>
                          <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            style={{
                              backgroundColor: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '12px 20px',
                              fontSize: '16px',
                              color: '#6b7280',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                          >
                <span>{formData.city || 'Select a city to continue'}</span>
                <span style={{ fontSize: '12px', marginLeft: 'auto' }}>▼</span>
              </button>
              
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1001,
                  marginTop: '4px',
                  maxHeight: '320px',
                  overflowY: 'auto'
                }}>
                    {TOP_CITIES.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderRadius: '0',
                          transition: 'background-color 0.2s',
                          fontSize: '14px',
                          color: '#374151'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        {city}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Filter Modal - slides up from bottom */}
      {showFilterModal && (
        <>
          {/* Backdrop */}
          <div 
            onClick={handleCloseFilterModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              animation: 'fadeIn 0.3s ease'
            }}
          />
          {/* Filter Panel */}
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
          backgroundColor: 'white',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            padding: '30px 20px',
            maxHeight: '90vh',
            overflowY: 'auto',
            zIndex: 9999,
            animation: 'slideUp 0.3s ease',
          maxWidth: '750px',
            margin: '0 auto'
        }}>
            {/* Close button */}
          <div style={{
            display: 'flex',
              justifyContent: 'flex-end', 
            marginBottom: '20px'
          }}>
              <button
                onClick={handleCloseFilterModal}
                style={{
                  backgroundColor: 'transparent',
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
            
            <form onSubmit={handleShowResults}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                Who's it for?
              </label>
                <div style={{
                display: 'flex', 
                gap: '12px', 
                flexWrap: 'nowrap',
                overflowX: 'auto',
                paddingBottom: '8px',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                msOverflowStyle: '-ms-autohiding-scrollbar'
              }}>
                {AUDIENCES.map((audience) => (
                      <button
                    key={audience.value}
                        type="button"
                    onClick={() => setFormData(prev => ({ ...prev, audience: audience.value }))}
                        style={{
                      padding: '8px 16px',
                      border: `2px solid ${formData.audience === audience.value ? '#3E85FC' : '#e5e7eb'}`,
                      borderRadius: '20px',
                      backgroundColor: formData.audience === audience.value ? '#3E85FC' : 'white',
                      color: formData.audience === audience.value ? 'white' : '#6b7280',
                          cursor: 'pointer',
                          fontSize: '14px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                        }}
                      >
                    {audience.label}
                      </button>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                Pick the vibe
              </label>
              
              {loadingInterests ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  Loading interests...
                </div>
              ) : interestsStructure && interestsStructure.length > 0 ? (
                <>
                  {/* Category Selection */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                      Category
                    </label>
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      flexWrap: 'nowrap',
                      overflowX: 'auto',
                      paddingBottom: '8px',
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'thin',
                      msOverflowStyle: '-ms-autohiding-scrollbar'
                    }}>
                      {interestsStructure.map(category => (
                  <button
                          key={category.id}
                    type="button"
                          onClick={() => handleCategoryChange(category.id)}
                    style={{
                      padding: '8px 16px',
                            border: `2px solid ${selectedCategory === category.id ? '#3E85FC' : '#e5e7eb'}`,
                      borderRadius: '20px',
                            backgroundColor: selectedCategory === category.id ? '#3E85FC' : 'white',
                            color: selectedCategory === category.id ? 'white' : '#6b7280',
                      cursor: 'pointer',
                      fontSize: '14px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                        >
                          {category.icon} {CATEGORY_NAMES[category.name] || category.name}
                  </button>
                ))}
              </div>
            </div>

                  {/* Interests Selection - Show all interests by default, or only from selected category */}
                  {allInterests.length > 0 && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                        Select interests
              </label>
                      <div style={{ 
                        display: isMobile ? 'flex' : 'grid',
                        flexDirection: isMobile ? 'row' : 'column',
                        gridTemplateColumns: !isMobile ? 'repeat(auto-fill, minmax(120px, 1fr))' : 'none',
                        gap: '8px',
                        maxHeight: isMobile ? 'none' : '200px',
                        overflowY: isMobile ? 'visible' : 'auto',
                        overflowX: isMobile ? 'auto' : 'visible',
                        paddingRight: '8px',
                        paddingBottom: isMobile ? '8px' : '0',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'thin'
                      }}>
                        {availableInterests.map(interest => {
                          const category = interestsStructure.find(c => c.id === interest.category_id);
                          const isSelected = formData.interest_ids.includes(interest.id);
                          const isFromSelectedCategory = selectedCategory && interest.category_id === selectedCategory;
                          const isSelectedFromOtherCategory = isSelected && !isFromSelectedCategory;
                          
                          return (
                  <button
                              key={interest.id}
                    type="button"
                              onClick={() => handleInterestToggle(interest.id)}
                    style={{
                      padding: '8px 12px',
                                border: `2px solid ${isSelected ? '#3E85FC' : isFromSelectedCategory ? '#93c5fd' : isSelectedFromOtherCategory ? '#c7d2fe' : '#e5e7eb'}`,
                                borderRadius: '16px',
                                backgroundColor: isSelected ? '#3E85FC' : isFromSelectedCategory ? '#eff6ff' : isSelectedFromOtherCategory ? '#eef2ff' : 'white',
                                color: isSelected ? 'white' : '#6b7280',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      minHeight: '36px',
                                minWidth: isMobile ? '120px' : 'auto',
                      display: 'flex',
                      alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                opacity: 1,
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}
                            >
                              {category?.icon} {INTEREST_NAMES[interest.name] || interest.name}
                  </button>
                          );
                        })}
              </div>
                    </div>
                  )}

                  {/* Selected Interests Display - Always visible, search in allInterests */}
                  {formData.interest_ids.length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>
                        Selected ({formData.interest_ids.length}):
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: isMobile ? 'nowrap' : 'wrap',
                        gap: '6px',
                        overflowX: isMobile ? 'auto' : 'visible',
                        paddingBottom: isMobile ? '8px' : '0',
                        WebkitOverflowScrolling: 'touch'
                      }}>
                        {formData.interest_ids.map(interestId => {
                          // Search in allInterests, not just availableInterests
                          const interest = allInterests.find(i => i.id === interestId);
                          if (!interest) return null;
                          
                          const category = interestsStructure.find(c => c.id === interest.category_id);
                          
                          return (
                            <span
                              key={interestId}
                              style={{
                                padding: '4px 10px',
                                backgroundColor: '#e0e7ff',
                                color: '#3730a3',
                                borderRadius: '12px',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}
                            >
                              {category?.icon} {INTEREST_NAMES[interest.name] || interest.name}
                              <button
                                type="button"
                                onClick={() => handleInterestToggle(interestId)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#3730a3',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  padding: '0',
                                  marginLeft: '4px',
                                  lineHeight: '1',
                                  fontWeight: 'bold'
                                }}
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  Failed to load interests. Please try again later.
                </div>
              )}
              
              {errors.interests && (
                <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>{errors.interests}</p>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {/* Budget Field */}
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                    Trip Budget
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                      placeholder="300"
                      min="1"
                      style={{
                        width: '100%',
                        padding: '12px 40px 12px 16px',
                        border: `2px solid ${errors.budget ? '#ef4444' : '#e5e7eb'}`,
                        borderRadius: '12px',
                        fontSize: '16px',
                        color: '#374151'
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6b7280',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}>
                      €
                    </span>
                  </div>
                  {errors.budget && <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>{errors.budget}</p>}
                </div>

                {/* Trip Date - Single calendar for range selection (max 2 days) */}
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                    Trip date {selectedDates.length > 0 && `(${selectedDates.length} day${selectedDates.length > 1 ? 's' : ''})`}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={selectedDates.length > 0 
                        ? selectedDates.length === 1 
                          ? new Date(selectedDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : `${new Date(selectedDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(selectedDates[selectedDates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : ''}
                      placeholder="Select date(s)"
                      readOnly
                      onClick={(e) => {
                        const dateInput = document.createElement('input');
                        dateInput.type = 'date';
                        dateInput.min = new Date().toISOString().slice(0, 10);
                        // Max date: today + 1 day (to allow max 2 days total)
                        const maxDate = new Date();
                        maxDate.setDate(maxDate.getDate() + 1);
                        dateInput.max = maxDate.toISOString().slice(0, 10);
                        dateInput.value = selectedDates.length > 0 ? selectedDates[0] : '';
                        
                        const rect = e.target.getBoundingClientRect();
                        dateInput.style.position = 'fixed';
                        dateInput.style.left = rect.left + 'px';
                        dateInput.style.top = (rect.bottom + 5) + 'px';
                        dateInput.style.zIndex = '9999';
                        dateInput.style.opacity = '0';
                        dateInput.style.pointerEvents = 'auto';
                        dateInput.style.width = '1px';
                        dateInput.style.height = '1px';
                        
                        document.body.appendChild(dateInput);
                        
                        setTimeout(() => {
                          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                          if (isMobile || !dateInput.showPicker) {
                            dateInput.focus();
                            dateInput.click();
                          } else {
                            dateInput.showPicker();
                          }
                        }, 10);
                        
                        dateInput.onchange = (e) => {
                          const selectedDate = e.target.value;
                          if (!selectedDate) return;
                          
                          setSelectedDates(prev => {
                            if (prev.length === 0) {
                              // First date selected
                              setFormData(formData => ({ ...formData, date_from: selectedDate, date_to: null }));
                              return [selectedDate];
                            } else if (prev.length === 1) {
                              // Second date selected - check if it's within 1 day
                              const firstDate = new Date(prev[0]);
                              const secondDate = new Date(selectedDate);
                              const diffTime = Math.abs(secondDate - firstDate);
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              
                              if (diffDays <= 1) {
                                // Valid range (max 2 days)
                                const dates = [prev[0], selectedDate].sort();
                                setFormData(formData => ({ ...formData, date_from: dates[0], date_to: dates[1] }));
                                return dates;
                              } else {
                                // Reset to new date
                                setFormData(formData => ({ ...formData, date_from: selectedDate, date_to: null }));
                                return [selectedDate];
                              }
                            } else {
                              // Reset to new date
                              setFormData(formData => ({ ...formData, date_from: selectedDate, date_to: null }));
                              return [selectedDate];
                            }
                          });
                          document.body.removeChild(dateInput);
                        };
                        
                        dateInput.onblur = () => {
                          setTimeout(() => {
                            if (document.body.contains(dateInput)) {
                              document.body.removeChild(dateInput);
                            }
                          }, 100);
                        };
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 40px 12px 16px',
                        border: `2px solid ${errors.date ? '#ef4444' : '#e5e7eb'}`,
                        borderRadius: '12px',
                        fontSize: '16px',
                        color: '#374151',
                        cursor: 'pointer',
                        backgroundColor: 'white'
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6b7280',
                      fontSize: '12px'
                    }}>
                      📅
                    </span>
                  </div>
                  {errors.date && <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>{errors.date}</p>}
                </div>
              </div>
            </div>

                        <div style={{ textAlign: 'center' }}>
                          <button
                            type="submit"
                            disabled={!formData.city || !formData.audience || formData.interest_ids.length === 0 || !formData.budget || formData.budget === "" || selectedDates.length === 0}
                            style={{
                              backgroundColor: (!formData.city || !formData.audience || formData.interest_ids.length === 0 || !formData.budget || formData.budget === "" || selectedDates.length === 0) ? '#e0e0e0' : '#3E85FC',
                              color: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '14px 28px',
                              fontSize: '18px',
                              fontWeight: 'bold',
                              cursor: (!formData.city || !formData.audience || formData.interest_ids.length === 0 || !formData.budget || formData.budget === "" || selectedDates.length === 0) ? 'not-allowed' : 'pointer',
                              transition: 'background-color 0.2s ease',
                              width: '100%'
                            }}
                          >
                            Show results
                          </button>
                          <p style={{ 
                            color: '#6b7280', 
                            fontSize: '14px',
                            margin: '10px 0 0 0'
                          }}>
                            Your scenario will be ready in seconds — free preview
                          </p>
                        </div>
          </form>
        </div>
        </>
      )}

        onClick={() => {
          // Navigate to itinerary page with filters
          const params = new URLSearchParams();
          params.append('city', formData.city);
          params.append('audience', formData.audience);
          if (selectedDates.length > 0) {
            params.append('date_from', selectedDates[0]);
            if (selectedDates.length > 1) {
              params.append('date_to', selectedDates[selectedDates.length - 1]);
            } else {
              params.append('date_to', selectedDates[0]);
            }
          }
          params.append('budget', formData.budget);
          params.append('previewOnly', 'true');
          formData.interest_ids.forEach(id => {
            params.append('interest_ids', id);
          });
          navigate(`/itinerary?${params.toString()}`);
        }}
        >
          <img
            src={personalizedTripPreview.image}
            alt={personalizedTripPreview.title}
            style={{
              width: '100%',
              height: '200px',
              objectFit: 'cover'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
            padding: '20px',
            color: 'white'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '5px',
              color: 'white'
            }}>
              {personalizedTripPreview.title}
            </h3>
            <p style={{
              fontSize: '14px',
              opacity: 0.9,
              marginBottom: '15px',
              color: 'white'
            }}>
              {personalizedTripPreview.subtitle}
            </p>
            <button style={{
              backgroundColor: '#FFD700',
              color: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              YOUR PERSONAL TRIP
            </button>
          </div>
        </div>
      )}

      {/* White Section with Tours from Database */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '30px 20px',
        maxWidth: '750px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {(tours.length > 0 || filtersApplied) && (
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '24px'
        }}>
          Take a look at our day plan
        </h2>
        )}
        
        {loadingTours ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Loading tours...
          </div>
        ) : tours.length === 0 && !filtersApplied ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No tours available. {formData.city && 'Try adjusting your filters.'}
          </div>
        ) : (
        <div className="masonry-grid">
            {/* Red Banner - always first if filters not applied */}
            {!filtersApplied && (
              <div
                className="red-banner-card"
                style={{
                  backgroundColor: '#ef4444',
                  borderRadius: '12px',
                  padding: '40px 30px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                  gridColumn: 'span 1',
                  gridRow: 'span 2',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
                }}
                onClick={handleCreatePersonalizedTrip}
              >
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: 'white',
                  marginBottom: '12px',
                  lineHeight: '1.2'
                }}>
                  Create Personalized Trip
                </h2>
                <p style={{
                  fontSize: '16px',
                  color: 'rgba(255, 255, 255, 0.95)',
                  marginBottom: '20px',
                  lineHeight: '1.5'
                }}>
                  Мы возьмем все ваши предпочтения и соберем трип с учетом всех деталей
                </p>
                <button
                  style={{
                    backgroundColor: 'white',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    alignSelf: 'flex-start'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                >
                  START CREATION
                </button>
              </div>
            )}
            
            {/* Personalized Trip Preview - replaces red banner when filters applied */}
            {filtersApplied && personalizedTripPreview && (
              <div
                className="personalized-trip-card"
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                position: 'relative',
                  gridColumn: 'span 1',
                  gridRow: 'span 2',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '30px',
                  color: 'white'
                }}
                onClick={() => {
                  const params = new URLSearchParams();
                  if (formData.city) params.append('city', formData.city);
                  if (formData.audience) params.append('audience', formData.audience);
                  if (formData.interest_ids && formData.interest_ids.length > 0) {
                    formData.interest_ids.forEach(id => {
                      params.append('interest_ids', id);
                    });
                  }
                  navigate(`/itinerary?${params.toString()}`);
                }}
              >
                <div>
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginBottom: '12px',
                    lineHeight: '1.2'
                  }}>
                    {personalizedTripPreview.title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    opacity: 0.9,
                    lineHeight: '1.5'
                  }}>
                    {personalizedTripPreview.subtitle}
                  </p>
                </div>
                <button
                  style={{
                    backgroundColor: 'white',
                    color: '#667eea',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    alignSelf: 'flex-start',
                    marginTop: '20px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                >
                  Your personal trip
                </button>
              </div>
            )}
            
            {/* Tour Cards */}
            {tours.map((tour, index) => {
              const creator = getTourCreator(tour.id);
              // Determine card size: mix of vertical (story format) and horizontal
              // Vertical cards are 1x2, horizontal are 2x1 (half height of vertical)
              // Pattern: vertical, horizontal, vertical, vertical, horizontal, vertical, etc.
              const isVertical = (index % 4) !== 1 && (index % 4) !== 2; // Cards at index 1, 2, 5, 6, 9, 10... are horizontal
              
              // Get preview image - use creator avatar or tour preview
              const previewImage = tour.preview_media_url || creator.avatar || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop&q=80';
              
              // Deterministically decide if it's a video (30% chance based on tour ID)
              const tourIdWithoutDashes = tour.id.replace(/\-/g, '');
              const tourIdHash = parseInt(tourIdWithoutDashes.substring(0, 8), 16);
              const isVideo = (tourIdHash % 10) < 3; // 30% chance
              
              return (
                <div
                  key={tour.id}
                  className={`tour-card ${isVertical ? 'vertical-card' : 'horizontal-card'}`}
                  style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    position: 'relative',
                    gridColumn: 'span 1',
                    gridRow: isVertical ? 'span 2' : 'span 1'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  onClick={() => handleTourClick(tour)}
            >
                  {/* Background Image/Video */}
              <img
                    src={previewImage}
                    alt={tour.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1
                }}
              />
                  
                  {/* Video Play Button Overlay */}
                  {isVideo && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 3,
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}>
                      <div style={{
                        width: 0,
                        height: 0,
                        borderLeft: '15px solid white',
                        borderTop: '10px solid transparent',
                        borderBottom: '10px solid transparent',
                        marginLeft: '3px'
                      }} />
                    </div>
                  )}
              
              {/* Dark overlay for text readability */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6))',
                zIndex: 2
              }} />
              
              {/* Content */}
              <div style={{
                position: 'absolute',
                    bottom: 0,
                left: 0,
                right: 0,
                zIndex: 3,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                    justifyContent: 'flex-end'
                  }}>
                  {/* Title */}
                  <h3 style={{
                      fontSize: isVertical ? '18px' : '16px',
                    fontWeight: 'bold',
                    color: 'white',
                      lineHeight: '1.3',
                      marginBottom: '8px'
                  }}>
                      {tour.title}
                  </h3>
                    
                    {/* Creator */}
                    <div style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      by {creator.name}
                </div>
              </div>
            </div>
              );
            })}
        </div>
        )}
      </div>
    </div>
  );
}