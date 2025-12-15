import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { generateItinerary, generateSmartItinerary, generateSmartItineraryV2, generateCreativeItinerary, generateRealPlacesItinerary, generatePDF, sendEmail, saveItinerary, getItinerary } from '../services/api';
import PhotoGallery from '../components/PhotoGallery';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import './ItineraryPage.css';

export default function ItineraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [itinerary, setItinerary] = useState(null);
  const [email, setEmail] = useState('');
  const [itineraryId, setItineraryId] = useState(null);

  // Генерация fallback заголовков согласно промптам
  const generateFallbackTitle = (formData) => {
    const interestMap = {
      'swimming': 'Aquatic adventures',
      'zoo': 'Wildlife discoveries', 
      'playground': 'Family fun',
      'adventure': 'Adventures',
      'culture': 'Cultural treasures',
      'food': 'Culinary journey',
      'romantic': 'Romantic escapes',
      'art': 'Artistic discoveries',
      'music': 'Musical journey',
      'nature': 'Nature exploration',
      'history': 'Historical wonders',
      'shopping': 'Shopping adventures',
      'nightlife': 'Night discoveries',
      'relaxation': 'Peaceful retreat',
      'wellness': 'Wellness journey',
      'architecture': 'Architectural marvels',
      'photography': 'Photo adventures',
      'local': 'Local discoveries',
      'sports': 'Active adventures',
      'outdoor': 'Outdoor exploration',
      'indoor': 'Indoor discoveries',
      // Исключаем служебные интересы
      'budget': null,
      'luxury': null,
      'family': null
    };
    
    // Находим первый РЕАЛЬНЫЙ интерес (не служебный)
    console.log('🔍 Генерируем fallback заголовок для интересов:', formData.interests);
    let mainInterest = 'exploration';
    if (formData.interests && formData.interests.length > 0) {
      for (const interest of formData.interests) {
        if (interestMap[interest] !== null && interestMap[interest] !== undefined) {
          mainInterest = interest;
          console.log('✅ Выбран основной интерес:', mainInterest);
          break;
        }
      }
    }
    
    const interestText = interestMap[mainInterest] || 'Amazing discoveries';
    
    // Учитываем аудиторию для более точного заголовка
    const audiencePrefix = {
      'kids': 'Family',
      'couples': 'Romantic',
      'him': 'Epic',
      'her': 'Beautiful'
    };
    
    const prefix = audiencePrefix[formData.audience] || '';
    return prefix ? `${prefix} ${interestText.toLowerCase()} in ${formData.city}` : `${interestText} in ${formData.city}`;
  };

  const generateFallbackSubtitle = (formData) => {
    const formattedDate = new Date(formData.date).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    const audienceMap = {
      'him': 'for him',
      'her': 'for her', 
      'couples': 'for couples',
      'kids': 'for children'
    };
    
    const audienceText = audienceMap[formData.audience] || 'for you';
    const mainInterest = formData.interests?.[0] || 'exploration';
    
    const subtitleTemplates = {
      'swimming': `${formattedDate} ${audienceText} - dive into aquatic adventures in the heart of ${formData.city}. Splash through crystal waters, discover hidden pools, and let the rhythm of the waves guide your perfect day. An unforgettable journey of water and wonder awaits.`,
      'zoo': `${formattedDate} ${audienceText} - embark on a wildlife adventure in ${formData.city}. Meet amazing creatures, discover nature's secrets, and create magical memories with every step. A day where wonder meets wild in the most beautiful way.`,
      'romantic': `${formattedDate} ${audienceText} - fall in love with ${formData.city} all over again. Stroll through enchanting streets, share intimate moments, and let the city's magic weave around you. Romance, passion, and unforgettable memories await.`
    };
    
    return subtitleTemplates[mainInterest] || `${formattedDate} ${audienceText} - discover the magic of ${formData.city}. Experience authentic moments, create lasting memories, and let the city's unique charm captivate your heart. An extraordinary adventure awaits your arrival.`;
  };
  
  // Check if this is an example from state
  const isExample = location.state?.isExample;
  const exampleItinerary = location.state?.itinerary;
  
  // Extract form data from URL params
  const previewOnly = searchParams.get('previewOnly') === 'true';
  const existingItineraryId = searchParams.get('itineraryId');
  const isFullPlan = searchParams.get('full') === 'true'; // Indicates we expect a full plan, not preview
  const formData = {
    city: searchParams.get('city') || 'Barcelona',
    audience: searchParams.get('audience') || 'him',
    interests: searchParams.get('interests')?.split(',') || ['Romantic'],
    date: searchParams.get('date') || new Date().toISOString().slice(0, 10),
    budget: searchParams.get('budget') || '500',
    previewOnly: previewOnly // Boolean value
  };
  
  console.log('🔍 ItineraryPage - previewOnly:', previewOnly, 'existingItineraryId:', existingItineraryId, 'isFullPlan:', isFullPlan, 'formData:', formData);

  useEffect(() => {
    if (existingItineraryId) {
      setItineraryId(existingItineraryId);
    }
  }, [existingItineraryId]);

  useEffect(() => {
    if (isExample && exampleItinerary) {
      // Use example data directly
      setItinerary(exampleItinerary);
      setLoading(false);
    } else if (existingItineraryId) {
      // Load existing itinerary from Redis (preview or full)
      console.log('📥 Loading existing itinerary from Redis:', existingItineraryId, isFullPlan ? '(expecting full plan)' : '');
      loadItineraryFromRedis(existingItineraryId);
    } else {
      // Generate new itinerary (preview or full)
      console.log('🆕 Generating new itinerary, previewOnly:', previewOnly);
      generateItineraryData();
    }
  }, [isExample, exampleItinerary, existingItineraryId, previewOnly, isFullPlan]);

  const loadItineraryFromRedis = async (itineraryId) => {
    try {
      setLoading(true);
      console.log('📥 Loading itinerary from Redis:', itineraryId);
      const data = await getItinerary(itineraryId);
      console.log('📥 Loaded data:', data);
      if (data && data.success && data.itinerary) {
        console.log('✅ Itinerary loaded from Redis');
        const loadedItinerary = data.itinerary;
        
        // Log what we loaded
        const totalItems = loadedItinerary.daily_plan?.[0]?.blocks?.reduce((sum, block) => sum + (block.items?.length || 0), 0) || 0;
        const totalActivities = loadedItinerary.activities?.length || 0;
        console.log('📊 Loaded itinerary info:', {
          hasDailyPlan: !!loadedItinerary.daily_plan,
          dailyPlanBlocks: loadedItinerary.daily_plan?.[0]?.blocks?.length || 0,
          totalItemsInDailyPlan: totalItems,
          hasActivities: !!loadedItinerary.activities,
          activitiesCount: totalActivities,
          previewOnly: loadedItinerary.previewOnly,
          hasConceptualPlan: !!loadedItinerary.conceptual_plan,
          timeSlotsCount: loadedItinerary.conceptual_plan?.timeSlots?.length || 0
        });
        
        // Check if it's already in the converted format (has daily_plan)
        if (loadedItinerary.daily_plan && loadedItinerary.daily_plan.length > 0) {
          // Already converted, use as is
          // CRITICAL: If full=true in URL, show all blocks (full plan after payment)
          // If previewOnly=true and full=false, show only first 2 blocks
          const shouldShowPreview = previewOnly && !isFullPlan;
          const displayItinerary = { 
            ...loadedItinerary, 
            previewOnly: shouldShowPreview,
            // If preview mode, limit to 2 blocks, otherwise show all
            daily_plan: shouldShowPreview ? [{
              ...loadedItinerary.daily_plan[0],
              blocks: loadedItinerary.daily_plan[0]?.blocks?.slice(0, 2) || []
            }] : loadedItinerary.daily_plan
          };
          
          console.log('✅ Itinerary already in display format');
          console.log('📋 Preview mode:', shouldShowPreview ? 'YES (showing first 2 blocks)' : 'NO (showing all blocks)');
          console.log('📊 Total blocks in daily_plan:', loadedItinerary.daily_plan[0]?.blocks?.length || 0);
          console.log('📊 Display blocks:', displayItinerary.daily_plan[0]?.blocks?.length || 0);
          console.log('📊 Total items in daily_plan:', totalItems);
          setItinerary(displayItinerary);
        } else if (loadedItinerary.activities && loadedItinerary.activities.length > 0) {
          // Need to convert from backend format to display format
          console.log('🔄 Converting itinerary from backend format to display format');
          const convertedData = {
            ...loadedItinerary,
            daily_plan: [{
              date: loadedItinerary.date,
              blocks: loadedItinerary.activities.map(activity => ({
                time: activity.time,
                items: [{
                  title: activity.name || activity.title,
                  why: activity.description,
                  description: activity.description,
                  category: activity.category,
                  duration: `${activity.duration} min`,
                  price: activity.price,
                  location: activity.location,
                  address: activity.location,
                  photos: activity.photos ? activity.photos.map(photoUrl => ({
                    url: photoUrl,
                    thumbnail: photoUrl,
                    source: 'google_places'
                  })) : [],
                  approx_cost: activity.priceRange || `€${activity.price}`,
                  tips: activity.recommendations,
                  rating: activity.rating
                }]
              }))
            }]
          };
          console.log('✅ Converted itinerary for display');
          setItinerary(convertedData);
        } else {
          console.log('⚠️ Itinerary format not recognized, using as is');
          setItinerary(loadedItinerary);
        }
        
        // Always set itineraryId state
        setItineraryId(itineraryId);
      } else {
        console.log('⚠️ Itinerary not found in Redis, generating new');
        // If not found, generate new
        generateItineraryData();
      }
    } catch (error) {
      console.error('❌ Error loading itinerary from Redis:', error);
      // If error, generate new
      generateItineraryData();
    } finally {
      setLoading(false);
    }
  };

  const generateItineraryData = async () => {
    try {
      setLoading(true);
      console.log('🌍 Starting REAL PLACES itinerary generation...');
      
      try {
        // ОСНОВНАЯ система с реальными местами
        console.log('🚀 Calling generateSmartItinerary with previewOnly:', formData.previewOnly);
        const data = await generateSmartItinerary(formData);
        console.log('✅ Received smart itinerary data:', data);
        console.log('📊 Activities count:', data.activities?.length);
        
        // Проверяем, есть ли активности в плане
        const hasActivities = data.activities && data.activities.length > 0;
        
        if (hasActivities) {
          // Конвертируем данные в нужный формат для отображения
          const convertedData = {
            ...data,
            daily_plan: [{
              date: data.date,
              blocks: data.activities.map(activity => ({
                time: activity.time,
                items: [{
                  title: activity.name || activity.title,
                  why: activity.description,
                  photos: activity.photos ? activity.photos.map(photoUrl => ({
                    url: photoUrl,
                    thumbnail: photoUrl,
                    source: 'google_places'
                  })) : [],
                  address: activity.location,
                  approx_cost: activity.priceRange || `€${activity.price}`,
                  duration: `${activity.duration} min`,
                  tips: activity.recommendations,
                  rating: activity.rating
                }]
              }))
            }]
          };
          console.log('✅ Converted data for display:', convertedData);
          
          // Save preview to Redis (only 2 locations for preview)
          let savedItineraryId = itineraryId; // Initialize with existing ID
          
          if (previewOnly) {
            try {
              // Save only preview (2 locations) - remaining will be generated after payment
              const previewDataToSave = {
                ...data,
                daily_plan: [{
                  ...convertedData.daily_plan[0],
                  blocks: convertedData.daily_plan[0]?.blocks?.slice(0, 2) || []
                }],
                activities: data.activities?.slice(0, 2) || [],
                previewOnly: true
              };
              console.log('💾 Saving preview (2 locations) to Redis...', {
                hasConceptualPlan: !!data.conceptual_plan,
                hasTimeSlots: !!data.conceptual_plan?.timeSlots,
                timeSlotsCount: data.conceptual_plan?.timeSlots?.length || 0,
                activitiesCount: previewDataToSave.activities?.length,
                dailyPlanBlocks: previewDataToSave.daily_plan[0]?.blocks?.length || 0,
                previewOnly: true
              });
              const saveResult = await saveItinerary(previewDataToSave);
              console.log('💾 Save result:', saveResult);
              if (saveResult && saveResult.success && saveResult.itineraryId) {
                // Update URL with itineraryId
                const newParams = new URLSearchParams(searchParams);
                newParams.set('itineraryId', saveResult.itineraryId);
                window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`);
                savedItineraryId = saveResult.itineraryId;
                setItineraryId(saveResult.itineraryId);
                console.log('✅ Preview saved to Redis with ID:', saveResult.itineraryId);
              } else {
                console.error('❌ Save failed - no itineraryId in response:', saveResult);
              }
            } catch (saveError) {
              console.error('❌ Error saving to Redis:', saveError);
              console.error('❌ Error details:', saveError.message, saveError.stack);
            }
          }
          
          // Set itinerary with preview flag - show only 2 blocks for preview
          const displayItinerary = {
            ...convertedData,
            previewOnly: previewOnly,
            // For preview, limit daily_plan to 2 blocks
            daily_plan: previewOnly ? [{
              ...convertedData.daily_plan[0],
              blocks: convertedData.daily_plan[0]?.blocks?.slice(0, 2) || []
            }] : convertedData.daily_plan
          };
          setItinerary(displayItinerary);
          
          // Debug: Log state for email/button display
          console.log('🔍 Debug preview state:', {
            previewOnly,
            itineraryPreviewOnly: displayItinerary.previewOnly,
            itineraryId: savedItineraryId,
            hasEmailButton: previewOnly && savedItineraryId,
            blocksCount: displayItinerary.daily_plan[0]?.blocks?.length || 0
          });
          
          return;
        } else {
          console.log('⚠️ Smart itinerary API returned empty itinerary');
          throw new Error('No activities found in smart itinerary');
        }
      } catch (apiError) {
        console.error('❌ Real places API failed:', apiError);
        
        // Используем локальный fallback с правильной структурой
        console.log('🔄 Using local fallback itinerary...');
        const fallbackData = generateFallbackItinerary(formData);
        setItinerary(fallbackData);
        return;
      }
      
    } catch (error) {
      console.error('❌ Complete failure:', error);
      setError(`Failed to generate itinerary for ${formData.city}. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackItinerary = (formData) => {
    return {
      title: `Epic amazing discoveries in ${formData.city}`,
      subtitle: `${formData.date} for ${formData.audience} - discover the magic of ${formData.city}. Experience authentic moments, create lasting memories, and let the city's unique charm captivate your heart. An extraordinary adventure awaits your arrival.`,
      city: formData.city,
      date: formData.date,
      budget: formData.budget || '800',
      weather: {
        forecast: `Perfect weather for exploring ${formData.city}`,
        clothing: 'Comfortable walking shoes and light layers',
        tips: 'Stay hydrated and bring a camera!'
      },
      daily_plan: [{
        blocks: [
          {
            time: "08:00",
            items: [{
              title: "Morning Coffee & Breakfast",
              why: "Start your day with local flavors and energy",
              address: "Central Market, Main Square",
              approx_cost: "8-12€",
              tips: "Try local pastries and coffee",
              duration: "45 minutes",
            }]
          },
          {
            time: "09:00",
            items: [{
              title: "Historic City Center Walking Tour",
              why: "Get oriented and learn about the city's history",
              address: "Old Town Square",
              approx_cost: "15-20€",
              tips: "Wear comfortable shoes, bring camera",
              duration: "2 hours",
            }]
          },
          {
            time: "11:30",
            items: [{
              title: "Local Museum Visit",
              why: "Dive deeper into the city's culture and art",
              address: "City Art Museum, Museum Street 1",
              approx_cost: "12-15€",
              tips: "Check for student discounts, audio guide recommended",
              duration: "1.5 hours",
            }]
          },
          {
            time: "13:00",
            items: [{
              title: "Traditional Lunch",
              why: "Experience authentic local cuisine",
              address: "Local Restaurant, Food Street 15",
              approx_cost: "25-35€",
              tips: "Try the house specialty, book ahead for popular places",
              duration: "1 hour",
            }]
          },
          {
            time: "14:30",
            items: [{
              title: "Afternoon Stroll & Shopping",
              why: "Relax and pick up souvenirs",
              address: "Shopping District, Market Street",
              approx_cost: "20-50€",
              tips: "Bargain at local markets, check opening hours",
              duration: "1.5 hours",
            }]
          },
          {
            time: "16:00",
            items: [{
              title: "Scenic Viewpoint",
              why: "Capture the best city views and photos",
              address: "City Hill Lookout Point",
              approx_cost: "Free",
              tips: "Best light in late afternoon, bring water",
              duration: "45 minutes",
            }]
          },
          {
            time: "17:00",
            items: [{
              title: "Local Park & Relaxation",
              why: "Unwind and enjoy the local atmosphere",
              address: "Central Park, Green Street",
              approx_cost: "Free",
              tips: "Perfect for people watching, bring a book",
              duration: "1 hour",
            }]
          },
          {
            time: "18:30",
            items: [{
              title: "Evening Drinks & Tapas",
              why: "Experience the local nightlife and social scene",
              address: "Rooftop Bar, High Street 8",
              approx_cost: "20-30€",
              tips: "Book table for sunset views, try local wines",
              duration: "1.5 hours",
            }]
          },
          {
            time: "20:30",
            items: [{
              title: "Dinner at Local Favorite",
              why: "End the day with a memorable dining experience",
              address: "Traditional Restaurant, Old Quarter 12",
              approx_cost: "40-60€",
              tips: "Reservation recommended, try the chef's special",
              duration: "2 hours",
            }]
          },
        ]
      }]
    };
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleDownloadPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.querySelector('.itinerary-container');
      const opt = {
        margin: 1,
        filename: `FlipTrip_${formData.city}_${formData.date}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <div className="loading-text">Creating your perfect itinerary...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="loading-content">
          <div className="error-icon">Error</div>
          <div className="error-text">{error}</div>
          <button onClick={handleBack} className="back-button">
            Back
          </button>
        </div>
      </div>
    );
  }

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#eff6ff',
    padding: '32px 16px'
  };

  const contentStyle = {
    maxWidth: '800px',
    margin: '0 auto'
  };

  const headerStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    padding: '32px',
    marginBottom: '24px',
    textAlign: 'center'
  };

  const titleStyle = {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '16px'
  };

  const subtitleStyle = {
    fontSize: '20px',
    color: '#6b7280',
    marginBottom: '24px'
  };

  const badgesStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '24px'
  };

  const badgeStyle = {
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500'
  };

  const weatherStyle = {
    backgroundColor: '#f0f9ff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px'
  };

  const buttonStyle = {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500'
  };

  const planStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    padding: '32px'
  };

  const blockStyle = {
    borderLeft: '4px solid #3b82f6',
    paddingLeft: '24px',
    marginBottom: '32px',
    position: 'relative'
  };

  const timeStyle = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: '16px'
  };

  const itemStyle = {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px'
  };

  const itemTitleStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '20px'
  };

  const itemDescriptionStyle = {
    color: '#6b7280',
    marginBottom: '20px'
  };

  const itemDetailsStyle = {
    fontSize: '14px',
    color: '#9ca3af'
  };

  return (
    <div className="itinerary-container">
      {/* Header with Logo */}
      <div className="header-section">
        {/* Centered Logo */}
        <div className="logo-container">
          <img 
            src={FlipTripLogo} 
            alt="FlipTrip" 
            className="logo-image"
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>

      <div className="content-section">
        {/* Header */}
        <div className="enhanced-card">
          <h1 className="title">
{itinerary?.title || generateFallbackTitle(formData)}
          </h1>
          <p className="subtitle">
{itinerary?.subtitle || generateFallbackSubtitle(formData)}
          </p>
          
          <div className="badges">
            <span className="badge-enhanced" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>
              🌍 {formData.city}
            </span>
            <span className="badge-enhanced" style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}>
              📅 {formData.date}
            </span>
            <span className="badge-enhanced" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
              For: {formData.audience}
            </span>
            <span className="badge-enhanced" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              Budget: {itinerary?.meta?.total_estimated_cost || `${formData.budget}€`}
            </span>
            {formData.interests && formData.interests.map((interest, index) => (
              <span key={index} className="badge-enhanced" style={{ backgroundColor: '#fde7e7', color: '#b91c1c' }}>
                🎯 {interest}
              </span>
            ))}
          </div>

          {itinerary?.weather && (
            <div className="weather-enhanced">
              <div className="weather-main">
                <div className="weather-icon">🌤️</div>
                <div className="weather-temp">{itinerary.weather.temperature}°C</div>
              </div>
              <div className="weather-description">
                {itinerary.weather.forecast} {itinerary.weather.clothing}
              </div>
              {itinerary.weather.tips && (
                <div className="weather-tips">
                  💡 {itinerary.weather.tips}
                </div>
              )}
            </div>
          )}

          {/* Pay to Unlock Section - только для превью */}
          {previewOnly && itineraryId && (
            <div className="enhanced-card" style={{ marginTop: '20px', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                🔒 Unlock Full Itinerary
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                Enter your email to unlock the complete day plan with all locations and recommendations.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '16px'
                  }}
                />
                <button
                  onClick={() => {
                    if (email && itineraryId) {
                      const paymentParams = new URLSearchParams({
                        itineraryId: itineraryId,
                        email: email,
                        city: formData.city,
                        audience: formData.audience,
                        interests: formData.interests.join(','),
                        date: formData.date,
                        budget: formData.budget
                      });
                      navigate(`/payment?${paymentParams.toString()}`);
                    }
                  }}
                  disabled={!email || !itineraryId}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: email && itineraryId ? '#3b82f6' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: email && itineraryId ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Pay to Unlock
                </button>
              </div>
            </div>
          )}

          {itinerary?.previewOnly !== true && (
            <button
              onClick={handleDownloadPDF}
              className="download-button"
            >
              📱 Download PDF
            </button>
          )}
        </div>


        {/* Itinerary Plan */}
        <div className="enhanced-card">
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
            📅 Day Plan
          </h2>
          
          {((itinerary?.previewOnly === true)
            ? itinerary?.daily_plan?.[0]?.blocks?.slice(0, 2) 
            : itinerary?.daily_plan?.[0]?.blocks
          )?.map((block, blockIndex) => (
            <div key={blockIndex} style={blockStyle}>
              <div className="time-block-enhanced">{block.time}</div>
              {block.items?.map((item, itemIndex) => (
                <div key={itemIndex} className="item-enhanced">
                  <h3 className="item-title">
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title + ' ' + item.address)}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="enhanced-link"
                    >
                      {item.title}
                    </a>
                  </h3>
                  {item.why && (
                    <p className="item-description">{item.why}</p>
                  )}
                  {item.photos && item.photos.length > 0 && (
                    <div className="photo-gallery-enhanced">
                      <PhotoGallery photos={item.photos} placeName={item.title} />
                    </div>
                  )}
                  <div className="item-details">
                    {item.address && (
                      <div style={{ marginBottom: '10px' }}>
                        📍 <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="enhanced-link"
                        >
                          {item.address}
                        </a>
                      </div>
                    )}
                    {item.approx_cost && (
                      <div style={{ marginBottom: '10px' }}>
                        💰 {item.approx_cost}
                      </div>
                    )}
                    {item.duration && (
                      <div style={{ marginBottom: '10px' }}>
                        ⏱️ {item.duration}
                      </div>
                    )}
                    {item.tips && (
                      <div style={{ marginBottom: '10px', color: '#3b82f6', fontStyle: 'italic' }}>
                        💡 {item.tips}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="footer-enhanced">
          <p>Created with ❤️ in FlipTrip</p>
        </div>
      </div>
    </div>
  );
}
