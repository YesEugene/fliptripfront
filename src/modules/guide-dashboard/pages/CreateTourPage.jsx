/**
 * CreateTourPage - Tour creation page for guides
 * Module: guide-dashboard
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTour } from '../../tours-database';
import { getCurrentUser } from '../../auth/services/authService';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';

export default function CreateTourPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await createTour(formData);
      if (result.success) {
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
        category: '',
        duration: '',
        approx_cost: ''
      });
      return { ...prev, daily_plan: newPlan };
    });
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
