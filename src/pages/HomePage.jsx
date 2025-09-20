import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
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

const INTERESTS = [
  { value: 'adventure', label: 'Adventure' },
  { value: 'culture', label: 'Culture' },
  { value: 'food', label: 'Food' },
  { value: 'nature', label: 'Nature' },
  { value: 'art', label: 'Art' },
  { value: 'music', label: 'Music' },
  { value: 'sports', label: 'Sports' },
  { value: 'relaxation', label: 'Relaxation' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'history', label: 'History' },
  { value: 'photography', label: 'Photography' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'local', label: 'Local Experience' },
  { value: 'family', label: 'Family Friendly' },
  { value: 'budget', label: 'Budget Friendly' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'outdoor', label: 'Outdoor Activities' },
  { value: 'indoor', label: 'Indoor Activities' },
  { value: 'seasonal', label: 'Seasonal Events' },
  { value: 'festivals', label: 'Festivals' }
];

const KIDS_INTERESTS = [
  { value: 'playground', label: 'Playgrounds' },
  { value: 'museums', label: 'Kids Museums' },
  { value: 'parks', label: 'Parks & Gardens' },
  { value: 'zoo', label: 'Zoo & Aquarium' },
  { value: 'amusement', label: 'Amusement Parks' },
  { value: 'science', label: 'Science Centers' },
  { value: 'sports', label: 'Sports' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'nature', label: 'Nature Walks' },
  { value: 'art', label: 'Art & Crafts' },
  { value: 'music', label: 'Music' },
  { value: 'theater', label: 'Children Theater' },
  { value: 'food', label: 'Kids Friendly Food' },
  { value: 'shopping', label: 'Toy Stores' },
  { value: 'indoor', label: 'Indoor Play' },
  { value: 'outdoor', label: 'Outdoor Play' },
  { value: 'seasonal', label: 'Seasonal Events' },
  { value: 'family', label: 'Family Activities' },
  { value: 'educational', label: 'Educational' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'culture', label: 'Culture' }
];

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
    interests: [],
    date: new Date().toISOString().slice(0, 10), // Current date as default
    budget: ""
  });
  const [errors, setErrors] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // Removed '' state - using simple dropdown only

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
      // Clear interests when switching to/from kids
      interests: []
    }));
  };

  const handleInterestChange = (interest) => {
    setFormData(prev => {
      const newInterests = prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests: newInterests };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.city) newErrors.city = "Please select a city.";
    if (!formData.audience) newErrors.audience = "Please select who this is for.";
    if (formData.interests.length === 0) newErrors.interests = "Please select at least one interest.";
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
      const queryParams = new URLSearchParams(formData);
      navigate(`/preview?${queryParams.toString()}`);
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
                  {/* Red Header Section - only show when no city selected */}
                  {!showFilters && (
                    <div className="red-header-section" style={{
                      backgroundColor: '#F04C31',
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
          
          {/* Mobile Logo - Centered */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingTop: '40px',
            flex: 1
          }}>
            <img 
              src={FlipTripLogo} 
              alt="FlipTrip" 
              style={{ 
                height: '60px',
                width: '100px',
                marginBottom: '40px'
              }}
            />
            <div style={{
              color: 'white',
              fontSize: '30px',
              fontWeight: 'bold',
              textAlign: 'center',
              lineHeight: '1.3',
              marginBottom: '40px'
            }}>
              Choose a city.<br />
              We'll craft your journey.
            </div>
          </div>

          {/* Mobile City Selection - Under text */}
          <div className="mobile-city-select" style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            zIndex: 20,
            display: 'block',
            maxWidth: '750px',
            margin: '0 auto'
          }}>
            <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            style={{
                              backgroundColor: 'white',
                              border: '2px solid #F04C31',
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
                  zIndex: 20,
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
          {/* Centered Logo */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <img 
              src={FlipTripLogo} 
              alt="FlipTrip" 
              style={{ 
                height: '57px',
                width: '435px'
              }}
            />
          </div>
          
          {/* City Selection - Centered under logo */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '750px' }}>
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
                  zIndex: 20,
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
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                maxHeight: '180px',
                overflowY: 'auto',
                paddingRight: '8px'
              }}>
                {(formData.audience === 'kids' ? KIDS_INTERESTS : INTERESTS).map((interest) => (
                  <button
                    key={interest.value}
                    type="button"
                    onClick={() => handleInterestChange(interest.value)}
                    style={{
                      padding: '8px 12px',
                      border: `2px solid ${formData.interests.includes(interest.value) ? '#3E85FC' : '#e5e7eb'}`,
                      borderRadius: '20px',
                      backgroundColor: formData.interests.includes(interest.value) ? '#3E85FC' : 'white',
                      color: formData.interests.includes(interest.value) ? 'white' : '#6b7280',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      minHeight: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {interest.label}
                  </button>
                ))}
              </div>
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
                          dateInput.showPicker();
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
                            disabled={!formData.city || !formData.audience || formData.interests.length === 0 || !formData.budget || formData.budget === "" || !formData.date}
                            style={{
                              backgroundColor: (!formData.city || !formData.audience || formData.interests.length === 0 || !formData.budget || formData.budget === "" || !formData.date) ? '#e0e0e0' : '#3E85FC',
                              color: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '14px 28px',
                              fontSize: '18px',
                              fontWeight: 'bold',
                              cursor: (!formData.city || !formData.audience || formData.interests.length === 0 || !formData.budget || formData.budget === "" || !formData.date) ? 'not-allowed' : 'pointer',
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
        margin: '0 auto'
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