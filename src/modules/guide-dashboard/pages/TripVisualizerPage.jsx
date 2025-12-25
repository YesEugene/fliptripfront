/**
 * Trip Visualizer Page - WYSIWYG editor for tour creation
 * Allows guides to create tours with flexible content blocks
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../../auth/services/authService';
import { getGuideProfile } from '../../../modules/guide-profile';
import FlipTripLogo from '../../../assets/FlipTripLogo.svg';
import PDFIcon from '../../../assets/PDF.svg';
import LocationIcon from '../../../assets/Location.svg';
import TitleIcon from '../../../assets/Title.svg';
import PhotoTextIcon from '../../../assets/Photo + text.svg';
import TextBlockIcon from '../../../assets/Text Block.svg';
import SlideTypeIcon from '../../../assets/Slide type.svg';
import ThreeColumnsIcon from '../../../assets/3 columns.svg';
import PhotoIcon from '../../../assets/Photo.svg';
import DividerIcon from '../../../assets/Devider.svg';
import BarcelonaExampleImage from '../../../assets/Barcelona-example.png';
import SantAntoniMarketImage from '../../../assets/Sant Antoni Market.jpg';
import ElRavalImage from '../../../assets/El Raval Backstreets.webp';
import MontjuicImage from '../../../assets/Montjuïc Hill (Miradors & Paths).jpg';
import PhotoTextImage from '../../../assets/Photo_text.png';
import Photo1Image from '../../../assets/Photo-1.jpg';
import Photo2Image from '../../../assets/Photo-2.jpg';
import Photo3Image from '../../../assets/Photo-3.jpg';
import PhotoImage from '../../../assets/Photo.jpg';
import SlideImage from '../../../assets/Slide.jpg';
import { getTourById } from '../../../services/api';
import { getTourAvailability, updateAvailabilitySlots } from '../services/availabilityService';
import BlockRenderer from '../components/BlockRenderer';
import TextEditor from '../components/TextEditor';
import GoogleMapsLocationSelector from '../components/GoogleMapsLocationSelector';

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

// Month names for calendar
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Weekday names for calendar (Monday first)
const WEEKDAYS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];

export default function TripVisualizerPage() {
  const navigate = useNavigate();
  const { tourId } = useParams();
  const [user, setUser] = useState(null);
  const [guideProfile, setGuideProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tour, setTour] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [showTourEditor, setShowTourEditor] = useState(false);
  const [isAuthorTextExpanded, setIsAuthorTextExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  // Detect screen size for responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  // Tour basic info state with default Barcelona content
  const [tourInfo, setTourInfo] = useState({
    city: 'Barcelona',
    title: 'Barcelona without the rush',
    description: 'I return to Barcelona not for landmarks, but for its rhythm. The way the city lives between meals, walks, and pauses. I made this guide for moments when you don\'t want to impress yourself with how much you\'ve seen. When you want the city to feel human, readable, and calm.\n\nThese are the places and routes I choose when I want Barcelona to feel like a place I\'m living in — not passing through.',
    preview: BarcelonaExampleImage
  });

  // City autocomplete state
  const [cities, setCities] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  // Tour settings state
  const [tourSettings, setTourSettings] = useState({
    selfGuided: false, // Self-guided is now optional
    withGuide: false,
    price: {
      pdfPrice: 16,
      guidedPrice: 0,
      currency: 'USD',
      availableDates: [],
      meetingPoint: '',
      meetingTime: ''
    },
    additionalOptions: {
      platformOptions: ['insurance', 'accommodation'],
      creatorOptions: {}
    },
    tags: []
  });

  // Tag input state
  const [tagInput, setTagInput] = useState('');
  
  // Availability calendar state
  const [availabilityCalendarMonth, setAvailabilityCalendarMonth] = useState(new Date().getMonth());
  const [availabilityCalendarYear, setAvailabilityCalendarYear] = useState(new Date().getFullYear());
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedCalendarDates, setSelectedCalendarDates] = useState([]);
  const [defaultGroupSize, setDefaultGroupSize] = useState(10);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Tour settings block collapsed state
  const [isTourSettingsCollapsed, setIsTourSettingsCollapsed] = useState(true);

  // Load availability slots when tour has guide format
  useEffect(() => {
    if (tourSettings.withGuide && tourId) {
      loadAvailabilitySlots(tourId);
    }
  }, [tourSettings.withGuide, tourId]);

  useEffect(() => {
    loadUser();
    loadGuideProfile();
    if (tourId) {
      loadTour();
    }
    // Load cities for autocomplete
    const loadCities = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://fliptripback.vercel.app';
        const response = await fetch(`${API_BASE_URL}/api/admin-cities`);
        const data = await response.json();
        if (data.success && data.cities) {
          setCities(data.cities);
        }
      } catch (err) {
        console.error('Error loading cities:', err);
      }
    };
    loadCities();
    
    // Close city suggestions when clicking outside
    const handleClickOutside = (e) => {
      if (!e.target.closest('.city-autocomplete-container')) {
        setShowCitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tourId]);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);
    setLoading(false);
  };

  const loadGuideProfile = async () => {
    try {
      const profile = await getGuideProfile();
      if (profile) {
        setGuideProfile(profile);
      }
    } catch (error) {
      console.error('Error loading guide profile:', error);
    }
  };

  const loadTour = async (id = null) => {
    const tourIdToLoad = id || tourId;
    if (!tourIdToLoad) return;
    
    try {
      // Load tour basic info
      const tourData = await getTourById(tourIdToLoad);
      // getTourById returns tour object directly, not wrapped
      const tourObj = tourData?.tour || tourData;
      if (tourObj) {
        setTour(tourObj);
        
        // Check if draft_data exists and use it, otherwise use main tour data
        const draftData = tourObj.draft_data;
        const sourceData = draftData || tourObj;
        
        setTourInfo({
          city: sourceData.city || tourObj.city?.name || 'Barcelona',
          title: sourceData.title || tourObj.title || 'Barcelona without the rush',
          description: sourceData.description || tourObj.description || 'I return to Barcelona not for landmarks, but for its rhythm. The way the city lives between meals, walks, and pauses. I made this guide for moments when you don\'t want to impress yourself with how much you\'ve seen. When you want the city to feel human, readable, and calm.\n\nThese are the places and routes I choose when I want Barcelona to feel like a place I\'m living in — not passing through.',
          preview: sourceData.preview || tourObj.preview_media_url || BarcelonaExampleImage
        });

        // Load tour settings
        // First, check if draft_data.tourSettings exists (for tours created in Visualizer)
        let loadedSettings = null;
        if (draftData && draftData.tourSettings) {
          loadedSettings = draftData.tourSettings;
        }
        
        // Determine format from tour data
        const defaultFormat = tourObj.default_format;
        const selfGuided = loadedSettings?.selfGuided ?? (defaultFormat === 'self_guided');
        const withGuide = loadedSettings?.withGuide ?? (defaultFormat === 'with_guide' || defaultFormat === 'guided');
        
        const tags = tourObj.tour_tags?.map(tt => tt.tag?.name).filter(Boolean) || [];
        
        // Load availability dates if tour has guide format
        let availableDates = [];
        if (withGuide && tourIdToLoad) {
          try {
            const availabilityResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-availability?tourId=${tourIdToLoad}`).catch(() => null);
            if (availabilityResponse && availabilityResponse.ok) {
              const availabilityData = await availabilityResponse.json();
              if (availabilityData.success && availabilityData.slots) {
                // Extract unique dates from availability slots
                availableDates = [...new Set(availabilityData.slots
                  .filter(slot => slot.available_spots > 0)
                  .map(slot => slot.date)
                  .filter(Boolean)
                )].sort();
              }
            }
          } catch (err) {
            console.warn('Could not load availability dates:', err);
          }
        }
        
        setTourSettings({
          selfGuided: selfGuided,
          withGuide: withGuide,
          price: {
            pdfPrice: loadedSettings?.price?.pdfPrice ?? tourObj.price_pdf ?? 16,
            guidedPrice: loadedSettings?.price?.guidedPrice ?? tourObj.price_guided ?? 0,
            currency: loadedSettings?.price?.currency ?? tourObj.currency ?? 'USD',
            availableDates: loadedSettings?.price?.availableDates ?? availableDates,
            meetingPoint: loadedSettings?.price?.meetingPoint ?? tourObj.meeting_point ?? '',
            meetingTime: loadedSettings?.price?.meetingTime ?? tourObj.meeting_time ?? ''
          },
          additionalOptions: {
            platformOptions: loadedSettings?.additionalOptions?.platformOptions ?? ['insurance', 'accommodation'],
            creatorOptions: loadedSettings?.additionalOptions?.creatorOptions ?? {}
          },
          tags: loadedSettings?.tags ?? tags
        });
      }

      // Load content blocks (ignore errors if table doesn't exist yet)
      try {
        const blocksResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks?tourId=${tourIdToLoad}`).catch(() => null);
        if (blocksResponse && blocksResponse.ok) {
          const blocksData = await blocksResponse.json();
          if (blocksData.success) {
            setBlocks(blocksData.blocks || []);
          }
        } else {
          // Table might not exist yet - silently ignore
          setBlocks([]);
        }
      } catch (blocksError) {
        // Table might not exist yet - silently ignore
        setBlocks([]);
      }
      
      // Load availability slots if tour has guide format
      if (withGuide && tourIdToLoad) {
        loadAvailabilitySlots(tourIdToLoad);
      }
    } catch (error) {
      console.error('Error loading tour:', error);
    }
  };
  
  // Load availability slots for calendar
  const loadAvailabilitySlots = async (tourIdParam) => {
    if (!tourIdParam) return;
    
    try {
      setAvailabilityLoading(true);
      const slots = await getTourAvailability(tourIdParam);
      setAvailabilitySlots(slots || []);
      
      // Extract dates from slots and update tourSettings
      const availableDates = [...new Set(slots
        .filter(slot => slot.is_available && !slot.is_blocked)
        .map(slot => slot.date)
        .filter(Boolean)
      )].sort();
      
      setTourSettings(prev => ({
        ...prev,
        price: {
          ...prev.price,
          availableDates: availableDates
        }
      }));
      
      // Set default group size from first slot or tour
      if (slots.length > 0 && slots[0].max_group_size) {
        setDefaultGroupSize(slots[0].max_group_size);
      }
    } catch (err) {
      console.warn('Could not load availability slots:', err);
      setAvailabilitySlots([]);
    } finally {
      setAvailabilityLoading(false);
    }
  };
  
  // Mark selected dates as available
  const handleMarkDatesAsAvailable = async () => {
    if (selectedCalendarDates.length === 0 || !tourId) {
      // For new tours, just update local state
      const dateStrings = selectedCalendarDates.map(d => {
        if (d instanceof Date) {
          return d.toISOString().split('T')[0];
        }
        return d;
      });
      
      setTourSettings(prev => ({
        ...prev,
        price: {
          ...prev.price,
          availableDates: [...new Set([...(prev.price.availableDates || []), ...dateStrings])].sort()
        }
      }));
      setSelectedCalendarDates([]);
      return;
    }
    
    try {
      setAvailabilityLoading(true);
      const slots = selectedCalendarDates.map(date => {
        const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
        return {
          date: dateStr,
          max_group_size: defaultGroupSize,
          is_available: true,
          is_blocked: false
        };
      });
      
      await updateAvailabilitySlots(tourId, slots);
      await loadAvailabilitySlots(tourId);
      setSelectedCalendarDates([]);
    } catch (err) {
      console.error('Failed to mark dates as available:', err);
      alert('Failed to save availability. Please try again.');
    } finally {
      setAvailabilityLoading(false);
    }
  };
  
  // Block selected dates
  const handleBlockDates = async () => {
    if (selectedCalendarDates.length === 0 || !tourId) {
      // For new tours, remove from availableDates
      const dateStrings = selectedCalendarDates.map(d => {
        if (d instanceof Date) {
          return d.toISOString().split('T')[0];
        }
        return d;
      });
      
      setTourSettings(prev => ({
        ...prev,
        price: {
          ...prev.price,
          availableDates: (prev.price.availableDates || []).filter(d => !dateStrings.includes(d))
        }
      }));
      setSelectedCalendarDates([]);
      return;
    }
    
    try {
      setAvailabilityLoading(true);
      const dateStrings = selectedCalendarDates.map(date => {
        return date instanceof Date ? date.toISOString().split('T')[0] : date;
      });
      
      // Update slots to be blocked
      const slots = dateStrings.map(dateStr => ({
        date: dateStr,
        max_group_size: defaultGroupSize,
        is_available: false,
        is_blocked: true
      }));
      
      await updateAvailabilitySlots(tourId, slots);
      await loadAvailabilitySlots(tourId);
      setSelectedCalendarDates([]);
    } catch (err) {
      console.error('Failed to block dates:', err);
      alert('Failed to block dates. Please try again.');
    } finally {
      setAvailabilityLoading(false);
    }
  };
  
  // Calendar helper functions
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (month, year) => {
    const date = new Date(year, month, 1);
    return (date.getDay() + 6) % 7; // Monday = 0
  };
  
  const formatDateStr = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };
  
  const isDateInAvailableDates = (date) => {
    const dateStr = formatDateStr(date);
    return (tourSettings.price.availableDates || []).includes(dateStr);
  };
  
  const isDateInSlots = (date) => {
    const dateStr = formatDateStr(date);
    return availabilitySlots.some(slot => slot.date === dateStr && slot.is_available && !slot.is_blocked);
  };
  
  const isDateBlocked = (date) => {
    const dateStr = formatDateStr(date);
    return availabilitySlots.some(slot => slot.date === dateStr && slot.is_blocked);
  };
  
  const isDateSelected = (date) => {
    const dateStr = formatDateStr(date);
    return selectedCalendarDates.some(d => formatDateStr(d) === dateStr);
  };
  
  const handleCalendarDateClick = (day) => {
    const clickedDate = new Date(availabilityCalendarYear, availabilityCalendarMonth, day);
    clickedDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (clickedDate < today) return; // Can't select past dates
    
    setSelectedCalendarDates(prev => {
      const dateStr = formatDateStr(clickedDate);
      if (prev.some(d => formatDateStr(d) === dateStr)) {
        return prev.filter(d => formatDateStr(d) !== dateStr);
      } else {
        return [...prev, clickedDate];
      }
    });
  };
  
  const goToPreviousMonth = () => {
    if (availabilityCalendarMonth === 0) {
      setAvailabilityCalendarMonth(11);
      setAvailabilityCalendarYear(availabilityCalendarYear - 1);
    } else {
      setAvailabilityCalendarMonth(availabilityCalendarMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (availabilityCalendarMonth === 11) {
      setAvailabilityCalendarMonth(0);
      setAvailabilityCalendarYear(availabilityCalendarYear + 1);
    } else {
      setAvailabilityCalendarMonth(availabilityCalendarMonth + 1);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/guide/dashboard');
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions: 1920x1080
          const maxWidth = 1920;
          const maxHeight = 1080;
          
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with quality 0.8
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file, callback) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      const compressedBase64 = await compressImage(file);
      callback(compressedBase64);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
    }
  };

  const handleSaveAsDraft = async () => {
    try {
      // Validate required fields
      if (!tourInfo.city || !tourInfo.title) {
        alert('Please fill in City and Trip name before saving');
        return;
      }
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        alert('Please log in to save the tour');
        return;
      }
      
      if (!tourId) {
        // Create new tour as draft
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tours-create`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            city: tourInfo.city,
            title: tourInfo.title,
            description: tourInfo.description || '',
            preview: tourInfo.preview || null,
            previewType: 'image',
            status: 'draft',
            daily_plan: [], // Empty daily_plan for visualizer tours
            tags: [],
            meta: {
              interests: [],
              audience: 'him',
              total_estimated_cost: '€0'
            },
            // Add default values to match CreateTourPage format
            format: tourSettings.selfGuided ? 'self-guided' : (tourSettings.withGuide ? 'guided' : 'self-guided'),
            withGuide: tourSettings.withGuide,
            selfGuided: tourSettings.selfGuided,
            price: {
              pdfPrice: 16,
              guidedPrice: 0,
              currency: 'USD',
              availableDates: [],
              meetingPoint: '',
              meetingTime: ''
            },
            duration: {
              type: 'hours',
              value: 6
            },
            languages: ['en'],
            additionalOptions: {
              platformOptions: ['insurance', 'accommodation'],
              creatorOptions: {}
            }
          })
        });

        const data = await response.json();
        if (data.success && data.tour) {
          // Update URL with new tour ID
          const newTourId = data.tour.id;
          navigate(`/guide/tours/visualizer/${newTourId}`, { replace: true });
          setTour(data.tour);
          // Update tourId in state by reloading tour
          await loadTour(newTourId);
          alert('Tour saved as draft!');
        } else {
          alert(data.error || 'Failed to save tour');
        }
      } else {
        // Update existing tour as draft
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tours-update?id=${tourId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            city: tourInfo.city,
            title: tourInfo.title,
            description: tourInfo.description || '',
            preview: tourInfo.preview || null,
            previewType: 'image',
            saveAsDraft: true,
            format: tourSettings.withGuide ? 'guided' : (tourSettings.selfGuided ? 'self-guided' : 'self-guided'),
            withGuide: tourSettings.withGuide,
            selfGuided: tourSettings.selfGuided,
            price: {
              pdfPrice: tourSettings.price.pdfPrice || 16,
              guidedPrice: tourSettings.price.guidedPrice || 0,
              currency: tourSettings.price.currency || 'USD',
              availableDates: tourSettings.price.availableDates || [],
              meetingPoint: tourSettings.price.meetingPoint || '',
              meetingTime: tourSettings.price.meetingTime || ''
            },
            additionalOptions: {
              platformOptions: tourSettings.additionalOptions.platformOptions || ['insurance', 'accommodation'],
              creatorOptions: tourSettings.additionalOptions.creatorOptions || {}
            },
            tags: tourSettings.tags || []
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Update tour error:', errorData);
          alert(errorData.error || `Failed to save tour (${response.status})`);
          return;
        }
        
        const data = await response.json();
        if (data.success) {
          // Always preserve current preview in state (it was just saved)
          // Update other fields from response
          if (data.tour) {
            setTour(data.tour);
            setTourInfo({
              city: data.tour.city?.name || tourInfo.city,
              title: data.tour.title || tourInfo.title,
              description: data.tour.description || tourInfo.description,
              preview: tourInfo.preview // Keep current preview (was just saved)
            });
          }
          alert('Tour saved as draft!');
        } else {
          alert(data.error || 'Failed to save tour');
        }
      }
    } catch (error) {
      console.error('Error saving tour:', error);
      alert('Failed to save tour');
    }
  };

  const handleSaveTour = async () => {
    // This function is called from TourEditorModal when clicking "Save"
    // Similar to CreateTourPage's handleSubmit - validate and save
    if (!tourInfo.city || !tourInfo.title) {
      alert('Please fill in City and Trip name before saving');
      return;
    }
    
    // Close modal first
    setShowTourEditor(false);
    
    // Save tour as draft (same as CreateTourPage creates tour)
    await handleSaveAsDraft();
  };

  const handleSubmitForModeration = async () => {
    try {
      // Validate required fields
      if (!tourInfo.city || !tourInfo.title) {
        alert('Please fill in City and Trip name before submitting');
        return;
      }

      // Validate tour settings
      if (!isTourSettingsValid()) {
        alert('Please select at least one tour format (Self-guided or With Guide). If "With Guide" is selected, fill all required fields (Price, Meeting Point, Meeting Time, and at least one Available Date).');
        return;
      }
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        alert('Please log in to submit the tour');
        return;
      }
      
      if (!tourId) {
        // Create new tour and submit for moderation
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tours-create`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            city: tourInfo.city,
            title: tourInfo.title,
            description: tourInfo.description || '',
            preview: tourInfo.preview || null,
            previewType: 'image',
            status: 'pending',
            daily_plan: [], // Empty daily_plan for visualizer tours
            tags: [],
            meta: {
              interests: [],
              audience: 'him',
              total_estimated_cost: '€0'
            },
            // Add default values to match CreateTourPage format
            format: tourSettings.selfGuided ? 'self-guided' : (tourSettings.withGuide ? 'guided' : 'self-guided'),
            withGuide: tourSettings.withGuide,
            selfGuided: tourSettings.selfGuided,
            price: {
              pdfPrice: 16,
              guidedPrice: 0,
              currency: 'USD',
              availableDates: [],
              meetingPoint: '',
              meetingTime: ''
            },
            duration: {
              type: 'hours',
              value: 6
            },
            languages: ['en'],
            additionalOptions: {
              platformOptions: ['insurance', 'accommodation'],
              creatorOptions: {}
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Submit tour error:', errorData);
          alert(errorData.error || `Failed to submit tour (${response.status})`);
          return;
        }
        
        const data = await response.json();
        if (data.success && data.tour) {
          // Update URL with new tour ID
          const newTourId = data.tour.id;
          navigate(`/guide/tours/visualizer/${newTourId}`, { replace: true });
          setTour(data.tour);
          // Reload page to update tourId from URL params
          window.location.reload();
        } else {
          alert(data.error || 'Failed to submit tour');
        }
      } else {
        // Update existing tour and submit for moderation
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tours-update?id=${tourId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            city: tourInfo.city,
            title: tourInfo.title,
            description: tourInfo.description || '',
            preview: tourInfo.preview || null,
            previewType: 'image',
            status: 'pending',
            format: tourSettings.withGuide ? 'guided' : (tourSettings.selfGuided ? 'self-guided' : 'self-guided'),
            withGuide: tourSettings.withGuide,
            selfGuided: tourSettings.selfGuided,
            price: {
              pdfPrice: tourSettings.price.pdfPrice || 16,
              guidedPrice: tourSettings.price.guidedPrice || 0,
              currency: tourSettings.price.currency || 'USD',
              availableDates: tourSettings.price.availableDates || [],
              meetingPoint: tourSettings.price.meetingPoint || '',
              meetingTime: tourSettings.price.meetingTime || ''
            },
            additionalOptions: {
              platformOptions: tourSettings.additionalOptions.platformOptions || ['insurance', 'accommodation'],
              creatorOptions: tourSettings.additionalOptions.creatorOptions || {}
            },
            tags: tourSettings.tags || []
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Update tour error:', errorData);
          alert(errorData.error || `Failed to submit tour (${response.status})`);
          return;
        }
        
        const data = await response.json();
        if (data.success) {
          // Reload tour to get updated preview image
          await loadTour();
          alert('Tour submitted for moderation!');
        } else {
          alert(data.error || 'Failed to submit tour');
        }
      }
    } catch (error) {
      console.error('Error submitting tour:', error);
      alert('Failed to submit tour');
    }
  };

  // Check if required fields are filled
  const isHeaderValid = () => {
    return !!(tourInfo.city && tourInfo.title && tourInfo.description && tourInfo.preview);
  };

  const isTourSettingsValid = () => {
    // At least one format must be selected
    if (!tourSettings.selfGuided && !tourSettings.withGuide) {
      return false;
    }
    
    // If With Guide is selected, all required fields must be filled
    if (tourSettings.withGuide) {
      return (
        tourSettings.price.guidedPrice > 0 &&
        tourSettings.price.meetingPoint &&
        tourSettings.price.meetingTime &&
        tourSettings.price.availableDates &&
        tourSettings.price.availableDates.length > 0 &&
        tourSettings.price.availableDates.every(date => date !== '')
      );
    }
    
    // If only self-guided is selected, settings are valid
    return true;
  };

  // Create tour automatically if it doesn't exist (for adding blocks)
  const ensureTourExists = async () => {
    if (tourId) return tourId;
    
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      alert('Please log in to add blocks');
      return null;
    }

    try {
      // Create a minimal tour with empty required fields
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tours-create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          city: tourInfo.city || 'Barcelona',
          title: tourInfo.title || 'Barcelona without the rush',
          description: tourInfo.description || 'I return to Barcelona not for landmarks, but for its rhythm. The way the city lives between meals, walks, and pauses. I made this guide for moments when you don\'t want to impress yourself with how much you\'ve seen. When you want the city to feel human, readable, and calm.\n\nThese are the places and routes I choose when I want Barcelona to feel like a place I\'m living in — not passing through.',
          preview: tourInfo.preview || BarcelonaExampleImage,
          previewType: 'image',
          status: 'draft',
          daily_plan: [],
          tags: [],
          meta: {
            interests: [],
            audience: 'him',
            total_estimated_cost: '€0'
          },
          format: tourSettings.selfGuided ? 'self-guided' : (tourSettings.withGuide ? 'guided' : 'self-guided'),
          withGuide: tourSettings.withGuide,
          selfGuided: tourSettings.selfGuided,
          price: {
            pdfPrice: 16,
            guidedPrice: 0,
            currency: 'USD',
            availableDates: [],
            meetingPoint: '',
            meetingTime: ''
          },
          duration: {
            type: 'hours',
            value: 6
          },
          languages: ['en'],
          additionalOptions: {
            platformOptions: ['insurance', 'accommodation'],
            creatorOptions: {}
          }
        })
      });

      const data = await response.json();
      if (data.success && data.tour) {
        const newTourId = data.tour.id;
        // Update URL with new tour ID
        navigate(`/guide/tours/visualizer/${newTourId}`, { replace: true });
        setTour(data.tour);
        return newTourId;
      } else {
        alert(data.error || 'Failed to create tour');
        return null;
      }
    } catch (error) {
      console.error('Error creating tour:', error);
      alert('Failed to create tour');
      return null;
    }
  };

  const handleAddBlock = async (blockType) => {
    console.log('Adding block:', blockType);
    
    // Automatically create tour if it doesn't exist
    const currentTourId = tourId || await ensureTourExists();
    if (!currentTourId) {
      setShowBlockSelector(false);
      return;
    }

    // Get the next order_index (highest + 1)
    const maxOrder = blocks.length > 0 
      ? Math.max(...blocks.map(b => b.order_index || 0))
      : -1;

    // Determine default content based on block type
    let defaultContent = {};
    switch (blockType) {
      case 'title':
        defaultContent = { text: 'New Title', size: 'large' };
        break;
      case 'text':
        defaultContent = { 
          layout: 'two-columns',
          column1: 'Barcelona works best when you stop trying to do it right.\n\nThis city doesn\'t need to be optimized. It doesn\'t want you to rush from one highlight to another or prove that you\'ve "seen enough." Some of its best moments happen when nothing special is planned.',
          column2: 'Use this guide as a direction, not a schedule. Walk a little further than intended. Sit longer than planned. If a street, a café, or a view feels right — stay.\n\nBarcelona opens up in pauses: between meals, between neighborhoods, between decisions. And the more space you give it, the more generous it becomes.',
          text: '', // For single column mode
          formatted: false
        };
        break;
      case 'photo_text':
        defaultContent = { 
          photo: PhotoTextImage, 
          text: 'Barcelona reveals itself between places, not inside them.\n\nThe moments that stay with you usually happen while walking without a destination, sitting longer than planned, or choosing not to move on when you easily could.',
          alignment: 'left' 
        };
        break;
      case 'slide':
        defaultContent = { 
          title: 'Neighborhoods Matter More Than Attractions', 
          photo: SlideImage, 
          text: 'In Barcelona, the real experience rarely happens at the main sights.\nIt happens inside neighborhoods — between daily routines, local cafés, and streets you didn\'t plan to walk down.' 
        };
        break;
      case '3columns':
        defaultContent = { 
          columns: [
            { 
              photo: Photo1Image, 
              text: 'Mornings in Barcelona don\'t rush you.\nThey wait until you\'re ready.' 
            },
            { 
              photo: Photo2Image, 
              text: 'The city is best understood while walking without a destination.' 
            },
            { 
              photo: Photo3Image, 
              text: 'Stay when it feels right.\nLeaving can wait.' 
            }
          ]
        };
        break;
      case 'photo':
        defaultContent = { 
          photo: PhotoImage, 
          caption: 'This is me here.\nAnd this is usually where the city starts to feel real.' 
        };
        break;
      case 'divider':
        defaultContent = { style: 'solid' };
        break;
      case 'location':
        // Default location block with example data to inspire users
        defaultContent = { 
          mainLocation: {
            time: '09:30 – 11:00',
            title: 'Sant Antoni Market & Surroundings',
            address: 'Barcelona, Eixample',
            description: 'Sant Antoni is where Barcelona starts its day quietly.\n\nLocals come here for groceries, quick coffees, and short conversations before work. The market itself is lively but not overwhelming, and the streets around it feel lived-in rather than curated.\n\nThis is a good place to begin the day without rushing — to observe how the city moves before it fully wakes up.',
            photo: SantAntoniMarketImage,
            recommendations: 'Walk around the market first, then step outside and choose a café nearby rather than inside. Sit facing the street. Order something simple and stay longer than planned — this is the moment to ease into the city.',
            category: null,
            interests: [],
            price_level: '',
            approx_cost: ''
          },
          alternativeLocations: [
            {
              time: '12:00 – 14:30',
              title: 'El Raval Backstreets',
              address: 'Barcelona, El Raval',
              description: 'El Raval is messy, layered, and impossible to summarize.\n\nIt\'s not a neighborhood you "visit" — it\'s one you move through slowly. Streets change character every few minutes, cafés sit next to bookstores and barber shops, and nothing feels designed for tourists.\n\nThis part of the city works best without a plan. Walk, get lost, and let the atmosphere guide your direction.',
              photo: ElRavalImage,
              recommendations: 'Avoid main streets. Turn into smaller ones even if they look less inviting. If you feel slightly unsure, you\'re probably in the right place. Stop when something catches your eye — not when a map tells you to.',
              category: null,
              interests: [],
              price_level: '',
              approx_cost: ''
            },
            {
              time: '17:30 – Sunset',
              title: 'Montjuïc Hill (Miradors & Paths)',
              address: 'Barcelona',
              description: 'Montjuïc offers space — something Barcelona rarely gives easily.\n\nUp here, the city feels quieter and more distant. Paths connect viewpoints, gardens, and unexpected corners where people sit alone or in silence.\n\nThis is a good place to slow down after a long day and let Barcelona settle rather than rush into the evening.',
              photo: MontjuicImage,
              recommendations: 'Skip the most obvious viewpoints and keep walking until there are fewer people. Bring water, sit on a wall, and watch the light change. This moment doesn\'t need a photo — it works better when you stay present.',
              category: null,
              interests: [],
              price_level: '',
              approx_cost: ''
            }
          ]
        };
        break;
      default:
        defaultContent = {};
    }

    // Create block in database immediately with default content
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        alert('Please log in to create blocks');
        setShowBlockSelector(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tourId: currentTourId,
          blockType: blockType,
          orderIndex: maxOrder + 1,
          content: defaultContent
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Create block error:', errorData, 'Status:', response.status);
        alert(errorData.error || `Failed to create block (${response.status})`);
        setShowBlockSelector(false);
        return;
      }

      const data = await response.json();
      
      if (data.success && data.block) {
        // Add new block to local state immediately
        setBlocks(prev => [...prev, data.block].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
        
        // Close selector - block appears on frontend with default content
        setShowBlockSelector(false);
        
        // Don't open editor - user can click "Edit" if they want to edit
      } else {
        alert(data.error || 'Failed to create block');
        setShowBlockSelector(false);
      }
    } catch (error) {
      console.error('Error creating block:', error);
      alert('Error creating block. Please try again.');
      setShowBlockSelector(false);
    }
  };

  const handleEditBlock = (block) => {
    setEditingBlock(block);
  };

  const handleSaveBlock = async (updatedBlock) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        alert('Please log in to save blocks');
        return;
      }

      // Check if this is a new block (needs to be created)
      const isNewBlock = updatedBlock.isNew || updatedBlock.id?.startsWith('temp-');
      
      // Get tourId from block or state
      const blockTourId = updatedBlock.tourId || updatedBlock.tour_id || tourId;
      
      if (isNewBlock && !blockTourId) {
        alert('Tour ID is required to create a block. Please save the tour first.');
        return;
      }
      
      let response;
      if (isNewBlock) {
        // Create new block
        response = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tourId: blockTourId,
            blockType: updatedBlock.block_type,
            orderIndex: updatedBlock.order_index,
            content: updatedBlock.content
          })
        });
      } else {
        // Update existing block
        response = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            blockId: updatedBlock.id,
            content: updatedBlock.content,
            orderIndex: updatedBlock.order_index
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Save block error:', errorData, 'Status:', response.status);
        alert(errorData.error || `Failed to save block (${response.status})`);
        return;
      }

      const data = await response.json();
      
      if (data.success && data.block) {
        if (isNewBlock) {
          // Add new block to local state
          setBlocks(prev => [...prev, data.block].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
        } else {
          // Update existing block in local state
          // Use updatedBlock content if server response doesn't have the latest content
          const finalBlock = data.block.content?.mainLocation 
            ? data.block 
            : { ...data.block, content: updatedBlock.content };
          
          setBlocks(prev => 
            prev.map(b => b.id === updatedBlock.id ? finalBlock : b)
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          );
        }
        setEditingBlock(null);
      } else {
        alert(data.error || 'Failed to save block');
      }
    } catch (error) {
      console.error('Error saving block:', error);
      alert('Error saving block. Please try again.');
    }
  };

  const handleDeleteBlock = async (blockId) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        alert('Please log in to delete blocks');
        return;
      }

      // Send blockId as query parameter, not in body
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks?blockId=${blockId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        // Remove block from local state
        setBlocks(prev => prev.filter(b => b.id !== blockId));
        setEditingBlock(null);
      } else {
        alert(data.error || 'Failed to delete block');
      }
    } catch (error) {
      console.error('Error deleting block:', error);
      alert('Error deleting block. Please try again.');
    }
  };

  const handleSwitchLocation = async (updatedBlock) => {
    console.log('handleSwitchLocation called with:', updatedBlock);
    
    // Save the original block for potential rollback
    const originalBlock = blocks.find(b => b.id === updatedBlock.id);
    
    // Update the block content when switching main and alternative locations
    // First update local state immediately for instant UI feedback
    setBlocks(prev => {
      const updated = prev.map(b => 
        b.id === updatedBlock.id ? updatedBlock : b
      );
      console.log('Updated blocks state:', updated.find(b => b.id === updatedBlock.id));
      return updated;
    });
    
    // Then save to database
    try {
      await handleSaveBlock(updatedBlock);
    } catch (error) {
      console.error('Error saving location switch:', error);
      // Revert state on error
      if (originalBlock) {
        setBlocks(prev => prev.map(b => 
          b.id === updatedBlock.id ? originalBlock : b
        ));
      }
    }
  };

  const handleMoveBlock = async (blockId, direction) => {
    console.log('Moving block:', blockId, direction);
    
    const currentIndex = blocks.findIndex(b => b.id === blockId);
    if (currentIndex === -1) return;

    let targetIndex;
    if (direction === 'up') {
      if (currentIndex === 0) return; // Already at top
      targetIndex = currentIndex - 1;
    } else {
      if (currentIndex === blocks.length - 1) return; // Already at bottom
      targetIndex = currentIndex + 1;
    }

    const currentBlock = blocks[currentIndex];
    const targetBlock = blocks[targetIndex];

    // Swap order_index values
    const currentOrder = currentBlock.order_index;
    const targetOrder = targetBlock.order_index;

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        alert('Please log in to move blocks');
        return;
      }

      // Update both blocks via API
      const [response1, response2] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            blockId: currentBlock.id,
            content: currentBlock.content,
            orderIndex: targetOrder
          })
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            blockId: targetBlock.id,
            content: targetBlock.content,
            orderIndex: currentOrder
          })
        })
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      if (data1.success && data2.success && data1.block && data2.block) {
        // Update local state with swapped blocks
        setBlocks(prev => {
          const newBlocks = [...prev];
          newBlocks[currentIndex] = data1.block;
          newBlocks[targetIndex] = data2.block;
          return newBlocks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        });
      } else {
        alert('Failed to move block. Please try again.');
      }
    } catch (error) {
      console.error('Error moving block:', error);
      alert('Error moving block. Please try again.');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        width: '100%',
        margin: 0,
        padding: 0
      }}>
        <div style={{
          maxWidth: '100%',
          width: '100%',
          margin: '0 auto',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img 
              src={FlipTripLogo} 
              alt="FlipTrip" 
              style={{ height: '40px', cursor: 'pointer' }}
              onClick={() => navigate('/')}
            />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
              Visualizer
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ color: '#374151', fontSize: '16px', fontWeight: '500' }}>
              {user?.name || 'User'}
            </span>
            <button
              onClick={handleBackToDashboard}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Hero Block - Preview Image with Title */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '300px',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '32px',
          backgroundColor: '#4b5563',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: '20px 30px'
        }}>
          {/* Background image with overlay */}
          {tourInfo.preview && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${tourInfo.preview})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              zIndex: 0
            }} />
          )}
          {/* Gradient overlay - black at top, transparent in middle */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: tourInfo.preview 
              ? 'linear-gradient(to bottom, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.3), transparent)'
              : 'linear-gradient(to bottom, #4b5563, #d1d5db)',
            zIndex: 1
          }} />
          {/* Title overlay - top left aligned */}
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
            {tourInfo.title || 'Lorem ipsum dolor conta me more upsi colora'}
          </div>
          
          {/* Edit block button */}
          <button
            onClick={() => setShowTourEditor(true)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '8px 14px',
              backgroundColor: '#fbbf24',
              color: '#111827',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              zIndex: 2,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f59e0b'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#fbbf24'}
          >
            Edit block
          </button>

          {/* Download PDF button - increased by 15% */}
          <button
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
        </div>

        {/* Tags placeholder */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '30px',
          marginTop: '-10px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#FFE7CE',
            color: '#111827',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: '500'
          }}>
            {tourInfo.city || 'City'}
          </div>
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#CFF2FF',
            color: '#111827',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: '500'
          }}>
            Dates
          </div>
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#CFFFE1',
            color: '#111827',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: '500'
          }}>
            Budget
          </div>
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#FFCFCF',
            color: '#111827',
            borderRadius: '24px',
            fontSize: '15px',
            fontWeight: '500'
          }}>
            Interests
          </div>
        </div>

        {/* From author block */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid #D0D0D0',
          marginBottom: '40px',
          marginTop: '-10px'
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '24px', 
            alignItems: 'flex-start',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              flexShrink: 0, 
              minWidth: isMobile ? '100%' : '120px',
              width: isMobile ? '100%' : 'auto'
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
                {(guideProfile?.avatar || user?.avatar) ? (
                  <img src={guideProfile?.avatar || user?.avatar} alt="Author" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                Tour created{'\n'}by <strong style={{ color: '#111827', fontWeight: '600' }}>{guideProfile?.name || user?.name || 'Author'}</strong>
              </p>
            </div>
            <div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '500', 
                marginBottom: '16px', 
                color: '#111827',
                marginTop: 0,
                textAlign: isMobile ? 'center' : 'left'
              }}>
                A note from the author
              </h3>
              <div>
                {(() => {
                  const text = tourInfo.description || 'I return to Barcelona not for landmarks, but for its rhythm. The way the city lives between meals, walks, and pauses. I made this guide for moments when you don\'t want to impress yourself with how much you\'ve seen. When you want the city to feel human, readable, and calm.\n\nThese are the places and routes I choose when I want Barcelona to feel like a place I\'m living in — not passing through.';
                  
                  // Check if text is likely to be more than 5 lines
                  // Count lines by splitting on newlines and estimating chars per line
                  // With line-height 1.7 and font-size 15px, approximate 80-100 chars per line
                  // Account for newlines - each \n adds a line
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
                          whiteSpace: 'pre-line'
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
                          whiteSpace: 'pre-line'
                        }}>
                          {text}
                        </p>
                      )}
                      {shouldShowButton && (
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
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Content Blocks - Appear after author block */}
        {blocks.map((block, index) => (
          <div 
            key={block.id} 
            style={{ marginBottom: '54px', position: 'relative' }}
            onMouseEnter={(e) => {
              const controls = e.currentTarget.querySelector('.block-controls');
              if (controls) controls.style.display = 'flex';
            }}
            onMouseLeave={(e) => {
              const controls = e.currentTarget.querySelector('.block-controls');
              if (controls) controls.style.display = 'none';
            }}
          >
            {/* Render Block */}
            <BlockRenderer 
              block={block} 
              onEdit={() => handleEditBlock(block)} 
              onSwitchLocation={handleSwitchLocation}
            />
            
            {/* Block Controls - Only visible on hover, positioned at top right */}
            <div 
              className="block-controls"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                zIndex: 10,
                display: 'none',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                backgroundColor: 'white',
                padding: '8px',
                borderRadius: '10px',
                boxShadow: '0px 1px 19px 0px rgba(0, 0, 0, 0.21)'
              }}
            >
              <button
                onClick={() => handleMoveBlock(block.id, 'up')}
                disabled={index === 0}
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: index === 0 ? '#e5e7eb' : '#3E85FC',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  opacity: index === 0 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => handleMoveBlock(block.id, 'down')}
                disabled={index === blocks.length - 1}
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: index === blocks.length - 1 ? '#e5e7eb' : '#3E85FC',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: index === blocks.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  opacity: index === blocks.length - 1 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                title="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => handleEditBlock(block)}
                style={{
                  width: '80px',
                  height: '30px',
                  backgroundColor: '#FFDD00',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                title="Edit block"
              >
                Edit block
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this block?')) {
                    handleDeleteBlock(block.id);
                  }
                }}
                style={{
                  width: '80px',
                  height: '30px',
                  backgroundColor: '#F66969',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                title="Delete block"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Spacer to prevent content from being hidden behind fixed bottom panel */}
        <div style={{ height: isTourSettingsCollapsed ? '120px' : '80vh' }} />
      </div>

      {/* Fixed Bottom Panel - Action buttons and Tour Settings */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* White button panel - 65px height */}
        <div style={{
          width: '100%',
          height: '65px',
          backgroundColor: 'white',
          boxShadow: '0px -20px 18.4px 0px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center'
        }}>
          {/* Inner container matching content width */}
          <div style={{
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            {/* Add New Block button - left aligned */}
            <button
              onClick={() => setShowBlockSelector(true)}
              style={{
                width: '145px',
                height: '40px',
                backgroundColor: '#FFDD00',
                color: '#111827',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f59e0b';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#FFDD00';
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1 }}>+</span>
              Add New Block
            </button>

            {/* Right side buttons */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {/* Save as Draft button */}
              <button
                onClick={handleSaveAsDraft}
                disabled={!isHeaderValid()}
                style={{
                  width: '105px',
                  height: '40px',
                  backgroundColor: '#E9EBEF',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isHeaderValid() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  opacity: isHeaderValid() ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  if (isHeaderValid() && !e.target.disabled) {
                    e.target.style.backgroundColor = '#d1d5db';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isHeaderValid() && !e.target.disabled) {
                    e.target.style.backgroundColor = '#E9EBEF';
                  }
                }}
                title={!isHeaderValid() ? 'Please fill in City, Title, Description, and Preview Photo' : ''}
              >
                Save as Draft
              </button>

              {/* Submit for Moderation button - opens settings */}
              <button
                onClick={() => setIsTourSettingsCollapsed(!isTourSettingsCollapsed)}
                style={{
                  width: '185px',
                  height: '40px',
                  backgroundColor: 'white',
                  color: '#111827',
                  border: '1px solid #D5D7DC',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                }}
              >
                Submit for Moderation
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {isTourSettingsCollapsed ? '▼' : '▲'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Tour Settings Block - Collapsible */}
        {!isTourSettingsCollapsed && (
          <div style={{
            backgroundColor: 'white',
            padding: '24px 0',
            maxHeight: 'calc(80vh - 65px)',
            overflowY: 'auto'
          }}>
            {/* Inner container with maxWidth ~700px */}
            <div style={{
              maxWidth: '700px',
              width: '100%',
              margin: '0 auto',
              padding: '0 20px'
            }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Tour Settings
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  Complete the settings to submit your tour for moderation. Review takes up to 24 hours.
                </p>
              </div>

              {/* Tour Format & Pricing Section */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500', fontSize: '16px' }}>
                  Tour Format & Pricing
                </label>
                
                {/* Self-guided Tour (Optional Checkbox) */}
                <div style={{
                  padding: '16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  backgroundColor: tourSettings.selfGuided ? '#f0fdf4' : '#f9fafb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={tourSettings.selfGuided || false}
                      onChange={(e) => {
                        setTourSettings(prev => ({
                          ...prev,
                          selfGuided: e.target.checked
                        }));
                      }}
                      style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <strong style={{ fontSize: '16px' }}>Self-guided Tour (PDF)</strong>
                  </div>
                  {tourSettings.selfGuided && (
                    <div style={{ marginLeft: '26px', color: '#6b7280', fontSize: '14px' }}>
                      Fixed price: <strong style={{ color: '#059669' }}>${tourSettings.price.pdfPrice || 16}</strong>
                      <br />
                      <span style={{ fontSize: '12px' }}>Travelers can download the PDF route and explore independently</span>
                    </div>
                  )}
                </div>

                {/* Guided Tour Format (Optional Checkbox) */}
                <div style={{
                  padding: '16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  backgroundColor: tourSettings.withGuide ? '#eff6ff' : '#f9fafb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={tourSettings.withGuide || false}
                      onChange={(e) => {
                        setTourSettings(prev => ({
                          ...prev,
                          withGuide: e.target.checked
                        }));
                      }}
                      style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <strong style={{ fontSize: '16px' }}>With Guide (Optional)</strong>
                  </div>
                  <div style={{ marginLeft: '26px', color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>
                    Check this if you're ready to accompany travelers on this tour
                  </div>
                  
                  {tourSettings.withGuide && (
                    <div style={{ marginLeft: '26px', marginTop: '12px' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                          Your Price (USD) *
                        </label>
                        <input
                          type="number"
                          value={tourSettings.price.guidedPrice || ''}
                          onChange={(e) => setTourSettings(prev => ({
                            ...prev,
                            price: { ...prev.price, guidedPrice: parseFloat(e.target.value) || 0 }
                          }))}
                          min="0"
                          step="0.01"
                          required={tourSettings.withGuide}
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
                          value={tourSettings.price.meetingPoint || ''}
                          onChange={(e) => setTourSettings(prev => ({
                            ...prev,
                            price: { ...prev.price, meetingPoint: e.target.value }
                          }))}
                          required={tourSettings.withGuide}
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
                          value={tourSettings.price.meetingTime || ''}
                          onChange={(e) => setTourSettings(prev => ({
                            ...prev,
                            price: { ...prev.price, meetingTime: e.target.value }
                          }))}
                          required={tourSettings.withGuide}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      {/* Availability Calendar - Inline */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                          Manage Available Dates *
                        </label>
                        <div style={{
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          padding: '12px',
                          backgroundColor: '#f9fafb'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <button
                              type="button"
                              onClick={() => setAvailabilityCalendarMonth(prev => {
                                if (prev === 0) {
                                  setAvailabilityCalendarYear(year => year - 1);
                                  return 11;
                                }
                                return prev - 1;
                              })}
                              style={{
                                padding: '4px 12px',
                                backgroundColor: '#e5e7eb',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              ←
                            </button>
                            <span style={{ fontSize: '16px', fontWeight: '600' }}>
                              {MONTHS[availabilityCalendarMonth]} {availabilityCalendarYear}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAvailabilityCalendarMonth(prev => {
                                if (prev === 11) {
                                  setAvailabilityCalendarYear(year => year + 1);
                                  return 0;
                                }
                                return prev + 1;
                              })}
                              style={{
                                padding: '4px 12px',
                                backgroundColor: '#e5e7eb',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              →
                            </button>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '4px',
                            marginBottom: '8px'
                          }}>
                            {WEEKDAYS.map((day, index) => (
                              <div key={index} style={{
                                textAlign: 'center',
                                fontSize: '12px',
                                fontWeight: '500',
                                color: '#6b7280'
                              }}>
                                {day}
                              </div>
                            ))}
                          </div>

                          {availabilityLoading ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                              Loading...
                            </div>
                          ) : (
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(7, 1fr)',
                              gap: '4px'
                            }}>
                              {(() => {
                                const days = [];
                                const daysInMonth = getDaysInMonth(availabilityCalendarMonth, availabilityCalendarYear);
                                const firstDay = getFirstDayOfMonth(availabilityCalendarMonth, availabilityCalendarYear);

                                for (let i = 0; i < firstDay; i++) {
                                  days.push(null);
                                }

                                for (let day = 1; day <= daysInMonth; day++) {
                                  const date = new Date(availabilityCalendarYear, availabilityCalendarMonth, day);
                                  days.push(date);
                                }

                                return days.map((date, index) => {
                                  if (!date) {
                                    return <div key={index} style={{ aspectRatio: '1', padding: '4px' }}></div>;
                                  }

                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const isPast = date < today;
                                  const dateStr = formatDateStr(date);
                                  const isAvailable = isDateInAvailableDates(date) || isDateInSlots(date);
                                  const isBlocked = isDateBlocked(date);
                                  const isSelected = isDateSelected(date);

                                  let backgroundColor = '#ffffff';
                                  let color = '#111827';
                                  let cursor = 'pointer';

                                  if (isPast) {
                                    backgroundColor = '#f3f4f6';
                                    color = '#9ca3af';
                                    cursor = 'not-allowed';
                                  } else if (isSelected) {
                                    backgroundColor = '#3b82f6';
                                    color = 'white';
                                  } else if (isBlocked) {
                                    backgroundColor = '#fee2e2';
                                    color = '#991b1b';
                                  } else if (isAvailable) {
                                    backgroundColor = '#d1fae5';
                                    color = '#065f46';
                                  }

                                  return (
                                    <div
                                      key={index}
                                      onClick={() => !isPast && handleCalendarDateClick(date.getDate())}
                                      style={{
                                        aspectRatio: '1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor,
                                        color,
                                        borderRadius: '4px',
                                        cursor: isPast ? 'not-allowed' : cursor,
                                        fontWeight: '500',
                                        transition: 'background-color 0.2s'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isPast && !isSelected && !isBlocked) {
                                          e.target.style.backgroundColor = isAvailable ? '#a7f3d0' : '#e0e7ff';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isPast && !isSelected && !isBlocked) {
                                          e.target.style.backgroundColor = isAvailable ? '#d1fae5' : '#ffffff';
                                        }
                                      }}
                                    >
                                      {date.getDate()}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={handleMarkDatesAsAvailable}
                              disabled={selectedCalendarDates.length === 0 || availabilityLoading}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                opacity: selectedCalendarDates.length === 0 || availabilityLoading ? 0.6 : 1
                              }}
                            >
                              Mark as Available
                            </button>
                            <button
                              type="button"
                              onClick={handleBlockDates}
                              disabled={selectedCalendarDates.length === 0 || availabilityLoading}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                opacity: selectedCalendarDates.length === 0 || availabilityLoading ? 0.6 : 1
                              }}
                            >
                              Block Dates
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedCalendarDates([])}
                              disabled={selectedCalendarDates.length === 0}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                opacity: selectedCalendarDates.length === 0 ? 0.6 : 1
                              }}
                            >
                              Clear Selection
                            </button>
                          </div>

                          {(tourSettings.price.availableDates && tourSettings.price.availableDates.length > 0) && (
                            <div style={{ marginTop: '12px' }}>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                                Available dates ({tourSettings.price.availableDates.length}):
                              </div>
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px'
                              }}>
                                {tourSettings.price.availableDates.map((dateStr, idx) => (
                                  <span key={idx} style={{
                                    backgroundColor: '#e0e7ff',
                                    color: '#3b82f6',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                  }}>
                                    {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit for Moderation Button */}
              <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={handleSubmitForModeration}
                  disabled={!isHeaderValid() || !isTourSettingsValid()}
                  style={{
                    width: '100%',
                    padding: '14px 28px',
                    backgroundColor: (isHeaderValid() && isTourSettingsValid()) ? '#4ade80' : '#d1d5db',
                    color: (isHeaderValid() && isTourSettingsValid()) ? '#111827' : '#9ca3af',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: (isHeaderValid() && isTourSettingsValid()) ? 'pointer' : 'not-allowed',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    opacity: (isHeaderValid() && isTourSettingsValid()) ? 1 : 0.6
                  }}
                  onMouseEnter={(e) => {
                    if (isHeaderValid() && isTourSettingsValid() && !e.target.disabled) {
                      e.target.style.backgroundColor = '#22c55e';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isHeaderValid() && isTourSettingsValid() && !e.target.disabled) {
                      e.target.style.backgroundColor = '#4ade80';
                    }
                  }}
                  title={!isHeaderValid() ? 'Please fill in City, Title, Description, and Preview Photo' : (!isTourSettingsValid() ? 'Please select at least one tour format (Self-guided or With Guide)' : '')}
                >
                  Submit for Moderation
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Block Selector Modal */}
      {showBlockSelector && (
        <BlockSelectorModal
          onClose={() => setShowBlockSelector(false)}
          onSelect={handleAddBlock}
        />
      )}

      {/* Tour Editor Modal */}
      {showTourEditor && (
        <TourEditorModal
          tourInfo={tourInfo}
          onClose={() => setShowTourEditor(false)}
          onSave={handleSaveTour}
          onChange={setTourInfo}
          onImageUpload={handleImageUpload}
          cities={cities}
          citySuggestions={citySuggestions}
          showCitySuggestions={showCitySuggestions}
          setCitySuggestions={setCitySuggestions}
          setShowCitySuggestions={setShowCitySuggestions}
        />
      )}

      {/* Block Editor Modal */}
      {editingBlock && (
        <BlockEditorModal
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSave={handleSaveBlock}
          onDelete={handleDeleteBlock}
          onImageUpload={handleImageUpload}
          onOpenLocationSelector={() => setShowLocationSelector(true)}
        />
      )}

      {/* Image Crop Modal */}
      {showImageCrop && imageToCrop && (
        <ImageCropModal
          imageSrc={imageToCrop}
          onClose={() => {
            setShowImageCrop(false);
            setImageToCrop(null);
          }}
          onCrop={(croppedImage) => {
            setTourInfo({ ...tourInfo, preview: croppedImage });
            setShowImageCrop(false);
            setImageToCrop(null);
          }}
        />
      )}

      {/* Google Maps Location Selector Modal */}
      <GoogleMapsLocationSelector
        isOpen={showLocationSelector}
        onClose={() => setShowLocationSelector(false)}
        onSelectLocation={(locationData) => {
          // Auto-fill location fields with selected place data
          if (editingBlock && editingBlock.block_type === 'location') {
            // Get current content from editingBlock
            const currentContent = editingBlock.content || {};
            const editingLocationIndex = editingBlock.editingLocationIndex;
            
            if (editingLocationIndex === null) {
              // Updating main location
              const updatedContent = {
                ...currentContent,
                mainLocation: {
                  ...currentContent.mainLocation,
                  title: locationData.title,
                  address: locationData.address,
                  price_level: locationData.price_level || '',
                  approx_cost: locationData.approximate_cost || '',
                  photo: locationData.photo || currentContent.mainLocation?.photo,
                  rating: locationData.rating || null
                }
              };
              setEditingBlock({ ...editingBlock, content: updatedContent });
            } else {
              // Updating alternative location
              const alternativeLocations = [...(currentContent.alternativeLocations || [])];
              alternativeLocations[editingLocationIndex] = {
                ...alternativeLocations[editingLocationIndex],
                title: locationData.title,
                address: locationData.address,
                price_level: locationData.price_level || '',
                approx_cost: locationData.approximate_cost || '',
                photo: locationData.photo || alternativeLocations[editingLocationIndex]?.photo,
                rating: locationData.rating || null
              };
              const updatedContent = {
                ...currentContent,
                alternativeLocations
              };
              setEditingBlock({ ...editingBlock, content: updatedContent });
            }
          }
        }}
        city={tourInfo.city}
      />
    </div>
  );
}

// Image Crop Modal Component - Photo stretches to width, can move up/down
function ImageCropModal({ imageSrc, onClose, onCrop }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [imagePosition, setImagePosition] = useState(0); // Vertical offset for image
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDisplayHeight, setImageDisplayHeight] = useState(0);
  const containerHeight = 400;

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      handleImageLoad();
    }
  }, []);

  const handleImageLoad = () => {
    const img = imageRef.current;
    if (img) {
      const container = containerRef.current;
      const containerWidth = container ? container.offsetWidth - 40 : 600;
      
      // Calculate image dimensions to fill width
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const displayHeight = containerWidth * aspectRatio;
      
      setImageDisplayHeight(displayHeight);
      // Center image vertically initially
      setImagePosition(Math.max(0, (displayHeight - containerHeight) / 2));
      setImageLoaded(true);
    }
  };

  const handleMouseDown = (e) => {
    if (!imageLoaded) return;
    setIsDragging(true);
    setDragStart(e.clientY);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !imageLoaded) return;
    const deltaY = e.clientY - dragStart;
    const newPosition = imagePosition - deltaY;
    
    // Constrain to image bounds
    const maxPosition = Math.max(0, imageDisplayHeight - containerHeight);
    setImagePosition(Math.max(0, Math.min(newPosition, maxPosition)));
    setDragStart(e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    
    const container = containerRef.current;
    const containerWidth = container ? container.offsetWidth - 40 : 600;
    
    // Calculate crop coordinates in original image
    const scaleX = img.naturalWidth / containerWidth;
    const scaleY = img.naturalHeight / imageDisplayHeight;
    
    const cropX = 0;
    const cropY = imagePosition * scaleY;
    const cropWidth = img.naturalWidth;
    const cropHeight = containerHeight * scaleY;
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    
    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
    onCrop(croppedBase64);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Adjust Image Position</h2>
          <button onClick={onClose} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: `${containerHeight}px`,
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '20px',
            padding: '20px',
            boxSizing: 'border-box',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {imageLoaded && (
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop"
              onLoad={handleImageLoad}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                transform: `translateY(-${imagePosition}px)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            />
          )}
          {!imageLoaded && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6b7280'
            }}>
              Loading image...
            </div>
          )}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '20px',
            right: '20px',
            bottom: 0,
            border: '2px solid #3b82f6',
            pointerEvents: 'none',
            boxSizing: 'border-box'
          }} />
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none'
          }}>
            Drag up/down to adjust visible area
          </div>
        </div>
        
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            disabled={!imageLoaded}
            style={{
              padding: '10px 20px',
              backgroundColor: imageLoaded ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: imageLoaded ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}

// Placeholder components - will be implemented next
function BlockSelectorModal({ onClose, onSelect }) {
  const blockTypes = [
    { type: 'location', label: 'Location', icon: LocationIcon },
    { type: 'title', label: 'Title', icon: TitleIcon },
    { type: 'photo_text', label: 'Photo + Text', icon: PhotoTextIcon },
    { type: 'text', label: 'Text Block', icon: TextBlockIcon },
    { type: 'slide', label: 'Slide type', icon: SlideTypeIcon },
    { type: '3columns', label: '3 columns', icon: ThreeColumnsIcon },
    { type: 'photo', label: 'Photo', icon: PhotoIcon },
    { type: 'divider', label: 'Divider', icon: DividerIcon }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      zIndex: 1000
    }}
    onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#F0F1F3',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          padding: '24px',
          width: '100%',
          maxWidth: '100%',
          maxHeight: '70vh',
          overflowY: 'auto',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>Add block</h2>
          <button 
            onClick={onClose} 
            style={{ 
              fontSize: '24px', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px 8px'
            }}
          >
            ×
          </button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '16px'
        }}>
          {blockTypes.map(block => (
            <img
              key={block.type}
              src={block.icon}
              alt={block.label}
              onClick={() => onSelect(block.type)}
              style={{
                width: '100%',
                height: 'auto',
                cursor: 'pointer',
                borderRadius: '12px',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Shared hints for all modals
const hints = {
  city: 'Start typing the city name and select it from the list.\n\nIf your city doesn\'t appear, simply type it in manually.',
  tripName: 'Choose a short, meaningful title that reflects the idea of your tour, not a list of places.\n\nAim for 3–6 words. Avoid generic phrases like "Best of" or "Top places".\nA good title sets the mood and makes people want to open the tour.',
  previewPhoto: 'Use a high-quality image that captures the essence of your tour.\n\nThis photo should communicate the feeling of the experience at a glance — not just a landmark.\nAvoid blurry images, heavy filters, or screenshots.',
  noteFromAuthor: 'Introduce yourself and explain why you created this tour.\n\nShare your personal connection to the city or route, and what kind of experience you\'re offering.\nThis is not a biography — it\'s a short, honest note that helps people trust you and want to live the journey you\'re proposing.',
  textBlock: 'Use this block to set the mood of the tour and explain how it should be experienced.\n\nWrite freely, in a personal tone. Share an observation, a feeling, or a way of moving through the city. This is not a place for locations or instructions, it\'s where you help the reader slow down, trust the route, and understand your rhythm.',
  timeForLocation: 'This field was designed for building a day schedule, but it\'s optional.\n\nYou can add a time range, write something personal (like "Morning" or "Before sunset"), or leave it empty — if left blank, it won\'t appear in the tour.',
  locationName: 'Choose a place you personally know and would recommend to someone to feel the city.\n\nIt doesn\'t have to be famous — it just needs to fit the rhythm of your route.',
  locationDescription: 'Describe the place as you experience it.\n\nExplain why it matters in your route and what kind of moment it creates.\nAvoid factual descriptions — focus on atmosphere, rhythm, and feeling.',
  locationPhoto: 'Add a photo that naturally represents this place.\n\nIt doesn\'t need to be perfect, but it should help the reader imagine being there.',
  locationRecommendation: 'Share a small secret, habit, or personal tip.\n\nSomething you\'d tell a friend — where to sit, what to skip, how to stay longer, or when to leave.',
  categoryOfInterests: 'Select the categories that best describe this location.\n\nThis helps users discover your tour based on what they enjoy and how they travel.',
  photoText: 'Use this block to combine an image and a short reflection.'
};

// Shared HintButton component for all modals
function HintButton({ hintKey }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    
    const handleMouseEnter = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setTooltipPosition({
          top: rect.bottom + 8,
          left: rect.left + rect.width / 2
        });
      }
      setShowTooltip(true);
    };
    
    return (
      <>
        <div style={{ position: 'relative', display: 'inline-block', marginLeft: '8px' }}>
          <button
            ref={buttonRef}
            type="button"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setShowTooltip(false)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            Hint
          </button>
        </div>
        {showTooltip && (
          <div
            style={{
              position: 'fixed',
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              transform: 'translateX(-50%)',
              padding: '12px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 10000,
              minWidth: '280px',
              maxWidth: '320px',
              whiteSpace: 'pre-line',
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#374151',
              pointerEvents: 'none'
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            {hints[hintKey]}
            <div
              style={{
                position: 'absolute',
                top: '-6px',
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: '12px',
                height: '12px',
                backgroundColor: 'white',
                borderLeft: '1px solid #d1d5db',
                borderTop: '1px solid #d1d5db'
              }}
            />
          </div>
        )}
      </>
    );
}

function TourEditorModal({ tourInfo, onClose, onSave, onChange, onImageUpload, cities = [], citySuggestions = [], showCitySuggestions = false, setCitySuggestions, setShowCitySuggestions }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Edit tour</h2>
          <button onClick={onClose} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        
        <div style={{ marginBottom: '20px', position: 'relative' }} className="city-autocomplete-container">
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
            City *
            <HintButton hintKey="city" />
          </label>
          <input
            type="text"
            value={tourInfo.city}
            onChange={(e) => {
              const value = e.target.value;
              onChange({ ...tourInfo, city: value });
              
              // Show suggestions
              if (value.length > 1 && cities && Array.isArray(cities)) {
                const filtered = cities.filter(c => 
                  c.name.toLowerCase().includes(value.toLowerCase())
                );
                if (setCitySuggestions) setCitySuggestions(filtered);
                if (setShowCitySuggestions) setShowCitySuggestions(filtered.length > 0);
              } else {
                if (setCitySuggestions) setCitySuggestions([]);
                if (setShowCitySuggestions) setShowCitySuggestions(false);
              }
            }}
            onFocus={(e) => {
              if (e.target.value.length > 1 && citySuggestions && citySuggestions.length > 0 && setShowCitySuggestions) {
                setShowCitySuggestions(true);
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
          {showCitySuggestions && citySuggestions.length > 0 && (
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
              {citySuggestions.map((city, index) => (
                <div
                  key={city.id || index}
                  onClick={() => {
                    onChange({ ...tourInfo, city: city.name });
                    if (setCitySuggestions) setCitySuggestions([]);
                    if (setShowCitySuggestions) setShowCitySuggestions(false);
                  }}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: index < citySuggestions.length - 1 ? '1px solid #e5e7eb' : 'none'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  {city.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
            Trip name *
            <HintButton hintKey="tripName" />
          </label>
          <input
            type="text"
            value={tourInfo.title}
            onChange={(e) => onChange({ ...tourInfo, title: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
            Preview Photo *
            <HintButton hintKey="previewPhoto" />
          </label>
          <div style={{
            width: '100%',
            height: '200px',
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
            backgroundColor: '#f9fafb'
          }}>
            {tourInfo.preview ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img 
                  src={tourInfo.preview} 
                  alt="Preview" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }} 
                />
                <button
                  onClick={() => {
                    setImageToCrop(tourInfo.preview);
                    setShowImageCrop(true);
                  }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    padding: '6px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Adjust
                </button>
              </div>
            ) : (
              <span style={{ color: '#6b7280' }}>No photo selected</span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file && onImageUpload) {
                onImageUpload(file, (base64) => {
                  onChange({ ...tourInfo, preview: base64 });
                });
              }
            }}
            style={{ display: 'none' }}
            id="tour-preview-upload"
          />
          <label
            htmlFor="tour-preview-upload"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Choose photo
          </label>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', margin: 0 }}>
            JPG, PNG or GIF. Max size 5MB
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
            A note from the author *
            <HintButton hintKey="noteFromAuthor" />
          </label>
          <textarea
            value={tourInfo.description}
            onChange={(e) => onChange({ ...tourInfo, description: e.target.value })}
            rows={6}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Close
          </button>
          <button
            onClick={onSave}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function BlockEditorModal({ block, onClose, onSave, onDelete, onImageUpload, onOpenLocationSelector }) {
  // Helper function to normalize content
  const normalizeContent = (contentToNormalize) => {
    if (!contentToNormalize || Object.keys(contentToNormalize).length === 0) {
      // Return default content based on block type
      if (block.block_type === 'location') {
        return {
          mainLocation: {
            time: '09:00 - 12:00',
            title: '',
            address: '',
            description: '',
            photo: null,
            recommendations: '',
            category: null,
            interests: [],
            price_level: '',
            approx_cost: ''
          },
          alternativeLocations: []
        };
      }
      return {};
    }
    
    // Check if old format (for location blocks)
    const isOldFormat = !contentToNormalize.mainLocation && (contentToNormalize.title || contentToNormalize.time);
    
    if (block.block_type === 'location') {
      if (isOldFormat) {
        // Convert old format to new format
        return {
          mainLocation: contentToNormalize,
          alternativeLocations: []
        };
      }
      
      // Ensure mainLocation structure exists
      return {
        mainLocation: contentToNormalize.mainLocation || {
          time: '09:00 - 12:00',
          title: '',
          address: '',
          description: '',
          photo: null,
          recommendations: '',
          category: null,
          interests: [],
          price_level: '',
          approx_cost: ''
        },
        alternativeLocations: contentToNormalize.alternativeLocations || []
      };
    }
    
    // For other blocks, return as is
    return contentToNormalize;
  };
  
  const initialContent = block.content || {};
  const [content, setContent] = useState(() => normalizeContent(initialContent));
  
  // Update content when block changes (e.g., after save and reload)
  useEffect(() => {
    const updatedContent = normalizeContent(block.content || {});
    setContent(updatedContent);
  }, [block.id, JSON.stringify(block.content)]);
  
  const [editingLocationIndex, setEditingLocationIndex] = useState(null); // null = main, number = alternative index
  const [interestsStructure, setInterestsStructure] = useState(null);
  const [availableInterests, setAvailableInterests] = useState([]);
  const [loadingInterests, setLoadingInterests] = useState(false);

  // Initialize editingLocationIndex to null (main location) for location blocks
  useEffect(() => {
    if (block.block_type === 'location' && editingLocationIndex === null && content.mainLocation) {
      setEditingLocationIndex(null); // Start with main location
    }
  }, [block.block_type]);

  // Load interests structure for location block
  useEffect(() => {
    if (block.block_type === 'location') {
      const loadInterests = async () => {
        try {
          setLoadingInterests(true);
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://fliptripback.vercel.app';
          const response = await fetch(`${API_BASE_URL}/api/interests?full_structure=true`);
          const data = await response.json();
          if (data.success && data.categories) {
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
    }
  }, [block.block_type]);

  const handleSave = () => {
    onSave({ ...block, content });
  };

  const renderEditor = () => {
    switch (block.block_type) {
      case 'title':
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Text *
              </label>
              <input
                type="text"
                value={content.text || ''}
                onChange={(e) => setContent({ ...content, text: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Size
              </label>
              <select
                value={content.size || 'large'}
                onChange={(e) => setContent({ ...content, size: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </>
        );

      case 'text':
        const layout = content.layout || 'single';
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                Text *
                <HintButton hintKey="textBlock" />
              </label>
              
              {/* Layout Toggle */}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '16px',
                padding: '4px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                width: 'fit-content'
              }}>
                <button
                  type="button"
                  onClick={() => setContent({ ...content, layout: 'single' })}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: layout === 'single' ? '#3b82f6' : 'transparent',
                    color: layout === 'single' ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Single Column
                </button>
                <button
                  type="button"
                  onClick={() => setContent({ ...content, layout: 'two-columns' })}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: layout === 'two-columns' ? '#3b82f6' : 'transparent',
                    color: layout === 'two-columns' ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Two Columns
                </button>
              </div>

              {layout === 'single' ? (
                <TextEditor
                  value={content.text || ''}
                  onChange={(text) => setContent({ ...content, text, formatted: true })}
                  placeholder="Enter text..."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
                      First Column
                    </label>
                    <TextEditor
                      value={content.column1 || ''}
                      onChange={(text) => setContent({ ...content, column1: text, formatted: true })}
                      placeholder="Enter text for first column..."
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
                      Second Column
                    </label>
                    <TextEditor
                      value={content.column2 || ''}
                      onChange={(text) => setContent({ ...content, column2: text, formatted: true })}
                      placeholder="Enter text for second column..."
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        );

      case 'photo_text':
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                Photo
                <HintButton hintKey="photoText" />
              </label>
              <div style={{
                width: '100%',
                height: '200px',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                backgroundColor: '#f9fafb'
              }}>
                {content.photo ? (
                  <img src={content.photo} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ color: '#6b7280' }}>No photo selected</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file && onImageUpload) {
                    onImageUpload(file, (base64) => {
                      setContent({ ...content, photo: base64 });
                    });
                  }
                }}
                style={{ display: 'none' }}
                id={`photo-text-upload-${block.id}`}
              />
              <label
                htmlFor={`photo-text-upload-${block.id}`}
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Choose photo
              </label>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Text *
              </label>
              <textarea
                value={content.text || ''}
                onChange={(e) => setContent({ ...content, text: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Alignment
              </label>
              <select
                value={content.alignment || 'left'}
                onChange={(e) => setContent({ ...content, alignment: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="left">Photo Left</option>
                <option value="right">Photo Right</option>
              </select>
            </div>
          </>
        );

      case 'photo':
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Photo *
              </label>
              <div style={{
                width: '100%',
                height: '200px',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                backgroundColor: '#f9fafb'
              }}>
                {content.photo ? (
                  <img src={content.photo} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ color: '#6b7280' }}>No photo selected</span>
                )}
              </div>
              <button style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Choose photo
              </button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Caption
              </label>
              <input
                type="text"
                value={content.caption || ''}
                onChange={(e) => setContent({ ...content, caption: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="Optional caption"
              />
            </div>
          </>
        );

      case 'slide':
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Title *
              </label>
              <input
                type="text"
                value={content.title || ''}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Photo
              </label>
              <div style={{
                width: '100%',
                height: '200px',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                backgroundColor: '#f9fafb'
              }}>
                {content.photo ? (
                  <img src={content.photo} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ color: '#6b7280' }}>No photo selected</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file && onImageUpload) {
                    onImageUpload(file, (base64) => {
                      setContent({ ...content, photo: base64 });
                    });
                  }
                }}
                style={{ display: 'none' }}
                id={`slide-photo-upload-${block.id}`}
              />
              <label
                htmlFor={`slide-photo-upload-${block.id}`}
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Choose photo
              </label>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Text *
              </label>
              <textarea
                value={content.text || ''}
                onChange={(e) => setContent({ ...content, text: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </>
        );

      case '3columns':
        return (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Columns
            </label>
            {(content.columns || [
              { photo: null, text: 'Column 1 text' },
              { photo: null, text: 'Column 2 text' },
              { photo: null, text: 'Column 3 text' }
            ]).map((column, index) => (
              <div key={index} style={{ marginBottom: '20px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Column {index + 1}</h4>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    width: '100%',
                    height: '100px',
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    backgroundColor: '#f9fafb'
                  }}>
                    {column.photo ? (
                      <img src={column.photo} alt={`Column ${index + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#6b7280', fontSize: '12px' }}>No photo</span>
                    )}
                  </div>
                  <button style={{
                    padding: '6px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}>
                    Choose photo
                  </button>
                </div>
                <textarea
                  value={column.text || ''}
                  onChange={(e) => {
                    const newColumns = [...(content.columns || [])];
                    newColumns[index] = { ...newColumns[index], text: e.target.value };
                    setContent({ ...content, columns: newColumns });
                  }}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            ))}
          </div>
        );

      case 'divider':
        return (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Style
            </label>
            <select
              value={content.style || 'solid'}
              onChange={(e) => setContent({ ...content, style: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>
        );

      case 'location':
        // Determine which location is being edited (main or alternative)
        const currentLocation = editingLocationIndex === null 
          ? content.mainLocation 
          : content.alternativeLocations[editingLocationIndex];
        
        const updateCurrentLocation = (updates) => {
          if (editingLocationIndex === null) {
            // Update main location
            setContent({ ...content, mainLocation: { ...content.mainLocation, ...updates } });
          } else {
            // Update alternative location
            const newAlternatives = [...content.alternativeLocations];
            newAlternatives[editingLocationIndex] = { ...newAlternatives[editingLocationIndex], ...updates };
            setContent({ ...content, alternativeLocations: newAlternatives });
          }
        };

        const handleAddAlternativeLocation = () => {
          const newAltLocation = {
            time: '09:00 - 12:00',
            title: '',
            address: '',
            description: '',
            photo: null,
            recommendations: '',
            category: null,
            subcategory: null,
            interests: [],
            price_level: '',
            approx_cost: ''
          };
          setContent({ 
            ...content, 
            alternativeLocations: [...content.alternativeLocations, newAltLocation]
          });
          setEditingLocationIndex(content.alternativeLocations.length); // Switch to the new location
        };

        return (
          <div style={{ marginBottom: '20px' }}>
            {/* Tabs for switching between main and alternative locations */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              marginBottom: '20px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '8px'
            }}>
              <button
                type="button"
                onClick={() => setEditingLocationIndex(null)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: editingLocationIndex === null ? '#3b82f6' : 'transparent',
                  color: editingLocationIndex === null ? 'white' : '#6b7280',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: editingLocationIndex === null ? '600' : '400',
                  fontSize: '14px'
                }}
              >
                Main Location
              </button>
              {content.alternativeLocations.map((altLoc, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    position: 'relative'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setEditingLocationIndex(idx)}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      backgroundColor: editingLocationIndex === idx ? '#3b82f6' : 'transparent',
                      color: editingLocationIndex === idx ? 'white' : '#6b7280',
                      borderRadius: '8px 8px 0 0',
                      cursor: 'pointer',
                      fontWeight: editingLocationIndex === idx ? '600' : '400',
                      fontSize: '14px'
                    }}
                  >
                    Alternative {idx + 1}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newAlternatives = content.alternativeLocations.filter((_, i) => i !== idx);
                      setContent({ ...content, alternativeLocations: newAlternatives });
                      // If we deleted the currently selected alternative, switch to main location
                      if (editingLocationIndex === idx) {
                        setEditingLocationIndex(null);
                      } else if (editingLocationIndex > idx) {
                        // Adjust index if we deleted an alternative before the current one
                        setEditingLocationIndex(editingLocationIndex - 1);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '18px',
                      lineHeight: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      marginLeft: '4px'
                    }}
                    title="Delete alternative location"
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#fee2e2';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddAlternativeLocation}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  marginLeft: 'auto'
                }}
              >
                + Add Alternative Location
              </button>
            </div>

            {/* Location Editor Form */}
            {currentLocation && (
              <>
                {/* Time for location */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                    Time for location
                    <HintButton hintKey="timeForLocation" />
                  </label>
                  <input
                    type="text"
                    value={currentLocation.time || ''}
                    onChange={(e) => updateCurrentLocation({ time: e.target.value })}
                    placeholder="09:00 - 12:00 or leave empty"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Location Name and Address */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                    Location
                    <HintButton hintKey="locationName" />
                  </label>
                  <button
                    type="button"
                    onClick={() => onOpenLocationSelector && onOpenLocationSelector()}
                    style={{ 
                      color: '#3b82f6', 
                      textDecoration: 'underline',
                      fontSize: '14px',
                      marginBottom: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: 'inherit'
                    }}
                  >
                    Find on Google Maps
                  </button>
                  <input
                    type="text"
                    value={currentLocation.title || ''}
                    onChange={(e) => updateCurrentLocation({ title: e.target.value })}
                    placeholder="Location Name *"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      marginBottom: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <input
                    type="text"
                    value={currentLocation.address || ''}
                    onChange={(e) => updateCurrentLocation({ address: e.target.value })}
                    placeholder="Address *"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Add Photo of Location */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                    Photo of Location
                    <HintButton hintKey="locationPhoto" />
                  </label>
                  <div style={{
                    width: '100%',
                    aspectRatio: '1',
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                    backgroundColor: '#f9fafb',
                    overflow: 'hidden'
                  }}>
                    {currentLocation.photo ? (
                      <img 
                        src={currentLocation.photo} 
                        alt="Location preview" 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }} 
                      />
                    ) : (
                      <span style={{ color: '#6b7280' }}>No photo selected</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && onImageUpload) {
                        onImageUpload(file, (base64) => {
                          updateCurrentLocation({ photo: base64 });
                        });
                      }
                    }}
                    style={{ display: 'none' }}
                    id={`location-photo-upload-${block.id}-${editingLocationIndex === null ? 'main' : editingLocationIndex}`}
                  />
                  <label
                    htmlFor={`location-photo-upload-${block.id}-${editingLocationIndex === null ? 'main' : editingLocationIndex}`}
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '8px'
                    }}
                  >
                    Choose photo
                  </label>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    JPG, PNG or GIF. Max size 5MB. Image will be cropped to square.
                  </p>
                </div>

                {/* Location Description */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                    Location Description
                    <HintButton hintKey="locationDescription" />
                  </label>
                  <textarea
                    value={currentLocation.description || ''}
                    onChange={(e) => updateCurrentLocation({ description: e.target.value })}
                    placeholder="Describe this location..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Recommendations */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                    Recommendation
                    <HintButton hintKey="locationRecommendation" />
                  </label>
                  <textarea
                    value={currentLocation.recommendations || ''}
                    onChange={(e) => updateCurrentLocation({ recommendations: e.target.value })}
                    placeholder="Recommendations (tips, best time to visit, what to try, etc.)"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Category of interests */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                    Category of interests
                    <HintButton hintKey="categoryOfInterests" />
                  </label>
                  <select
                    value={currentLocation.category || ''}
                    onChange={(e) => {
                      const categoryId = e.target.value || null;
                      updateCurrentLocation({ 
                        category: categoryId,
                        subcategory: null, // Reset subcategory when category changes
                        interests: [] // Reset interests when category changes
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">Choose category</option>
                    {interestsStructure?.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {CATEGORY_NAMES[category.name] || category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory (if category has subcategories) */}
                {currentLocation.category && interestsStructure?.find(c => c.id === currentLocation.category)?.subcategories?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Subcategory (optional)
                    </label>
                    <select
                      value={currentLocation.subcategory || ''}
                      onChange={(e) => {
                        const subcategoryId = e.target.value || null;
                        updateCurrentLocation({ 
                          subcategory: subcategoryId,
                          interests: [] // Reset interests when subcategory changes
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">All interests in category</option>
                      {interestsStructure
                        .find(c => c.id === currentLocation.category)
                        ?.subcategories?.map(subcategory => (
                          <option key={subcategory.id} value={subcategory.id}>
                            {SUBCATEGORY_NAMES[subcategory.name] || subcategory.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Interests Selection */}
                {currentLocation.category && (() => {
                  const category = interestsStructure?.find(c => c.id === currentLocation.category);
                  if (!category) return null;
                  
                  let availableInterestsList = [];
                  if (currentLocation.subcategory) {
                    const subcategory = category.subcategories?.find(s => s.id === currentLocation.subcategory);
                    availableInterestsList = subcategory?.interests || [];
                  } else {
                    if (category.direct_interests) {
                      availableInterestsList.push(...category.direct_interests);
                    }
                    if (category.subcategories) {
                      category.subcategories.forEach(subcategory => {
                        if (subcategory.interests) {
                          availableInterestsList.push(...subcategory.interests);
                        }
                      });
                    }
                  }
                  
                  const currentInterestIds = currentLocation.interests || [];
                  const availableToAdd = availableInterestsList.filter(interest => 
                    !currentInterestIds.includes(interest.id)
                  );
                  
                  return (
                    <>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Interests
                        </label>
                        {availableToAdd.length > 0 && (
                          <select
                            onChange={(e) => {
                              const interestId = e.target.value;
                              if (interestId && !currentInterestIds.includes(interestId)) {
                                updateCurrentLocation({ 
                                  interests: [...currentInterestIds, interestId]
                                });
                              }
                              e.target.value = ''; // Reset select
                            }}
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '16px',
                              boxSizing: 'border-box',
                              backgroundColor: 'white',
                              marginBottom: '12px'
                            }}
                          >
                            <option value="">Select interests</option>
                            {availableToAdd.map(interest => (
                              <option key={interest.id} value={interest.id}>
                                {interest.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Selected interests */}
                      {currentInterestIds.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            Selected interests
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {currentInterestIds.map(interestId => {
                              const interest = availableInterests.find(i => i.id === interestId);
                              if (!interest) return null;
                              
                              const categoryForInterest = interestsStructure?.find(c => 
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
                                  {categoryForInterest?.icon} {interest.name}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateCurrentLocation({ 
                                        interests: currentInterestIds.filter(id => id !== interestId)
                                      });
                                    }}
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
                  );
                })()}

                {/* Price Level and Approximate Cost */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '14px', 
                      fontWeight: '500',
                      color: '#6b7280'
                    }}>
                      Price Level (1-4)
                    </label>
                    <select
                      value={currentLocation.price_level || ''}
                      onChange={(e) => updateCurrentLocation({ price_level: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        backgroundColor: 'white',
                        boxSizing: 'border-box'
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
                      marginBottom: '8px', 
                      fontSize: '14px', 
                      fontWeight: '500',
                      color: '#6b7280'
                    }}>
                      Approximate Cost
                    </label>
                    <input
                      type="text"
                      value={currentLocation.approx_cost || ''}
                      onChange={(e) => updateCurrentLocation({ approx_cost: e.target.value })}
                      placeholder="Approximate Cost"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        );

      default:
        return <p style={{ color: '#6b7280' }}>Editor for {block.block_type} not implemented yet</p>;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Edit block: {block.block_type}</h2>
          <button onClick={onClose} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        
        {renderEditor()}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
          <button
            onClick={() => {
              if (onDelete && confirm('Are you sure you want to delete this block?')) {
                onDelete(block.id);
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Delete
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#111827',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Close
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

