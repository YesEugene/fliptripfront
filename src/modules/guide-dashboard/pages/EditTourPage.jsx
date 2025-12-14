/**
 * EditTourPage - Tour editing page for guides
 * Module: guide-dashboard
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { updateTour, getTourById } from '../../tours-database';
import { getCurrentUser } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

export default function EditTourPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '', // New: Tour description
    city: '',
    duration: {
      type: 'hours',
      value: 6
    },
    languages: ['en'],
    format: 'self-guided',
    // Updated price structure
    price: {
      pdfPrice: 16, // Fixed price for PDF format
      guidedPrice: 0, // Price for guided tour (if format is 'guided')
      currency: 'USD',
      availableDates: [], // Available dates for guided tours
      meetingPoint: '', // Meeting point for guided tours
      meetingTime: '' // Meeting time for guided tours
    },
    // Split additional options into platform and creator options
    additionalOptions: {
      platformOptions: [], // Options provided by platform (insurance, accommodation)
      creatorOptions: [] // Options provided by creator (photography, food, transport)
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
  
  // Load tour data on mount
  useEffect(() => {
    const loadTour = async () => {
      try {
        setLoading(true);
        const tour = await getTourById(id);
        if (tour) {
          // Handle legacy data structure (backward compatibility)
          const legacyPrice = tour.price?.amount !== undefined;
          const legacyOptions = Array.isArray(tour.additionalOptions);
          
          setFormData({
            title: tour.title || '',
            description: tour.description || '',
            city: tour.city || '',
            duration: tour.duration || { type: 'hours', value: 6 },
            languages: tour.languages || ['en'],
            format: tour.format || 'self-guided',
            price: legacyPrice ? {
              pdfPrice: tour.price?.format === 'pdf' ? (tour.price?.amount || 16) : 16,
              guidedPrice: tour.price?.format === 'guided' ? (tour.price?.amount || 0) : 0,
              currency: tour.price?.currency || 'USD',
              availableDates: tour.price?.availableDates || [],
              meetingPoint: tour.price?.meetingPoint || '',
              meetingTime: tour.price?.meetingTime || ''
            } : (tour.price || {
              pdfPrice: 16,
              guidedPrice: 0,
              currency: 'USD',
              availableDates: [],
              meetingPoint: '',
              meetingTime: ''
            }),
            additionalOptions: legacyOptions ? {
              platformOptions: tour.additionalOptions.filter(id => ['insurance', 'accommodation'].includes(id)),
              creatorOptions: tour.additionalOptions.filter(id => ['photography', 'food', 'transport'].includes(id))
            } : (tour.additionalOptions || {
              platformOptions: [],
              creatorOptions: []
            }),
            daily_plan: tour.daily_plan || [{
              day: 1,
              date: new Date().toISOString().slice(0, 10),
              blocks: [{ time: '09:00 - 12:00', items: [] }]
            }],
            meta: tour.meta || {
              interests: [],
              audience: 'him',
              total_estimated_cost: '€0'
            }
          });
        }
      } catch (err) {
        setError(err.message || 'Error loading tour');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      loadTour();
    }
  }, [id]);
  
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
  
  const handlePlatformOptionChange = (optionId) => {
    setFormData(prev => {
      const currentOptions = prev.additionalOptions?.platformOptions || [];
      const newOptions = currentOptions.includes(optionId)
        ? currentOptions.filter(id => id !== optionId)
        : [...currentOptions, optionId];
      return { 
        ...prev, 
        additionalOptions: {
          ...prev.additionalOptions,
          platformOptions: newOptions
        }
      };
    });
  };

  const handleCreatorOptionChange = (optionId) => {
    setFormData(prev => {
      const currentOptions = prev.additionalOptions?.creatorOptions || [];
      const newOptions = currentOptions.includes(optionId)
        ? currentOptions.filter(id => id !== optionId)
        : [...currentOptions, optionId];
      return { 
        ...prev, 
        additionalOptions: {
          ...prev.additionalOptions,
          creatorOptions: newOptions
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const result = await updateTour(id, formData);
      if (result.success) {
        navigate('/guide/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Error updating tour');
    } finally {
      setSaving(false);
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
        category: '',
        duration: '',
        approx_cost: ''
      });
      return { ...prev, daily_plan: newPlan };
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading tour...</div>
        </div>
      </div>
    );
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
          Edit Tour
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

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
              Basic Information
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Tour Name *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Tour Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                placeholder="Describe your tour, what makes it special, what travelers will experience..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: '20px', 
              marginBottom: '20px' 
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Duration
                </label>
                <select
                  value={formData.duration.type}
                  onChange={(e) => setFormData({
                    ...formData,
                    duration: { ...formData.duration, type: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Value
                </label>
                <input
                  type="number"
                  value={formData.duration.value}
                  onChange={(e) => setFormData({
                    ...formData,
                    duration: { ...formData.duration, value: parseInt(e.target.value) }
                  })}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>
            </div>

            {/* Pricing and Format Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
                Tour Format & Pricing
              </label>
              
              {/* PDF Format (Default) */}
              <div style={{
                padding: '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                marginBottom: '16px',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="radio"
                    name="format"
                    value="self-guided"
                    checked={formData.format === 'self-guided'}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <strong style={{ fontSize: '16px' }}>Self-guided Tour (PDF)</strong>
                </div>
                <div style={{ marginLeft: '26px', color: '#6b7280', fontSize: '14px' }}>
                  Fixed price: <strong style={{ color: '#059669' }}>${formData.price.pdfPrice || 16}</strong>
                  <br />
                  <span style={{ fontSize: '12px' }}>Travelers can download the PDF route and explore independently</span>
                </div>
              </div>

              {/* Guided Tour Format */}
              <div style={{
                padding: '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                marginBottom: '16px',
                backgroundColor: formData.format === 'guided' ? '#eff6ff' : '#f9fafb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="radio"
                    name="format"
                    value="guided"
                    checked={formData.format === 'guided'}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <strong style={{ fontSize: '16px' }}>With Guide</strong>
                </div>
                
                {formData.format === 'guided' && (
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
                        required={formData.format === 'guided'}
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
                        required={formData.format === 'guided'}
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
                        required={formData.format === 'guided'}
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
                              required={formData.format === 'guided'}
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
            
            {/* Additional Options - Platform Options */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
                Platform Additional Options
              </label>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                Options provided by FlipTrip platform
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '12px'
              }}>
                {platformOptionsList.map((option) => (
                  <label
                    key={option.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: formData.additionalOptions?.platformOptions?.includes(option.id) ? '#eff6ff' : 'white',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.additionalOptions?.platformOptions?.includes(option.id) || false}
                      onChange={() => handlePlatformOptionChange(option.id)}
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
                ))}
              </div>
            </div>

            {/* Additional Options - Creator Options */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
                Your Additional Services
              </label>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                Additional services you can provide to travelers
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '12px'
              }}>
                {creatorOptionsList.map((option) => (
                  <label
                    key={option.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: formData.additionalOptions?.creatorOptions?.includes(option.id) ? '#eff6ff' : 'white',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.additionalOptions?.creatorOptions?.includes(option.id) || false}
                      onChange={() => handleCreatorOptionChange(option.id)}
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
                ))}
              </div>
            </div>
          </div>

          {/* Daily Plan */}
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
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
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
                            
                            <textarea
                              value={item.description || ''}
                              onChange={(e) => {
                                const newPlan = [...formData.daily_plan];
                                newPlan[dayIndex].blocks[blockIndex].items[itemIndex].description = e.target.value;
                                setFormData({ ...formData, daily_plan: newPlan });
                              }}
                              placeholder="Location Description"
                              rows={3}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                marginBottom: '8px',
                                fontSize: '14px',
                                resize: 'vertical'
                              }}
                            />
                            
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
                                marginBottom: '8px',
                                fontSize: '14px',
                                resize: 'vertical'
                              }}
                            />
                            
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', 
                              gap: '8px' 
                            }}>
                              <input
                                type="text"
                                value={item.category || ''}
                                onChange={(e) => {
                                  const newPlan = [...formData.daily_plan];
                                  newPlan[dayIndex].blocks[blockIndex].items[itemIndex].category = e.target.value;
                                  setFormData({ ...formData, daily_plan: newPlan });
                                }}
                                placeholder="Category"
                                style={{
                                  padding: '8px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  width: '100%'
                                }}
                              />
                              <input
                                type="text"
                                value={item.duration || ''}
                                onChange={(e) => {
                                  const newPlan = [...formData.daily_plan];
                                  newPlan[dayIndex].blocks[blockIndex].items[itemIndex].duration = e.target.value;
                                  setFormData({ ...formData, daily_plan: newPlan });
                                }}
                                placeholder="Duration"
                                style={{
                                  padding: '8px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  width: '100%'
                                }}
                              />
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

          {/* Submit Button */}
          <div style={{ marginBottom: '32px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving Tour...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

