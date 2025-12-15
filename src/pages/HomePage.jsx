import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import { isAuthenticated, getCurrentUser, logout } from '../modules/auth/services/authService';
import FlipTripPhoto from '../assets/FlipTripPhoto.svg';
import ParisImage from '../assets/Paris.svg';
import BarcelonaImage from '../assets/Barcelona.svg';
import RomeImage from '../assets/Rome.svg';
import LisbonImage from '../assets/Lisbon.svg';
import ExamplePlanCard from '../components/ExamplePlanCard';
import './HomePage.css';

// Top 20 most popular travel destinations
const TOP_CITIES = [
  'Barcelona', 'Paris', 'Amsterdam', 'Berlin', 'London', 
  'Rome', 'Madrid', 'Lisbon', 'New York', 'Tokyo',
  'Prague', 'Vienna', 'Venice', 'Florence', 'Moscow',
  'Istanbul', 'Dubai', 'Sydney', 'Singapore', 'Copenhagen'
];

const AUDIENCES = [
  { value: 'him', label: 'Him' },
  { value: 'her', label: 'Her' },
  { value: 'couples', label: 'Couples' },
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

const POPULAR_TRIPS = [
  {
    id: 1,
    title: "Relax weekend in Paris",
    image: ParisImage,
    interests: "Spa, Relaxation",
    city: "Paris",
    audience: "her",
    interestsList: ["relaxation", "spa"],
    budget: "500",
    exampleId: "paris-spa-relaxation"
  },
  {
    id: 2,
    title: "Adventure in Barcelona",
    image: BarcelonaImage,
    interests: "Cycling, Architecture",
    city: "Barcelona",
    audience: "him",
    interestsList: ["sports", "art"],
    budget: "300",
    exampleId: "barcelona-cycling-architecture"
  },
  {
    id: 3,
    title: "A Day of Inspiration in Rome",
    image: RomeImage,
    interests: "Day of Emma Watson",
    city: "Rome",
    audience: "her",
    interestsList: ["culture", "art"],
    budget: "400",
    exampleId: "rome-family-city-gems"
  },
  {
    id: 4,
    title: "Romantic Day in Lisbon",
    image: LisbonImage,
    interests: "Romantic, Culture",
    city: "Lisbon",
    audience: "couples",
    interestsList: ["culture", "food"],
    budget: "350",
    exampleId: "lisbon-romantic-culture"
  }
];

export default function HomePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    city: "",
    audience: "",
    interest_ids: [], // Changed from interests to interest_ids (using IDs from DB)
    date: new Date().toISOString().slice(0, 10), // Current date as default
    budget: ""
  });
  const [errors, setErrors] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  
  // Interests system state
  const [interestsStructure, setInterestsStructure] = useState(null);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [availableInterests, setAvailableInterests] = useState([]);
  const [allInterests, setAllInterests] = useState([]); // Store all interests for always-visible display
  
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

  // Load interests structure from API
  useEffect(() => {
    const loadInterests = async () => {
      try {
        setLoadingInterests(true);
        const response = await fetch(`${API_BASE_URL}/api/interests?full_structure=true`);
        const data = await response.json();
        if (data.success) {
          setInterestsStructure(data.categories || []);
          // Flatten all interests for easy access
          const flattenedInterests = [];
          data.categories.forEach(category => {
            if (category.direct_interests) {
              category.direct_interests.forEach(interest => {
                flattenedInterests.push({ ...interest, category_id: category.id });
              });
            }
            if (category.subcategories) {
              category.subcategories.forEach(subcategory => {
                if (subcategory.interests) {
                  subcategory.interests.forEach(interest => {
                    flattenedInterests.push({ 
                      ...interest, 
                      category_id: category.id,
                      subcategory_id: subcategory.id 
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
    setShowFilters(true);
  };

  // Inline handlers used instead

  const handleAudienceChange = (e) => {
    const newAudience = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      audience: newAudience,
      // Clear interests when switching audience
      interest_ids: []
    }));
    // Reset category/subcategory selection
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    // Keep all interests visible
    setAvailableInterests(allInterests);
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    // Always show all interests, but we'll highlight the selected category
    // This way selected interests from other categories remain visible
    if (!categoryId) {
      setAvailableInterests(allInterests);
      return;
    }
    
    // Still show all interests, but we'll use categoryId for highlighting
    setAvailableInterests(allInterests);
  };

  const handleSubcategoryChange = (subcategoryId) => {
    setSelectedSubcategory(subcategoryId);
    if (!subcategoryId) {
      // Show all interests when no subcategory selected
      setAvailableInterests(allInterests);
      return;
    }
    
    // Still show all interests, but we'll use subcategoryId for highlighting
    setAvailableInterests(allInterests);
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
    if (!formData.date) newErrors.date = "Please select a date.";
    
    // Check if date is in the past
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare only dates
      if (selectedDate < today) newErrors.date = "Please select a future date.";
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
      params.append('date', formData.date);
      params.append('budget', formData.budget);
      params.append('previewOnly', 'true');
      
      // Add each interest_id as separate parameter
      formData.interest_ids.forEach(id => {
        params.append('interest_ids', id);
      });
      
      navigate(`/itinerary?${params.toString()}`);
    }
  };

  const handleExampleTripClick = async (trip) => {
    try {
      // Load example data from API
      const response = await fetch(`http://localhost:3000/api/examples/${trip.exampleId}`);
      const data = await response.json();
      
      if (data.success) {
        // Navigate to itinerary page with example data
        navigate('/itinerary', { 
          state: { 
            itinerary: data.example,
            isExample: true 
          } 
        });
      } else {
        console.error('Failed to load example:', data.error);
      }
    } catch (error) {
      console.error('Error loading example:', error);
    }
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
                  {/* Header Section with random city image - only show when no city selected */}
                  {!showFilters && (
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
      )}

      {/* Header when city is selected */}
      {showFilters && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          maxWidth: '750px',
          margin: '0 auto',
          position: 'relative'
        }}>
          {/* Logo and Auth Links - Logo left, buttons right */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            width: '100%'
          }}>
            {/* Logo - Left aligned */}
            <img 
              src={FlipTripLogo} 
              alt="FlipTrip" 
              style={{ 
                height: '57px',
                width: 'auto'
              }}
            />
            {/* Auth buttons - Right aligned, same height as logo */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              alignItems: 'center',
              height: '57px' // Match logo height
            }}>
              {user ? (
                <>
                  <Link
                    to={user.role === 'guide' ? '/guide/dashboard' : '/user/dashboard'}
                    style={{
                      color: '#374151',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600'
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
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
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
                      color: '#374151',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Вход
                  </Link>
                  <Link
                    to="/register"
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '14px',
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
          
          {/* City Selection - Centered under logo */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '750px', zIndex: 1000 }}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #C9C9C9',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '16px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
      )}

      {/* Filters Section - show when city selected */}
      {showFilters && (
        <div style={{
          width: '100%',
          maxWidth: '750px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          padding: '30px',
          marginTop: '20px',
          position: 'relative',
          zIndex: 10,
          margin: '0 auto'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                Who's it for?
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
                      fontWeight: 'bold'
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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                            gap: '6px'
                          }}
                        >
                          {category.icon} {category.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subcategory Selection (if category has subcategories) */}
                  {selectedCategory && interestsStructure.find(c => c.id === selectedCategory)?.subcategories?.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                        Subcategory (optional)
                      </label>
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        flexWrap: window.innerWidth < 768 ? 'nowrap' : 'wrap',
                        overflowX: window.innerWidth < 768 ? 'auto' : 'visible',
                        paddingBottom: window.innerWidth < 768 ? '8px' : '0',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'thin'
                      }}>
                        <button
                          type="button"
                          onClick={() => handleSubcategoryChange(null)}
                          style={{
                            padding: '6px 14px',
                            border: `2px solid ${!selectedSubcategory ? '#3E85FC' : '#e5e7eb'}`,
                            borderRadius: '16px',
                            backgroundColor: !selectedSubcategory ? '#3E85FC' : 'white',
                            color: !selectedSubcategory ? 'white' : '#6b7280',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                        >
                          All
                        </button>
                        {interestsStructure
                          .find(c => c.id === selectedCategory)
                          ?.subcategories?.map(subcategory => (
                            <button
                              key={subcategory.id}
                              type="button"
                              onClick={() => handleSubcategoryChange(subcategory.id)}
                              style={{
                                padding: '6px 14px',
                                border: `2px solid ${selectedSubcategory === subcategory.id ? '#3E85FC' : '#e5e7eb'}`,
                                borderRadius: '16px',
                                backgroundColor: selectedSubcategory === subcategory.id ? '#3E85FC' : 'white',
                                color: selectedSubcategory === subcategory.id ? 'white' : '#6b7280',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}
                            >
                              {SUBCATEGORY_NAMES[subcategory.name] || subcategory.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Interests Selection - Always show all interests, but highlight selected category */}
                  {availableInterests.length > 0 && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                        Select Interests {selectedCategory && '(showing ' + (interestsStructure?.find(c => c.id === selectedCategory)?.name || 'selected') + ' category)'}
                      </label>
                      <div style={{ 
                        display: window.innerWidth < 768 ? 'flex' : 'grid',
                        flexDirection: window.innerWidth < 768 ? 'row' : 'column',
                        gridTemplateColumns: window.innerWidth >= 768 ? 'repeat(auto-fill, minmax(120px, 1fr))' : 'none',
                        gap: '8px',
                        maxHeight: window.innerWidth < 768 ? 'none' : '200px',
                        overflowY: window.innerWidth < 768 ? 'visible' : 'auto',
                        overflowX: window.innerWidth < 768 ? 'auto' : 'visible',
                        paddingRight: '8px',
                        paddingBottom: window.innerWidth < 768 ? '8px' : '0',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'thin'
                      }}>
                        {allInterests.map(interest => {
                          const category = interestsStructure.find(c => 
                            c.id === interest.category_id || 
                            c.subcategories?.some(s => s.id === interest.subcategory_id)
                          );
                          const isSelected = formData.interest_ids.includes(interest.id);
                          const isFromSelectedCategory = selectedCategory && interest.category_id === selectedCategory;
                          
                          return (
                            <button
                              key={interest.id}
                              type="button"
                              onClick={() => handleInterestToggle(interest.id)}
                              style={{
                                padding: '8px 12px',
                                border: `2px solid ${isSelected ? '#3E85FC' : (isFromSelectedSubcategory || isFromSelectedCategory) ? '#93c5fd' : '#e5e7eb'}`,
                                borderRadius: '16px',
                                backgroundColor: isSelected ? '#3E85FC' : (isFromSelectedSubcategory || isFromSelectedCategory) ? '#eff6ff' : 'white',
                                color: isSelected ? 'white' : '#6b7280',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                minHeight: '36px',
                                minWidth: window.innerWidth < 768 ? '120px' : 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                opacity: !selectedCategory || isFromSelectedSubcategory || isFromSelectedCategory || isSelected ? 1 : 0.6,
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
                        flexWrap: window.innerWidth < 768 ? 'nowrap' : 'wrap',
                        gap: '6px',
                        overflowX: window.innerWidth < 768 ? 'auto' : 'visible',
                        paddingBottom: window.innerWidth < 768 ? '8px' : '0',
                        WebkitOverflowScrolling: 'touch'
                      }}>
                        {formData.interest_ids.map(interestId => {
                          // Search in allInterests, not just availableInterests
                          const interest = allInterests.find(i => i.id === interestId);
                          if (!interest) return null;
                          
                          const category = interestsStructure.find(c => 
                            c.id === interest.category_id || 
                            c.subcategories?.some(s => s.id === interest.subcategory_id)
                          );
                          
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

                  {!selectedCategory && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                      Select a category above to choose interests
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

                {/* Date Field */}
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                    When?
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={formData.date ? new Date(formData.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      }) : ''}
                      placeholder="09 Feb"
                      readOnly
                      onClick={(e) => {
                        const dateInput = document.createElement('input');
                        dateInput.type = 'date';
                        dateInput.min = new Date().toISOString().slice(0, 10);
                        dateInput.value = formData.date;
                        
                        // Position the date picker near the clicked element
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
                        
                        // Small delay to ensure element is rendered
                        setTimeout(() => {
                          // Check if device is mobile or showPicker is not supported
                          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                          if (isMobile || !dateInput.showPicker) {
                            dateInput.focus();
                            dateInput.click();
                          } else {
                            dateInput.showPicker();
                          }
                        }, 10);
                        
                        dateInput.onchange = (e) => {
                          setFormData(prev => ({ ...prev, date: e.target.value }));
                          document.body.removeChild(dateInput);
                        };
                        
                        // Clean up if user clicks away without selecting
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
                      fontSize: '16px'
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
                            disabled={!formData.city || !formData.audience || formData.interest_ids.length === 0 || !formData.budget || formData.budget === "" || !formData.date}
                            style={{
                              backgroundColor: (!formData.city || !formData.audience || formData.interest_ids.length === 0 || !formData.budget || formData.budget === "" || !formData.date) ? '#e0e0e0' : '#3E85FC',
                              color: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '14px 28px',
                              fontSize: '18px',
                              fontWeight: 'bold',
                              cursor: (!formData.city || !formData.audience || formData.interest_ids.length === 0 || !formData.budget || formData.budget === "" || !formData.date) ? 'not-allowed' : 'pointer',
                              transition: 'background-color 0.2s ease',
                              width: '100%'
                            }}
                          >
                            Show my plan
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
      )}

      {/* White Section with Popular Trips */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '30px 20px',
        maxWidth: '750px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '24px'
        }}>
          Take a look at our day plan
        </h2>
        
        <div className="cards-grid">
          {POPULAR_TRIPS.map((trip) => (
            <div
              key={trip.id}
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                position: 'relative',
                width: '100%',
                height: '0',
                paddingBottom: '100%'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              onClick={() => handleExampleTripClick(trip)}
            >
              {/* Background Image */}
              <img
                src={trip.image}
                alt={trip.title}
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
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 3,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                {/* Top content - Interests and Title */}
                <div>
                  {/* Interests */}
                  <div style={{
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: '500',
                    opacity: 0.9,
                    marginBottom: '8px'
                  }}>
                    {trip.interests}
                  </div>
                  
                  {/* Title */}
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: 'white',
                    lineHeight: '1.3'
                  }}>
                    {trip.title}
                  </h3>
                </div>
                
                {/* Bottom content - Button */}
                <div>
                  <button
                    style={{
                      backgroundColor: 'white',
                      color: 'black',
                      border: 'none',
                      borderRadius: '8px',
                      width: '60px',
                      height: '22px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    See plan
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}