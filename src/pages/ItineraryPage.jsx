import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { generateItinerary, generateSmartItinerary, generateSmartItineraryV2, generateCreativeItinerary, generateRealPlacesItinerary, generatePDF, sendEmail, createCheckoutSession, saveItinerary, getItinerary, completeItinerary } from '../services/api';
import html2pdf from 'html2pdf.js';
import PhotoGallery from '../components/PhotoGallery';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import SkateboardingGif from '../assets/Skateboarding.gif';
import './ItineraryPage.css';

export default function ItineraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [itinerary, setItinerary] = useState(null);
  const [email, setEmail] = useState('');

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
  const formData = {
    city: searchParams.get('city') || 'Barcelona',
    audience: searchParams.get('audience') || 'him',
    interests: searchParams.get('interests')?.split(',') || ['Romantic'],
    date: searchParams.get('date') || new Date().toISOString().slice(0, 10),
    budget: searchParams.get('budget') || '500'
  };

  // Check if full plan should be shown (after payment)
  const showFullPlan = searchParams.get('full') === 'true';
  // Get itinerary ID from URL if exists
  const itineraryId = searchParams.get('id');

  useEffect(() => {
    if (isExample && exampleItinerary) {
      // Use example data directly
      setItinerary(exampleItinerary);
      setLoading(false);
    } else if (itineraryId) {
      // Load existing itinerary by ID
      loadItineraryById(itineraryId);
    } else {
      // Generate new itinerary
      generateItineraryData();
    }
  }, [isExample, exampleItinerary, itineraryId]);

  const loadItineraryById = async (id) => {
    try {
      setLoading(true);
      console.log(`📖 Loading itinerary ${id}...`);
      
      const response = await getItinerary(id);
      if (response.success && response.itinerary) {
        const savedItinerary = response.itinerary;
        
        // Convert to display format
        const convertedData = {
          ...savedItinerary,
          daily_plan: [{
            date: savedItinerary.date,
            blocks: savedItinerary.activities.map(activity => ({
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
        
        console.log('✅ Loaded itinerary from storage:', convertedData);
        setItinerary(convertedData);
        
        // Update URL to include ID if not present
        if (!itineraryId) {
          const newParams = new URLSearchParams(searchParams);
          newParams.set('id', id);
          navigate(`/itinerary?${newParams.toString()}`, { replace: true });
        }
      } else {
        throw new Error('Itinerary not found');
      }
    } catch (error) {
      console.error('❌ Failed to load itinerary:', error);
      setError('Failed to load itinerary. Generating new one...');
      // Fallback to generating new itinerary
      generateItineraryData();
    } finally {
      setLoading(false);
    }
  };

  const generateItineraryData = async () => {
    try {
      setLoading(true);
      console.log('🌍 Starting REAL PLACES itinerary generation (preview mode)...');
      
      try {
        // Генерируем только первые 2 локации для preview
        const data = await generateSmartItinerary(formData, true); // previewOnly=true
        console.log('✅ Received smart itinerary data (preview):', data);
        
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
          setItinerary(convertedData);
          
          // Save itinerary to storage
          try {
            const saveResponse = await saveItinerary(data);
            if (saveResponse.success) {
              console.log(`✅ Saved itinerary with ID: ${saveResponse.itineraryId}`);
              // Update URL to include ID
              const newParams = new URLSearchParams(searchParams);
              newParams.set('id', saveResponse.itineraryId);
              navigate(`/itinerary?${newParams.toString()}`, { replace: true });
            }
          } catch (saveError) {
            console.error('⚠️ Failed to save itinerary:', saveError);
            // Continue anyway, plan is still displayed
          }
          
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
          {
            time: "22:30",
            items: [{
              title: "Evening Stroll & Night Views",
              why: "See the city lights and end on a romantic note",
              address: "Riverside Promenade",
              approx_cost: "Free",
              tips: "Perfect for couples, bring a light jacket",
              duration: "30 minutes",
            }]
          }
        ]
      }]
    };
  };

  const handleDownloadPDF = async () => {
    try {
      // Находим элемент для конвертации в PDF
      const element = document.querySelector('.itinerary-container');
      if (!element) {
        alert('Unable to find content for PDF generation');
        return;
      }

      // Настройки PDF
      const options = {
        margin: 0.5,
        filename: `FlipTrip-${itinerary?.city || 'Itinerary'}-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'in', 
          format: 'letter', 
          orientation: 'portrait' 
        }
      };

      // Показываем индикатор загрузки
      const originalButtonText = 'Download PDF';
      const button = document.querySelector('.download-button');
      if (button) {
        button.textContent = '📄 Generating PDF...';
        button.disabled = true;
      }

      // Генерируем и скачиваем PDF
      await html2pdf().set(options).from(element).save();

      // Восстанавливаем кнопку
      if (button) {
        button.textContent = '📱 Download PDF';
        button.disabled = false;
      }

    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Error generating PDF. Please try again.');
      
      // Восстанавливаем кнопку при ошибке
      const button = document.querySelector('.download-button');
      if (button) {
        button.textContent = '📱 Download PDF';
        button.disabled = false;
      }
    }
  };


  const handleBack = () => {
    navigate('/');
  };

  const handlePayment = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!itineraryId) {
      setError('Itinerary ID is missing. Please refresh the page and try again.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const paymentData = {
        ...formData,
        email: email,
        itineraryId: itineraryId // Pass itinerary ID to payment
      };
      const response = await createCheckoutSession(paymentData);
      // Redirect to Stripe Checkout
      window.location.href = response.url;
    } catch (err) {
      console.error('Payment error:', err);
      setError('Ошибка при создании платежа. Пожалуйста, попробуйте еще раз.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <img 
            src={SkateboardingGif} 
            alt="Loading..." 
            style={{ 
              width: '60px', 
              height: '60px', 
              marginBottom: '16px',
              borderRadius: '8px'
            }} 
          />
          <div style={{ fontSize: '20px', color: '#374151' }}>Curating your perfect day experience...</div>
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
    marginBottom: '16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    display: 'inline-block'
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

          <button
            onClick={handleDownloadPDF}
            className="download-button"
          >
            📱 Download PDF
          </button>
        </div>


        {/* Itinerary Plan */}
        <div className="enhanced-card">
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
            📅 Day Plan
          </h2>
          
          {(() => {
            const blocks = itinerary?.daily_plan?.[0]?.blocks || [];
            const displayedBlocks = showFullPlan ? blocks : blocks.slice(0, 2);
            const hasMoreBlocks = blocks.length > 2 && !showFullPlan;
            
            return (
              <>
                {displayedBlocks.map((block, blockIndex) => (
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
                          {item.approx_cost && <div style={{ marginBottom: '10px' }}>💰 {item.approx_cost}</div>}
                          {item.duration && <div style={{ marginBottom: '10px' }}>⏱️ {item.duration}</div>}
                          {item.tips && <div>💡 {item.tips}</div>}
                          {item.url && (
                            <div style={{ marginTop: '20px' }}>
                              🔗 <a href={item.url} target="_blank" rel="noreferrer" className="enhanced-link">
                                Learn More
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                
                {/* Payment Button - Show if not full plan and there are more blocks */}
                {hasMoreBlocks && (
                  <div style={{
                    marginTop: '32px',
                    padding: '32px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '16px',
                    textAlign: 'center',
                    border: '2px dashed #e5e7eb'
                  }}>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: '#1f2937',
                      marginBottom: '12px'
                    }}>
                      🔒 Unlock Full Itinerary
                    </div>
                    <div style={{
                      fontSize: '16px',
                      color: '#6b7280',
                      marginBottom: '24px'
                    }}>
                      Pay $16 to see the complete day plan with all {blocks.length} locations
                    </div>
                    
                    {/* Email Input */}
                    <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontWeight: 'bold', 
                        color: '#374151',
                        fontSize: '14px'
                      }}>
                        Email (to receive your full itinerary)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: `2px solid ${error && !email ? '#ef4444' : '#e5e7eb'}`,
                          borderRadius: '12px',
                          fontSize: '16px',
                          color: '#374151'
                        }}
                      />
                      {error && !email && (
                        <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px' }}>{error}</p>
                      )}
                    </div>
                    
                    <button
                      onClick={handlePayment}
                      disabled={loading}
                      style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '16px 32px',
                        backgroundColor: '#3E85FC',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s ease',
                        opacity: loading ? 0.7 : 1
                      }}
                      onMouseOver={(e) => {
                        if (!loading) {
                          e.target.style.backgroundColor = '#2563eb';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!loading) {
                          e.target.style.backgroundColor = '#3E85FC';
                        }
                      }}
                    >
                      {loading ? 'Processing...' : '💳 Pay $16 to Unlock'}
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="footer-enhanced">
          <p>Created with ❤️ in FlipTrip</p>
        </div>
      </div>
    </div>
  );
}