/**
 * CreateTourPage - Tour creation page for guides
 * Module: guide-dashboard
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTour } from '../../tours-database';
import { getCurrentUser } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

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

export default function CreateTourPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' or 'daily'
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [interestsStructure, setInterestsStructure] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [availableInterests, setAvailableInterests] = useState([]);
  const [loadingInterests, setLoadingInterests] = useState(false);
  
  // City autocomplete state
  const [cities, setCities] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  
  const [formData, setFormData] = useState({
    // country removed - not used
    city: '', // City field (moved up)
    title: '',
    description: '', // New: Tour description
    preview: '', // New: Preview image/video (base64 or URL)
    previewType: 'image', // 'image' or 'video'
    tags: [], // New: Tags array
    duration: {
      type: 'hours',
      value: 6
    },
    languages: ['en'],
    format: 'self-guided', // Always self-guided, can also be 'guided' if checkbox is checked
    withGuide: false, // Checkbox for "With Guide" option
    // Updated price structure
    price: {
      pdfPrice: 16, // Fixed price for PDF format (always available)
      guidedPrice: 0, // Price for guided tour (if withGuide is true)
      currency: 'USD',
      availableDates: [], // Available dates for guided tours
      meetingPoint: '', // Meeting point for guided tours
      meetingTime: '' // Meeting time for guided tours
    },
    // Split additional options into platform and creator options
    additionalOptions: {
      platformOptions: ['insurance', 'accommodation'], // Always available from platform (informational only)
      creatorOptions: {} // Object with optionId as key and price as value: { photography: 50, food: 30 }
    },
    daily_plan: [
      {
        day: 1,
        date: new Date().toISOString().slice(0, 10),
        blocks: [
          {
            time: '09:00 - 12:00',
            items: []
          }
        ]
      }
    ],
    meta: {
      interests: [],
      audience: 'him',
      total_estimated_cost: '€0'
    }
  });
  
  // Platform-provided additional options (automated by platform)
  const platformOptionsList = [
    { id: 'insurance', label: 'Travel Insurance' },
    { id: 'accommodation', label: 'Accommodation' }
  ];
  
  // Creator-provided additional options
  const creatorOptionsList = [
    { id: 'photography', label: 'Photography Service' },
    { id: 'food', label: 'Food & Dining' },
    { id: 'transport', label: 'Transportation' }
  ];
  
  const handleCreatorOptionChange = (optionId, checked) => {
    setFormData(prev => {
      const currentOptions = prev.additionalOptions?.creatorOptions || {};
      if (checked) {
        // Add option with default price 0
        return { 
          ...prev, 
          additionalOptions: {
            ...prev.additionalOptions,
            creatorOptions: {
              ...currentOptions,
              [optionId]: currentOptions[optionId] || 0
            }
          }
        };
      } else {
        // Remove option
        const newOptions = { ...currentOptions };
        delete newOptions[optionId];
        return { 
          ...prev, 
          additionalOptions: {
            ...prev.additionalOptions,
            creatorOptions: newOptions
          }
        };
      }
    });
  };

  const handleCreatorOptionPriceChange = (optionId, price) => {
    setFormData(prev => {
      const currentOptions = prev.additionalOptions?.creatorOptions || {};
      return { 
        ...prev, 
        additionalOptions: {
          ...prev.additionalOptions,
          creatorOptions: {
            ...currentOptions,
            [optionId]: parseFloat(price) || 0
          }
        }
      };
    });
  };

  const addAvailableDate = () => {
    setFormData(prev => ({
      ...prev,
      price: {
        ...prev.price,
        availableDates: [...(prev.price.availableDates || []), '']
      }
    }));
  };

  const removeAvailableDate = (index) => {
    setFormData(prev => ({
      ...prev,
      price: {
        ...prev.price,
        availableDates: prev.price.availableDates.filter((_, i) => i !== index)
      }
    }));
  };

  const updateAvailableDate = (index, value) => {
    setFormData(prev => {
      const newDates = [...prev.price.availableDates];
      newDates[index] = value;
      return {
        ...prev,
        price: {
          ...prev.price,
          availableDates: newDates
        }
      };
    });
  };

  const handlePreviewChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        setError('Please select an image or video file');
        return;
      }
      
      // Validate file size (max 10MB for images, 50MB for videos)
      const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`File size should be less than ${isImage ? '10MB' : '50MB'}`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          preview: reader.result, // base64 string
          previewType: isImage ? 'image' : 'video'
        }));
        setError('');
      };
      reader.onerror = () => {
        setError('Error reading file');
      };
      reader.readAsDataURL(file);
    }
  };

  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Generate tag suggestions based on tour description and locations
  const generateTagSuggestions = async () => {
    if (!formData.description && formData.daily_plan?.[0]?.blocks?.[0]?.items?.length === 0) {
      setTagSuggestions([]);
      return;
    }

    try {
      // Collect text from description and location titles/descriptions
      const locationTexts = formData.daily_plan
        .flatMap(day => day.blocks)
        .flatMap(block => block.items)
        .map(item => `${item.title || ''} ${item.description || ''}`)
        .join(' ');

      const fullText = `${formData.description || ''} ${locationTexts}`.trim();

      if (!fullText) {
        setTagSuggestions([]);
        return;
      }

      // Call backend API to generate tag suggestions (using smart-itinerary with action=generateTags)
      const response = await fetch('https://fliptripback.vercel.app/api/smart-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generateTags', text: fullText })
      });

      if (response.ok) {
        const data = await response.json();
        setTagSuggestions(data.tags || []);
      }
    } catch (error) {
      console.error('Error generating tag suggestions:', error);
      // Fallback: simple keyword extraction
      const keywords = extractKeywords(formData.description || '');
      setTagSuggestions(keywords);
    }
  };

  // Simple keyword extraction fallback
  const extractKeywords = (text) => {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));
    
    return [...new Set(words)].slice(0, 10);
  };

  const handleTagInputChange = (e) => {
    const value = e.target.value;
    setTagInput(value);
    setShowTagSuggestions(value.length > 0 && tagSuggestions.length > 0);
  };

  const handleTagAdd = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleTagRemove = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Load interests structure on component mount
  useEffect(() => {
    const loadInterests = async () => {
      try {
        setLoadingInterests(true);
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';
        const response = await fetch(`${API_BASE_URL}/api/interests?full_structure=true`);
        const data = await response.json();
        if (data.success) {
          setInterestsStructure(data.categories || []);
          // Flatten all interests for easy access
          const allInterests = [];
          data.categories.forEach(category => {
            if (category.direct_interests) {
              allInterests.push(...category.direct_interests);
            }
            if (category.subcategories) {
              category.subcategories.forEach(subcategory => {
                if (subcategory.interests) {
                  allInterests.push(...subcategory.interests);
                }
              });
            }
          });
          setAvailableInterests(allInterests);
        }
      } catch (err) {
        console.error('Error loading interests:', err);
      } finally {
        setLoadingInterests(false);
      }
    };
    loadInterests();
  }, []);

  // Load cities on component mount
  useEffect(() => {
    const loadCities = async () => {
      try {
        setLoadingCities(true);
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';
        const response = await fetch(`${API_BASE_URL}/api/admin-cities`);
        const data = await response.json();
        if (data.success && data.cities) {
          setCities(data.cities);
        }
      } catch (err) {
        console.error('Error loading cities:', err);
      } finally {
        setLoadingCities(false);
      }
    };
    loadCities();
  }, []);

  // Handle city input change - show suggestions
  const handleCityInputChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, city: value });
    
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
    setFormData({ ...formData, city: city.name });
    setCitySuggestions([]);
    setShowCitySuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.city-autocomplete-container')) {
        setShowCitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await createTour(formData);
      if (result.success) {
        // Reload cities list after successful tour creation to include newly created city
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';
        try {
          const citiesResponse = await fetch(`${API_BASE_URL}/api/admin-cities`);
          const citiesData = await citiesResponse.json();
          if (citiesData.success && citiesData.cities) {
            setCities(citiesData.cities);
          }
        } catch (citiesErr) {
          console.error('Error reloading cities:', citiesErr);
        }
        // Show success message about moderation
        alert('Tour created successfully! Your tour has been submitted for moderation and will be reviewed by an administrator.');
        navigate('/guide/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Error creating tour');
    } finally {
      setLoading(false);
    }
  };

  const addDay = () => {
    setFormData(prev => ({
      ...prev,
      daily_plan: [
        ...prev.daily_plan,
        {
          day: prev.daily_plan.length + 1,
          date: new Date().toISOString().slice(0, 10),
          blocks: [
            {
              time: '09:00 - 12:00',
              items: []
            }
          ]
        }
      ]
    }));
  };

  const addBlock = (dayIndex) => {
    setFormData(prev => {
      const newPlan = [...prev.daily_plan];
      newPlan[dayIndex].blocks.push({
        time: '12:00 - 15:00',
        items: []
      });
      return { ...prev, daily_plan: newPlan };
    });
  };

  const addItem = (dayIndex, blockIndex) => {
    setFormData(prev => {
      const newPlan = [...prev.daily_plan];
      newPlan[dayIndex].blocks[blockIndex].items.push({
        title: '',
        address: '',
        description: '',
        recommendations: '', // New: Recommendations field for each location
        price_level: '', // Price level (1-4)
        approx_cost: '',
        interest_ids: [], // Interests for this location
        selectedCategory: null, // For category selection UI
        selectedSubcategory: null // For subcategory selection UI
      });
      return { ...prev, daily_plan: newPlan };
    });
  };

  // Handle category change for a specific location item
  const handleItemCategoryChange = (dayIndex, blockIndex, itemIndex, categoryId) => {
    setFormData(prev => {
      const newPlan = [...prev.daily_plan];
      const item = newPlan[dayIndex].blocks[blockIndex].items[itemIndex];
      item.selectedCategory = categoryId;
      item.selectedSubcategory = null; // Reset subcategory when category changes
      return { ...prev, daily_plan: newPlan };
    });
  };

  // Handle subcategory change for a specific location item
  const handleItemSubcategoryChange = (dayIndex, blockIndex, itemIndex, subcategoryId) => {
    setFormData(prev => {
      const newPlan = [...prev.daily_plan];
      const item = newPlan[dayIndex].blocks[blockIndex].items[itemIndex];
      item.selectedSubcategory = subcategoryId;
      return { ...prev, daily_plan: newPlan };
    });
  };

  // Handle interest add for a specific location item
  const handleItemInterestAdd = (dayIndex, blockIndex, itemIndex, interestId) => {
    setFormData(prev => {
      const newPlan = [...prev.daily_plan];
      const item = newPlan[dayIndex].blocks[blockIndex].items[itemIndex];
      const currentInterestIds = item.interest_ids || [];
      if (!currentInterestIds.includes(interestId)) {
        item.interest_ids = [...currentInterestIds, interestId];
      }
      return { ...prev, daily_plan: newPlan };
    });
  };

  // Handle interest remove for a specific location item
  const handleItemInterestRemove = (dayIndex, blockIndex, itemIndex, interestId) => {
    setFormData(prev => {
      const newPlan = [...prev.daily_plan];
      const item = newPlan[dayIndex].blocks[blockIndex].items[itemIndex];
      item.interest_ids = (item.interest_ids || []).filter(id => id !== interestId);
      return { ...prev, daily_plan: newPlan };
    });
  };

  // Get available interests for a specific location item based on selected category/subcategory
  const getAvailableInterestsForItem = (item) => {
    if (!item.selectedCategory || !interestsStructure) {
      return [];
    }
    
    const category = interestsStructure.find(c => c.id === item.selectedCategory);
    if (!category) {
      return [];
    }

    if (item.selectedSubcategory) {
      // If subcategory is selected, return only interests from that subcategory
      const subcategory = category.subcategories?.find(s => s.id === item.selectedSubcategory);
      return subcategory?.interests || [];
    } else {
      // If no subcategory selected, return all interests from category
      const interests = [];
      if (category.direct_interests) {
        interests.push(...category.direct_interests);
      }
      if (category.subcategories) {
        category.subcategories.forEach(subcategory => {
          if (subcategory.interests) {
            interests.push(...subcategory.interests);
          }
        });
      }
      return interests;
    }
  };

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
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <img src={FlipTripLogo} alt="FlipTrip" style={{ height: '40px' }} />
          <button
            onClick={() => navigate('/guide/dashboard')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
          Create New Tour
        </h1>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            {error}
          </div>
        )}

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: activeTab === 'basic' ? '#111827' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'basic' ? '2px solid #111827' : '2px solid transparent',
              borderRadius: '0',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'basic' ? '600' : '500',
              transition: 'all 0.2s',
              marginBottom: '-1px'
            }}
          >
            Basic Information
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: activeTab === 'daily' ? '#111827' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === 'daily' ? '2px solid #111827' : '2px solid transparent',
              borderRadius: '0',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'daily' ? '600' : '500',
              transition: 'all 0.2s',
              marginBottom: '-1px'
            }}
          >
            Daily Plan
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            marginBottom: '24px'
          }}>
            {/* Form Fields Section */}
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
                Basic Information
              </h2>

            {/* City - At the top */}
            <div style={{ 
              marginBottom: '20px' 
            }}>
              <div className="city-autocomplete-container" style={{ position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={handleCityInputChange}
                  onFocus={() => {
                    if (citySuggestions.length > 0) {
                      setShowCitySuggestions(true);
                    }
                  }}
                  required
                  placeholder="e.g., Paris, Rome, Barcelona"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ 
                  fontSize: '13px', 
                  color: '#6b7280', 
                  marginTop: '8px', 
                  marginBottom: 0,
                  lineHeight: '1.5'
                }}>
                  Enter the name of the city where you are creating the trip (must be in English)
                </p>
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
                            {typeof city.country === 'string' ? city.country : (city.country.name || city.country)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Tour Name *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Trip name"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ 
                fontSize: '13px', 
                color: '#6b7280', 
                marginTop: '8px', 
                marginBottom: 0,
                lineHeight: '1.5'
              }}>
                We recommend creating clear tour names, consisting of the city, tour idea/concept, and target audience. For example "Paris Romantic Evening Walk" or "Rome Food Lovers Adventure"
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Tour Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                placeholder="Describe the concept of your tour"
                rows={5}
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
              <p style={{ 
                fontSize: '13px', 
                color: '#6b7280', 
                marginTop: '8px', 
                marginBottom: 0,
                lineHeight: '1.5'
              }}>
                Create a recommendation on what the tour description should be like and provide an example.
              </p>
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                borderLeft: '3px solid #3b82f6'
              }}>
                <p style={{ 
                  fontSize: '13px', 
                  color: '#1e40af', 
                  margin: 0,
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  💡 Writing Recommendation:
                </p>
                <p style={{ 
                  fontSize: '13px', 
                  color: '#1e3a8a', 
                  margin: 0,
                  lineHeight: '1.6',
                  marginBottom: '8px'
                }}>
                  The description should be to the point, but not devoid of emotion. Tell about the real experiences travelers will have. Use specific details and create the atmosphere of the place.
                </p>
                <p style={{ 
                  fontSize: '13px', 
                  color: '#1e3a8a', 
                  margin: 0,
                  lineHeight: '1.6',
                  fontStyle: 'italic'
                }}>
                  <strong>Example:</strong> "Discover the hidden gems of Montmartre as the sun sets over Paris. This romantic evening walk takes you through cobblestone streets where artists once lived, past charming cafés where you can stop for a glass of wine, and to the iconic Sacré-Cœur Basilica with breathtaking city views. Feel the bohemian spirit of Paris come alive as you explore this magical neighborhood."
                </p>
              </div>
            </div>

            {/* Preview Upload Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Preview (Photo or Video Story) *
              </label>
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                position: 'relative'
              }}>
                {formData.preview ? (
                  <div>
                    {formData.previewType === 'image' ? (
                      <img 
                        src={formData.preview} 
                        alt="Preview" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '300px', 
                          borderRadius: '8px',
                          marginBottom: '12px'
                        }} 
                      />
                    ) : (
                      <video 
                        src={formData.preview} 
                        controls
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '300px', 
                          borderRadius: '8px',
                          marginBottom: '12px'
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, preview: '', previewType: 'image' })}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Remove Preview
                    </button>
                  </div>
                ) : (
                  <div>
                    <label style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handlePreviewChange}
                        style={{ display: 'none' }}
                      />
                      Choose Photo or Video
                    </label>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', marginBottom: 0 }}>
                      JPG, PNG or GIF. Max size 5MB
                    </p>
                    <p style={{ 
                      fontSize: '13px', 
                      color: '#6b7280', 
                      marginTop: '8px', 
                      marginBottom: 0,
                      lineHeight: '1.5'
                    }}>
                      Use a photo that reflects the concept of your tour/offer. This could be a scenic view, a unique place, or a vivid moment that conveys the atmosphere of the adventure. Avoid blurry or low-quality images.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tour Format & Pricing Section */}
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
            {/* Pricing and Format Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
                Tour Format & Pricing
              </label>
              
              {/* PDF Format (Default - Always Available) */}
              <div style={{
                padding: '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                marginBottom: '16px',
                backgroundColor: '#f0fdf4',
                borderLeft: '4px solid #10b981'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ 
                    marginRight: '8px', 
                    fontSize: '20px',
                    color: '#10b981'
                  }}>✓</span>
                  <strong style={{ fontSize: '16px' }}>Self-guided Tour (PDF) - Always Available</strong>
                </div>
                <div style={{ marginLeft: '28px', color: '#6b7280', fontSize: '14px' }}>
                  Fixed price: <strong style={{ color: '#059669' }}>${formData.price.pdfPrice || 16}</strong>
                  <br />
                  <span style={{ fontSize: '12px' }}>Travelers can download the PDF route and explore independently</span>
                </div>
              </div>

              {/* Guided Tour Format (Optional Checkbox) */}
              <div style={{
                padding: '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                marginBottom: '16px',
                backgroundColor: formData.withGuide ? '#eff6ff' : '#f9fafb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.withGuide || false}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        withGuide: e.target.checked,
                        format: e.target.checked ? 'guided' : 'self-guided'
                      });
                    }}
                    style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <strong style={{ fontSize: '16px' }}>With Guide (Optional)</strong>
                </div>
                <div style={{ marginLeft: '26px', color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>
                  Check this if you're ready to accompany travelers on this tour
                </div>
                
                {formData.withGuide && (
                  <div style={{ marginLeft: '26px', marginTop: '12px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                        Your Price (USD) *
                      </label>
                      <input
                        type="number"
                        value={formData.price.guidedPrice || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          price: { ...formData.price, guidedPrice: parseFloat(e.target.value) || 0 }
                        })}
                        min="0"
                        step="0.01"
                        required={formData.withGuide}
                        placeholder="0.00"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                        Meeting Point *
                      </label>
                      <input
                        type="text"
                        value={formData.price.meetingPoint || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          price: { ...formData.price, meetingPoint: e.target.value }
                        })}
                        required={formData.withGuide}
                        placeholder="e.g., Central Station, Main Square"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                        Meeting Time *
                      </label>
                      <input
                        type="time"
                        value={formData.price.meetingTime || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          price: { ...formData.price, meetingTime: e.target.value }
                        })}
                        required={formData.withGuide}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500' }}>
                          Available Dates *
                        </label>
                        <button
                          type="button"
                          onClick={addAvailableDate}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          + Add Date
                        </button>
                      </div>
                      {formData.price.availableDates && formData.price.availableDates.length > 0 ? (
                        formData.price.availableDates.map((date, index) => (
                          <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                              type="date"
                              value={date}
                              onChange={(e) => updateAvailableDate(index, e.target.value)}
                              required={formData.withGuide}
                              style={{
                                flex: 1,
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removeAvailableDate(index)}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      ) : (
                        <div style={{ 
                          padding: '12px', 
                          backgroundColor: '#fef3c7', 
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#92400e'
                        }}>
                          No dates added. Click "+ Add Date" to add available dates for your guided tour.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Additional Options - Platform Options (Informational Only) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
                Platform Additional Options
              </label>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                Options automatically provided by FlipTrip platform (always available)
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '12px'
              }}>
                {platformOptionsList.map((option) => (
                  <div
                    key={option.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      backgroundColor: '#f0fdf4',
                      borderLeft: '4px solid #10b981'
                    }}
                  >
                    <span style={{ 
                      marginRight: '8px', 
                      fontSize: '18px',
                      color: '#10b981'
                    }}>✓</span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                      {option.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Options - Creator Options */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
                Your Additional Services
              </label>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                Additional services you can provide to travelers (check and set price)
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {creatorOptionsList.map((option) => {
                  const isChecked = formData.additionalOptions?.creatorOptions?.[option.id] !== undefined;
                  const price = formData.additionalOptions?.creatorOptions?.[option.id] || 0;
                  
                  return (
                    <div
                      key={option.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        backgroundColor: isChecked ? '#eff6ff' : 'white',
                        transition: 'background-color 0.2s',
                        gap: '12px',
                        flexWrap: isMobile ? 'wrap' : 'nowrap'
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          flex: '0 0 auto',
                          minWidth: isMobile ? '100%' : '200px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleCreatorOptionChange(option.id, e.target.checked)}
                          style={{
                            marginRight: '8px',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                          {option.label}
                        </span>
                      </label>
                      {isChecked && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          flex: isMobile ? '1 1 100%' : '1 1 auto',
                          minWidth: isMobile ? '100%' : '200px'
                        }}>
                          <label style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                            Price (USD):
                          </label>
                          <input
                            type="number"
                            value={price}
                            onChange={(e) => handleCreatorOptionPriceChange(option.id, e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{
                              flex: '1 1 auto',
                              padding: '6px 10px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              maxWidth: '120px'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          )}

          {/* Daily Plan Tab */}
          {activeTab === 'daily' && (
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>
                Daily Plan
              </h2>
              <button
                type="button"
                onClick={addDay}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                + Add Day
              </button>
            </div>

            {formData.daily_plan.map((day, dayIndex) => (
              <div key={dayIndex} style={{
                marginBottom: '24px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                  Day {day.day}
                </h3>

                {day.blocks.map((block, blockIndex) => (
                  <div key={blockIndex} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <input
                      type="text"
                      value={block.time}
                      onChange={(e) => {
                        const newPlan = [...formData.daily_plan];
                        newPlan[dayIndex].blocks[blockIndex].time = e.target.value;
                        setFormData({ ...formData, daily_plan: newPlan });
                      }}
                      placeholder="09:00 - 12:00"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        fontWeight: '600'
                      }}
                    />
                    
                    {/* Locations in block */}
                    {block.items && block.items.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        {block.items.map((item, itemIndex) => (
                          <div key={itemIndex} style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            padding: '12px',
                            marginBottom: '8px',
                            backgroundColor: '#f9fafb'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <strong style={{ fontSize: '14px' }}>Location {itemIndex + 1}</strong>
                              <button
                                type="button"
                                onClick={() => {
                                  const newPlan = [...formData.daily_plan];
                                  newPlan[dayIndex].blocks[blockIndex].items.splice(itemIndex, 1);
                                  setFormData({ ...formData, daily_plan: newPlan });
                                }}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Delete
                              </button>
                            </div>
                            
                            <input
                              type="text"
                              value={item.title || ''}
                              onChange={(e) => {
                                const newPlan = [...formData.daily_plan];
                                newPlan[dayIndex].blocks[blockIndex].items[itemIndex].title = e.target.value;
                                setFormData({ ...formData, daily_plan: newPlan });
                              }}
                              placeholder="Location Name *"
                              required
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                marginBottom: '8px',
                                fontSize: '14px'
                              }}
                            />
                            
                            <input
                              type="text"
                              value={item.address || ''}
                              onChange={(e) => {
                                const newPlan = [...formData.daily_plan];
                                newPlan[dayIndex].blocks[blockIndex].items[itemIndex].address = e.target.value;
                                setFormData({ ...formData, daily_plan: newPlan });
                              }}
                              placeholder="Address"
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                marginBottom: '8px',
                                fontSize: '14px'
                              }}
                            />
                            
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ 
                                display: 'block', 
                                marginBottom: '4px', 
                                fontSize: '14px', 
                                fontWeight: '500',
                                color: '#111827'
                              }}>
                                Location Description
                              </label>
                              <textarea
                                value={item.description || ''}
                                onChange={(e) => {
                                  const newPlan = [...formData.daily_plan];
                                  newPlan[dayIndex].blocks[blockIndex].items[itemIndex].description = e.target.value;
                                  setFormData({ ...formData, daily_plan: newPlan });
                                }}
                                placeholder="Describe this location..."
                                rows={3}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  resize: 'vertical',
                                  boxSizing: 'border-box'
                                }}
                              />
                              <div style={{
                                marginTop: '8px',
                                padding: '10px',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '6px',
                                borderLeft: '3px solid #3b82f6'
                              }}>
                                <p style={{ 
                                  fontSize: '12px', 
                                  color: '#1e40af', 
                                  margin: 0,
                                  fontWeight: '500',
                                  marginBottom: '6px'
                                }}>
                                  💡 Recommendation:
                                </p>
                                <p style={{ 
                                  fontSize: '12px', 
                                  color: '#1e3a8a', 
                                  margin: 0,
                                  lineHeight: '1.5',
                                  marginBottom: '6px'
                                }}>
                                  The description should be to the point, but not devoid of emotion. Tell about the real experiences travelers will have. Use specific details.
                                </p>
                                <p style={{ 
                                  fontSize: '12px', 
                                  color: '#1e3a8a', 
                                  margin: 0,
                                  lineHeight: '1.5',
                                  fontStyle: 'italic'
                                }}>
                                  <strong>Example:</strong> "This charming café tucked away in a quiet Montmartre street is where locals come for their morning espresso. The aroma of freshly baked croissants fills the air, and the owner, a friendly Parisian, greets every customer by name. Sit by the window to watch the neighborhood come alive."
                                </p>
                              </div>
                            </div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              <label style={{ 
                                display: 'block', 
                                marginBottom: '4px', 
                                fontSize: '14px', 
                                fontWeight: '500',
                                color: '#111827'
                              }}>
                                Recommendations
                              </label>
                              <textarea
                                value={item.recommendations || ''}
                                onChange={(e) => {
                                  const newPlan = [...formData.daily_plan];
                                  newPlan[dayIndex].blocks[blockIndex].items[itemIndex].recommendations = e.target.value;
                                  setFormData({ ...formData, daily_plan: newPlan });
                                }}
                                placeholder="Recommendations (tips, best time to visit, what to try, etc.)"
                                rows={3}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  resize: 'vertical',
                                  boxSizing: 'border-box'
                                }}
                              />
                              <div style={{
                                marginTop: '8px',
                                padding: '10px',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '6px',
                                borderLeft: '3px solid #3b82f6'
                              }}>
                                <p style={{ 
                                  fontSize: '12px', 
                                  color: '#1e40af', 
                                  margin: 0,
                                  fontWeight: '500',
                                  marginBottom: '6px'
                                }}>
                                  💡 Recommendation:
                                </p>
                                <p style={{ 
                                  fontSize: '12px', 
                                  color: '#1e3a8a', 
                                  margin: 0,
                                  lineHeight: '1.5',
                                  marginBottom: '6px'
                                }}>
                                  Give practical advice with emotional coloring. Tell about the best time to visit, what to try, and what experiences await the traveler.
                                </p>
                                <p style={{ 
                                  fontSize: '12px', 
                                  color: '#1e3a8a', 
                                  margin: 0,
                                  lineHeight: '1.5',
                                  fontStyle: 'italic'
                                }}>
                                  <strong>Example:</strong> "Best visited in the morning when the light streams through the windows. Try their signature croissant with homemade jam - it's a revelation. The owner loves sharing stories about the neighborhood's history, so don't hesitate to ask. Perfect spot for a quiet moment before exploring Montmartre."
                                </p>
                              </div>
                            </div>
                            
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                              gap: '8px' 
                            }}>
                              <div>
                                <label style={{ 
                                  display: 'block', 
                                  marginBottom: '4px', 
                                  fontSize: '12px', 
                                  fontWeight: '500',
                                  color: '#6b7280'
                                }}>
                                  Price Level (1-4)
                                </label>
                                <select
                                  value={item.price_level || ''}
                                  onChange={(e) => {
                                    const newPlan = [...formData.daily_plan];
                                    newPlan[dayIndex].blocks[blockIndex].items[itemIndex].price_level = e.target.value;
                                    setFormData({ ...formData, daily_plan: newPlan });
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    backgroundColor: 'white'
                                  }}
                                >
                                  <option value="">Not specified</option>
                                  <option value="1">1 - Inexpensive</option>
                                  <option value="2">2 - Moderate</option>
                                  <option value="3">3 - Expensive</option>
                                  <option value="4">4 - Very Expensive</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ 
                                  display: 'block', 
                                  marginBottom: '4px', 
                                  fontSize: '12px', 
                                  fontWeight: '500',
                                  color: '#6b7280'
                                }}>
                                  Approximate Cost
                                </label>
                                <input
                                  type="text"
                                  value={item.approx_cost || ''}
                                  onChange={(e) => {
                                    const newPlan = [...formData.daily_plan];
                                    newPlan[dayIndex].blocks[blockIndex].items[itemIndex].approx_cost = e.target.value;
                                    setFormData({ ...formData, daily_plan: newPlan });
                                  }}
                                  placeholder="Approximate Cost"
                                  style={{
                                    padding: '8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    width: '100%'
                                  }}
                                />
                              </div>
                            </div>
                            
                            {/* Interests for Location */}
                            <div style={{ marginTop: '12px', width: '100%' }}>
                              <label style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                fontWeight: '500',
                                fontSize: '14px'
                              }}>
                                Interests
                              </label>
                              {loadingInterests ? (
                                <div style={{ padding: '8px', color: '#6b7280', fontSize: '12px' }}>Loading interests...</div>
                              ) : (
                                <>
                                  {/* Category Selection */}
                                  <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                      Category
                                    </label>
                                    <select
                                      value={item.selectedCategory || ''}
                                      onChange={(e) => handleItemCategoryChange(dayIndex, blockIndex, itemIndex, e.target.value || null)}
                                      style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px'
                                      }}
                                    >
                                      <option value="">Select a category...</option>
                                      {interestsStructure?.map(category => (
                                        <option key={category.id} value={category.id}>
                                          {category.icon} {CATEGORY_NAMES[category.name] || category.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Subcategory Selection (if category has subcategories) */}
                                  {item.selectedCategory && interestsStructure?.find(c => c.id === item.selectedCategory)?.subcategories?.length > 0 && (
                                    <div style={{ marginBottom: '12px' }}>
                                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                        Subcategory (optional)
                                      </label>
                                      <select
                                        value={item.selectedSubcategory || ''}
                                        onChange={(e) => handleItemSubcategoryChange(dayIndex, blockIndex, itemIndex, e.target.value || null)}
                                        style={{
                                          width: '100%',
                                          padding: '8px',
                                          border: '1px solid #d1d5db',
                                          borderRadius: '6px',
                                          fontSize: '14px'
                                        }}
                                      >
                                        <option value="">All interests in category</option>
                                        {interestsStructure
                                          .find(c => c.id === item.selectedCategory)
                                          ?.subcategories?.map(subcategory => (
                                            <option key={subcategory.id} value={subcategory.id}>
                                              {SUBCATEGORY_NAMES[subcategory.name] || subcategory.name}
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  )}

                                  {/* Interests Selection */}
                                  {item.selectedCategory && getAvailableInterestsForItem(item).length > 0 && (
                                    <div style={{ marginBottom: '12px' }}>
                                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                        Select Interests
                                      </label>
                                      <div style={{
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        padding: '8px'
                                      }}>
                                        {getAvailableInterestsForItem(item)
                                          .filter(interest => {
                                            const currentInterestIds = item.interest_ids || [];
                                            return !currentInterestIds.includes(interest.id);
                                          })
                                          .map(interest => (
                                            <button
                                              key={interest.id}
                                              type="button"
                                              onClick={() => handleItemInterestAdd(dayIndex, blockIndex, itemIndex, interest.id)}
                                              style={{
                                                display: 'block',
                                                width: '100%',
                                                padding: '8px 12px',
                                                marginBottom: '4px',
                                                backgroundColor: '#f3f4f6',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                textAlign: 'left',
                                                transition: 'background-color 0.2s'
                                              }}
                                              onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                                              onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                            >
                                              + {interest.name}
                                            </button>
                                          ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Selected Interests */}
                                  {(item.interest_ids || []).length > 0 && (
                                    <div style={{ marginBottom: '12px' }}>
                                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>
                                        Selected interests:
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {(item.interest_ids || []).map(interestId => {
                                          const interest = availableInterests.find(i => i.id === interestId);
                                          if (!interest) return null;
                                          
                                          const category = interestsStructure?.find(c => 
                                            c.id === interest.category_id || 
                                            c.subcategories?.some(s => s.id === interest.subcategory_id)
                                          );
                                          
                                          return (
                                            <span
                                              key={interestId}
                                              style={{
                                                padding: '6px 12px',
                                                backgroundColor: '#e0e7ff',
                                                color: '#3730a3',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                              }}
                                            >
                                              {category?.icon} {interest.name}
                                              <button
                                                type="button"
                                                onClick={() => handleItemInterestRemove(dayIndex, blockIndex, itemIndex, interestId)}
                                                style={{
                                                  background: 'none',
                                                  border: 'none',
                                                  color: '#3730a3',
                                                  cursor: 'pointer',
                                                  fontSize: '16px',
                                                  padding: '0',
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
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => addItem(dayIndex, blockIndex)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      + Add Location
                    </button>
                  </div>
                ))}
                      </div>
                    )}

                <button
                  type="button"
                  onClick={() => addBlock(dayIndex)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  + Add Time Block
                </button>
                </div>
              ))}
              </div>
            ))}

          {/* Tags Section - Hidden but kept for future use */}
          {false && (
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
              Tags
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Add Tags (for search and discovery)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      handleTagAdd(tagInput.trim());
                    }
                  }}
                  placeholder="Type to see suggestions or press Enter to add"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                {showTagSuggestions && tagSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}>
                    {tagSuggestions
                      .filter(tag => !formData.tags.includes(tag) && tag.toLowerCase().includes(tagInput.toLowerCase()))
                      .slice(0, 5)
                      .map((tag, index) => (
                        <div
                          key={index}
                          onClick={() => handleTagAdd(tag)}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: index < tagSuggestions.length - 1 ? '1px solid #e5e7eb' : 'none',
                            hover: { backgroundColor: '#f3f4f6' }
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          {tag}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                Tags help travelers discover your tour. Suggestions are generated based on your tour description and locations.
              </p>
            </div>

            {/* Display selected tags */}
            {formData.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '6px 12px',
                      backgroundColor: '#eff6ff',
                      color: '#1e40af',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleTagRemove(tag)}
                      style={{
                        marginLeft: '8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#1e40af',
                        cursor: 'pointer',
                        fontSize: '16px',
                        lineHeight: '1',
                        padding: '0',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            </div>
          )}
          </div>
          )}

          {/* Submit Button - Visible on both tabs */}
          <div style={{ marginBottom: '32px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating Tour...' : 'Create Tour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
