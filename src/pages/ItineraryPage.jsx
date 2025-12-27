import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { generateItinerary, generateSmartItinerary, generateSmartItineraryV2, generateCreativeItinerary, generateRealPlacesItinerary, generatePDF, sendEmail, checkPayment } from '../services/api';
import { getTourById } from '../modules/tours-database';
import { isAuthenticated, getCurrentUser, logout } from '../modules/auth/services/authService';
import html2pdf from 'html2pdf.js';
import PhotoGallery from '../components/PhotoGallery';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import BlockRenderer from '../modules/guide-dashboard/components/BlockRenderer';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import PDFIcon from '../assets/PDF.svg';
// import SkateboardingGif from '../assets/Skateboarding.gif'; // File not found, commented out
import './ItineraryPage.css';

export default function ItineraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [itinerary, setItinerary] = useState(null);
  const [email, setEmail] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [tourData, setTourData] = useState(null); // Store full tour data for guide info
  const [user, setUser] = useState(null); // User state for auth buttons
  const [tourType, setTourType] = useState('self-guided'); // 'self-guided' or 'with-guide'
  const [selectedDate, setSelectedDate] = useState(null); // Selected date for with-guide tour
  const [quantity, setQuantity] = useState(1); // Number of spots to book
  const [availableSpots, setAvailableSpots] = useState(null); // Available spots for selected date
  const [maxGroupSize, setMaxGroupSize] = useState(null); // Max group size for selected date
  const [isSubtitleExpanded, setIsSubtitleExpanded] = useState(false); // Subtitle expand/collapse state
  const [tourIdState, setTourId] = useState(null); // Tour ID state for generated tours
  const [contentBlocks, setContentBlocks] = useState([]); // Blocks from tour_content_blocks table
  const [useNewFormat, setUseNewFormat] = useState(false); // Flag to use new format (contentBlocks) or old format (daily_plan)

  // Handle switching between main and alternative locations in LocationBlock
  const handleSwitchLocation = (updatedBlock) => {
    setContentBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === updatedBlock.id ? updatedBlock : block
      )
    );
  };
  const [isAuthorTextExpanded, setIsAuthorTextExpanded] = useState(false); // Author text expand/collapse state
  const [isMobile, setIsMobile] = useState(false); // Mobile detection

  // Detect mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize(); // Check on mount
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // City images mapping
  const cityImagesMap = {
    'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=600&fit=crop&q=80',
    'Barcelona': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d2?w=1200&h=600&fit=crop&q=80',
    'Amsterdam': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&h=600&fit=crop&q=80',
    'Berlin': 'https://images.unsplash.com/photo-1587330979470-3595ac045ab0?w=1200&h=600&fit=crop&q=80',
    'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=600&fit=crop&q=80',
    'Rome': 'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=1200&h=600&fit=crop&q=80',
    'Madrid': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d2?w=1200&h=600&fit=crop&q=80',
    'Lisbon': 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&h=600&fit=crop&q=80',
    'Vienna': 'https://images.unsplash.com/photo-1516550164669-0e0f8c4b4e1c?w=1200&h=600&fit=crop&q=80',
    'Prague': 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=1200&h=600&fit=crop&q=80',
    'Moscow': 'https://images.unsplash.com/photo-1512496015851-a90fb38cd796?w=1200&h=600&fit=crop&q=80',
    'Istanbul': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&h=600&fit=crop&q=80',
    'Dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&h=600&fit=crop&q=80',
    'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=600&fit=crop&q=80',
    'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=600&fit=crop&q=80',
    'Sydney': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop&q=80',
    'Singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&h=600&fit=crop&q=80',
    'Copenhagen': 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1200&h=600&fit=crop&q=80',
    'Venice': 'https://images.unsplash.com/photo-1514890547357-a9e192465165?w=1200&h=600&fit=crop&q=80',
    'Florence': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=600&fit=crop&q=80'
  };

  // Get city image by city name
  const getCityImage = (cityName) => {
    return cityImagesMap[cityName] || cityImagesMap['Barcelona'] || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=600&fit=crop&q=80&auto=format';
  };

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
  const tourIdFromUrl = searchParams.get('tourId');
  // Use tourId from URL or from state (state takes priority if set)
  const tourId = tourIdState || tourIdFromUrl;
  const previewOnly = searchParams.get('previewOnly') === 'true';
  const isFullPlan = searchParams.get('full') === 'true';
  
  // Update tourId state when URL changes
  useEffect(() => {
    if (tourIdFromUrl && tourIdFromUrl !== tourIdState) {
      setTourId(tourIdFromUrl);
    }
  }, [tourIdFromUrl]);
  
  // Extract form data from URL params
  // Note: budget, interests, and audience should be null if not in URL (not default values)
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const dateParam = searchParams.get('date');
  
  // Use date_from if available, otherwise use date param, otherwise use today
  let displayDate = dateFrom || dateParam || new Date().toISOString().slice(0, 10);
  
  // If we have both date_from and date_to, format as range
  if (dateFrom && dateTo && dateFrom !== dateTo) {
    displayDate = `${dateFrom} - ${dateTo}`;
  }
  
  // Extract interests - try both 'interests' (names) and 'interest_ids' (IDs)
  let interestsFromURL = searchParams.get('interests')?.split(',').filter(Boolean) || null;
  const interestIdsFromURL = searchParams.getAll('interest_ids'); // getAll because there can be multiple
  
  console.log('🔍 Extracting interests from URL:', {
    interestsParam: searchParams.get('interests'),
    interestIdsParam: interestIdsFromURL,
    interestsFromURL,
    allParams: Array.from(searchParams.entries())
  });
  
  const formData = {
    city: searchParams.get('city') || 'Barcelona',
    audience: searchParams.get('audience') || null, // null if not specified, not default to 'him'
    interests: interestsFromURL, // Will be set below if we have interest_ids
    interest_ids: interestIdsFromURL.length > 0 ? interestIdsFromURL : null,
    date: displayDate,
    date_from: dateFrom,
    date_to: dateTo,
    budget: searchParams.get('budget') || null // null if not specified, not default to '500'
  };
  
  console.log('🔍 Extracted formData from URL:', {
    city: formData.city,
    audience: formData.audience,
    interests: formData.interests,
    interest_ids: formData.interest_ids,
    date: formData.date,
    date_from: formData.date_from,
    date_to: formData.date_to,
    budget: formData.budget
  });

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
    console.log('📋 Tour structure check:', {
      hasDailyPlan: !!tour.daily_plan,
      hasTourDays: !!tour.tour_days,
      dailyPlanLength: tour.daily_plan?.length || 0,
      tourDaysLength: tour.tour_days?.length || 0
    });

    // IMPORTANT: Use tour_days (original structure from DB) instead of daily_plan (converted)
    // because tour_days contains full location objects with location_interests
    // daily_plan only has flattened fields without location objects
    const structureToUse = tour.tour_days || tour.daily_plan;
    
    if (structureToUse && Array.isArray(structureToUse)) {
      structureToUse.forEach((day, dayIndex) => {
        // Handle both tour_days and daily_plan structures
        const blocks = day.tour_blocks || day.blocks || [];
        
        if (blocks && Array.isArray(blocks)) {
          blocks.forEach((block, blockIndex) => {
            // Handle both tour_items and items
            const items = block.tour_items || block.items || [];
            
            if (items && Array.isArray(items)) {
              items.forEach((item, itemIndex) => {
                itemsProcessed++;
                
                // Get location - in tour_days structure, location is a full object
                // in daily_plan structure, location is not present (only flattened fields)
                const location = item.location;
                
                // Sum up budget
                const cost = parseFloat(item.approx_cost) || parseFloat(item.cost) || 0;
                totalBudget += cost;

                // Debug: Check item structure
                console.log(`📦 Item ${itemsProcessed} (day ${dayIndex}, block ${blockIndex}, item ${itemIndex}):`, {
                  hasLocation: !!location,
                  locationName: location?.name,
                  hasLocationInterests: !!location?.location_interests,
                  locationInterestsType: Array.isArray(location?.location_interests) ? 'array' : typeof location?.location_interests,
                  locationInterestsLength: location?.location_interests?.length || 0,
                  approx_cost: item.approx_cost,
                  cost: item.cost
                });

                // Collect interests from location
                if (location) {
                  console.log(`  🔍 Processing location "${location.name}" (ID: ${location.id}):`, {
                    hasLocationInterests: !!location.location_interests,
                    locationInterestsCount: location.location_interests?.length || 0,
                    locationInterests: location.location_interests?.map(li => ({
                      interestId: li.interest?.id,
                      interestName: li.interest?.name,
                      interestCategoryId: li.interest?.category_id
                    })) || []
                  });
                  
                  // Path 1: location.location_interests (from backend query) - PRIMARY PATH
                  if (location.location_interests && Array.isArray(location.location_interests)) {
                    location.location_interests.forEach(li => {
                      if (li.interest?.name) {
                        const interestName = li.interest.name;
                        allInterests.add(interestName);
                        itemsWithInterests++;
                        console.log(`  ✅ Added interest "${interestName}" from location "${location.name}" (location ID: ${location.id}, interest ID: ${li.interest.id})`);
                      } else {
                        console.log(`  ⚠️ location_interests entry missing interest.name:`, li);
                      }
                    });
                  } else {
                    console.log(`  ⚠️ Location "${location.name}" has no location_interests array`);
                  }
                  
                  // Path 2: Check if interests are directly in location
                  if (location.interests && Array.isArray(location.interests)) {
                    location.interests.forEach(interest => {
                      if (typeof interest === 'string') {
                        allInterests.add(interest);
                        console.log(`  ✅ Added interest (string) "${interest}" from location "${location.name}"`);
                      } else if (interest.name) {
                        allInterests.add(interest.name);
                        console.log(`  ✅ Added interest (object) "${interest.name}" from location "${location.name}"`);
                      }
                    });
                  }
                } else {
                  console.log(`  ⚠️ Item ${itemsProcessed} has no location object`);
                }
                
                // Path 3: Check interest_ids if available (fallback)
                if (item.interest_ids && Array.isArray(item.interest_ids) && item.interest_ids.length > 0) {
                  console.log(`  ⚠️ Item has interest_ids but we need names. IDs:`, item.interest_ids);
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
    console.log(`📊 Final interests for tour ${tour.id}:`, tags.interests);
    console.log(`📊 Total unique interests collected: ${allInterests.size}, limited to: ${tags.interests.length}`);
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
        interests: formData.interests || [] // Use filter interests if provided
      };
    } else if (tour) {
      // Use tour tags (calculated from tour data)
      return calculateTourTags(tour);
    } else {
      // Fallback to formData (but interests should be null if not specified)
      return {
        city: formData.city || 'Unknown',
        date: formData.date || new Date().toISOString().slice(0, 10),
        audience: formData.audience || null,
        budget: formData.budget ? `€${formData.budget}` : null,
        interests: formData.interests || [] // Empty array if not specified
      };
    }
  };

  // Load tour from database
  const loadTourFromDatabase = async (tourIdParam, isPreviewOnly, isFull) => {
    try {
      setLoading(true);
      setError('');
      // Ensure previewOnly is correctly determined from URL if not explicitly passed
      const previewOnlyFromUrl = searchParams.get('previewOnly') === 'true';
      const actualPreviewOnly = isPreviewOnly !== undefined ? isPreviewOnly : previewOnlyFromUrl;
      console.log('📖 Loading tour from database:', tourIdParam, 'previewOnly:', actualPreviewOnly, 'full:', isFull);
      
      // Check if user has paid for this tour (if email is available)
      const emailFromUrl = searchParams.get('email');
      if (emailFromUrl && tourIdParam) {
        try {
          const paymentCheck = await checkPayment(tourIdParam, emailFromUrl);
          if (paymentCheck.success && paymentCheck.hasPaid) {
            console.log('✅ User has paid for this tour, unlocking full itinerary');
            setIsPaid(true);
            // Remove previewOnly flag if paid
            if (isPreviewOnly) {
              isPreviewOnly = false;
            }
          } else {
            console.log('ℹ️ User has not paid for this tour yet');
            setIsPaid(false);
          }
        } catch (paymentError) {
          console.warn('⚠️ Error checking payment status (non-critical):', paymentError);
          // Don't fail the whole load if payment check fails
        }
      }
      
      const tour = await getTourById(tourIdParam);
      setTourData(tour); // Save raw tour data for guide info
      console.log('✅ Tour loaded from DB:', tour);
      console.log('🔍 Tour guide info:', {
        hasGuide: !!tour.guide,
        guide: tour.guide,
        guideName: tour.guide?.name,
        guideAvatar: tour.guide?.avatar_url
      });
      console.log('🔍 Tour structure check:', {
        hasDailyPlan: !!tour.daily_plan,
        hasTourDays: !!tour.tour_days,
        dailyPlanLength: tour.daily_plan?.length || 0,
        tourDaysLength: tour.tour_days?.length || 0,
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
      
      // Load content blocks from tour_content_blocks table FIRST (before checking format)
      let loadedContentBlocks = [];
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';
        const blocksResponse = await fetch(`${API_BASE_URL}/api/tour-content-blocks?tourId=${tourIdParam}`).catch(() => null);
        if (blocksResponse && blocksResponse.ok) {
          const blocksData = await blocksResponse.json();
          if (blocksData.success && blocksData.blocks) {
            // Sort blocks by order_index
            loadedContentBlocks = blocksData.blocks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            setContentBlocks(loadedContentBlocks);
            console.log('✅ Content blocks loaded:', loadedContentBlocks.length, 'blocks');
            
            // If we have content blocks, mark as using new format
            if (loadedContentBlocks.length > 0) {
              setUseNewFormat(true);
            }
          } else {
            console.log('ℹ️ No content blocks found for this tour');
          }
        } else {
          console.log('ℹ️ Could not load content blocks (table might not exist for old tours)');
        }
      } catch (blocksError) {
        console.warn('⚠️ Error loading content blocks (non-critical):', blocksError);
      }
      
      // Debug: Check tour_days structure for interests
      if (tour.tour_days && Array.isArray(tour.tour_days)) {
        console.log('🔍 Checking tour_days structure for location interests:');
        tour.tour_days.forEach((day, dayIdx) => {
          if (day.tour_blocks && Array.isArray(day.tour_blocks)) {
            day.tour_blocks.forEach((block, blockIdx) => {
              if (block.tour_items && Array.isArray(block.tour_items)) {
                block.tour_items.forEach((item, itemIdx) => {
                  if (item.location) {
                    console.log(`  📍 Day ${dayIdx}, Block ${blockIdx}, Item ${itemIdx}: Location "${item.location.name}" (ID: ${item.location.id})`, {
                      hasLocationInterests: !!item.location.location_interests,
                      locationInterestsCount: item.location.location_interests?.length || 0,
                      interests: item.location.location_interests?.map(li => li.interest?.name).filter(Boolean) || []
                    });
                  }
                });
              }
            });
          }
        });
      }
      
      // Extract city name
      const cityName = typeof tour.city === 'string' ? tour.city : tour.city?.name || 'Unknown City';
      
      // Check if tour uses new format (contentBlocks) or old format (daily_plan)
      // For new format tours, daily_plan might be empty, which is OK
      // Use loadedContentBlocks (from API) instead of contentBlocks state (which might not be updated yet)
      const hasContentBlocks = loadedContentBlocks.length > 0;
      const hasDailyPlan = tour.daily_plan && tour.daily_plan.length > 0;
      
      // If tour has neither contentBlocks nor daily_plan, show empty state instead of error
      // This can happen for tours created in visualizer but not yet populated with blocks
      if (!hasContentBlocks && !hasDailyPlan) {
        console.log('ℹ️ Tour has no content blocks or daily plan - showing empty state');
        // Create minimal itinerary data to show tour info even without content
        const itineraryData = {
          title: tour.title || 'Tour',
          subtitle: tour.description || `Explore ${cityName} with this curated tour`,
          city: cityName,
          tourId: tourIdParam,
          preview_media_url: tour.preview_media_url || tour.preview || null,
          tags: calculateTourTags(tour),
          isEmpty: true // Flag to indicate empty tour
        };
        setItinerary(itineraryData);
        setContentBlocks([]); // Empty blocks array
        setUseNewFormat(true); // Use new format rendering even if empty
        setLoading(false);
        return; // Exit early - will show empty state in UI
      }
      
      // If using new format (contentBlocks), skip daily_plan processing
      if (hasContentBlocks) {
        console.log('✅ Tour uses new format (contentBlocks), skipping daily_plan processing');
        // Create minimal itinerary data for new format
        const itineraryData = {
          title: tour.title || 'Tour',
          subtitle: tour.description || `Explore ${cityName} with this curated tour`,
          city: cityName,
          date: formData.date || new Date().toISOString().slice(0, 10),
          budget: null,
          daily_plan: [], // Empty for new format - content comes from contentBlocks
          tourId: tourIdParam,
          preview_media_url: tour.preview_media_url || tour.preview || null,
          tags: {
            city: cityName,
            date: formData.date || new Date().toISOString().slice(0, 10),
            audience: null,
            budget: null,
            interests: []
          }
        };
        
        console.log('✅ Converted tour to itinerary format (new format):', itineraryData);
        setItinerary(itineraryData);
        setUseNewFormat(true); // Mark as using new format (contentBlocks)
        
        // Reset tour type selection based on tour data
        // CRITICAL: Check draft_data.tourSettings first for explicit saved values
        // If tourSettings exist, use ONLY those values (don't check other fields)
        const draftData = tour.draft_data || {};
        const tourSettings = draftData.tourSettings || {};
        
        // If tourSettings exist, use explicit values from there
        // Otherwise, infer from tour fields
        let selfGuided, withGuide;
        if (tourSettings.selfGuided !== undefined || tourSettings.withGuide !== undefined) {
          // Use explicit values from tourSettings
          selfGuided = tourSettings.selfGuided !== undefined ? tourSettings.selfGuided : true; // Default: true
          withGuide = tourSettings.withGuide !== undefined ? tourSettings.withGuide : false;
        } else {
          // Fallback: infer from tour fields
          selfGuided = tour.default_format !== 'with_guide' && tour.default_format !== 'guided';
          withGuide = tour.withGuide || 
                     tour.default_format === 'with_guide' || 
                     tour.default_format === 'guided' ||
                     tour.format === 'guided' ||
                     (tour.price?.guidedPrice && tour.price.guidedPrice > 0);
        }
        
        // Determine available formats - use explicit values from tourSettings
        const supportsSelfGuided = selfGuided === true;
        const supportsGuide = withGuide === true;
        
        // Set default tour type based on available formats
        if (supportsSelfGuided && !supportsGuide) {
          setTourType('self-guided');
        } else if (!supportsSelfGuided && supportsGuide) {
          setTourType('with-guide');
        } else if (supportsSelfGuided && supportsGuide) {
          // Both available - default to self-guided
          setTourType('self-guided');
        } else {
          // Neither available - default to self-guided as fallback
          setTourType('self-guided');
        }
        
        setSelectedDate(null);
        
        setLoading(false);
        return; // Exit early for new format tours
      }
      
      // CRITICAL: Check if we should show all days or just first day
      // Preview mode: show only first day with 2 locations
      // Full mode (paid): show all days with all locations
      const shouldShowAllDays = (isFull || isPaid) && !actualPreviewOnly;
      const shouldLimitItems = actualPreviewOnly && !isFull && !isPaid;
      
      // Process all days or just first day based on mode
      let daysToShow = [];
      
      if (shouldShowAllDays) {
        // Full mode: show all days with all locations
        console.log('📋 Full plan mode: showing all', tour.daily_plan.length, 'days with all locations');
        daysToShow = tour.daily_plan.map(day => ({
          ...day,
          blocks: day.blocks || []
        }));
      } else {
        // Preview mode: show only first day with 2 locations max
        const firstDay = tour.daily_plan[0];
        if (!firstDay || !firstDay.blocks || firstDay.blocks.length === 0) {
          throw new Error('Tour has no daily plan or blocks');
        }
        
        let blocksToShow = firstDay.blocks;
        
        if (shouldLimitItems) {
          // Limit to first 2 items total across all blocks
          let itemCount = 0;
          blocksToShow = blocksToShow.map(block => {
            if (itemCount >= 2) {
              return { ...block, items: [] }; // Empty items if we've reached limit
            }
            const limitedItems = block.items.slice(0, 2 - itemCount);
            itemCount += limitedItems.length;
            return { ...block, items: limitedItems };
          }).filter(block => block.items && block.items.length > 0); // Remove blocks with no items
          
          console.log('📋 Preview mode: showing first day with first 2 items');
        }
        
        daysToShow = [{
          ...firstDay,
          blocks: blocksToShow
        }];
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
      // CRITICAL: Include all days if full mode, or just first day if preview
      const itineraryData = {
        title: tour.title || 'Tour',
        subtitle: tour.description || `Explore ${cityName} with this curated tour`,
        city: cityName,
        date: formData.date || new Date().toISOString().slice(0, 10),
        budget: finalBudget,
        daily_plan: daysToShow.map(day => ({
          day: day.day || day.day_number || 1,
          date: day.date || null,
          title: day.title || null,
          blocks: (day.blocks || []).map(block => ({
            time: block.time || '09:00 - 12:00',
            title: block.title || null,
            items: (block.items || []).map(item => ({
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
        })),
        // Add tour metadata
        tourId: tourIdParam,
        preview_media_url: tour.preview_media_url || tour.preview || null,
        // Add tags for display
        tags: tags
      };
      
          console.log('✅ Converted tour to itinerary format:', itineraryData);
          setItinerary(itineraryData);
          setUseNewFormat(false); // Mark as using old format (daily_plan)
          
          // Reset tour type selection based on tour data
          // CRITICAL: Check draft_data.tourSettings first for explicit saved values
          // If tourSettings exist, use ONLY those values (don't check other fields)
          const draftData = tour.draft_data || {};
          const tourSettings = draftData.tourSettings || {};
          
          // If tourSettings exist, use explicit values from there
          // Otherwise, infer from tour fields
          let selfGuided, withGuide;
          if (tourSettings.selfGuided !== undefined || tourSettings.withGuide !== undefined) {
            // Use explicit values from tourSettings
            selfGuided = tourSettings.selfGuided !== undefined ? tourSettings.selfGuided : true; // Default: true
            withGuide = tourSettings.withGuide !== undefined ? tourSettings.withGuide : false;
          } else {
            // Fallback: infer from tour fields
            selfGuided = tour.default_format !== 'with_guide' && tour.default_format !== 'guided';
            withGuide = tour.withGuide || 
                       tour.default_format === 'with_guide' || 
                       tour.default_format === 'guided' ||
                       tour.format === 'guided' ||
                       (tour.price?.guidedPrice && tour.price.guidedPrice > 0);
          }
          
          // Determine available formats - use explicit values from tourSettings
          const supportsSelfGuided = selfGuided === true;
          const supportsGuide = withGuide === true;
          
          // Set default tour type based on available formats
          if (supportsSelfGuided && !supportsGuide) {
            setTourType('self-guided');
          } else if (!supportsSelfGuided && supportsGuide) {
            setTourType('with-guide');
          } else if (supportsSelfGuided && supportsGuide) {
            // Both available - default to self-guided
            setTourType('self-guided');
          } else {
            // Neither available - default to self-guided as fallback
            setTourType('self-guided');
          }
          
          setSelectedDate(null);
          
          setLoading(false);
    } catch (err) {
      console.error('❌ Error loading tour from database:', err);
      setError(err.message || 'Failed to load tour');
      setLoading(false);
    }
  };

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

  // Check if payment was successful from URL params (from success page redirect)
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const paidParam = searchParams.get('paid');
    
    // If session_id or paid=true is present, payment was successful
    if (sessionId || paidParam === 'true') {
      setIsPaid(true);
      console.log('✅ Payment confirmed, unlocking full itinerary');
      
      // Clean up URL to remove session_id and paid params, but keep tourId
      // CRITICAL: Remove previewOnly after payment - user paid for full tour
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('session_id');
      newSearchParams.delete('paid');
      newSearchParams.delete('previewOnly'); // Remove previewOnly after payment
      
      // Keep essential params for tour loading
      if (tourId) {
        newSearchParams.set('tourId', tourId);
      }
      // Add email if present
      const emailFromUrl = searchParams.get('email');
      if (emailFromUrl) {
        newSearchParams.set('email', emailFromUrl);
      }
      
      navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
    }
  }, [searchParams, navigate, location.pathname, tourId]);

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
  }, [isExample, exampleItinerary, tourId, previewOnly, isFullPlan, isPaid]);

  const generateItineraryData = async () => {
    try {
      setLoading(true);
      console.log('🌍 Starting REAL PLACES itinerary generation...');
      
      // If we have interest_ids but no interests (names), try to fetch interest names
      let finalInterests = formData.interests;
      if (!finalInterests && formData.interest_ids && formData.interest_ids.length > 0) {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';
          const response = await fetch(`${API_BASE_URL}/api/interests`);
          if (response.ok) {
            const interestsData = await response.json();
            if (interestsData.success && interestsData.interests) {
              const interestNames = formData.interest_ids
                .map(id => {
                  const interest = interestsData.interests.find(i => i.id === id);
                  return interest ? interest.name : null;
                })
                .filter(Boolean);
              if (interestNames.length > 0) {
                finalInterests = interestNames;
                console.log('✅ Converted interest_ids to names:', interestNames);
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch interests to convert IDs:', err);
        }
      }
      
      // Update formData with final interests
      const formDataWithInterests = {
        ...formData,
        interests: finalInterests
      };
      
      try {
        // ОСНОВНАЯ система с реальными местами
        // Add email to formData if available (for tour creation)
        const formDataWithEmail = {
          ...formDataWithInterests,
          email: email || searchParams.get('email') || null,
          previewOnly: previewOnly || false
        };
        const data = await generateSmartItinerary(formDataWithEmail);
        console.log('✅ Received smart itinerary data:', data);
        console.log('📋 Tour ID from API:', data.tourId);
        
        // Проверяем, есть ли активности в плане
        const hasActivities = data.activities && data.activities.length > 0;
        
        if (hasActivities) {
          // Limit to first 2 items if preview and not paid
          // CRITICAL: Check previewOnly from URL params, not just state
          const previewOnlyFromUrl = searchParams.get('previewOnly') === 'true';
          // Use previewOnly from URL or from function parameter
          const actualPreviewOnly = previewOnly !== undefined ? previewOnly : previewOnlyFromUrl;
          const shouldLimitItems = actualPreviewOnly && !isFullPlan && !isPaid;
          
          console.log('🔍 Preview limiting check:', {
            previewOnly,
            previewOnlyFromUrl,
            actualPreviewOnly,
            isFullPlan,
            isPaid,
            shouldLimitItems,
            activitiesCount: data.activities?.length || 0
          });
          let itemCount = 0;
          
          const activitiesToShow = shouldLimitItems 
            ? data.activities.slice(0, 2) // Simply take first 2 activities
            : data.activities;
          
          console.log(`📋 Generated tour: ${shouldLimitItems ? 'Preview mode' : 'Full mode'}, showing ${activitiesToShow.length} out of ${data.activities.length} activities`);
          console.log(`📋 Preview check: previewOnly=${previewOnly}, previewOnlyFromUrl=${previewOnlyFromUrl}, actualPreviewOnly=${actualPreviewOnly}, shouldLimitItems=${shouldLimitItems}`);
          console.log(`📋 Activities to show:`, activitiesToShow.map(a => a.name || a.title));
          
          // Конвертируем данные в нужный формат для отображения
          const convertedData = {
            ...data,
            daily_plan: [{
              date: data.date,
              blocks: activitiesToShow.map(activity => ({
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
            }],
            tags: { // Add tags for generated itineraries
              city: formDataWithInterests.city || 'Unknown',
              date: formDataWithInterests.date || new Date().toISOString().slice(0, 10), // Use formatted date from formData
              audience: formDataWithInterests.audience || null, // Include audience tag
              budget: formDataWithInterests.budget ? `€${formDataWithInterests.budget}` : `€${data.totalCost || '800'}`,
              interests: (() => {
                // Handle interests - can be array or null
                const interests = finalInterests || formDataWithInterests.interests;
                if (!interests) return [];
                if (Array.isArray(interests)) {
                  return interests.length > 0 ? interests : [];
                }
                // If it's a string, convert to array
                if (typeof interests === 'string') {
                  return interests.split(',').filter(Boolean);
                }
                return [];
              })() // Include interests from filters
            }
          };
          console.log('✅ Converted data for display:', convertedData);
          console.log('📊 Tags in converted data:', convertedData.tags);
          console.log('📊 FormData for tags:', {
            city: formDataWithInterests.city,
            audience: formDataWithInterests.audience,
            interests: finalInterests || formDataWithInterests.interests,
            budget: formDataWithInterests.budget
          });
          
          // If tourId is returned from API, save it and update URL
          if (data.tourId) {
            console.log('💾 Saving tourId to state and URL:', data.tourId);
            setTourId(data.tourId);
            
            // Update URL with tourId for bookmarking - use window.history for immediate update
            const newSearchParams = new URLSearchParams(window.location.search);
            newSearchParams.set('tourId', data.tourId);
            // Always preserve previewOnly if it was in URL
            const currentPreviewOnly = searchParams.get('previewOnly') === 'true';
            if (currentPreviewOnly || previewOnly) {
              newSearchParams.set('previewOnly', 'true');
            }
            // Preserve all existing params
            const newUrl = `${window.location.pathname}?${newSearchParams.toString()}`;
            window.history.replaceState({}, '', newUrl);
            console.log('✅ URL updated with tourId:', newUrl);
            console.log('📋 URL params after update:', Object.fromEntries(newSearchParams));
          } else {
            console.warn('⚠️ No tourId returned from API. Check backend logs.');
          }
          
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

  // Handle payment checkout
  const handlePayment = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    if (!itinerary) {
      alert('Itinerary data is not available');
      return;
    }

    try {
      setProcessingPayment(true);
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';
      
      // Validate with-guide selection
      if (tourType === 'with-guide') {
        if (!selectedDate) {
          alert('Please select an available date for the guided tour');
          setProcessingPayment(false);
          return;
        }
        if (!quantity || quantity < 1) {
          alert('Please select the number of spots to book');
          setProcessingPayment(false);
          return;
        }
        if (availableSpots !== null && quantity > availableSpots) {
          alert(`Only ${availableSpots} spots available. Please select a smaller number.`);
          setProcessingPayment(false);
          return;
        }
      }

      // Prepare checkout session data
      // CRITICAL: Ensure tourId is included - check state, URL, and itinerary
      const finalTourId = tourId || searchParams.get('tourId') || itinerary?.tourId || null;
      console.log('💳 Payment tourId check:', { 
        tourIdFromState: tourId, 
        tourIdFromURL: searchParams.get('tourId'),
        tourIdFromItinerary: itinerary?.tourId,
        finalTourId 
      });
      
      const checkoutData = {
        email: email,
        itineraryId: finalTourId || null,
        tourId: finalTourId, // Use finalTourId for database tours
        city: itinerary.city || formData.city || 'Unknown',
        audience: itinerary.tags?.audience || formData.audience || null, // Can be null for DB tours
        interests: (itinerary.tags?.interests || formData.interests || []).join(','),
        date: itinerary.date || formData.date || new Date().toISOString().slice(0, 10),
        budget: itinerary.tags?.budget || itinerary.budget || formData.budget || null,
        tourType: tourType, // 'self-guided' or 'with-guide'
        selectedDate: tourType === 'with-guide' ? selectedDate : null, // Only if with-guide
        quantity: tourType === 'with-guide' ? quantity : 1 // Number of spots for guided tours
      };
      
      console.log('💳 Checkout data prepared:', checkoutData);

      console.log('💳 Creating checkout session:', checkoutData);

      const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkoutData)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      const checkoutUrl = data.sessionUrl || data.url;
      if (checkoutUrl) {
        console.log('✅ Redirecting to Stripe Checkout:', checkoutUrl);
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (err) {
      console.error('❌ Payment error:', err);
      alert(err.message || 'Failed to process payment. Please try again.');
      setProcessingPayment(false);
    }
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
    // Try to restore filters from sessionStorage
    try {
      const savedFilters = sessionStorage.getItem('fliptrip_filters');
      if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        // Check if filters are not too old (1 hour max)
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        if (filters.timestamp && filters.timestamp > oneHourAgo) {
          // Build URL with filter parameters
          const params = new URLSearchParams();
          if (filters.formData?.city) {
            params.append('city', filters.formData.city);
          }
          if (filters.formData?.audience) {
            params.append('audience', filters.formData.audience);
          }
          if (filters.formData?.budget) {
            params.append('budget', filters.formData.budget);
          }
          if (filters.formData?.date_from) {
            params.append('date_from', filters.formData.date_from);
          }
          if (filters.formData?.date_to) {
            params.append('date_to', filters.formData.date_to);
          }
          if (filters.formData?.interest_ids && Array.isArray(filters.formData.interest_ids)) {
            filters.formData.interest_ids.forEach(id => {
              params.append('interest_ids', id);
            });
          }
          if (filters.selectedDates && Array.isArray(filters.selectedDates)) {
            if (filters.selectedDates.length > 0) {
              params.append('date', filters.selectedDates[0]);
            }
          }
          navigate(`/?${params.toString()}`);
          return;
        } else {
          // Remove stale filters
          sessionStorage.removeItem('fliptrip_filters');
        }
      }
    } catch (error) {
      console.error('Error restoring filters:', error);
      sessionStorage.removeItem('fliptrip_filters');
    }
    
    // Fallback: navigate without filters
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <img 
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f0f0f0' width='200' height='200'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ELoading...%3C/text%3E%3C/svg%3E" 
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

  // useNewFormat is a state variable set in loadTourFromDatabase
  // It determines whether to use new format (contentBlocks) or old format (daily_plan)
  console.log('🔍 Format check:', {
    useNewFormat,
    contentBlocksCount: contentBlocks.length,
    hasDailyPlan: !!itinerary?.daily_plan,
    dailyPlanLength: itinerary?.daily_plan?.length || 0
  });

  // Get image for hero - use tour preview_media_url if available, otherwise city image
  const tourPreviewImage = itinerary?.preview_media_url || tourData?.preview_media_url || tourData?.preview || null;
  const cityName = itinerary?.tags?.city || formData.city || tourData?.city?.name || (typeof tourData?.city === 'string' ? tourData.city : null) || 'Barcelona';
  const cityImage = getCityImage(cityName);
  const heroImage = tourPreviewImage || cityImage; // Use tour preview if available, otherwise city image
  
  // Get guide info from tour data (only for DB tours, not generated)
  const isGeneratedTour = !tourId; // If no tourId, it's a generated tour
  const guideInfo = !isGeneratedTour && tourData?.guide ? tourData.guide : null;
  const guideName = guideInfo?.name || null;
  const guideAvatar = guideInfo?.avatar_url || null;
  
  // Get tour info for new format (from tourData or tourInfo state)
  const tourTitle = useNewFormat ? (tourData?.title || '') : (itinerary?.title || generateFallbackTitle(formData));
  const tourDescription = useNewFormat ? (tourData?.description || '') : (itinerary?.subtitle || generateFallbackSubtitle(formData));
  
  // Debug logging for author display
  console.log('🔍 Author display check:', {
    tourId,
    isGeneratedTour,
    hasTourData: !!tourData,
    hasGuide: !!tourData?.guide,
    guideInfo,
    guideName,
    guideAvatar,
    useNewFormat,
    tourTitle,
    tourDescription
  });

  return (
    <div className="itinerary-container">
      {/* White Header with Logo and Auth Buttons */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        maxWidth: '750px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%'
      }}>
        {/* Logo - Clickable with filter restoration */}
        <img 
          src={FlipTripLogo} 
          alt="FlipTrip" 
          onClick={handleBack}
          style={{ 
            cursor: 'pointer',
            height: '60px',
            width: 'auto'
          }}
        />
        
        {/* Auth Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '12px',
          alignItems: 'center',
          height: '60px'
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
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '600'
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
                  border: 'none',
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

      {/* Hero Image Section with Rounded Corners */}
      <div style={{
        maxWidth: '750px',
        margin: '0 10px 32px',
        marginLeft: '10px',
        marginRight: '10px',
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
      }}>
        <div 
          style={{
            position: 'relative',
            width: '100%',
            height: '300px',
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            padding: '20px'
          }}
        >
          {/* Black Gradient Overlay - from black to transparent (top to bottom) */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: heroImage 
              ? 'linear-gradient(to bottom, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.3), transparent)'
              : 'linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 100%)',
            zIndex: 1
          }} />

          {/* Title overlay - top left aligned - Match visualizer exactly */}
          <div style={{ 
            color: 'white', 
            fontSize: '35px', 
            fontWeight: '700',
            textAlign: 'left',
            lineHeight: '1.2',
            letterSpacing: '-0.3px',
            zIndex: 2,
            maxWidth: '80%',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative'
          }}>
            {tourTitle}
          </div>

          {/* Download PDF Button at Bottom - Match visualizer exactly */}
          {(!previewOnly || isPaid) && (
            <button
              onClick={handleDownloadPDF}
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                padding: '11.04px 22.08px',
                backgroundColor: 'white',
                color: '#111827',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13.8px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '9.2px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 2,
                transition: 'all 0.2s',
                transform: 'scale(0.92)',
                transformOrigin: 'left bottom'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(0.92) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(0.92) translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
              }}
            >
              <img 
                src={PDFIcon} 
                alt="PDF" 
                style={{ width: '18.4px', height: '18.4px' }}
              />
              Download PDF
            </button>
          )}
        </div>
      </div>

      {/* Tags Section - Match visualizer exactly */}
      <div style={{ 
        maxWidth: '750px',
        margin: '-10px 10px 30px',
        marginLeft: '10px',
        marginRight: '10px',
        padding: '0',
        paddingLeft: '0',
        paddingRight: '0'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          flexWrap: 'wrap',
          margin: '0'
        }}>
          {/* City tag */}
          <div style={{
            height: '35px',
            padding: '0 12px',
            backgroundColor: '#FFE7CE',
            color: '#111827',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center'
          }}>
            {itinerary?.tags?.city || formData.city || tourData?.city?.name || (typeof tourData?.city === 'string' ? tourData.city : 'City')}
          </div>
          
          {/* Date tag */}
          <div style={{
            height: '35px',
            padding: '0 12px',
            backgroundColor: '#CFF2FF',
            color: '#111827',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center'
          }}>
            Dates
          </div>
          
          {/* Budget tag */}
          <div style={{
            height: '35px',
            padding: '0 12px',
            backgroundColor: '#CFFFE1',
            color: '#111827',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center'
          }}>
            Budget
          </div>
          
          {/* Interests tags - from tourData.tour_tags for new format tours */}
          {useNewFormat && tourData?.tour_tags && tourData.tour_tags.length > 0 ? (
            tourData.tour_tags.map((tt, idx) => {
              const interest = tt.interest;
              if (!interest) return null;
              return (
                <div
                  key={idx}
                  style={{
                    height: '35px',
                    padding: '0 12px',
                    backgroundColor: 'white',
                    color: '#111827',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid #DEDEDE'
                  }}
                >
                  {interest.name}
                </div>
              );
            })
          ) : (
            // Fallback: show from itinerary.tags.interests or formData.interests
            (itinerary?.tags?.interests && itinerary.tags.interests.length > 0 ? itinerary.tags.interests : (formData.interests || [])).map((interest, index) => (
              <div
                key={index}
                style={{
                  height: '35px',
                  padding: '0 12px',
                  backgroundColor: 'white',
                  color: '#111827',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid #DEDEDE'
                }}
              >
                {interest}
              </div>
            ))
          )}
        </div>
      </div>

      {/* From author block - Show only if using new format (contentBlocks) - Match visualizer exactly */}
      {useNewFormat && guideName && (
        <div style={{
          maxWidth: '750px',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #D0D0D0',
          marginBottom: '10px',
          marginTop: '-10px',
          margin: '-10px 10px 10px',
          marginLeft: '10px',
          marginRight: '10px'
        }}>
            {/* Avatar section - always on top */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              marginBottom: '16px'
            }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: '#e5e7eb',
                overflow: 'hidden',
                marginBottom: '12px',
                border: '3px solid #f3f4f6'
              }}>
                {guideAvatar ? (
                  <img src={guideAvatar} alt="Author" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '40px' }}>
                    👤
                  </div>
                )}
              </div>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: '#6b7280',
                textAlign: 'center',
                lineHeight: '1.5',
                whiteSpace: 'pre-line'
              }}>
                Tour created{'\n'}by <strong style={{ color: '#111827', fontWeight: '600' }}>{guideName}</strong>
              </p>
            </div>
            
            {/* Title, text and button section - below avatar */}
            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '500', 
                marginBottom: '16px', 
                color: '#111827',
                marginTop: 0,
                textAlign: 'center',
                width: '100%'
              }}>
                A note from the author
              </h3>
                <div>
                  {(() => {
                    const text = tourDescription || '';
                    
                    // Check if text is likely to be more than 5 lines
                    const lineCount = text ? (text.split('\n').length + Math.ceil(text.replace(/\n/g, '').length / 90)) : 0;
                    const shouldShowButton = lineCount > 5;
                    
                    return (
                      <>
                        {isAuthorTextExpanded ? (
                          <p style={{ 
                            color: '#4b5563', 
                            fontSize: '15px', 
                            lineHeight: isMobile ? '1.5' : '1.7', 
                            marginBottom: '16px',
                            marginTop: 0,
                            whiteSpace: 'pre-line',
                            textAlign: 'left',
                            width: '100%'
                          }}>
                            {text}
                          </p>
                        ) : (
                          <p style={{ 
                            color: '#4b5563', 
                            fontSize: '15px', 
                            lineHeight: isMobile ? '1.5' : '1.7', 
                            marginBottom: shouldShowButton ? '12px' : '16px',
                            marginTop: 0,
                            display: '-webkit-box',
                            WebkitLineClamp: 5,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            whiteSpace: 'pre-line',
                            textAlign: 'left',
                            width: '100%'
                          }}>
                            {text}
                          </p>
                        )}
                        {shouldShowButton && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            width: '100%'
                          }}>
                            <button 
                              onClick={() => setIsAuthorTextExpanded(!isAuthorTextExpanded)}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#EFEFEF',
                                color: '#6b7280',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                transition: 'all 0.2s',
                                marginTop: '4px'
                              }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#e5e5e5';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#EFEFEF';
                            }}
                          >
                            {isAuthorTextExpanded ? 'Read less' : 'Read more'}
                          </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
            </div>
        </div>
      )}

      <div className="content-section" style={{ padding: '0 !important', paddingLeft: '0 !important', paddingRight: '0 !important' }}>
        {/* Subtitle Card - Description only - Show only if using old format */}
        {!useNewFormat && (
          <div className="enhanced-card">
            <p 
              className={`subtitle ${!isSubtitleExpanded ? 'subtitle-collapsed' : ''}`}
            >
              {itinerary?.subtitle || generateFallbackSubtitle(formData)}
            </p>
          
          {/* Read more button - show only if text is long enough */}
          {(() => {
            const subtitleText = itinerary?.subtitle || generateFallbackSubtitle(formData);
            // Check if text is likely to be more than 4 lines (rough estimate: ~80 chars per line)
            const isLongText = subtitleText && subtitleText.length > 320;
            
            if (isLongText) {
              return (
                <button
                  onClick={() => setIsSubtitleExpanded(!isSubtitleExpanded)}
                  style={{
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    marginTop: '12px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  {isSubtitleExpanded ? 'Read less' : 'Read more'}
                </button>
              );
            }
            return null;
          })()}

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
        )}

        {/* Email and Payment Block - Show only if preview and not paid (for both formats) */}
        {previewOnly && !isPaid && (() => {
          // Determine available formats from draft_data.tourSettings
          // CRITICAL: If tourSettings exist, use ONLY those values (don't check other fields)
          const draftData = tourData?.draft_data || {};
          const tourSettings = draftData.tourSettings || {};
          
          // If tourSettings exist, use explicit values from there
          // Otherwise, infer from tour fields
          let selfGuided, withGuide;
          if (tourSettings.selfGuided !== undefined || tourSettings.withGuide !== undefined) {
            // Use explicit values from tourSettings
            selfGuided = tourSettings.selfGuided !== undefined ? tourSettings.selfGuided : true; // Default: true
            withGuide = tourSettings.withGuide !== undefined ? tourSettings.withGuide : false;
          } else {
            // Fallback: infer from tour fields
            selfGuided = tourData?.default_format !== 'with_guide' && tourData?.default_format !== 'guided';
            withGuide = tourData?.withGuide || 
                       tourData?.default_format === 'with_guide' || 
                       tourData?.default_format === 'guided' ||
                       tourData?.format === 'guided' ||
                       (tourData?.price?.guidedPrice && tourData.price.guidedPrice > 0);
          }
          
          // Determine available formats - use explicit values from tourSettings
          const supportsSelfGuided = selfGuided === true;
          const supportsGuide = withGuide === true;
          
          console.log('🔍 Payment block debug:', {
            tourData: !!tourData,
            draftData: !!tourData?.draft_data,
            tourSettings: tourData?.draft_data?.tourSettings,
            selfGuided: tourSettings?.selfGuided,
            withGuide: tourSettings?.withGuide,
            tourDataWithGuide: tourData?.withGuide,
            default_format: tourData?.default_format,
            format: tourData?.format,
            guidedPrice: tourData?.price?.guidedPrice || tourData?.price_guided,
            supportsSelfGuided,
            supportsGuide,
            tourId,
            tourType,
            quantity,
            selectedDate,
            availableSpots
          });
          
          // Get prices
          const pdfPrice = tourData?.price?.pdfPrice || tourData?.price_pdf || 16;
          const guidedPrice = tourData?.price?.guidedPrice || tourData?.price_guided || null;
          
          // Calculate current price based on selected tour type and quantity
          const basePrice = tourType === 'with-guide' && guidedPrice ? guidedPrice : pdfPrice;
          const currentPrice = tourType === 'with-guide' ? basePrice * quantity : basePrice;
          const currency = tourData?.price?.currency || tourData?.currency || 'USD';
          
          console.log('💰 Price calculation:', {
            pdfPrice,
            guidedPrice,
            basePrice,
            quantity,
            currentPrice,
            currency
          });
          
          return (
            <div style={{
              maxWidth: '750px',
              marginTop: '10px',
              marginBottom: '30px',
              margin: '10px 10px 30px',
              marginLeft: '10px',
              marginRight: '10px',
              padding: '0',
              paddingLeft: '0',
              paddingRight: '0'
            }}>
              {/* Choose type of your trip - with calendar on side for desktop when With Guide is selected */}
              <div className="payment-cards-container" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '0',
                margin: '0',
                padding: '0',
                paddingLeft: '0',
                paddingRight: '0'
              }}>
                {/* Left Card: Choose type of your trip */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                  <h4 style={{
                    fontSize: '21px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '20px'
                  }}>
                    Choose type of your trip
                  </h4>
                  
                  {/* Self-guided Tour */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: supportsSelfGuided ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s',
                    backgroundColor: tourType === 'self-guided' && supportsSelfGuided ? '#eff6ff' : 'transparent',
                    opacity: supportsSelfGuided ? 1 : 0.5,
                    marginBottom: '12px'
                  }}
                  onMouseEnter={(e) => {
                    if (supportsSelfGuided && tourType !== 'self-guided') {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (supportsSelfGuided && tourType !== 'self-guided') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  >
                    <input
                      type="radio"
                      name="tourType"
                      value="self-guided"
                      checked={tourType === 'self-guided'}
                      onChange={(e) => {
                        if (supportsSelfGuided) {
                          setTourType('self-guided');
                          setSelectedDate(null);
                        }
                      }}
                      disabled={!supportsSelfGuided}
                      style={{
                        marginTop: '2px',
                        cursor: supportsSelfGuided ? 'pointer' : 'not-allowed',
                        width: '18px',
                        height: '18px'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: supportsSelfGuided ? '#111827' : '#9ca3af',
                        marginBottom: '4px'
                      }}>
                        Self-guided Tour
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: supportsSelfGuided ? '#6b7280' : '#9ca3af',
                        lineHeight: '1.5'
                      }}>
                        {supportsSelfGuided 
                          ? `Fixed price: ${currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}${pdfPrice}. Travelers can download the PDF route and explore independently`
                          : 'This option is not available for this tour'}
                      </div>
                    </div>
                  </label>
                  
                  {/* With Guide */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: supportsGuide ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s',
                    backgroundColor: tourType === 'with-guide' && supportsGuide ? '#eff6ff' : 'transparent',
                    opacity: supportsGuide ? 1 : 0.5,
                    marginTop: '12px'
                  }}
                  onMouseEnter={(e) => {
                    if (supportsGuide && tourType !== 'with-guide') {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (supportsGuide && tourType !== 'with-guide') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  >
                    <input
                      type="radio"
                      name="tourType"
                      value="with-guide"
                      checked={tourType === 'with-guide'}
                      onChange={(e) => {
                        if (supportsGuide) {
                          setTourType('with-guide');
                        }
                      }}
                      disabled={!supportsGuide}
                      style={{
                        marginTop: '2px',
                        cursor: supportsGuide ? 'pointer' : 'not-allowed',
                        width: '18px',
                        height: '18px'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: supportsGuide ? '#111827' : '#9ca3af',
                        marginBottom: '4px'
                      }}>
                        With Guide
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: supportsGuide ? '#6b7280' : '#9ca3af',
                        lineHeight: '1.5'
                      }}>
                        {supportsGuide && guidedPrice 
                          ? `Experience this tour with the guide who created it`
                          : 'This option is not available for this tour'}
                      </div>
                    </div>
                  </label>
                  
                  {/* Button - Always show at bottom, under With Guide option */}
                  <a
                    href="#unlock-full-itinerary"
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 24px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'center',
                      textDecoration: 'none',
                      transition: 'background-color 0.2s',
                      marginTop: '12px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#3b82f6';
                    }}
                  >
                    Unlock full itinerary
                  </a>
                </div>
                
                {/* Right Card: Availability Calendar - Show only when With Guide is selected (desktop) */}
                {tourType === 'with-guide' && supportsGuide && tourId ? (
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '16px'
                    }}>
                      Select available date
                    </h4>
                    <AvailabilityCalendar
                      tourId={tourId}
                      selectedDate={selectedDate}
                      onDateSelect={(date) => {
                        setSelectedDate(date);
                        setQuantity(1); // Reset quantity when date changes
                      }}
                      onAvailabilityChange={(info) => {
                        console.log('📅 Availability info received:', info);
                        setAvailableSpots(info.availableSpots);
                        setMaxGroupSize(info.maxGroupSize);
                      }}
                      disabled={false}
                    />
                    
                    {/* Quantity selector - Show only if date is selected */}
                    {selectedDate && availableSpots !== null && availableSpots > 0 && (
                      <div style={{
                        marginTop: '20px',
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111827',
                          marginBottom: '8px'
                        }}>
                          Available spots: {availableSpots} out of {maxGroupSize || 10}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <label style={{
                            fontSize: '14px',
                            color: '#6b7280',
                            fontWeight: '500'
                          }}>
                            Number of spots:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={availableSpots}
                            value={quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 1;
                              if (value >= 1 && value <= availableSpots) {
                                setQuantity(value);
                              }
                            }}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '16px',
                              width: '80px',
                              textAlign: 'center'
                            }}
                          />
                          <span style={{
                            fontSize: '12px',
                            color: '#6b7280'
                          }}>
                            (Max: {availableSpots})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Empty placeholder to maintain grid layout
                  <div></div>
                )}
              </div>
              
              {/* Availability Calendar - Show below for mobile when With Guide is selected */}
              {tourType === 'with-guide' && supportsGuide && tourId && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  marginTop: '20px',
                  display: 'none' // Hidden on desktop, shown on mobile via CSS
                }}
                className="mobile-calendar"
                >
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '16px'
                  }}>
                    Select available date
                  </h4>
                  <AvailabilityCalendar
                    tourId={tourId}
                    selectedDate={selectedDate}
                    onDateSelect={(date) => {
                      setSelectedDate(date);
                      setQuantity(1); // Reset quantity when date changes
                    }}
                    onAvailabilityChange={(info) => {
                      console.log('📅 Availability info received:', info);
                      setAvailableSpots(info.availableSpots);
                      setMaxGroupSize(info.maxGroupSize);
                    }}
                    disabled={false}
                  />
                  
                  {/* Quantity selector - Show only if date is selected */}
                  {selectedDate && availableSpots !== null && availableSpots > 0 && (
                    <div style={{
                      marginTop: '20px',
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '8px'
                      }}>
                        Available spots: {availableSpots} out of {maxGroupSize || 10}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <label style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          fontWeight: '500'
                        }}>
                          Number of spots:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={availableSpots}
                          value={quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            if (value >= 1 && value <= availableSpots) {
                              setQuantity(value);
                            }
                          }}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '16px',
                            width: '80px',
                            textAlign: 'center'
                          }}
                        />
                        <span style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          (Max: {availableSpots})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Content Blocks - New Format (using BlockRenderer) */}
        {useNewFormat && (
          <div style={{ 
            maxWidth: '750px',
            margin: '40px 10px 0', 
            marginTop: '40px',
            marginLeft: '10px',
            marginRight: '10px',
            padding: '0', 
            paddingLeft: '0', 
            paddingRight: '0' 
          }}>
            {/* Determine which blocks to show based on preview mode */}
            {(() => {
              // Check if tour is empty (no blocks)
              if (itinerary?.isEmpty || contentBlocks.length === 0) {
                return (
                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    padding: '48px 20px',
                    textAlign: 'center',
                    marginTop: '32px',
                    marginBottom: '32px',
                    border: '1px solid #e5e7eb',
                    marginLeft: '10px',
                    marginRight: '10px'
                  }}>
                    <div style={{
                      fontSize: '48px',
                      marginBottom: '16px'
                    }}>📝</div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '8px'
                    }}>
                      Tour content is being prepared
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      marginBottom: '24px',
                      maxWidth: '400px',
                      margin: '0 auto 24px'
                    }}>
                      This tour is currently being created. Content blocks will appear here once the creator adds them.
                    </p>
                    {guideName && (
                      <div style={{
                        fontSize: '13px',
                        color: '#9ca3af',
                        fontStyle: 'italic'
                      }}>
                        Created by {guideName}
                      </div>
                    )}
                  </div>
                );
              }
              
              const shouldLimitBlocks = previewOnly && !isPaid;
              const blocksToShow = shouldLimitBlocks 
                ? contentBlocks.slice(0, 2) // Show only first 2 blocks in preview
                : contentBlocks; // Show all blocks if paid or not preview
              
              return (
                <>
                  {blocksToShow.map((block, index) => (
                    <div 
                      key={block.id} 
                      style={{ 
                        marginBottom: '30px',
                        padding: '0'
                      }}
                    >
                      <div style={{
                        padding: '0'
                      }}>
                        <BlockRenderer 
                          block={block} 
                          onEdit={() => {}} // No edit on client page
                          onSwitchLocation={handleSwitchLocation} // Switch locations on client page
                        />
                      </div>
                    </div>
                  ))}
                  
                  {/* Payment Block - Show after first 2 blocks in preview mode (new format) */}
                  {shouldLimitBlocks && blocksToShow.length >= 2 && (() => {
                    // Determine if tour supports guide option
                    const supportsGuide = tourData?.withGuide || 
                                          tourData?.default_format === 'with_guide' || 
                                          tourData?.format === 'guided' ||
                                          (tourData?.price?.guidedPrice && tourData.price.guidedPrice > 0);
                    
                    // Get prices
                    const pdfPrice = tourData?.price?.pdfPrice || tourData?.price_pdf || 16;
                    const guidedPrice = tourData?.price?.guidedPrice || tourData?.price_guided || null;
                    const currency = tourData?.price?.currency || tourData?.currency || 'USD';
                    
                    // Calculate current price based on selected tour type and quantity
                    const basePrice = tourType === 'with-guide' && guidedPrice ? guidedPrice : pdfPrice;
                    const currentPrice = tourType === 'with-guide' ? basePrice * quantity : basePrice;
                    
                    return (
                      <div style={{
                        maxWidth: '750px',
                        marginTop: '10px',
                        marginBottom: '10px',
                        width: '100%',
                        margin: '10px 10px',
                        marginLeft: '10px',
                        marginRight: '10px',
                        padding: '0',
                        paddingLeft: '0',
                        paddingRight: '0'
                      }}>
                        <div className="payment-cards-container" style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr',
                          gap: '20px',
                          marginBottom: '0',
                          margin: '0',
                          padding: '0',
                          paddingLeft: '0',
                          paddingRight: '0'
                        }}>
                          <div id="unlock-full-itinerary" style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            padding: '20px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                          }}>
                        <h4 style={{
                          fontSize: '21px',
                          fontWeight: '600',
                          color: '#111827',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span>🔒</span>
                          <span>Unlock Full Itinerary</span>
                        </h4>
                        <p style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '20px'
                        }}>
                          Get access to all locations and detailed daily plan.
                        </p>
                        
                        <div style={{
                          fontSize: '32px',
                          fontWeight: 'bold',
                          color: '#111827',
                          marginBottom: '4px'
                        }}>
                          {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}{currentPrice}
                        </div>
                        
                        {tourType === 'with-guide' && quantity > 1 && (
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            marginBottom: '4px'
                          }}>
                            {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}{basePrice} × {quantity} spots
                          </div>
                        )}
                        
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '24px'
                        }}>
                          One-time payment
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '12px'
                        }}>
                          <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                              padding: '12px 16px',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '16px',
                              width: '100%',
                              boxSizing: 'border-box'
                            }}
                          />
                          <button
                            onClick={handlePayment}
                            disabled={processingPayment || !email || (tourType === 'with-guide' && !selectedDate)}
                            style={{
                              padding: '12px 24px',
                              backgroundColor: processingPayment || !email || (tourType === 'with-guide' && (!selectedDate || !quantity || quantity < 1)) ? '#9ca3af' : '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '16px',
                              fontWeight: '600',
                              cursor: processingPayment || !email || (tourType === 'with-guide' && (!selectedDate || !quantity || quantity < 1)) ? 'not-allowed' : 'pointer',
                              width: '100%',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!processingPayment && email && !(tourType === 'with-guide' && (!selectedDate || !quantity || quantity < 1))) {
                                e.target.style.backgroundColor = '#2563eb';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!processingPayment && email && !(tourType === 'with-guide' && (!selectedDate || !quantity || quantity < 1))) {
                                e.target.style.backgroundColor = '#3b82f6';
                              }
                            }}
                          >
                            {processingPayment ? 'Processing...' : 'Proceed to payment'}
                          </button>
                        </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        )}

        {/* Itinerary Plan - Old Format (backward compatibility) */}
        {!useNewFormat && (
          <div 
            className="enhanced-card"
            style={{
              marginLeft: '10px',
              marginRight: '10px',
              maxWidth: '750px'
            }}
          >
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
              📅 Day Plan
            </h2>
            
            {(() => {
            let itemCount = 0;
            const shouldShowUnlockBlock = previewOnly && !isPaid;
            let shouldInsertUnlockAfterSecond = false;
            
            // CRITICAL: Limit to 2 items total if preview mode and not paid
            const shouldLimitPreviewItems = previewOnly && !isPaid;
            let previewItemCount = 0;
            
            // CRITICAL: Render ALL days from daily_plan, not just first day
            if (!itinerary?.daily_plan || itinerary.daily_plan.length === 0) {
              return null;
            }
            
            return itinerary.daily_plan.map((day, dayIndex) => {
              const dayNumber = day.day || day.day_number || dayIndex + 1;
              const dayTitle = day.title || `Day ${dayNumber}`;
              const dayDate = day.date || null;
              
              return (
                <div key={dayIndex} style={{ marginBottom: dayIndex > 0 ? '40px' : '0' }}>
                  {/* Day Header - only show if multiple days */}
                  {itinerary.daily_plan.length > 1 && (
                    <div style={{ 
                      marginBottom: '20px', 
                      paddingBottom: '10px', 
                      borderBottom: '2px solid #e5e7eb' 
                    }}>
                      <h3 style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold', 
                        color: '#1f2937',
                        marginBottom: '5px'
                      }}>
                        {dayTitle}
                      </h3>
                      {dayDate && (
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                          {new Date(dayDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Day Blocks */}
                  {day.blocks?.map((block, blockIndex) => {
                    // Filter items if in preview mode (only for first day)
                    const itemsToShow = (shouldLimitPreviewItems && dayIndex === 0)
                      ? block.items?.filter(() => {
                          if (previewItemCount >= 2) return false;
                          previewItemCount++;
                          return true;
                        }) || []
                      : block.items || [];
                    
                    // Skip block if no items to show
                    if (itemsToShow.length === 0) return null;
                    
                    return (
                      <div key={blockIndex} style={blockStyle}>
                        <div className="time-block-enhanced">{block.time}</div>
                        {itemsToShow.map((item, itemIndex) => {
                          itemCount++;
                          const isSecondItem = itemCount === 2;
                          if (isSecondItem && shouldShowUnlockBlock) {
                            shouldInsertUnlockAfterSecond = true;
                          }
                          
                          return (
                            <div key={itemIndex}>
                              <div className="item-enhanced">
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
                            </div>
                          );
                        })}
                      </div>
                    );
                  }).filter(Boolean)} {/* Remove null blocks */}
                </div>
              );
            });
          })()}
          
          {/* Unlock Full Itinerary block - Outside timeline, full width */}
          {previewOnly && !isPaid && (() => {
            // Count items to check if we should show unlock block
            let totalItemCount = 0;
            itinerary?.daily_plan?.[0]?.blocks?.forEach(block => {
              if (block.items) {
                totalItemCount += block.items.length;
              }
            });
            
            // Show unlock block only if we have at least 2 items (preview mode)
            if (totalItemCount >= 2) {
              // Determine if tour supports guide option
              const supportsGuide = tourData?.withGuide || 
                                    tourData?.default_format === 'with_guide' || 
                                    tourData?.format === 'guided' ||
                                    (tourData?.price?.guidedPrice && tourData.price.guidedPrice > 0);
              
              // Get prices
              const pdfPrice = tourData?.price?.pdfPrice || tourData?.price_pdf || 16;
              const guidedPrice = tourData?.price?.guidedPrice || tourData?.price_guided || null;
              const currency = tourData?.price?.currency || tourData?.currency || 'USD';
              
              // Calculate current price based on selected tour type and quantity
              const basePrice = tourType === 'with-guide' && guidedPrice ? guidedPrice : pdfPrice;
              const currentPrice = tourType === 'with-guide' ? basePrice * quantity : basePrice;
              
              return (
                <div style={{
                  maxWidth: '750px',
                  width: '100%',
                  margin: '10px 10px 0',
                  padding: '0',
                  paddingLeft: '0',
                  paddingRight: '0',
                  marginLeft: '10px',
                  marginRight: '10px'
                }}>
                  <div className="payment-cards-container" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '20px',
                    marginBottom: '0',
                    margin: '0',
                    marginLeft: '0',
                    marginRight: '0',
                    padding: '0',
                    paddingLeft: '0',
                    paddingRight: '0'
                  }}>
                          <div id="unlock-full-itinerary" style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: '12px',
                            padding: '20px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            margin: '0',
                            marginLeft: '0',
                            marginRight: '0'
                          }}>
                  <h4 style={{
                    fontSize: '21px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>🔒</span>
                    <span>Unlock Full Itinerary</span>
                  </h4>
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginBottom: '20px'
                  }}>
                    Get access to all locations and detailed daily plan.
                  </p>
                  
                  <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#111827',
                    marginBottom: '4px'
                  }}>
                    {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}{currentPrice}
                  </div>
                  
                  {tourType === 'with-guide' && quantity > 1 && (
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginBottom: '4px'
                    }}>
                      {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}{basePrice} × {quantity} spots
                    </div>
                  )}
                  
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginBottom: '24px'
                  }}>
                    One-time payment
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px'
                  }}>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      onClick={handlePayment}
                      disabled={processingPayment || !email || (tourType === 'with-guide' && !selectedDate)}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: processingPayment || !email || (tourType === 'with-guide' && (!selectedDate || !quantity || quantity < 1)) ? '#9ca3af' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: processingPayment || !email || (tourType === 'with-guide' && (!selectedDate || !quantity || quantity < 1)) ? 'not-allowed' : 'pointer',
                        width: '100%',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!processingPayment && email && !(tourType === 'with-guide' && (!selectedDate || !quantity || quantity < 1))) {
                          e.target.style.backgroundColor = '#2563eb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!processingPayment && email && !(tourType === 'with-guide' && (!selectedDate || !quantity || quantity < 1))) {
                          e.target.style.backgroundColor = '#3b82f6';
                        }
                      }}
                    >
                      {processingPayment ? 'Processing...' : 'Proceed to payment'}
                    </button>
                  </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
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