import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { generateItinerary, generateSmartItinerary, generateSmartItineraryV2, generateCreativeItinerary, generateRealPlacesItinerary, generatePDF, sendEmail, saveItinerary, getItinerary, getTourById } from '../services/api';
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
  const [interestNames, setInterestNames] = useState([]); // Имена интересов для отображения
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // Для переключения между днями
  const [guide, setGuide] = useState(null); // Информация о креаторе тура (гиде)

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
  const tourId = searchParams.get('tourId'); // Tour ID from database
  const isFullPlan = searchParams.get('full') === 'true'; // Indicates we expect a full plan, not preview
  // Extract interest_ids from query params (can be multiple with same name)
  const interestIds = searchParams.getAll('interest_ids');
  
  const formData = {
    city: searchParams.get('city') || 'Barcelona',
    audience: searchParams.get('audience') || 'him',
    interests: searchParams.get('interests')?.split(',') || [], // Legacy support
    interest_ids: interestIds.length > 0 ? interestIds : [], // New system
    date: searchParams.get('date') || new Date().toISOString().slice(0, 10),
    budget: searchParams.get('budget') || '500',
    previewOnly: previewOnly // Boolean value
  };
  
  console.log('🔍 ItineraryPage - previewOnly:', previewOnly, 'existingItineraryId:', existingItineraryId, 'tourId:', tourId, 'isFullPlan:', isFullPlan, 'formData:', formData);

  useEffect(() => {
    if (existingItineraryId) {
      setItineraryId(existingItineraryId);
      // If full=true, we expect a full plan, so load it
      if (isFullPlan) {
        console.log('🔄 Loading full plan after payment...');
        loadItineraryFromRedis(existingItineraryId);
      }
    }
  }, [existingItineraryId]);

  // Load tour and convert to preview format (NO GENERATION - use existing tour data)
  const loadTourAndGeneratePreview = async (tourIdParam) => {
    try {
      setLoading(true);
      setError('');
      console.log('📖 Loading tour from database:', tourIdParam);
      
      const tourResponse = await getTourById(tourIdParam);
      if (!tourResponse.success || !tourResponse.tour) {
        throw new Error('Tour not found');
      }
      
      const tour = tourResponse.tour;
      console.log('✅ Tour loaded from DB (no generation needed):', tour);
      
      // Save guide info if available
      if (tour.guide) {
        setGuide(tour.guide);
        console.log('👤 Guide info loaded:', tour.guide);
      }
      
      // Extract city name from tour
      const cityName = typeof tour.city === 'string' ? tour.city : tour.city?.name || tour.city_id || 'Barcelona';
      
      // Convert tour structure directly to preview format (NO API CALL)
      const date = formData.date || new Date().toISOString().slice(0, 10);
      
      // Build daily_plan from tour structure (tour_days → tour_blocks → tour_items)
      // IMPORTANT: Each day should be a separate element in daily_plan array
      // IMPORTANT: Save ALL blocks to Redis, not just 2. Preview display will show only 2.
      const dailyPlan = [];
      let totalDays = 0;
      let totalBlocks = 0;
      let totalItems = 0;
      
      // Helper function to parse time string to minutes for sorting
      const parseTime = (timeStr) => {
        if (!timeStr) return Infinity;
        const match = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (match) {
          return parseInt(match[1]) * 60 + parseInt(match[2]);
        }
        return Infinity;
      };
      
      // Helper function to sort blocks by start time
      const sortBlocksByTime = (blocks) => {
        return blocks.sort((a, b) => {
          const timeA = a.time ? parseTime(a.time.split(' - ')[0]) : Infinity;
          const timeB = b.time ? parseTime(b.time.split(' - ')[0]) : Infinity;
          return timeA - timeB;
        });
      };
      
      if (tour.tour_days && Array.isArray(tour.tour_days)) {
        totalDays = tour.tour_days.length;
        // Sort days by day_number
        const sortedDays = [...tour.tour_days].sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
        
        for (const day of sortedDays) {
          const dayBlocks = [];
          if (day.tour_blocks && Array.isArray(day.tour_blocks)) {
            totalBlocks += day.tour_blocks.length;
            for (const block of day.tour_blocks) {
              const items = [];
              if (block.tour_items && Array.isArray(block.tour_items)) {
                totalItems += block.tour_items.length;
                for (const item of block.tour_items) {
                  const location = item.location;
                  if (location) {
                    items.push({
                      title: item.custom_title || location.name,
                      description: item.custom_description || location.description || '',
                      why: item.custom_description || location.description || '',
                      category: location.category || 'attraction',
                      location: location.name,
                      address: location.address || '',
                      photos: location.photos ? (Array.isArray(location.photos) ? location.photos.map(p => ({
                        url: p.url || p,
                        thumbnail: p.url || p,
                        source: 'database'
                      })) : []) : [],
                      tips: item.custom_recommendations || location.recommendations || '',
                      approx_cost: item.approx_cost ? `€${item.approx_cost}` : 'Free',
                      rating: 4.5
                    });
                  }
                }
              }
              
              if (items.length > 0) {
                dayBlocks.push({
                  time: block.start_time && block.end_time 
                    ? `${block.start_time} - ${block.end_time}`
                    : block.title || 'TBD',
                  items: items,
                  start_time: block.start_time // Keep for sorting
                });
              }
            }
          }
          
          // Sort blocks by time and add to daily plan
          if (dayBlocks.length > 0) {
            const sortedDayBlocks = sortBlocksByTime(dayBlocks);
            dailyPlan.push({
              date: date,
              day_number: day.day_number || dailyPlan.length + 1,
              blocks: sortedDayBlocks
            });
          }
        }
      }
      
      console.log(`📊 Tour structure from DB (preview): ${totalDays} days, ${totalBlocks} blocks, ${totalItems} items`);
      console.log(`📊 Built ${dailyPlan.length} days for preview`);
      
      // Build preview itinerary from tour data
      // Save ALL blocks to Redis, previewOnly flag controls display
      // If isFullPlan=true, show full tour without preview restrictions
      const previewItinerary = {
        title: tour.title,
        subtitle: tour.description || `Explore ${cityName} with this curated tour`,
        date: date,
        budget: tour.price_pdf ? tour.price_pdf.toString() : '500',
        previewOnly: !isFullPlan, // Full plan if isFullPlan=true, preview otherwise
        daily_plan: dailyPlan, // Each day is separate
        tourId: tourIdParam,
        preview_media_url: tour.preview_media_url || null // Add preview image from tour
      };
      
      // Save to Redis
      const saveResponse = await saveItinerary(previewItinerary);
      if (saveResponse.success && saveResponse.itineraryId) {
        setItineraryId(saveResponse.itineraryId);
        previewItinerary.id = saveResponse.itineraryId;
      }
      
      setItinerary(previewItinerary);
      setSelectedDayIndex(0); // Reset to first day
      setLoading(false);
      console.log('✅ Preview itinerary created from tour data (no generation)');
    } catch (err) {
      console.error('❌ Error loading tour and creating preview:', err);
      setError(err.message || 'Failed to load tour preview');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isExample && exampleItinerary) {
      // Use example data directly
      setItinerary(exampleItinerary);
      setLoading(false);
    } else if (existingItineraryId) {
      // Load existing itinerary from Redis (preview or full)
      console.log('📥 Loading existing itinerary from Redis:', existingItineraryId, isFullPlan ? '(expecting full plan)' : '');
      loadItineraryFromRedis(existingItineraryId);
    } else if (tourId) {
      // Load tour from database and generate preview
      console.log('📖 Loading tour and generating preview:', tourId);
      loadTourAndGeneratePreview(tourId);
    } else if (formData.city && formData.city !== 'Barcelona') {
      // Only generate if we have explicit city parameter (user came from homepage with filters)
      // Don't auto-generate for default/empty city
      console.log('🆕 Generating new itinerary with city parameter, previewOnly:', previewOnly);
      generateItineraryData();
    } else {
      // No city parameter - don't auto-generate, just show loading state
      console.log('⚠️ No city parameter - not auto-generating itinerary to save API costs');
      setLoading(false);
      setError('Please select a city and interests on the homepage to generate an itinerary.');
    }
  }, [isExample, exampleItinerary, existingItineraryId, tourId, previewOnly, isFullPlan]);

  const loadItineraryFromRedis = async (itineraryId) => {
    try {
      setLoading(true);
      console.log('📥 Loading itinerary from Redis:', itineraryId, 'isFullPlan:', isFullPlan, 'previewOnly:', previewOnly);
      const data = await getItinerary(itineraryId);
      console.log('📥 Loaded data:', data);
      if (data && data.success && data.itinerary) {
        console.log('✅ Itinerary loaded from Redis');
        const loadedItinerary = data.itinerary;
        
        // Log what we loaded
        const totalItems = loadedItinerary.daily_plan?.[0]?.blocks?.reduce((sum, block) => sum + (block.items?.length || 0), 0) || 0;
        const totalActivities = loadedItinerary.activities?.length || 0;
        const totalBlocks = loadedItinerary.daily_plan?.[0]?.blocks?.length || 0;
        console.log('📊 Loaded itinerary info:', {
          hasDailyPlan: !!loadedItinerary.daily_plan,
          dailyPlanBlocks: totalBlocks,
          totalItemsInDailyPlan: totalItems,
          hasActivities: !!loadedItinerary.activities,
          activitiesCount: totalActivities,
          previewOnly: loadedItinerary.previewOnly,
          hasConceptualPlan: !!loadedItinerary.conceptual_plan,
          timeSlotsCount: loadedItinerary.conceptual_plan?.timeSlots?.length || 0
        });
        
        // CRITICAL: If we expect full plan but loaded previewOnly=true, reload full tour from DB
        // Use tourId from URL if available, otherwise from loaded itinerary
        const tourIdToReload = tourId || loadedItinerary.tourId;
        if (isFullPlan && loadedItinerary.previewOnly === true && tourIdToReload) {
          console.warn('⚠️ Expected full plan but loaded previewOnly=true with tourId');
          console.log('🔄 Reloading full tour from database...', { tourIdFromURL: tourId, tourIdFromRedis: loadedItinerary.tourId, usingTourId: tourIdToReload });
          
          // Reload full tour from database
          try {
            const tourResponse = await getTourById(tourIdToReload);
            if (tourResponse.success && tourResponse.tour) {
              const tour = tourResponse.tour;
              
              // Save guide info if available
              if (tour.guide) {
                setGuide(tour.guide);
                console.log('👤 Guide info loaded (reload):', tour.guide);
              }
              
              const cityName = typeof tour.city === 'string' ? tour.city : tour.city?.name || tour.city_id || 'Barcelona';
              const date = loadedItinerary.date || formData.date || new Date().toISOString().slice(0, 10);
              
              // Build daily_plan from tour structure - each day separate
              // Helper function to parse time string to minutes for sorting
              const parseTime = (timeStr) => {
                if (!timeStr) return Infinity;
                const match = timeStr.match(/(\d{1,2}):(\d{2})/);
                if (match) {
                  return parseInt(match[1]) * 60 + parseInt(match[2]);
                }
                return Infinity;
              };
              
              // Helper function to sort blocks by start time
              const sortBlocksByTime = (blocks) => {
                return blocks.sort((a, b) => {
                  const timeA = a.time ? parseTime(a.time.split(' - ')[0]) : Infinity;
                  const timeB = b.time ? parseTime(b.time.split(' - ')[0]) : Infinity;
                  return timeA - timeB;
                });
              };
              
              const dailyPlan = [];
              let totalDays = 0;
              let totalBlocks = 0;
              let totalItems = 0;
              
              if (tour.tour_days && Array.isArray(tour.tour_days)) {
                totalDays = tour.tour_days.length;
                // Sort days by day_number
                const sortedDays = [...tour.tour_days].sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
                
                for (const day of sortedDays) {
                  const dayBlocks = [];
                  if (day.tour_blocks && Array.isArray(day.tour_blocks)) {
                    totalBlocks += day.tour_blocks.length;
                    for (const block of day.tour_blocks) {
                      const items = [];
                      if (block.tour_items && Array.isArray(block.tour_items)) {
                        totalItems += block.tour_items.length;
                        for (const item of block.tour_items) {
                          const location = item.location;
                          if (location) {
                            items.push({
                              title: item.custom_title || location.name,
                              description: item.custom_description || location.description || '',
                              why: item.custom_description || location.description || '',
                              category: location.category || 'attraction',
                              location: location.name,
                              address: location.address || '',
                              photos: location.photos ? (Array.isArray(location.photos) ? location.photos.map(p => ({
                                url: p.url || p,
                                thumbnail: p.url || p,
                                source: 'database'
                              })) : []) : [],
                              tips: item.custom_recommendations || location.recommendations || '',
                              approx_cost: item.approx_cost ? `€${item.approx_cost}` : 'Free',
                              rating: 4.5
                            });
                          }
                        }
                      }
                      
                      if (items.length > 0) {
                        dayBlocks.push({
                          time: block.start_time && block.end_time 
                            ? `${block.start_time} - ${block.end_time}`
                            : block.title || 'TBD',
                          items: items,
                          start_time: block.start_time // Keep for sorting
                        });
                      }
                    }
                  }
                  
                  // Sort blocks by time and add to daily plan
                  if (dayBlocks.length > 0) {
                    const sortedDayBlocks = sortBlocksByTime(dayBlocks);
                    dailyPlan.push({
                      date: date,
                      day_number: day.day_number || dailyPlan.length + 1,
                      blocks: sortedDayBlocks
                    });
                  }
                }
              }
              
              console.log(`📊 Tour structure from DB: ${totalDays} days, ${totalBlocks} blocks, ${totalItems} items`);
              console.log(`📊 Built ${dailyPlan.length} days for display`);
              
              // Create full itinerary with all blocks separated by days
              const fullItinerary = {
                ...loadedItinerary,
                title: tour.title,
                subtitle: tour.description || `Explore ${cityName} with this curated tour`,
                previewOnly: false, // Full plan unlocked
                daily_plan: dailyPlan, // Each day is separate
                preview_media_url: tour.preview_media_url || loadedItinerary.preview_media_url || null // Add preview image from tour
              };
              
              // Update in Redis
              await saveItinerary(fullItinerary, itineraryId);
              
              setItinerary(fullItinerary);
              setSelectedDayIndex(0); // Reset to first day
              setLoading(false);
              console.log(`✅ Full tour loaded from database with ${dailyPlan.length} days, ${totalBlocks} blocks (${totalItems} total locations)`);
              return;
            }
          } catch (tourError) {
            console.error('❌ Error reloading tour from DB:', tourError);
            // Fall through to use Redis data
          }
        }
        
        // Check if it's already in the converted format (has daily_plan)
        if (loadedItinerary.daily_plan && loadedItinerary.daily_plan.length > 0) {
          // Already converted, use as is
          // CRITICAL: If full=true in URL OR previewOnly=false in loaded data, show all blocks
          // If previewOnly=true in URL AND full=false, show only first 2 blocks
          // NEW APPROACH: Show preview only if previewOnly=true AND not full plan
          // If isFullPlan=true OR previewOnly=false, show all blocks
          const shouldShowPreview = loadedItinerary.previewOnly === true && !isFullPlan;
          
          // Helper function to parse time string to minutes for sorting
          const parseTime = (timeStr) => {
            if (!timeStr) return Infinity;
            const match = timeStr.match(/(\d{1,2}):(\d{2})/);
            if (match) {
              return parseInt(match[1]) * 60 + parseInt(match[2]);
            }
            return Infinity;
          };
          
          // Helper function to sort blocks by start time
          const sortBlocksByTime = (blocks) => {
            if (!blocks || !Array.isArray(blocks)) return [];
            return [...blocks].sort((a, b) => {
              const timeA = a.time ? parseTime(a.time.split(' - ')[0]) : Infinity;
              const timeB = b.time ? parseTime(b.time.split(' - ')[0]) : Infinity;
              return timeA - timeB;
            });
          };
          
          // Use daily_plan as is from database - don't auto-split days
          // Just sort blocks within each day
          let processedDailyPlan = loadedItinerary.daily_plan.map(day => ({
            ...day,
            day_number: day.day_number || 1, // Ensure day_number is set
            blocks: sortBlocksByTime(day.blocks || [])
          }));
          
          console.log('✅ Itinerary already in display format');
          console.log('📋 URL params - previewOnly:', previewOnly, 'isFullPlan:', isFullPlan);
          console.log('📋 Loaded data - previewOnly:', loadedItinerary.previewOnly);
          console.log('📋 Should show preview:', shouldShowPreview);
          console.log('📊 Total days in daily_plan:', processedDailyPlan.length);
          console.log('📊 Blocks per day:', processedDailyPlan.map(d => d.blocks?.length || 0));
          console.log('📊 Will show blocks:', shouldShowPreview ? 2 : 'all');
          
          const displayItinerary = { 
            ...loadedItinerary, 
            previewOnly: shouldShowPreview,
            // Keep full daily_plan with sorted blocks - slicing happens in render logic
            daily_plan: processedDailyPlan
          };
          setItinerary(displayItinerary);
          setSelectedDayIndex(0); // Reset to first day
          setLoading(false); // CRITICAL: Stop loading after setting itinerary
        } else if (loadedItinerary.activities && loadedItinerary.activities.length > 0) {
          // Need to convert from backend format to display format
          console.log('🔄 Converting itinerary from backend format to display format');
          
          // Helper function to parse time string to minutes for sorting
          const parseTime = (timeStr) => {
            if (!timeStr) return Infinity;
            const match = timeStr.match(/(\d{1,2}):(\d{2})/);
            if (match) {
              return parseInt(match[1]) * 60 + parseInt(match[2]);
            }
            return Infinity;
          };
          
          // Convert activities to blocks and sort by time
          const blocks = loadedItinerary.activities.map(activity => ({
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
          }));
          
          // Sort blocks by time
          const sortedBlocks = blocks.sort((a, b) => {
            const timeA = a.time ? parseTime(a.time.split(' - ')[0]) : Infinity;
            const timeB = b.time ? parseTime(b.time.split(' - ')[0]) : Infinity;
            return timeA - timeB;
          });
          
          const convertedData = {
            ...loadedItinerary,
            daily_plan: [{
              date: loadedItinerary.date,
              day_number: 1,
              blocks: sortedBlocks
            }]
          };
          console.log('✅ Converted itinerary for display with sorted blocks');
          setItinerary(convertedData);
          setSelectedDayIndex(0); // Reset to first day
          setLoading(false); // CRITICAL: Stop loading after setting itinerary
        } else {
          console.log('⚠️ Itinerary format not recognized, using as is');
          setItinerary(loadedItinerary);
          setLoading(false); // CRITICAL: Stop loading after setting itinerary
        }
        
        // Always set itineraryId state
        setItineraryId(itineraryId);
      } else {
        console.log('⚠️ Itinerary not found in Redis');
        // If not found and we expect full plan, show error
        if (isFullPlan) {
          setError('Itinerary not found. Please contact support.');
          setLoading(false);
        } else {
          // If not full plan, generate new (user came from homepage)
          generateItineraryData();
        }
      }
    } catch (error) {
      console.error('❌ Error loading itinerary from Redis:', error);
      // If error and we expect full plan, show error instead of regenerating
      if (isFullPlan) {
        setError('Failed to load itinerary. Please contact support.');
        setLoading(false);
      } else {
        // If not full plan, generate new (user came from homepage)
        generateItineraryData();
      }
    } finally {
      if (!isFullPlan || itinerary) {
        setLoading(false);
      }
    }
  };

  const generateItineraryData = async () => {
    try {
      setLoading(true);
      console.log('🌍 Starting REAL PLACES itinerary generation...');
      
      try {
        // ОСНОВНАЯ система с реальными местами
        // Prepare API data with all necessary parameters
        const apiData = {
          city: formData.city,
          audience: formData.audience,
          interest_ids: formData.interest_ids, // Array of IDs for DB filtering
          interests: formData.interests, // Legacy support (names)
          date: formData.date,
          date_from: searchParams.get('date_from') || formData.date,
          date_to: searchParams.get('date_to') || formData.date,
          budget: formData.budget,
          previewOnly: formData.previewOnly === true // Explicit boolean
        };
        
        console.log('🚀 Calling generateSmartItinerary with apiData:', apiData);
        const data = await generateSmartItinerary(apiData);
        console.log('✅ Received smart itinerary data:', data);
        console.log('📊 Activities count:', data.activities?.length);
        
        // Проверяем, есть ли активности в плане
        const hasActivities = data.activities && data.activities.length > 0;
        
        if (hasActivities) {
          // Helper function to parse time string to minutes for sorting
          const parseTime = (timeStr) => {
            if (!timeStr) return Infinity;
            const match = timeStr.match(/(\d{1,2}):(\d{2})/);
            if (match) {
              return parseInt(match[1]) * 60 + parseInt(match[2]);
            }
            return Infinity;
          };
          
          // Конвертируем данные в нужный формат для отображения
          const blocks = data.activities.map(activity => ({
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
          }));
          
          // Sort blocks by time
          const sortedBlocks = blocks.sort((a, b) => {
            const timeA = a.time ? parseTime(a.time.split(' - ')[0]) : Infinity;
            const timeB = b.time ? parseTime(b.time.split(' - ')[0]) : Infinity;
            return timeA - timeB;
          });
          
          const convertedData = {
            ...data,
            daily_plan: [{
              date: data.date,
              day_number: 1,
              blocks: sortedBlocks
            }]
          };
          console.log('✅ Converted data for display with sorted blocks:', convertedData);
          
          // Save preview to Redis (only 2 locations for preview)
          let savedItineraryId = itineraryId; // Initialize with existing ID
          
          if (previewOnly) {
            try {
              // NEW APPROACH: Save FULL plan, but with previewOnly=true flag
              // Frontend will show only first 2 blocks when previewOnly=true
              const previewDataToSave = {
                ...data,
                daily_plan: convertedData.daily_plan, // Save FULL daily_plan
                activities: data.activities, // Save ALL activities
                previewOnly: true // Flag to indicate preview mode
              };
              console.log('💾 Saving FULL plan with previewOnly=true to Redis...', {
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
          
          // Set itinerary with preview flag - keep ALL blocks, slicing happens in render
          // CRITICAL: Always set previewOnly flag based on previewOnly parameter
          const displayItinerary = {
            ...convertedData,
            previewOnly: previewOnly === true, // Explicitly set to boolean true/false
            itineraryId: savedItineraryId, // Include itineraryId in itinerary object
            // Keep FULL daily_plan - slicing happens in render logic based on previewOnly flag
            daily_plan: convertedData.daily_plan
          };
          setItinerary(displayItinerary);
          setSelectedDayIndex(0); // Reset to first day
          
          // Set itineraryId state if we have it
          if (savedItineraryId) {
            setItineraryId(savedItineraryId);
          }
          
          console.log('✅ Set itinerary with previewOnly:', displayItinerary.previewOnly, 'blocks:', displayItinerary.daily_plan[0]?.blocks?.length || 0);
          
          // Debug: Log state for email/button display
          console.log('🔍 Debug preview state:', {
            previewOnly,
            itineraryPreviewOnly: displayItinerary.previewOnly,
            itineraryId: savedItineraryId,
            itineraryItineraryId: displayItinerary.itineraryId,
            hasEmailButton: (previewOnly && savedItineraryId) || (previewOnly && displayItinerary),
            blocksCount: displayItinerary.daily_plan[0]?.blocks?.length || 0,
            totalBlocksInData: convertedData.daily_plan[0]?.blocks?.length || 0
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
          {/* Tour Image with Title and Download Button */}
          {(() => {
            // Priority: 1) tour preview_media_url, 2) itinerary preview_media_url, 3) first photo from locations, 4) placeholder
            const tourPreviewImage = itinerary?.preview_media_url || null;
            const firstPhoto = itinerary?.daily_plan?.[0]?.blocks?.[0]?.items?.[0]?.photos?.[0]?.url || 
                              itinerary?.daily_plan?.[0]?.blocks?.[0]?.items?.[0]?.photos?.[0] ||
                              null;
            const tourImage = tourPreviewImage || firstPhoto || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=600&fit=crop';
            
            return (
              <div className="tour-hero-image" style={{
                position: 'relative',
                width: '100%',
                height: '350px', // Reduced by 50px (was 400px)
                borderRadius: '16px',
                overflow: 'hidden',
                marginBottom: '24px',
                backgroundImage: `url(${tourImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                padding: '32px'
              }}>
                {/* Gradient overlay for better text readability */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 30%, transparent 60%)',
                  zIndex: 0,
                  pointerEvents: 'none'
                }} />
                
                {/* Title overlay */}
                <h1 className="title tour-hero-title" style={{
                  color: 'white',
                  fontWeight: 'bold',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                  margin: 0,
                  marginBottom: '16px',
                  zIndex: 1,
                  position: 'relative'
                }}>
                  {itinerary?.title || generateFallbackTitle(formData)}
                </h1>
                
                {/* Creator info - only show if guide exists, positioned below title */}
                {guide && guide.name && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 1,
                    position: 'relative',
                    marginBottom: 'auto'
                  }}>
                    {guide.avatar_url && (
                      <img 
                        src={guide.avatar_url} 
                        alt={guide.name}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          border: '3px solid white', // Increased by 1px (was 2px)
                          objectFit: 'cover',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}
                      />
                    )}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      lineHeight: '1.2'
                    }}>
                      <span style={{
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '500',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                      }}>
                        Tour created
                      </span>
                      <span style={{
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '500',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                      }}>
                        by {guide.name}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Download PDF Button */}
                {itinerary?.previewOnly !== true && (
                  <button
                    onClick={handleDownloadPDF}
                    style={{
                      alignSelf: 'flex-start',
                      marginTop: 'auto',
                      padding: '12px 24px',
                      backgroundColor: 'white',
                      color: '#1f2937',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                      zIndex: 1,
                      position: 'relative'
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>📄</span>
                    Download PDF
                  </button>
                )}
              </div>
            );
          })()}
          
          {/* Tags/Badges */}
          <div className="badges" style={{ marginBottom: '24px' }}>
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
            {/* Display interest names from interest_ids */}
            {interestNames.length > 0 && interestNames.map((interestName, index) => (
              <span key={index} className="badge-enhanced" style={{ backgroundColor: '#fde7e7', color: '#b91c1c' }}>
                🎯 {interestName}
              </span>
            ))}
            {/* Fallback to legacy interests if no names loaded */}
            {interestNames.length === 0 && formData.interests && formData.interests.length > 0 && formData.interests.map((interest, index) => (
              <span key={index} className="badge-enhanced" style={{ backgroundColor: '#fde7e7', color: '#b91c1c' }}>
                🎯 {interest}
              </span>
            ))}
          </div>

          {/* Tour Description */}
          <p className="subtitle" style={{ 
            fontSize: '16px', 
            lineHeight: '1.6', 
            color: '#4b5563',
            marginBottom: '24px'
          }}>
            {itinerary?.subtitle || generateFallbackSubtitle(formData)}
          </p>

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
          {((itinerary?.previewOnly === true || previewOnly) && (itineraryId || itinerary)) && (
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
                    const idToUse = itineraryId || (itinerary && itinerary.itineraryId);
                    if (email && idToUse) {
                      const paymentParams = new URLSearchParams({
                        itineraryId: idToUse,
                        email: email,
                        city: formData.city,
                        audience: formData.audience,
                        interests: formData.interests?.join(',') || '',
                        date: formData.date,
                        budget: formData.budget
                      });
                      // CRITICAL: Add tourId if present (for creator tours)
                      if (tourId || itinerary?.tourId) {
                        paymentParams.set('tourId', tourId || itinerary.tourId);
                        console.log('📖 Passing tourId to payment:', tourId || itinerary.tourId);
                      }
                      navigate(`/payment?${paymentParams.toString()}`);
                    }
                  }}
                  disabled={!email || (!itineraryId && !itinerary?.itineraryId)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: email && (itineraryId || itinerary?.itineraryId) ? '#3b82f6' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: email && (itineraryId || itinerary?.itineraryId) ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Pay to Unlock
                </button>
              </div>
            </div>
          )}
        </div>


        {/* Itinerary Plan */}
        <div className="enhanced-card">
          {(() => {
            // Helper function to parse time string to minutes for sorting
            const parseTime = (timeStr) => {
              if (!timeStr) return Infinity;
              const match = timeStr.match(/(\d{1,2}):(\d{2})/);
              if (match) {
                return parseInt(match[1]) * 60 + parseInt(match[2]);
              }
              return Infinity;
            };
            
            // Helper function to sort blocks by start time
            const sortBlocksByTime = (blocks) => {
              if (!blocks || !Array.isArray(blocks)) return [];
              return [...blocks].sort((a, b) => {
                const timeA = a.time ? parseTime(a.time.split(' - ')[0]) : Infinity;
                const timeB = b.time ? parseTime(b.time.split(' - ')[0]) : Infinity;
                return timeA - timeB;
              });
            };
            
            // Helper function to format date (e.g., "Dec.17")
            const formatDayDate = (baseDate, dayNumber) => {
              try {
                const date = new Date(baseDate);
                date.setDate(date.getDate() + (dayNumber - 1));
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = monthNames[date.getMonth()];
                const day = date.getDate();
                return `${month}.${day}`;
              } catch (e) {
                return '';
              }
            };
            
            // Get all days from daily_plan
            const allDays = itinerary?.daily_plan || [];
            const baseDate = itinerary?.date || formData.date || new Date().toISOString().slice(0, 10);
            
            // NEW APPROACH: Show only 2 blocks if previewOnly=true, all blocks otherwise
            const shouldShowPreview = itinerary?.previewOnly === true && !isFullPlan;
            
            console.log('🔍 Display blocks:', { 
              shouldShowPreview, 
              isFullPlan, 
              previewOnly: itinerary?.previewOnly,
              totalDays: allDays.length,
              baseDate,
              tourId: itinerary?.tourId || tourId,
              itineraryId: itineraryId
            });
            
            console.log('🎨 Rendering itinerary:', {
              totalDays: allDays.length,
              itineraryDailyPlan: itinerary?.daily_plan,
              allDays: allDays,
              days: allDays.map(d => ({
                day_number: d.day_number,
                blocksCount: d.blocks?.length || 0,
                firstBlockTime: d.blocks?.[0]?.time,
                lastBlockTime: d.blocks?.[d.blocks?.length - 1]?.time,
                hasDate: !!d.date
              }))
            });
            
            return (
              <>
                {/* Show all days sequentially with headers */}
                {allDays.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
                    No activities planned yet.
                  </p>
                ) : (
                  // For preview: show only first day with 2 blocks
                  // For full plan: show all days with all blocks
                  (shouldShowPreview ? allDays.slice(0, 1) : allDays).map((day, dayIndex) => {
                    const dayNumber = day.day_number || dayIndex + 1;
                    const dayDate = formatDayDate(baseDate, dayNumber);
                    const dayBlocks = day.blocks || [];
                    
                    // Sort blocks by time
                    const sortedBlocks = sortBlocksByTime(dayBlocks);
                    
                    // For preview, show only first 2 blocks of first day
                    // For full plan, show all blocks
                    const blocksToShow = shouldShowPreview
                      ? sortedBlocks.slice(0, 2)
                      : sortedBlocks;
                    
                    // Don't render day if no blocks to show
                    if (blocksToShow.length === 0) return null;
                    
                    console.log(`🎨 Rendering day ${dayNumber}:`, {
                      dayIndex,
                      dayNumber,
                      dayDate,
                      totalBlocks: sortedBlocks.length,
                      showingBlocks: blocksToShow.length,
                      shouldShowPreview,
                      firstBlockTime: blocksToShow[0]?.time,
                      lastBlockTime: blocksToShow[blocksToShow.length - 1]?.time
                    });
                    
                    return (
                      <div key={dayIndex} style={{ marginBottom: dayIndex < (shouldShowPreview ? 1 : allDays.length) - 1 ? '48px' : '0' }}>
                        {/* Day Header */}
                        <h3 style={{
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: '#1f2937',
                          marginBottom: '20px',
                          paddingTop: dayIndex > 0 ? '20px' : '0',
                          paddingBottom: '12px',
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          Day Plan {dayDate && `(${dayDate})`}
                        </h3>
                      
                      {/* Day Blocks */}
                      {blocksToShow.map((block, blockIndex) => {
                        // Format time: ensure HH:MM format (e.g., "09" -> "09:00", "09:00:00" -> "09:00", "09:00 - 10:30:00" -> "09:00 - 10:30")
                        const formatTime = (timeStr) => {
                          if (!timeStr) return '';
                          // Split by " - " to get start and end times
                          const parts = timeStr.split(' - ');
                          if (parts.length === 2) {
                            // Format both times
                            const formatSingleTime = (t) => {
                              t = t.trim();
                              // Remove seconds if present
                              t = t.replace(/:\d{2}$/, '');
                              // If only hour (e.g., "09"), add ":00"
                              if (/^\d{1,2}$/.test(t)) {
                                return `${t.padStart(2, '0')}:00`;
                              }
                              // If already HH:MM format, return as is
                              if (/^\d{1,2}:\d{2}$/.test(t)) {
                                const [hours, mins] = t.split(':');
                                return `${hours.padStart(2, '0')}:${mins.padStart(2, '0')}`;
                              }
                              return t;
                            };
                            const startTime = formatSingleTime(parts[0]);
                            const endTime = formatSingleTime(parts[1]);
                            return `${startTime} - ${endTime}`;
                          }
                          // If no " - " separator, format single time
                          let singleTime = timeStr.trim();
                          // Remove seconds if present
                          singleTime = singleTime.replace(/:\d{2}$/, '');
                          // If only hour (e.g., "09"), add ":00"
                          if (/^\d{1,2}$/.test(singleTime)) {
                            return `${singleTime.padStart(2, '0')}:00`;
                          }
                          // If already HH:MM format, ensure proper padding
                          if (/^\d{1,2}:\d{2}$/.test(singleTime)) {
                            const [hours, mins] = singleTime.split(':');
                            return `${hours.padStart(2, '0')}:${mins.padStart(2, '0')}`;
                          }
                          return singleTime;
                        };
                        
                        return (
                        <div key={blockIndex} style={blockStyle}>
                          <div className="time-block-enhanced">{formatTime(block.time)}</div>
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
                        );
                      })}
                    </div>
                  );
                })
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
