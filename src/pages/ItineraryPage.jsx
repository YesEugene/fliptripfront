import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { generateItinerary, generateSmartItinerary, generateSmartItineraryV2, generateCreativeItinerary, generateRealPlacesItinerary, generatePDF, sendEmail } from '../services/api';
import { getTourById } from '../modules/tours-database';
import html2pdf from 'html2pdf.js';
import PhotoGallery from '../components/PhotoGallery';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
// import SkateboardingGif from '../assets/Skateboarding.gif'; // File not found, commented out
import './ItineraryPage.css';

export default function ItineraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [itinerary, setItinerary] = useState(null);

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
  
  // Extract URL parameters
  const tourId = searchParams.get('tourId');
  const previewOnly = searchParams.get('previewOnly') === 'true';
  const isFullPlan = searchParams.get('full') === 'true';
  
  // Extract form data from URL params
  // Note: budget should be null if not in URL (not default to '500')
  const formData = {
    city: searchParams.get('city') || 'Barcelona',
    audience: searchParams.get('audience') || 'him',
    interests: searchParams.get('interests')?.split(',') || ['Romantic'],
    date: searchParams.get('date') || new Date().toISOString().slice(0, 10),
    budget: searchParams.get('budget') || null // null if not specified, not default to '500'
  };

  // Calculate tour tags from tour data (budget, interests, etc.)
  const calculateTourTags = (tour) => {
    const tags = {
      city: typeof tour.city === 'string' ? tour.city : tour.city?.name || 'Unknown City',
      date: formData.date || new Date().toISOString().slice(0, 10),
      audience: null, // Not shown for tours from DB
      budget: null,
      interests: []
    };

    // Calculate budget from all locations' approx_cost
    let totalBudget = 0;
    const allInterests = new Set();
    let itemsProcessed = 0;
    let itemsWithInterests = 0;

    console.log('🔍 Starting calculateTourTags for tour:', tour.id);
    console.log('📋 Tour daily_plan structure:', {
      hasDailyPlan: !!tour.daily_plan,
      dailyPlanLength: tour.daily_plan?.length || 0,
      firstDayBlocks: tour.daily_plan?.[0]?.blocks?.length || 0
    });

    if (tour.daily_plan && Array.isArray(tour.daily_plan)) {
      tour.daily_plan.forEach((day, dayIndex) => {
        if (day.blocks && Array.isArray(day.blocks)) {
          day.blocks.forEach((block, blockIndex) => {
            if (block.items && Array.isArray(block.items)) {
              block.items.forEach((item, itemIndex) => {
                itemsProcessed++;
                
                // Sum up budget
                const cost = parseFloat(item.approx_cost) || parseFloat(item.cost) || 0;
                totalBudget += cost;

                // Debug: Check item structure
                console.log(`📦 Item ${itemsProcessed} (day ${dayIndex}, block ${blockIndex}, item ${itemIndex}):`, {
                  hasLocation: !!item.location,
                  locationName: item.location?.name,
                  hasLocationInterests: !!item.location?.location_interests,
                  locationInterestsType: Array.isArray(item.location?.location_interests) ? 'array' : typeof item.location?.location_interests,
                  locationInterestsLength: item.location?.location_interests?.length || 0,
                  approx_cost: item.approx_cost,
                  cost: item.cost
                });

                // Collect interests from location
                // Try multiple paths to find interests
                if (item.location) {
                  // Path 1: location.location_interests (from backend query)
                  if (item.location.location_interests && Array.isArray(item.location.location_interests)) {
                    item.location.location_interests.forEach(li => {
                      if (li.interest?.name) {
                        allInterests.add(li.interest.name);
                        itemsWithInterests++;
                        console.log(`  ✅ Found interest: ${li.interest.name}`);
                      }
                    });
                  }
                  
                  // Path 2: Check if interests are directly in location
                  if (item.location.interests && Array.isArray(item.location.interests)) {
                    item.location.interests.forEach(interest => {
                      if (typeof interest === 'string') {
                        allInterests.add(interest);
                      } else if (interest.name) {
                        allInterests.add(interest.name);
                      }
                    });
                  }
                  
                  // Path 3: Check interest_ids if available
                  if (item.interest_ids && Array.isArray(item.interest_ids) && item.interest_ids.length > 0) {
                    console.log(`  ⚠️ Item has interest_ids but we need names. IDs:`, item.interest_ids);
                  }
                }
              });
            }
          });
        }
      });
    }

    console.log(`📊 Budget calculation: ${itemsProcessed} items processed, total budget: ${totalBudget}€`);
    console.log(`📊 Interests calculation: ${itemsWithInterests} items with interests, unique interests: ${allInterests.size}`);

    // Format budget
    if (totalBudget > 0) {
      tags.budget = `€${Math.round(totalBudget)}`;
    } else {
      tags.budget = 'Free';
    }

    // Convert interests set to array and limit to 5
    tags.interests = Array.from(allInterests).slice(0, 5);

    console.log('📊 Calculated tour tags:', tags);
    return tags;
  };

  // Get tags to display based on filters or tour data
  const getTagsToDisplay = (tour, hasFilters) => {
    if (hasFilters) {
      // Use filter tags (from URL params)
      return {
        city: formData.city || 'Unknown',
        date: formData.date || new Date().toISOString().slice(0, 10),
        audience: formData.audience || null,
        budget: formData.budget ? `€${formData.budget}` : null,
        interests: formData.interests || []
      };
    } else if (tour) {
      // Use tour tags (calculated from tour data)
      return calculateTourTags(tour);
    } else {
      // Fallback to formData
      return {
        city: formData.city || 'Unknown',
        date: formData.date || new Date().toISOString().slice(0, 10),
        audience: formData.audience || null,
        budget: formData.budget ? `€${formData.budget}` : null,
        interests: formData.interests || []
      };
    }
  };

  // Load tour from database
  const loadTourFromDatabase = async (tourIdParam, isPreviewOnly, isFull) => {
    try {
      setLoading(true);
      setError('');
      console.log('📖 Loading tour from database:', tourIdParam, 'previewOnly:', isPreviewOnly, 'full:', isFull);
      
      const tour = await getTourById(tourIdParam);
      console.log('✅ Tour loaded from DB:', tour);
      console.log('🔍 Tour structure check:', {
        hasDailyPlan: !!tour.daily_plan,
        dailyPlanLength: tour.daily_plan?.length || 0,
        firstDayHasBlocks: !!tour.daily_plan?.[0]?.blocks,
        firstDayBlocksLength: tour.daily_plan?.[0]?.blocks?.length || 0,
        firstBlockHasItems: !!tour.daily_plan?.[0]?.blocks?.[0]?.items,
        firstBlockItemsLength: tour.daily_plan?.[0]?.blocks?.[0]?.items?.length || 0,
        firstItemHasLocation: !!tour.daily_plan?.[0]?.blocks?.[0]?.items?.[0]?.location,
        firstItemLocationName: tour.daily_plan?.[0]?.blocks?.[0]?.items?.[0]?.location?.name,
        firstItemHasLocationInterests: !!tour.daily_plan?.[0]?.blocks?.[0]?.items?.[0]?.location?.location_interests,
        firstItemLocationInterestsType: Array.isArray(tour.daily_plan?.[0]?.blocks?.[0]?.items?.[0]?.location?.location_interests) ? 'array' : typeof tour.daily_plan?.[0]?.blocks?.[0]?.items?.[0]?.location?.location_interests,
        firstItemLocationInterestsLength: tour.daily_plan?.[0]?.blocks?.[0]?.items?.[0]?.location?.location_interests?.length || 0,
        firstItemApproxCost: tour.daily_plan?.[0]?.blocks?.[0]?.items?.[0]?.approx_cost
      });
      
      // Extract city name
      const cityName = typeof tour.city === 'string' ? tour.city : tour.city?.name || 'Unknown City';
      
      // Get first day from daily_plan
      const firstDay = tour.daily_plan && tour.daily_plan.length > 0 ? tour.daily_plan[0] : null;
      
      if (!firstDay || !firstDay.blocks || firstDay.blocks.length === 0) {
        throw new Error('Tour has no daily plan or blocks');
      }
      
      // If preview only (and not full plan), limit to first 2 blocks
      // If full=true, show all blocks
      let blocksToShow = firstDay.blocks;
      if (isPreviewOnly && !isFull && blocksToShow.length > 2) {
        blocksToShow = blocksToShow.slice(0, 2);
        console.log('📋 Preview mode: showing first 2 blocks out of', firstDay.blocks.length);
      } else if (isFull) {
        console.log('📋 Full plan mode: showing all', blocksToShow.length, 'blocks');
      }
      
      // Check if user has filters in URL (excluding budget, as budget logic is separate)
      const hasFilters = searchParams.get('city') || 
                         searchParams.get('audience') || 
                         searchParams.get('interests') || 
                         searchParams.get('date');
      
      // Check if budget was explicitly provided in URL (not default)
      const hasBudgetFilter = searchParams.get('budget') !== null;
      
      console.log('🔍 Filter check:', {
        hasFilters: !!hasFilters,
        hasBudgetFilter,
        budgetFromURL: searchParams.get('budget'),
        formDataBudget: formData.budget
      });
      
      // Calculate tags from tour
      const tourTags = calculateTourTags(tour);
      
      // Override budget: use filter budget ONLY if explicitly provided in URL, otherwise use calculated from tour
      const finalBudget = hasBudgetFilter && formData.budget ? `€${formData.budget}` : tourTags.budget;
      
      // Get tags to display
      const tags = hasFilters ? {
        city: formData.city || tourTags.city,
        date: formData.date || tourTags.date,
        audience: formData.audience || null,
        budget: finalBudget,
        interests: formData.interests && formData.interests.length > 0 ? formData.interests : tourTags.interests
      } : {
        ...tourTags,
        budget: finalBudget // Use calculated budget if no filter budget
      };
      
      // Convert tour data to itinerary format
      const itineraryData = {
        title: tour.title || 'Tour',
        subtitle: tour.description || `Explore ${cityName} with this curated tour`,
        city: cityName,
        date: formData.date || new Date().toISOString().slice(0, 10),
        budget: finalBudget,
        daily_plan: [{
          blocks: blocksToShow.map(block => ({
            time: block.time || '09:00 - 12:00',
            title: block.title || null,
            items: block.items.map(item => ({
              title: item.title || '',
              address: item.address || '',
              why: item.why || item.description || '',
              tips: item.tips || item.recommendations || '',
              photos: item.photos || [],
              cost: item.cost || item.approx_cost || 0,
              duration: item.duration || null,
              approx_cost: item.approx_cost || item.cost || 'Free'
            }))
          }))
        }],
        // Add tour metadata
        tourId: tourIdParam,
        preview_media_url: tour.preview_media_url || tour.preview || null,
        // Add tags for display
        tags: tags
      };
      
      console.log('✅ Converted tour to itinerary format:', itineraryData);
      setItinerary(itineraryData);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error loading tour from database:', err);
      setError(err.message || 'Failed to load tour');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isExample && exampleItinerary) {
      // Use example data directly
      setItinerary(exampleItinerary);
      setLoading(false);
    } else if (tourId) {
      // Load tour from database
      loadTourFromDatabase(tourId, previewOnly, isFullPlan);
    } else {
      // Generate new itinerary
      generateItineraryData();
    }
  }, [isExample, exampleItinerary, tourId, previewOnly, isFullPlan]);

  const generateItineraryData = async () => {
    try {
      setLoading(true);
      console.log('🌍 Starting REAL PLACES itinerary generation...');
      
      try {
        // ОСНОВНАЯ система с реальными местами
        const data = await generateSmartItinerary(formData);
        console.log('✅ Received smart itinerary data:', data);
        
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
        
        // Add tags to fallback data
        fallbackData.tags = {
          city: formData.city || 'Unknown',
          date: formData.date || new Date().toISOString().slice(0, 10),
          audience: formData.audience || null,
          budget: formData.budget ? `€${formData.budget}` : null,
          interests: formData.interests || []
        };
        
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <img 
            src="https://via.placeholder.com/200?text=Loading..." 
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
            {/* City tag */}
            <span className="badge-enhanced" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>
              🌍 {itinerary?.tags?.city || formData.city || 'Unknown'}
            </span>
            
            {/* Date tag */}
            <span className="badge-enhanced" style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}>
              📅 {itinerary?.tags?.date || formData.date || new Date().toISOString().slice(0, 10)}
            </span>
            
            {/* Audience tag - only show if from filters */}
            {itinerary?.tags?.audience && (
              <span className="badge-enhanced" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                For: {itinerary.tags.audience}
              </span>
            )}
            
            {/* Budget tag - always show if available */}
            {itinerary?.tags?.budget && (
              <span className="badge-enhanced" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                Budget: {itinerary.tags.budget}
              </span>
            )}
            
            {/* Fallback: show budget from itinerary.budget if tags.budget is not available */}
            {!itinerary?.tags?.budget && itinerary?.budget && (
              <span className="badge-enhanced" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                Budget: {itinerary.budget}
              </span>
            )}
            
            {/* Interests tags - show from tags if available, otherwise from formData */}
            {(itinerary?.tags?.interests && itinerary.tags.interests.length > 0) && itinerary.tags.interests.map((interest, index) => (
              <span key={index} className="badge-enhanced" style={{ backgroundColor: '#fde7e7', color: '#b91c1c' }}>
                🎯 {interest}
              </span>
            ))}
            
            {/* Fallback: show interests from formData if tags.interests is empty */}
            {(!itinerary?.tags?.interests || itinerary.tags.interests.length === 0) && formData.interests && formData.interests.length > 0 && formData.interests.map((interest, index) => (
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
          
          {itinerary?.daily_plan?.[0]?.blocks?.map((block, blockIndex) => (
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
        </div>

        {/* Footer */}
        <div className="footer-enhanced">
          <p>Created with ❤️ in FlipTrip</p>
        </div>
      </div>
    </div>
  );
}