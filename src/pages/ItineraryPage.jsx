import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { generateSmartItinerary, saveItinerary, getItinerary, completeItinerary, createCheckoutSession, getAlternatives } from '../services/api';
import PhotoGallery from '../components/PhotoGallery';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import './ItineraryPage.css';

export default function ItineraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [itinerary, setItinerary] = useState(null);
  const [itineraryId, setItineraryId] = useState(null);
  const [email, setEmail] = useState('');
  const [showFullPlan, setShowFullPlan] = useState(false);
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

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

  // Extract itineraryId and full flag from URL
  const urlItineraryId = searchParams.get('id');
  const urlShowFullPlan = searchParams.get('full') === 'true';

  useEffect(() => {
    console.log('🔄 useEffect triggered:', { isExample, hasExampleItinerary: !!exampleItinerary, urlItineraryId, urlShowFullPlan });
    
    if (isExample && exampleItinerary) {
      setItinerary(exampleItinerary);
      setLoading(false);
    } else if (urlItineraryId) {
      console.log('📥 Loading itinerary by ID from URL:', urlItineraryId);
      setItineraryId(urlItineraryId);
      if (urlShowFullPlan) {
        setShowFullPlan(true);
      }
      loadItineraryById(urlItineraryId);
    } else {
      console.log('🆕 Generating new preview itinerary (2 locations)');
      console.log('📊 Form data:', formData);
      generateItineraryData(true); // previewOnly = true
    }
  }, [isExample, exampleItinerary, urlItineraryId, urlShowFullPlan]);

  const generateItineraryData = async (previewOnly = false) => {
    try {
      setLoading(true);
      console.log('🌍 Starting REAL PLACES itinerary generation (previewOnly:', previewOnly, ')...');
      
      try {
        // ОСНОВНАЯ система с реальными местами
        console.log('CALLING generateSmartItinerary with previewOnly:', previewOnly, 'type:', typeof previewOnly);
        const data = await generateSmartItinerary(formData, previewOnly);
        console.log('✅ Received smart itinerary data:', data);
        
        // Проверяем, есть ли активности в плане
        const hasActivities = data.activities && data.activities.length > 0;
        
        if (hasActivities) {
          // Конвертируем данные в нужный формат для отображения
          const convertedData = {
            ...data,
            previewOnly: data.previewOnly || previewOnly, // Preserve previewOnly flag
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
                  rating: activity.rating,
                  category: activity.category // Сохраняем category для поиска альтернатив
                }]
              }))
            }]
          };
          console.log('✅ Converted data for display:', convertedData);
          console.log('Preview mode:', convertedData.previewOnly, 'Activities count:', convertedData.daily_plan[0].blocks.length);
          setItinerary(convertedData);
          
          // Если это preview и нет itineraryId, сохраняем в Redis
          if (previewOnly && !urlItineraryId && !itineraryId) {
            console.log('Saving preview itinerary to Redis...');
            try {
              const saveResult = await saveItinerary({
                itinerary: convertedData,
                itineraryId: null // Let backend generate ID
              });
              console.log('Data to save:', { previewOnly: convertedData.previewOnly, activitiesCount: convertedData.daily_plan[0].blocks.length });
              
              if (saveResult.success && saveResult.itineraryId) {
                const newId = saveResult.itineraryId;
                setItineraryId(newId);
                // Update URL with itinerary ID
                const newParams = new URLSearchParams(searchParams);
                newParams.set('id', newId);
                setSearchParams(newParams, { replace: true });
                console.log('✅ Preview saved with ID:', newId);
              }
            } catch (saveError) {
              console.error('❌ Failed to save itinerary:', saveError);
              // Don't block the UI if save fails
            }
          }
          
          return;
        } else {
          console.log('⚠️ Smart itinerary API returned empty itinerary');
          throw new Error('No activities found in smart itinerary');
        }
      } catch (apiError) {
        console.error('❌ Real places API failed:', apiError);
        
        // Если это ошибка квоты OpenAI, показываем понятное сообщение
        if (apiError.response?.data?.error?.includes('quota') || apiError.message?.includes('quota')) {
          setError('OpenAI API quota exceeded. Please try again later or contact support.');
        } else {
          setError(`Failed to generate itinerary for ${formData.city}. Please try again later.`);
        }
      }
      
    } catch (error) {
      console.error('❌ Complete failure:', error);
      setError(`Failed to generate itinerary for ${formData.city}. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  const loadItineraryById = async (id) => {
    try {
      setLoading(true);
      console.log('📥 Loading itinerary from Redis:', id);
      
      const response = await getItinerary(id);
      
      if (response.success && response.itinerary) {
        const savedItinerary = response.itinerary;
        console.log('✅ Loaded itinerary:', { previewOnly: savedItinerary.previewOnly, activitiesCount: savedItinerary.activities?.length });
        
        // Convert to display format
        const convertedData = {
          ...savedItinerary,
          daily_plan: [{
            date: savedItinerary.date,
            blocks: (savedItinerary.activities || []).map(activity => ({
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
        
        setItinerary(convertedData);
        
        // If we need to show full plan and it's still a preview, generate full plan
        if ((showFullPlan || urlShowFullPlan) && savedItinerary.previewOnly) {
          console.log('🔄 Generating full itinerary from preview...');
          await generateFullItinerary(id);
        }
      } else {
        setError('Itinerary not found. Please generate a new one.');
      }
    } catch (error) {
      console.error('❌ Error loading itinerary:', error);
      setError('Failed to load itinerary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateFullItinerary = async (id) => {
    try {
      setLoading(true);
      console.log('🔄 Completing itinerary:', id);
      
      const response = await completeItinerary(id, formData);
      
      if (response.success && response.itinerary) {
        const fullItinerary = response.itinerary;
        
        // Convert to display format
        const convertedData = {
          ...fullItinerary,
          daily_plan: [{
            date: fullItinerary.date,
            blocks: (fullItinerary.activities || []).map(activity => ({
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
                rating: activity.rating,
                category: activity.category // Сохраняем category
              }]
            }))
          }]
        };
        
        setItinerary(convertedData);
        setShowFullPlan(true);
        console.log('✅ Full itinerary loaded:', convertedData.daily_plan[0].blocks.length, 'activities');
      }
    } catch (error) {
      console.error('❌ Error completing itinerary:', error);
      setError('Failed to generate full itinerary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    const currentItineraryId = itineraryId || urlItineraryId;
    if (!email || !currentItineraryId) {
      alert('Please enter your email and ensure itinerary ID is present.');
      return;
    }
    
    try {
      console.log('💳 Creating checkout session:', { email, itineraryId: currentItineraryId });
      const session = await createCheckoutSession({
        ...formData,
        email,
        itineraryId: currentItineraryId
      });
      
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  // Обработка выбора альтернативного места
  const handleChooseAlternative = async (item) => {
    console.log('🔄 Choosing alternative for:', { title: item.title, category: item.category, city: formData.city });
    setCurrentItem(item);
    setShowAlternativesModal(true);
    setLoadingAlternatives(true);
    setAlternatives([]);
    
    try {
      // Определяем category для поиска альтернатив
      let searchCategory = item.category;
      if (!searchCategory) {
        const titleLower = item.title.toLowerCase();
        if (titleLower.includes('cafe') || titleLower.includes('coffee')) {
          searchCategory = 'cafe';
        } else if (titleLower.includes('restaurant') || titleLower.includes('dining')) {
          searchCategory = 'restaurant';
        } else if (titleLower.includes('bar') || titleLower.includes('pub')) {
          searchCategory = 'bar';
        } else if (titleLower.includes('bike') || titleLower.includes('cycling')) {
          searchCategory = 'bicycle_store';
        } else if (titleLower.includes('gym') || titleLower.includes('fitness')) {
          searchCategory = 'gym';
        } else if (titleLower.includes('night') || titleLower.includes('club')) {
          searchCategory = 'night_club';
        } else {
          searchCategory = 'restaurant'; // Fallback
        }
      }
      
      console.log('🔍 Searching alternatives with category:', searchCategory);
      
      const response = await getAlternatives(
        searchCategory,
        formData.city,
        item.title,
        item.address
      );
      
      console.log('📥 Alternatives response:', response);
      
      if (response && response.success && response.alternatives) {
        console.log('✅ Found alternatives:', response.alternatives.length);
        setAlternatives(response.alternatives);
      } else {
        console.log('⚠️ No alternatives found or error in response');
        setAlternatives([]);
      }
    } catch (error) {
      console.error('❌ Error loading alternatives:', error);
      setAlternatives([]);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  // Выбор альтернативного места
  const handleSelectAlternative = async (alternative) => {
    if (!currentItem || !itinerary || !itineraryId) {
      console.error('❌ Cannot select alternative: missing data');
      return;
    }

    try {
      // Обновляем текущий item с выбранной альтернативой
      const updatedItinerary = { ...itinerary };
      const blockIndex = updatedItinerary.daily_plan[0].blocks.findIndex(
        block => block.items.some(item => item.title === currentItem.title)
      );
      
      if (blockIndex !== -1) {
        const itemIndex = updatedItinerary.daily_plan[0].blocks[blockIndex].items.findIndex(
          item => item.title === currentItem.title
        );
        
        if (itemIndex !== -1) {
          // Обновляем item с данными альтернативного места
          updatedItinerary.daily_plan[0].blocks[blockIndex].items[itemIndex] = {
            ...updatedItinerary.daily_plan[0].blocks[blockIndex].items[itemIndex],
            title: alternative.name,
            address: alternative.address,
            rating: alternative.rating,
            photos: alternative.photos.map(photoUrl => ({
              url: photoUrl,
              thumbnail: photoUrl,
              source: 'google_places'
            })),
            approx_cost: alternative.priceLevel === 0 ? 'Free' : 
                        alternative.priceLevel === 1 ? '€' :
                        alternative.priceLevel === 2 ? '€€' :
                        alternative.priceLevel === 3 ? '€€€' : '€€€€',
            category: currentItem.category // Сохраняем category при замене места
          };
          
          // Обновляем состояние
          setItinerary(updatedItinerary);
          
          // Сохраняем обновленный itinerary в Redis
          console.log('💾 Saving updated itinerary to Redis:', itineraryId);
          await saveItinerary({
            itinerary: updatedItinerary,
            itineraryId: itineraryId
          });
          console.log('✅ Itinerary updated and saved to Redis');
          
          // Закрываем модальное окно
          setShowAlternativesModal(false);
          setCurrentItem(null);
          setAlternatives([]);
        }
      }
    } catch (error) {
      console.error('❌ Error selecting alternative:', error);
      alert('Failed to update location. Please try again.');
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
    // Dynamic import for html2pdf.js to avoid build issues
    const html2pdf = (await import('html2pdf.js')).default;
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            margin: '0 auto 16px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
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
        {/* Header with Image */}
        <div style={{ 
          position: 'relative', 
          borderRadius: '16px', 
          overflow: 'hidden',
          marginBottom: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          {/* Background Image - City-specific */}
          {(() => {
            // Get city-specific image
            const cityImages = {
              'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=600&fit=crop&q=80',
              'Barcelona': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d2?w=1200&h=600&fit=crop&q=80',
              'Amsterdam': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&h=600&fit=crop&q=80',
              'Berlin': 'https://images.unsplash.com/photo-1587330979470-3595ac045ab0?w=1200&h=600&fit=crop&q=80',
              'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=600&fit=crop&q=80',
              'Rome': 'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=1200&h=600&fit=crop&q=80',
              'Madrid': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d2?w=1200&h=600&fit=crop&q=80',
              'Lisbon': 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&h=600&fit=crop&q=80',
              'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=600&fit=crop&q=80',
              'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=600&fit=crop&q=80',
              'Prague': 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=1200&h=600&fit=crop&q=80',
              'Vienna': 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1200&h=600&fit=crop&q=80',
              'Venice': 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=1200&h=600&fit=crop&q=80',
              'Florence': 'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?w=1200&h=600&fit=crop&q=80',
              'Moscow': 'https://images.unsplash.com/photo-1513326738677-b964603b136d?w=1200&h=600&fit=crop&q=80',
              'Istanbul': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&h=600&fit=crop&q=80',
              'Dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&h=600&fit=crop&q=80',
              'Sydney': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop&q=80',
              'Singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&h=600&fit=crop&q=80',
              'Copenhagen': 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1200&h=600&fit=crop&q=80'
            };
            
            const cityName = formData.city || 'Barcelona';
            const cityImage = cityImages[cityName] || `https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=600&fit=crop&q=80&auto=format`;
            
            return (
              <div style={{
                width: '100%',
                height: '100px',
                backgroundImage: `url(${cityImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative'
              }}>
                {/* Dark overlay for better text readability */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)'
                }} />
                
                {/* Title overlay on image */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '16px',
                  right: '16px',
                  zIndex: 2
                }}>
                  <h1 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: 'white',
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    margin: 0,
                    lineHeight: '1.2'
                  }}>
                    {itinerary?.title || generateFallbackTitle(formData)}
                  </h1>
                </div>

                {/* Download PDF Button at bottom of image */}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '16px',
                  zIndex: 2
                }}>
                  <button
                    onClick={handleDownloadPDF}
                    style={{
                      backgroundColor: 'white',
                      color: '#1f2937',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#f9fafb';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'white';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
                    }}
                  >
                    <span style={{ fontSize: '10px' }}>📄</span>
                    Download PDF
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Content below image */}
        <div className="enhanced-card">
          <p className="subtitle" style={{ marginTop: 0 }}>
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
        </div>

        {/* Pay to Unlock Section */}
        {itinerary?.previewOnly && !showFullPlan && itinerary?.daily_plan?.[0]?.blocks && itinerary.daily_plan[0].blocks.length >= 2 && (
          <div className="enhanced-card" style={{ 
            backgroundColor: '#eff6ff', 
            border: '2px solid #3b82f6',
            marginBottom: '24px'
          }}>
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔒</div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px' }}>
                Unlock Full Itinerary
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                Get access to the complete day plan with all activities
              </p>
              
              <div style={{ maxWidth: '400px', margin: '0 auto 20px' }}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '16px',
                    marginBottom: '16px'
                  }}
                />
                <button
                  onClick={handlePayment}
                  disabled={!email || !(itineraryId || urlItineraryId)}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    backgroundColor: (itineraryId || urlItineraryId) && email ? '#3b82f6' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: (itineraryId || urlItineraryId) && email ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s'
                  }}
                >
                  Pay to Unlock Full Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Itinerary Plan */}
        <div className="enhanced-card">
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
            📅 Day Plan
          </h2>
          
          {/* Show only 2 blocks for preview, all blocks for full plan */}
          {itinerary?.daily_plan?.[0]?.blocks
            ?.filter((block, blockIndex) => {
              // Если это preview и не показываем полный план, показываем только первые 2 блока
              if (itinerary.previewOnly && !showFullPlan) {
                return blockIndex < 2;
              }
              // Если это полный план, показываем все блоки
              return true;
            })
            ?.map((block, blockIndex) => (
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
                  
                  {/* Alternatives Button */}
                  <div style={{ marginTop: '16px' }}>
                    <button
                      onClick={() => handleChooseAlternative(item)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        backgroundColor: 'white',
                        color: '#1f2937',
                        border: '2px solid #3b82f6',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#eff6ff';
                        e.target.style.borderColor = '#2563eb';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'white';
                        e.target.style.borderColor = '#3b82f6';
                      }}
                    >
                      🔄 Alternatives
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          
          {/* Show message if preview and more blocks available */}
          {itinerary?.previewOnly && !showFullPlan && itinerary?.daily_plan?.[0]?.blocks?.length > 2 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px', 
              color: '#6b7280',
              fontSize: '14px',
              borderTop: '1px solid #e5e7eb',
              marginTop: '20px'
            }}>
              🔒 {itinerary.daily_plan[0].blocks.length - 2} more activities available after payment
            </div>
          )}
        </div>

        {/* Alternatives Modal */}
        {showAlternativesModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => {
            setShowAlternativesModal(false);
            setCurrentItem(null);
            setAlternatives([]);
          }}
          >
            <div 
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold', 
                  color: '#1f2937',
                  margin: 0
                }}>
                  Choose Alternative Place
                </h2>
                <button
                  onClick={() => {
                    setShowAlternativesModal(false);
                    setCurrentItem(null);
                    setAlternatives([]);
                  }}
                  style={{
                    background: 'none',
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
              
              {currentItem && (
                <p style={{ 
                  color: '#6b7280', 
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>
                  Current: <strong>{currentItem.title}</strong>
                </p>
              )}
              
              {loadingAlternatives ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    margin: '0 auto 16px',
                    border: '4px solid #f3f4f6',
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <p style={{ color: '#6b7280' }}>Loading alternatives...</p>
                </div>
              ) : alternatives.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {alternatives.map((alt, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectAlternative(alt)}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: 'white'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}>
                        <h3 style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold', 
                          color: '#1f2937',
                          margin: 0
                        }}>
                          {alt.name}
                        </h3>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          ⭐ {alt.rating.toFixed(1)}
                        </div>
                      </div>
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#6b7280',
                        margin: '0 0 8px 0'
                      }}>
                        📍 {alt.address}
                      </p>
                      {alt.photos && alt.photos.length > 0 && (
                        <img 
                          src={alt.photos[0]} 
                          alt={alt.name}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            marginTop: '8px'
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: '#6b7280' }}>No alternatives found. Try a different category.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="footer-enhanced">
          <p>Created with ❤️ in FlipTrip</p>
        </div>
      </div>
    </div>
  );
}