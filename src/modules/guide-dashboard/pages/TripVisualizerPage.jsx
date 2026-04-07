/**
 * Trip Visualizer Page - WYSIWYG editor for tour creation
 * Allows guides to create tours with flexible content blocks
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation, Link } from 'react-router-dom';
import { getCurrentUser } from '../../auth/services/authService';

/**
 * Block Google Places Photo API URLs to prevent billable API calls.
 * Returns null for Google URLs — a placeholder will be shown instead.
 * Photos should be cached in Supabase via the migration process.
 */
function refreshPhotoUrl(url) {
  if (!url || typeof url !== 'string') return url;
  // Google Places Photo API URLs cost ~$7/1000 loads — block them
  if (url.includes('maps.googleapis.com/maps/api/place/photo')) return null;
  return url;
}

/** Allow only in-app paths (no open redirects). Used for ?returnTo= from admin panel links. */
function isSafeVisualizerReturnPath(path) {
  if (typeof path !== 'string' || path.length === 0) return false;
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  if (path.includes('://')) return false;
  return path.startsWith('/admin') || path.startsWith('/guide');
}
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
import BarcelonaExampleImage from '../../../assets/Barcelona-example.webp';
import SantAntoniMarketImage from '../../../assets/Sant Antoni Market.webp';
import ElRavalImage from '../../../assets/El Raval Backstreets.webp';
import MontjuicImage from '../../../assets/Montjuïc Hill (Miradors & Paths).webp';
// Default block images removed — blocks now use empty placeholders
import { getTourById } from '../../../services/api';
import { getTourAvailability, updateAvailabilitySlots } from '../services/availabilityService';
import BlockRenderer from '../components/BlockRenderer';
import VisualizerSidePanel from '../components/VisualizerSidePanel';
import TextEditor from '../components/TextEditor';
import GoogleMapsLocationSelector from '../components/GoogleMapsLocationSelector';
import { DEFAULT_SELF_GUIDED_PRICE } from '../../../constants/pricing';
import { buildPdfBlobFromStyledPreviewHtml } from '../../../utils/styledTourPdfClient';
import { formatTourLastUpdatedLabel } from '../../../utils/tourLastUpdated';
import '../../../pages/ExplorePage.css';
import './GuideDashboardPage.css';

/** Same as public itinerary / Explore (ItineraryPage.css `.itinerary-container`, ExplorePage) */
const VISUALIZER_PAGE_BG = '#fcfbf9';

/** Match HomePage `.home-page-wrapper` + GuideDashboardPage.css --guide-max */
const VISUALIZER_CONTENT_MAX_WIDTH = 750;

/** Hero cover height — same as ItineraryPage `itineraryHeroSection` */
const VISUALIZER_HERO_HEIGHT = {
  desktop: '400px',
  mobile: 'calc(350px + env(safe-area-inset-top, 0px))',
};

/** First “Header” block border (design) */
const VISUALIZER_HEADER_BLOCK_BORDER = '#B9B9B9';

/** Preview strip: duration / distance / budget (draft_data.tourQuickStats) */
const DEFAULT_TOUR_QUICK_STATS = {
  durationValue: '',
  durationCaption: '',
  distanceValue: '',
  distanceCaption: '',
  budgetValue: '',
  budgetCaption: '',
};

function mergeTourQuickStats(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  return {
    durationValue: String(d.durationValue ?? ''),
    durationCaption: String(d.durationCaption ?? ''),
    distanceValue: String(d.distanceValue ?? ''),
    distanceCaption: String(d.distanceCaption ?? ''),
    budgetValue: String(d.budgetValue ?? ''),
    budgetCaption: String(d.budgetCaption ?? ''),
  };
}

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

function AnimatedProgressText({ label }) {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDotCount(prev => (prev % 3) + 1);
    }, 350);
    return () => clearInterval(intervalId);
  }, []);

  return <>{label}{'.'.repeat(dotCount)}</>;
}

/** Merge a newly created block into local state without refetching all blocks (matches server order_index shift). */
function insertBlockIntoBlocksList(prevBlocks, newBlock, insertOrderIndex) {
  const mapBlock = prevBlocks.find(b => b.block_type === 'map') || null;
  const nonMap = prevBlocks.filter(b => b.block_type !== 'map');
  const bumped = nonMap.map((b) => {
    const oi = b.order_index ?? 0;
    if (oi >= insertOrderIndex) {
      return { ...b, order_index: oi + 1 };
    }
    return b;
  });
  const combined = [...bumped, newBlock];
  const sortedNonMap = combined.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  if (!mapBlock) return sortedNonMap;
  return [...sortedNonMap, { ...mapBlock, order_index: sortedNonMap.length }].sort((a, b) => {
    if (a.block_type === 'map' && b.block_type !== 'map') return 1;
    if (b.block_type === 'map' && a.block_type !== 'map') return -1;
    return (a.order_index || 0) - (b.order_index || 0);
  });
}

export default function TripVisualizerPage() {
  const navigate = useNavigate();
  const { tourId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const visualizerPathWithQuery = useCallback(
    (id, options = {}) => {
      const params = new URLSearchParams(searchParams);
      if (options.newTour) params.set('newTour', '1');
      const q = params.toString();
      return `/guide/tours/visualizer/${id}${q ? `?${q}` : ''}`;
    },
    [searchParams]
  );
  const [user, setUser] = useState(null);
  const [guideProfile, setGuideProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tour, setTour] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingOtherTour, setIsEditingOtherTour] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [insertAfterBlockId, setInsertAfterBlockId] = useState(null); // For adding block after specific block
  const [editingBlock, setEditingBlock] = useState(null);
  const [showTourEditor, setShowTourEditor] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [layoutBusyMessage, setLayoutBusyMessage] = useState('');
  const [isRefreshingPhotos, setIsRefreshingPhotos] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingForModeration, setIsSubmittingForModeration] = useState(false);
  const [isSavingHeaderModal, setIsSavingHeaderModal] = useState(false);
  const [isSavingBlock, setIsSavingBlock] = useState(false);
  const [isDeletingBlock, setIsDeletingBlock] = useState(false);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState(null);
  const [lastSubmittedAt, setLastSubmittedAt] = useState(null);
  const [step1HintDismissed, setStep1HintDismissed] = useState(() => {
    try {
      if (!tourId) return true;
      return localStorage.getItem(`visualizer_step1_hint_${tourId}`) === '1';
    } catch {
      return false;
    }
  });

  // Show notification message for 2 seconds
  const showNotificationMessage = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      setNotificationMessage('');
    }, 2000);
  };

  // Refresh location photos (manual or auto)
  const handleRefreshPhotos = useCallback(async (force = false) => {
    if (!tourId || isRefreshingPhotos) return;
    
    // Check if any location blocks exist before calling refresh endpoint
    const locationBlocks = blocks.filter(b => b.block_type === 'location');
    if (locationBlocks.length === 0) return;
    
    const hasGooglePhotos = locationBlocks.some(b => {
      const content = b.content || {};
      const checkPhotos = (loc) => {
        if (!loc) return false;
        const photos = loc.photos || (loc.photo ? [loc.photo] : []);
        return photos.some(p => p && typeof p === 'string' && p.includes('maps.googleapis.com/maps/api/place/photo'));
      };
      return checkPhotos(content.mainLocation) || 
             (content.alternativeLocations || []).some(alt => checkPhotos(alt));
    });
    
    if (!hasGooglePhotos && !force) return;
    
    setIsRefreshingPhotos(true);
    try {
      console.log('🔄 Refreshing location photos...');
      const refreshResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/refresh-tour-photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourId, force: !!force })
      });
      const refreshData = await refreshResponse.json();
      console.log('📋 Photo refresh result:', refreshData);
      
      if (refreshData.success) {
        // Reload blocks to get updated/cached Supabase URLs
        const blocksUrl = `${import.meta.env.VITE_API_URL}/api/tour-content-blocks?tourId=${tourId}`;
        const freshBlocksResponse = await fetch(blocksUrl);
        if (freshBlocksResponse.ok) {
          const freshBlocksData = await freshBlocksResponse.json();
          if (freshBlocksData.success && freshBlocksData.blocks) {
            const freshSorted = freshBlocksData.blocks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            setBlocks(freshSorted);
            const updated = refreshData.updated || 0;
            if (updated > 0) {
              showNotificationMessage(`✅ Photos refreshed in ${updated} block(s)`);
            } else {
              showNotificationMessage('✅ Photo refresh finished');
            }
          }
        }
      } else if (force) {
        showNotificationMessage('No photos needed updating');
      }
    } catch (refreshError) {
      console.warn('⚠️ Could not refresh photos:', refreshError.message);
      if (force) showNotificationMessage('⚠️ Failed to refresh photos');
    } finally {
      setIsRefreshingPhotos(false);
    }
  }, [tourId, blocks, isRefreshingPhotos]);

  // Detect screen size for responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (!tourId) {
      setStep1HintDismissed(true);
      return;
    }
    try {
      setStep1HintDismissed(localStorage.getItem(`visualizer_step1_hint_${tourId}`) === '1');
    } catch {
      setStep1HintDismissed(false);
    }
  }, [tourId]);

  const dismissStep1Hint = useCallback(() => {
    if (tourId) {
      try {
        localStorage.setItem(`visualizer_step1_hint_${tourId}`, '1');
      } catch {}
    }
    setStep1HintDismissed(true);
    if (tourId) {
      const params = new URLSearchParams(searchParams);
      params.delete('newTour');
      const q = params.toString();
      navigate(`/guide/tours/visualizer/${tourId}${q ? `?${q}` : ''}`, { replace: true });
    }
  }, [tourId, navigate, searchParams]);
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  // Tour basic info state - empty by default for new tours
  const [tourInfo, setTourInfo] = useState({
    city: '',
    title: '',
    description: '',
    shortDescription: '',
    preview: null,
    previewOriginal: null,
    previewImages: [], // Additional gallery images for preview carousel
    tourPdfUrl: '', // Optional uploaded tour presentation PDF
    pdfTemplate: 'classic', // Styled PDF template: classic|magazine|minimal
    pdfLayout: {
      subtitle: '',
      includeMap: true,
      includeHighlights: true
    },
    tags: [], // Tags/interests for the tour
    highlights: {}, // "What's Inside This Walk" structured: {icon3, text3, icon4, text4, icon5, text5}
    tourQuickStats: { ...DEFAULT_TOUR_QUICK_STATS },
  });

  // Normalize legacy/malformed values coming from older tours to prevent runtime crashes.
  const normalizeStringArray = (value) => {
    if (Array.isArray(value)) return value.map(v => String(v)).filter(Boolean);
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };
  const normalizeImageArray = (value) => Array.isArray(value)
    ? value.filter(v => typeof v === 'string' && v.trim().length > 0)
    : [];

  // City autocomplete state
  const [cities, setCities] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  // Tour settings state
  const [tourSettings, setTourSettings] = useState({
    selfGuided: true, // Default: Self-guided is always enabled by default
    withGuide: false,
    price: {
      pdfPrice: DEFAULT_SELF_GUIDED_PRICE,
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
  const [allInterestsForDisplay, setAllInterestsForDisplay] = useState([]); // For displaying tags in visualizer
  const [interestsStructureForDisplay, setInterestsStructureForDisplay] = useState(null); // For displaying tags in visualizer

  // Tour settings block collapsed state
  const [isTourSettingsCollapsed, setIsTourSettingsCollapsed] = useState(true);
  /** Bottom sheet: PDF / AI vs tour format */
  const [bottomPanelTab, setBottomPanelTab] = useState('finalization');

  // Load availability slots when tour has guide format
  useEffect(() => {
    if (tourSettings.withGuide && tourId) {
      loadAvailabilitySlots(tourId);
    }
  }, [tourSettings.withGuide, tourId]);

  useEffect(() => {
    const initPage = async () => {
      await loadUser();
      loadGuideProfile();
      if (tourId) {
        await loadTour();
      }
      setLoading(false);
    };
    initPage();
    // No need to preload all cities - we'll search via API as user types
    // Cities are now searched via API for better performance
    
    // Load interests structure for displaying tags
    const loadInterestsForDisplay = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://fliptripback.vercel.app';
        const response = await fetch(`${API_BASE_URL}/api/interests?full_structure=true`);
        const data = await response.json();
        if (data.success && data.categories) {
          setInterestsStructureForDisplay(data.categories || []);
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
          setAllInterestsForDisplay(allInterests);
        }
      } catch (err) {
        console.error('Error loading interests for display:', err);
      }
    };
    loadInterestsForDisplay();
    
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
    // Check if user is admin
    const userIsAdmin = currentUser.role === 'admin';
    setIsAdmin(userIsAdmin);
    // Don't set loading=false here — wait for loadTour to finish too
    // If there's no tourId, loading will be set false after this useEffect
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
      let tourData;
      try {
        tourData = await getTourById(tourIdToLoad);
      } catch (tourError) {
        console.error('❌ Error loading tour from API:', tourError);
        // If tour loading fails, try to continue with empty state
        setBlocks([]);
        return;
      }
      // getTourById returns tour object directly, not wrapped
      const tourObj = tourData?.tour || tourData;
      if (tourObj) {
        setTour(tourObj);
        
        // Check if admin is editing someone else's tour
        // This will be updated in useEffect when user loads
        if (user && isAdmin) {
          const tourOwnerId = tourObj.guide_id || tourObj.creator_id || tourObj.user_id || tourObj.created_by;
          const isOwnTour = tourOwnerId === user.id;
          setIsEditingOtherTour(!isOwnTour);
        }
        
        // Check if draft_data exists and use it, otherwise use main tour data
        const draftData = tourObj.draft_data;
        const sourceData = draftData || tourObj;
        
        // Extract interest IDs from tour_tags
        // tour_tags contains objects with interest_id and interest object
        console.log('📋 Tour tour_tags from API:', tourObj.tour_tags);
        
        setTourInfo({
          city: sourceData.city || tourObj.city?.name || '',
          title: sourceData.title || tourObj.title || '',
          description: sourceData.description || tourObj.description || '',
          shortDescription: sourceData.shortDescription || draftData?.shortDescription || '',
          preview: sourceData.preview || draftData?.preview || tourObj.preview_media_url || null,
          previewOriginal: sourceData.previewOriginal || draftData?.previewOriginal || tourObj.preview_media_url || sourceData.preview || null,
          previewImages: normalizeImageArray(draftData?.previewImages), // Additional gallery images
          tourPdfUrl: (draftData?.tourPdfUrl || sourceData?.tourPdfUrl || '').toString(),
          pdfTemplate: draftData?.pdfTemplate || sourceData?.pdfTemplate || 'classic',
          pdfLayout: {
            subtitle: draftData?.pdfLayout?.subtitle || '',
            includeMap: draftData?.pdfLayout?.includeMap !== false,
            includeHighlights: draftData?.pdfLayout?.includeHighlights !== false
          },
          tags: [], // Will be set later from tour_tags
          highlights: (() => {
            const h = draftData?.highlights;
            // Migrate old array format to new object format
            if (Array.isArray(h)) {
              const obj = {};
              if (h[2]) { obj.icon3 = h[2].icon || ''; obj.text3 = h[2].text || ''; }
              if (h[3]) { obj.icon4 = h[3].icon || ''; obj.text4 = h[3].text || ''; }
              if (h[4]) { obj.icon5 = h[4].icon || ''; obj.text5 = h[4].text || ''; }
              return obj;
            }
            return h || {};
          })(), // "What's Inside This Walk" structured highlights
          tourQuickStats: mergeTourQuickStats(draftData?.tourQuickStats),
        });

        // Load tour settings
        // First, check if draft_data.tourSettings exists (for tours created in Visualizer)
        let loadedSettings = null;
        if (draftData && draftData.tourSettings) {
          loadedSettings = draftData.tourSettings;
        }
        
        // Determine format from tour data
        // CRITICAL: Always check draft_data.tourSettings first for explicit saved values
        // If not found, use default_format from DB
        // Default: selfGuided = true (always enabled by default)
        const defaultFormat = tourObj.default_format;
        
        // Load explicit saved settings from draft_data.tourSettings
        // If settings exist, use them exactly as saved
        // If not, infer from default_format, but default to selfGuided = true
        const selfGuided = loadedSettings?.selfGuided !== undefined 
          ? loadedSettings.selfGuided 
          : (defaultFormat !== 'with_guide' && defaultFormat !== 'guided'); // Default to true unless explicitly with_guide
        
        const withGuide = loadedSettings?.withGuide !== undefined 
          ? loadedSettings.withGuide 
          : (defaultFormat === 'with_guide' || defaultFormat === 'guided');
        
        // Extract interest IDs from tour_tags (new system uses interests, not legacy tags)
        const interestIds = tourObj.tour_tags?.map(tt => {
          const id = tt.interest?.id || tt.interest_id;
          return id ? String(id) : null;
        }).filter(Boolean) || [];
        
        console.log('📋 Loading interests from tour:', { 
          tourTags: tourObj.tour_tags, 
          interestIds,
          count: interestIds.length 
        });
        
        // Load availability dates if tour has guide format
        let availableDates = [];
        if (withGuide && tourIdToLoad) {
          // withGuide is defined in this scope (line 230)
          try {
            const availabilityResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/guide-availability?tour_id=${tourIdToLoad}`).catch(() => null);
            if (availabilityResponse && availabilityResponse.ok) {
              const availabilityData = await availabilityResponse.json();
              if (availabilityData.success) {
                // API returns availability array directly, or slots array
                const slots = availabilityData.availability || availabilityData.slots || [];
                // Extract unique dates from availability slots
                availableDates = [...new Set(slots
                  .filter(slot => slot.available_spots > 0 || (slot.is_available && !slot.is_blocked))
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
            pdfPrice: loadedSettings?.price?.pdfPrice ?? tourObj.price_pdf ?? DEFAULT_SELF_GUIDED_PRICE,
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
          tags: normalizeStringArray(loadedSettings?.tags).length > 0
            ? normalizeStringArray(loadedSettings?.tags)
            : interestIds
        });
        
        // CRITICAL: Set tourInfo.tags from loaded interests
        // Draft tours store description in draft_data; top-level tour.description may be stale until submit.
        setTourInfo(prev => ({
          ...prev,
          city: (draftData?.city && String(draftData.city).trim())
            ? String(draftData.city).trim()
            : (tourObj.city?.name || prev.city),
          title:
            draftData && draftData.title !== undefined
              ? draftData.title
              : (tourObj.title || prev.title),
          description:
            draftData && draftData.description !== undefined
              ? draftData.description
              : (tourObj.description || prev.description),
          shortDescription: draftData?.shortDescription || prev.shortDescription || '',
          preview: tourObj.preview || prev.preview,
          previewOriginal: draftData?.previewOriginal || tourObj.preview_media_url || prev.previewOriginal || prev.preview,
          tourPdfUrl: draftData?.tourPdfUrl || prev.tourPdfUrl || '',
          pdfTemplate: draftData?.pdfTemplate || prev.pdfTemplate || 'classic',
          pdfLayout: {
            subtitle: draftData?.pdfLayout?.subtitle || prev.pdfLayout?.subtitle || '',
            includeMap: draftData?.pdfLayout?.includeMap !== false,
            includeHighlights: draftData?.pdfLayout?.includeHighlights !== false
          },
          tags: interestIds.length > 0
            ? interestIds
            : (normalizeStringArray(loadedSettings?.tags).length > 0
              ? normalizeStringArray(loadedSettings?.tags)
              : normalizeStringArray(prev.tags)),
          tourQuickStats: mergeTourQuickStats(draftData?.tourQuickStats ?? prev.tourQuickStats),
        }));
      }

      // Load content blocks (ignore errors if table doesn't exist yet)
      try {
        const blocksUrl = `${import.meta.env.VITE_API_URL}/api/tour-content-blocks?tourId=${tourIdToLoad}`;
        console.log('🔍 Loading blocks from:', blocksUrl);
        const blocksResponse = await fetch(blocksUrl).catch((err) => {
          console.error('❌ Fetch error:', err);
          return null;
        });
        
        if (blocksResponse && blocksResponse.ok) {
          const blocksData = await blocksResponse.json();
          console.log('📦 Blocks API response:', blocksData);
          if (blocksData.success) {
            const loadedBlocks = blocksData.blocks || [];
            console.log(`✅ Loaded ${loadedBlocks.length} blocks for tour ${tourIdToLoad}:`, loadedBlocks.map(b => ({ id: b.id, type: b.block_type, order: b.order_index })));
            
            // Debug: Check for location blocks with photos
            loadedBlocks.forEach(block => {
              if (block.block_type === 'location' && block.content) {
                const mainLocation = block.content.mainLocation || block.content;
                const photos = mainLocation.photos || (mainLocation.photo ? [mainLocation.photo] : []);
                if (photos.length > 0) {
                  console.log(`📸 Location block ${block.id} has ${photos.length} photos:`, {
                    photos: photos.map(p => {
                      if (!p) return 'null';
                      if (typeof p !== 'string') return `not string: ${typeof p}`;
                      if (p.startsWith('data:image/')) {
                        // Check if base64 string is complete (should end with base64 characters or be very long)
                        const isComplete = p.length > 100 && (p.endsWith('=') || p.endsWith('==') || p.length > 50000);
                        return `Base64 (length: ${p.length}, complete: ${isComplete}, first 50: ${p.substring(0, 50)}...)`;
                      }
                      if (p.startsWith('http')) return `HTTP URL`;
                      return `Unknown: ${p.substring(0, 50)}... (length: ${p.length})`;
                    })
                  });
                  
                  // Check if any base64 photos are truncated
                  photos.forEach((p, index) => {
                    if (p && typeof p === 'string' && p.startsWith('data:image/')) {
                      // Base64 strings should be quite long (at least several KB for a small image)
                      if (p.length < 1000) {
                        console.warn(`⚠️ Base64 photo ${index} seems too short (${p.length} chars) - might be truncated`);
                      }
                      // Check if it ends properly (base64 usually ends with = or ==)
                      if (!p.endsWith('=') && !p.endsWith('==') && p.length < 10000) {
                        console.warn(`⚠️ Base64 photo ${index} might be incomplete (doesn't end with = and is short)`);
                      }
                    }
                  });
                }
              }
            });
            
            // Sort blocks by order_index to ensure correct display order
            // IMPORTANT: Always keep map block last
            let sortedBlocks = loadedBlocks.sort((a, b) => {
              // Map block always goes to the end
              if (a.block_type === 'map' && b.block_type !== 'map') return 1;
              if (b.block_type === 'map' && a.block_type !== 'map') return -1;
              const byOrder = (a.order_index || 0) - (b.order_index || 0);
              if (byOrder !== 0) return byOrder;
              const byCreated = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
              if (byCreated !== 0) return byCreated;
              return String(a.id || '').localeCompare(String(b.id || ''));
            });
            
            // Check if map block exists, if not create it
            const mapBlock = sortedBlocks.find(b => b.block_type === 'map');
            if (!mapBlock && tourIdToLoad) {
              // Create map block automatically
              try {
                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                if (token) {
                  const maxOrder = sortedBlocks.length > 0 
                    ? Math.max(...sortedBlocks.map(b => b.order_index || 0))
                    : -1;
                  
                  const addresses = extractAddressesFromBlocks(sortedBlocks);
                  console.log('🗺️ Creating map block with', addresses.length, 'addresses');
                  
                  const mapResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      tourId: tourIdToLoad,
                      blockType: 'map',
                      orderIndex: maxOrder + 1,
                      content: {
                        locations: addresses,
                        hidden: false
                      }
                    })
                  });

                  if (mapResponse.ok) {
                    const mapData = await mapResponse.json();
                    if (mapData.success && mapData.block) {
                      sortedBlocks.push(mapData.block);
                      sortedBlocks = sortedBlocks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
                      console.log('✅ Map block created successfully:', mapData.block);
                      console.log('📍 Total blocks after map creation:', sortedBlocks.length);
                      console.log('📍 Blocks by type:', sortedBlocks.map(b => b.block_type));
                    } else {
                      console.error('❌ Map block creation failed:', mapData);
                    }
                  } else {
                    const errorText = await mapResponse.text().catch(() => '');
                    console.error('❌ Map block creation HTTP error:', mapResponse.status, errorText);
                  }
                } else {
                  console.warn('⚠️ No auth token for creating map block');
                }
              } catch (mapError) {
                console.error('Error creating map block:', mapError);
              }
            } else if (mapBlock) {
              console.log('✅ Map block already exists:', mapBlock.id, 'locations:', mapBlock.content?.locations?.length || 0);
              // Always keep map locations synced with location blocks.
              // Manual map edits should not block newly added locations.
              const addresses = extractAddressesFromBlocks(sortedBlocks.filter(b => b.block_type !== 'map'));
              const currentLocations = mapBlock.content?.locations || [];
              const addressesChanged = addresses.length !== currentLocations.length ||
                addresses.some((addr, idx) => {
                  const current = currentLocations[idx];
                  return !current || addr.address !== current.address || addr.title !== current.title;
                });

              if (addressesChanged && tourIdToLoad) {
                try {
                  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                  if (token) {
                    await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        blockId: mapBlock.id,
                        content: {
                          ...mapBlock.content,
                          locations: addresses
                        }
                      })
                    });

                    // Update local state
                    mapBlock.content = {
                      ...mapBlock.content,
                      locations: addresses
                    };
                  }
                } catch (updateError) {
                  console.error('Error updating map block:', updateError);
                }
              }
            }
            
            // Do NOT auto-normalize order_index on load.
            // Auto-rewriting order on page load caused random block jumps for authors.

            console.log('📍 Setting blocks state:', sortedBlocks.length, 'blocks');
            console.log('📍 Block types:', sortedBlocks.map(b => b.block_type));
            const mapBlockInState = sortedBlocks.find(b => b.block_type === 'map');
            if (mapBlockInState) {
              console.log('✅ Map block is in state:', mapBlockInState.id, 'hidden:', mapBlockInState.content?.hidden);
            } else {
              console.warn('⚠️ Map block NOT found in sortedBlocks!');
            }
            setBlocks(sortedBlocks);
            
            // One-time auto-refresh: only for locations that have NEVER been refreshed
            // After first refresh, photos are cached in Supabase and won't need refreshing again
            setTimeout(async () => {
              const locationBlocks = sortedBlocks.filter(b => b.block_type === 'location');
              const hasUnrefreshedGooglePhotos = locationBlocks.some(b => {
                const content = b.content || {};
                const checkNeedsRefresh = (loc) => {
                  if (!loc) return false;
                  // If already refreshed, skip — photos are cached in Supabase
                  if (loc._photosRefreshedAt) return false;
                  const photos = loc.photos || (loc.photo ? [loc.photo] : []);
                  return photos.some(p => p && typeof p === 'string' && p.includes('maps.googleapis.com/maps/api/place/photo'));
                };
                return checkNeedsRefresh(content.mainLocation) || 
                       (content.alternativeLocations || []).some(alt => checkNeedsRefresh(alt));
              });
              
              if (hasUnrefreshedGooglePhotos && tourIdToLoad) {
                console.log('🔄 One-time photo migration: caching Google photos to Supabase...');
                try {
                  const refreshResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/migrate-all-photos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tourId: tourIdToLoad, limit: 50 })
                  });
                  const refreshData = await refreshResponse.json();
                  console.log('📋 Photo migration result:', refreshData);
                  if (refreshData.success && refreshData.stats?.migratedBlocks > 0) {
                    // Reload blocks with fresh Supabase URLs
                    const freshBlocksResponse = await fetch(blocksUrl);
                    if (freshBlocksResponse.ok) {
                      const freshBlocksData = await freshBlocksResponse.json();
                      if (freshBlocksData.success && freshBlocksData.blocks) {
                        const freshSorted = freshBlocksData.blocks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
                        setBlocks(freshSorted);
                        console.log('✅ Blocks reloaded with cached Supabase photos');
                      }
                    }
                  }
                } catch (refreshError) {
                  console.warn('⚠️ Photo migration failed:', refreshError.message);
                }
              } else {
                console.log('✅ All photos already cached — no refresh needed');
              }
            }, 500);
          } else {
            console.warn('⚠️ Blocks API returned success: false', blocksData);
            setBlocks([]);
          }
        } else {
          const errorText = blocksResponse ? await blocksResponse.text().catch(() => '') : 'No response';
          console.warn('⚠️ Blocks API request failed:', blocksResponse?.status, blocksResponse?.statusText, errorText);
          // Table might not exist yet - silently ignore
          setBlocks([]);
        }
      } catch (blocksError) {
        console.error('❌ Error loading blocks:', blocksError);
        // Table might not exist yet - silently ignore
        setBlocks([]);
      }
      
      // Load availability slots if tour has guide format
      if (tourSettings.withGuide && tourIdToLoad) {
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
    if (selectedCalendarDates.length === 0) {
      return;
    }
    
    // Validate group size
    if (!defaultGroupSize || defaultGroupSize < 1) {
      alert('Please enter a valid number of available spots (at least 1)');
      return;
    }
    
    if (!tourId) {
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
  
  // Clear availability for selected dates (remove them from available dates)
  const handleClearAvailability = async () => {
    if (selectedCalendarDates.length === 0) {
      return;
    }
    
    if (!tourId) {
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
      
      // Update slots to be unavailable (is_available = false)
      const slots = dateStrings.map(dateStr => ({
        date: dateStr,
        max_group_size: defaultGroupSize,
        is_available: false,
        is_blocked: false
      }));
      
      await updateAvailabilitySlots(tourId, slots);
      await loadAvailabilitySlots(tourId);
      setSelectedCalendarDates([]);
    } catch (err) {
      console.error('Failed to clear availability:', err);
      alert('Failed to clear availability. Please try again.');
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
    const fromQuery = searchParams.get('returnTo');
    const fromState = location.state?.visualizerReturnTo;
    const target = [fromQuery, fromState].find((p) => isSafeVisualizerReturnPath(p));
    if (target) {
      navigate(target);
      return;
    }
    // Admins opening the visualizer without returnTo (e.g. bookmark) should not hit /guide/dashboard
    // (often redirects away); send them to tour management instead.
    if (isAdmin) {
      navigate('/admin/tours');
      return;
    }
    navigate('/guide/dashboard');
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      // Canvas + JPEG keeps only the first frame of animated GIFs (and drops animation).
      const isGif =
        (file.type && file.type.toLowerCase() === 'image/gif') ||
        /\.gif$/i.test(file.name || '');
      if (isGif) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

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

  /** GIF as base64 in JSON exceeds Vercel serverless body limits (~4.5MB). Upload to Supabase instead. */
  const uploadTourPreviewViaStorage = async (file) => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://fliptripback.vercel.app';
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) throw new Error('Please log in to upload images');

    let contentType = (file.type && String(file.type).toLowerCase().split(';')[0].trim()) || '';
    if (!contentType || contentType === 'application/octet-stream') {
      const n = (file.name || '').toLowerCase();
      if (n.endsWith('.gif')) contentType = 'image/gif';
      else if (n.endsWith('.png')) contentType = 'image/png';
      else if (n.endsWith('.webp')) contentType = 'image/webp';
      else contentType = 'image/jpeg';
    }

    const signedResp = await fetch(`${API_BASE_URL}/api/upload-tour-preview-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        tourId,
        fileName: file.name || 'preview',
        contentType,
        fileSize: file.size
      })
    });

    const signedData = await signedResp.json();
    if (!signedResp.ok || !signedData?.success) {
      throw new Error(signedData?.error || 'Failed to initialize image upload');
    }

    const uploadTarget = signedData.uploadUrl || signedData.signedUrl;
    const uploadResp = await fetch(uploadTarget, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file
    });

    if (!uploadResp.ok) {
      const uploadErrorText = await uploadResp.text().catch(() => '');
      throw new Error(
        `Failed to upload image (${uploadResp.status})${uploadErrorText ? ` — ${uploadErrorText.slice(0, 240)}` : ''}`
      );
    }

    if (!signedData.publicUrl) throw new Error('Upload succeeded but no public URL was returned');
    return signedData.publicUrl;
  };

  const handleImageUpload = async (file, callback) => {
    if (!file) return;

    const looksLikeImage =
      (file.type && file.type.startsWith('image/')) ||
      /\.(gif|jpe?g|png|webp)$/i.test(file.name || '');
    if (!looksLikeImage) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const isGif =
      (file.type && file.type.toLowerCase() === 'image/gif') ||
      /\.gif$/i.test(file.name || '');

    if (isGif) {
      if (!tourId) {
        alert(
          'To use an animated GIF, save the tour as a draft first so it gets an ID. Then upload the GIF again — it will be stored in the cloud (the save request cannot fit large GIFs).'
        );
        return;
      }
      try {
        const publicUrl = await uploadTourPreviewViaStorage(file);
        callback(publicUrl);
      } catch (error) {
        console.error('Error uploading GIF:', error);
        alert(error.message || 'Failed to upload GIF. Please try again.');
      }
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
    if (isSavingDraft || isSubmittingForModeration) return;
    setIsSavingDraft(true);
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
            shortDescription: tourInfo.shortDescription || '',
            preview: tourInfo.preview || null,
            previewOriginal: tourInfo.previewOriginal || tourInfo.preview || null,
            previewType: 'image',
            status: 'draft',
            daily_plan: [], // Empty daily_plan for visualizer tours
            tags: tourInfo.tags || [], // Tags/interests from tour header
            highlights: tourInfo.highlights || {}, // "What's Inside This Walk" structured highlights
            previewImages: tourInfo.previewImages || [], // Gallery images for preview carousel
            tourPdfUrl: tourInfo.tourPdfUrl || '', // Optional uploaded tour presentation PDF
            pdfTemplate: tourInfo.pdfTemplate || 'classic',
            pdfLayout: tourInfo.pdfLayout || {},
            tourQuickStats: tourInfo.tourQuickStats || { ...DEFAULT_TOUR_QUICK_STATS },
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
              pdfPrice: DEFAULT_SELF_GUIDED_PRICE,
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
          navigate(visualizerPathWithQuery(newTourId, { newTour: true }), { replace: true });
          setTour(data.tour);
          // Update tourId in state by reloading tour
          await loadTour(newTourId);
          showNotificationMessage('Tour saved as draft!');
          setLastDraftSavedAt(Date.now());
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
            shortDescription: tourInfo.shortDescription || '',
            preview: tourInfo.preview || null,
            previewOriginal: tourInfo.previewOriginal || tourInfo.preview || null,
            previewType: 'image',
            saveAsDraft: true,
            format: tourSettings.withGuide ? 'guided' : (tourSettings.selfGuided ? 'self-guided' : 'self-guided'),
            withGuide: tourSettings.withGuide,
            selfGuided: tourSettings.selfGuided,
            price: {
              pdfPrice: tourSettings.price.pdfPrice || DEFAULT_SELF_GUIDED_PRICE,
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
            tags: tourInfo.tags || [], // Tags/interests from tour header
            highlights: tourInfo.highlights || {}, // "What's Inside This Walk" structured highlights
            previewImages: tourInfo.previewImages || [], // Gallery images for preview carousel
            tourPdfUrl: tourInfo.tourPdfUrl || '', // Optional uploaded tour presentation PDF
            pdfTemplate: tourInfo.pdfTemplate || 'classic',
            pdfLayout: tourInfo.pdfLayout || {},
            tourQuickStats: tourInfo.tourQuickStats || { ...DEFAULT_TOUR_QUICK_STATS },
          })
        });
        
        console.log(
          '💾 Saving tour (update) with tags:',
          tourInfo.tags,
          'type:',
          Array.isArray(tourInfo.tags) ? tourInfo.tags.map(t => typeof t) : typeof tourInfo.tags
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Update tour error:', errorData);
          alert(errorData.error || `Failed to save tour (${response.status})`);
          return;
        }
        
        const data = await response.json();
        console.log('📥 Tour update response:', { success: data.success, hasTour: !!data.tour, tourTags: data.tour?.tour_tags });
        if (data.success) {
          // Always preserve current preview in state (it was just saved)
          // Update other fields from response
          if (data.tour) {
            setTour(data.tour);
            // Extract interest IDs from tour_tags in response
            // Convert to strings for consistency
            const interestIds = data.tour.tour_tags?.map(tt => {
              const id = tt.interest?.id || tt.interest_id;
              console.log('🔍 Extracting interest ID from response:', { 
                tt, 
                hasInterest: !!tt.interest,
                interestId: tt.interest?.id,
                interest_id: tt.interest_id,
                extractedId: id, 
                idType: typeof id 
              });
              return id ? String(id) : null;
            }).filter(Boolean) || [];
            
            console.log('🔄 Updated interests from server response:', interestIds);
            console.log('🔄 Previous interests in state:', tourInfo.tags);
            console.log('🔄 Will set interests to:', interestIds.length > 0 ? interestIds : tourInfo.tags);
            
            setTourInfo({
              city: data.tour.city?.name || tourInfo.city,
              title:
                data.tour.draft_data && data.tour.draft_data.title !== undefined
                  ? data.tour.draft_data.title
                  : (data.tour.title || tourInfo.title),
              description:
                data.tour.draft_data && data.tour.draft_data.description !== undefined
                  ? data.tour.draft_data.description
                  : (data.tour.description || tourInfo.description),
              shortDescription: tourInfo.shortDescription || '',
              preview: tourInfo.preview, // Keep current preview (was just saved)
              previewOriginal: tourInfo.previewOriginal || tourInfo.preview,
              previewImages: tourInfo.previewImages || [],
              tourPdfUrl: tourInfo.tourPdfUrl || '',
              pdfTemplate: tourInfo.pdfTemplate || 'classic',
              pdfLayout: tourInfo.pdfLayout || {},
              highlights: tourInfo.highlights || {},
              tourQuickStats: tourInfo.tourQuickStats || { ...DEFAULT_TOUR_QUICK_STATS },
              tags: interestIds.length > 0 ? interestIds : tourInfo.tags // Update interests from server response, fallback to current if empty
            });
            // Reload blocks after saving tour to ensure they're up to date
            const currentTourId = data.tour.id || tourId;
            if (currentTourId) {
              console.log('🔄 Reloading blocks after tour save...');
              const blocksResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks?tourId=${currentTourId}`).catch(() => null);
              if (blocksResponse && blocksResponse.ok) {
                const blocksData = await blocksResponse.json();
                if (blocksData.success) {
                  const loadedBlocks = blocksData.blocks || [];
                  const sortedBlocks = loadedBlocks.sort((a, b) => {
                    if (a.block_type === 'map' && b.block_type !== 'map') return 1;
                    if (b.block_type === 'map' && a.block_type !== 'map') return -1;
                    const byOrder = (a.order_index || 0) - (b.order_index || 0);
                    if (byOrder !== 0) return byOrder;
                    const byCreated = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                    if (byCreated !== 0) return byCreated;
                    return String(a.id || '').localeCompare(String(b.id || ''));
                  });
                  setBlocks(sortedBlocks);
                  console.log(`✅ Reloaded ${sortedBlocks.length} blocks after save`);
                }
              }
            }
          }
          showNotificationMessage('Tour saved as draft!');
          setLastDraftSavedAt(Date.now());
        } else {
          alert(data.error || 'Failed to save tour');
        }
      }
    } catch (error) {
      console.error('Error saving tour:', error);
      alert('Failed to save tour');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSaveTour = async () => {
    if (isSavingHeaderModal) return;
    setIsSavingHeaderModal(true);

    // Save from modal: one draft save only. (A prior extra PUT without saveAsDraft ran the
    // destructive full tours-update path — deleting tour_days — and could fail or corrupt data.)
    try {
      if (!tourInfo.city || !tourInfo.title) {
        alert('Please fill in City and Trip name before saving');
        return;
      }

      await handleSaveAsDraft();
      // Close modal only after save flow is complete
      setShowTourEditor(false);
    } finally {
      setIsSavingHeaderModal(false);
    }
  };

  const handleSubmitForModeration = async () => {
    if (isSavingDraft || isSubmittingForModeration) return;
    setIsSubmittingForModeration(true);
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
            shortDescription: tourInfo.shortDescription || '',
            preview: tourInfo.preview || null,
            previewOriginal: tourInfo.previewOriginal || tourInfo.preview || null,
            previewType: 'image',
            status: 'pending',
            daily_plan: [], // Empty daily_plan for visualizer tours
            tags: tourInfo.tags || [], // Tags/interests from tour header
            highlights: tourInfo.highlights || {}, // "What's Inside This Walk" structured highlights
            previewImages: tourInfo.previewImages || [], // Gallery images for preview carousel
            tourPdfUrl: tourInfo.tourPdfUrl || '', // Optional uploaded tour presentation PDF
            pdfTemplate: tourInfo.pdfTemplate || 'classic',
            pdfLayout: tourInfo.pdfLayout || {},
            tourQuickStats: tourInfo.tourQuickStats || { ...DEFAULT_TOUR_QUICK_STATS },
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
              pdfPrice: DEFAULT_SELF_GUIDED_PRICE,
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
          navigate(visualizerPathWithQuery(newTourId), { replace: true });
          setTour(data.tour);
          setLastSubmittedAt(Date.now());
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
            shortDescription: tourInfo.shortDescription || '',
            preview: tourInfo.preview || null,
            previewOriginal: tourInfo.previewOriginal || tourInfo.preview || null,
            previewType: 'image',
            status: 'pending',
            format: tourSettings.withGuide ? 'guided' : (tourSettings.selfGuided ? 'self-guided' : 'self-guided'),
            withGuide: tourSettings.withGuide,
            selfGuided: tourSettings.selfGuided,
            price: {
              pdfPrice: tourSettings.price.pdfPrice || DEFAULT_SELF_GUIDED_PRICE,
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
            tags: tourInfo.tags || [], // Tags/interests from tour header
            highlights: tourInfo.highlights || {}, // "What's Inside This Walk" structured highlights
            previewImages: tourInfo.previewImages || [], // Gallery images for preview carousel
            tourPdfUrl: tourInfo.tourPdfUrl || '', // Optional uploaded tour presentation PDF
            pdfTemplate: tourInfo.pdfTemplate || 'classic',
            pdfLayout: tourInfo.pdfLayout || {},
            tourQuickStats: tourInfo.tourQuickStats || { ...DEFAULT_TOUR_QUICK_STATS },
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
          showNotificationMessage('Tour submitted for moderation!');
          setLastSubmittedAt(Date.now());
        } else {
          alert(data.error || 'Failed to submit tour');
        }
      }
    } catch (error) {
      console.error('Error submitting tour:', error);
      alert('Failed to submit tour');
    } finally {
      setIsSubmittingForModeration(false);
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
          city: tourInfo.city || '',
          title: tourInfo.title || '',
          description: tourInfo.description || '',
          shortDescription: tourInfo.shortDescription || '',
          preview: tourInfo.preview || null,
          previewOriginal: tourInfo.previewOriginal || tourInfo.preview || null,
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
            pdfPrice: DEFAULT_SELF_GUIDED_PRICE,
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
        navigate(visualizerPathWithQuery(newTourId, { newTour: true }), { replace: true });
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

  // Handle adding a new block after a specific block
  const handleAddBlockAfter = (afterBlockId) => {
    if (layoutBusy) return;
    setInsertAfterBlockId(afterBlockId);
    setShowBlockSelector(true);
  };

  const handleAddBlock = async (blockType) => {
    if (layoutBusy) return;
    console.log('Adding block:', blockType, 'insertAfterBlockId:', insertAfterBlockId);

    setLayoutBusyMessage('Creating block');
    setLayoutBusy(true);

    // Automatically create tour if it doesn't exist
    const currentTourId = tourId || await ensureTourExists();
    if (!currentTourId) {
      setLayoutBusy(false);
      setLayoutBusyMessage('');
      setShowBlockSelector(false);
      setInsertAfterBlockId(null);
      return;
    }

    // Calculate insertion by visual position, not by dirty order_index.
    // This prevents blocks from "jumping" after reload.
    const nonMapBlocks = blocks.filter(b => b.block_type !== 'map');
    const insertPosition = (() => {
      if (!insertAfterBlockId) return nonMapBlocks.length;
      const afterIndex = nonMapBlocks.findIndex(b => b.id === insertAfterBlockId);
      return afterIndex >= 0 ? afterIndex + 1 : nonMapBlocks.length;
    })();
    const newOrderIndex = insertPosition;

    // Determine default content based on block type
    let defaultContent = {};
    switch (blockType) {
      case 'title':
        defaultContent = { text: 'New Title', size: 'large', fontWeight: 'medium' };
        break;
      case 'text':
        defaultContent = { 
          layout: 'two-columns',
          column1: '',
          column2: '',
          text: '',
          formatted: false,
          isPlaceholder: true
        };
        break;
      case 'photo_text':
        defaultContent = { 
          photo: null, 
          text: '',
          alignment: 'left',
          isPlaceholder: true
        };
        break;
      case 'slide':
        defaultContent = { 
          title: '', 
          photo: null, 
          text: '',
          isPlaceholder: true
        };
        break;
      case '3columns':
        defaultContent = { 
          columns: [
            { photo: null, text: '' },
            { photo: null, text: '' },
            { photo: null, text: '' }
          ],
          isPlaceholder: true
        };
        break;
      case 'photo':
        defaultContent = {
          photos: [],
          caption: '',
          layout: 'container',
          isPlaceholder: true
        };
        break;
      case 'divider':
        defaultContent = { style: 'solid' };
        break;
      case 'location':
        // Empty location block - user creates their own content
        // The placeholder hint will be shown in BlockRenderer
        defaultContent = { 
          mainLocation: {
            time: '',
            title: '',
            address: '',
            description: '',
            photo: null,
            photos: [],
            recommendations: '',
            category: null,
            interests: [],
            price_level: '',
            approx_cost: ''
          },
          alternativeLocations: [],
          isPlaceholder: true // Flag to show placeholder hint
        };
        break;
      default:
        defaultContent = {};
    }

    // Create block in database immediately with default content
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        setLayoutBusy(false);
        setLayoutBusyMessage('');
        alert('Please log in to create blocks');
        setShowBlockSelector(false);
        setInsertAfterBlockId(null);
        return;
      }

      // Close picker immediately so the top progress bar is visible during the request
      setShowBlockSelector(false);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tourId: currentTourId,
          blockType: blockType,
          orderIndex: newOrderIndex,
          content: defaultContent
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Create block error:', errorData, 'Status:', response.status);
        alert(errorData.error || `Failed to create block (${response.status})`);
        setLayoutBusy(false);
        setLayoutBusyMessage('');
        setShowBlockSelector(false);
        setInsertAfterBlockId(null);
        return;
      }

      const data = await response.json();
      
      if (data.success && data.block) {
        const newBlockId = data.block.id;
        setLastDraftSavedAt(null);

        setBlocks(prev => insertBlockIntoBlocksList(prev, data.block, newOrderIndex));
        setInsertAfterBlockId(null);
        setLayoutBusy(false);
        setLayoutBusyMessage('');

        // Smooth scroll to the new block after a short delay
        setTimeout(() => {
          const newBlockElement = document.querySelector(`[data-block-id="${newBlockId}"]`);
          if (newBlockElement) {
            newBlockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add highlight effect
            newBlockElement.style.transition = 'box-shadow 0.3s ease';
            newBlockElement.style.boxShadow = '0 0 0 3px #FFDD00';
            setTimeout(() => {
              newBlockElement.style.boxShadow = 'none';
            }, 2000);
          }
        }, 100);
      } else {
        alert(data.error || 'Failed to create block');
        setLayoutBusy(false);
        setLayoutBusyMessage('');
        setShowBlockSelector(false);
        setInsertAfterBlockId(null);
      }
    } catch (error) {
      console.error('Error creating block:', error);
      alert('Error creating block. Please try again.');
      setLayoutBusy(false);
      setLayoutBusyMessage('');
      setShowBlockSelector(false);
      setInsertAfterBlockId(null);
    }
  };

  const handleEditBlock = (block) => {
    setEditingBlock(block);
  };

  const handleSaveBlock = async (updatedBlock) => {
    if (isSavingBlock || isDeletingBlock) return;
    setIsSavingBlock(true);
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
        setLastDraftSavedAt(null);
        // Debug: Check if photos are preserved after save
        if (data.block.block_type === 'location' && data.block.content) {
          const savedMainLocation = data.block.content.mainLocation || data.block.content;
          const savedPhotos = savedMainLocation.photos || (savedMainLocation.photo ? [savedMainLocation.photo] : []);
          const originalMainLocation = updatedBlock.content?.mainLocation || updatedBlock.content;
          const originalPhotos = originalMainLocation?.photos || (originalMainLocation?.photo ? [originalMainLocation.photo] : []);
          
          console.log('💾 After save - Photo preservation check:', {
            originalPhotosCount: originalPhotos.length,
            savedPhotosCount: savedPhotos.length,
            originalFirstPhoto: originalPhotos[0] ? (originalPhotos[0].startsWith('data:image/') ? `Base64 (length: ${originalPhotos[0].length})` : 'HTTP URL') : 'none',
            savedFirstPhoto: savedPhotos[0] ? (savedPhotos[0].startsWith('data:image/') ? `Base64 (length: ${savedPhotos[0].length})` : 'HTTP URL') : 'none',
            photosMatch: JSON.stringify(originalPhotos) === JSON.stringify(savedPhotos)
          });
        }
        
        // Build next local state first
        const finalBlock = isNewBlock
          ? data.block
          : {
            ...data.block,
            content: updatedBlock.content // Keep content we sent (important for base64 photos)
          };

        let nextBlocks = isNewBlock
          ? [...blocks, finalBlock]
          : blocks.map(b => b.id === updatedBlock.id ? finalBlock : b);

        nextBlocks = nextBlocks.sort((a, b) => {
          if (a.block_type === 'map' && b.block_type !== 'map') return 1;
          if (b.block_type === 'map' && a.block_type !== 'map') return -1;
          return (a.order_index || 0) - (b.order_index || 0);
        });

        // If a location block changed, sync map markers immediately
        if (finalBlock.block_type === 'location') {
          const mapBlock = nextBlocks.find(b => b.block_type === 'map');
          if (mapBlock) {
            const nonMapBlocks = nextBlocks.filter(b => b.block_type !== 'map');
            const addresses = extractAddressesFromBlocks(nonMapBlocks);
            const currentLocations = mapBlock.content?.locations || [];
            const addressesChanged = addresses.length !== currentLocations.length ||
              addresses.some((addr, idx) => {
                const current = currentLocations[idx];
                return !current || addr.address !== current.address || addr.title !== current.title;
              });

            if (addressesChanged) {
              const updatedMapBlock = {
                ...mapBlock,
                content: {
                  ...mapBlock.content,
                  locations: addresses
                }
              };
              nextBlocks = nextBlocks.map(b => b.id === mapBlock.id ? updatedMapBlock : b);

              try {
                await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    blockId: mapBlock.id,
                    content: updatedMapBlock.content,
                    orderIndex: updatedMapBlock.order_index
                  })
                });
              } catch (mapSyncError) {
                console.warn('⚠️ Failed to sync map block locations after location save:', mapSyncError);
              }
            }
          }
        }

        setBlocks(nextBlocks);
        setEditingBlock(null);
      } else {
        alert(data.error || 'Failed to save block');
      }
    } catch (error) {
      console.error('Error saving block:', error);
      alert('Error saving block. Please try again.');
    } finally {
      setIsSavingBlock(false);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (isDeletingBlock || isSavingBlock) return;
    setIsDeletingBlock(true);
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
        setLastDraftSavedAt(null);
        // Remove block from local state
        setBlocks(prev => prev.filter(b => b.id !== blockId));
        setEditingBlock(null);
      } else {
        alert(data.error || 'Failed to delete block');
      }
    } catch (error) {
      console.error('Error deleting block:', error);
      alert('Error deleting block. Please try again.');
    } finally {
      setIsDeletingBlock(false);
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

  const handleDuplicateBlock = async (blockId) => {
    console.log('Duplicating block:', blockId);
    
    const currentIndex = blocks.findIndex(b => b.id === blockId);
    if (currentIndex === -1) {
      alert('Block not found');
      return;
    }

    const blockToDuplicate = blocks[currentIndex];
    const currentTourId = tourId || await ensureTourExists();
    
    if (!currentTourId) {
      alert('Tour not found. Please create a tour first.');
      return;
    }

    // Calculate order_index for the duplicate (insert right after current block)
    // We need to shift all blocks after this one by 1
    const currentOrder = blockToDuplicate.order_index || currentIndex;
    const nextOrder = currentOrder + 1;

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        alert('Please log in to duplicate blocks');
        return;
      }

      // First, shift all blocks after current one by 1
      const blocksToShift = blocks.filter(b => (b.order_index || 0) >= nextOrder);
      if (blocksToShift.length > 0) {
        await Promise.all(blocksToShift.map(block => 
          fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              blockId: block.id,
              content: block.content,
              orderIndex: (block.order_index || 0) + 1
            })
          })
        ));
      }

      // Create duplicate block with same content
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tourId: currentTourId,
          blockType: blockToDuplicate.block_type,
          orderIndex: nextOrder,
          content: JSON.parse(JSON.stringify(blockToDuplicate.content)) // Deep copy
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Duplicate block error:', errorData);
        alert(errorData.error || `Failed to duplicate block (${response.status})`);
        return;
      }

      const data = await response.json();
      
      if (data.success && data.block) {
        // Reload blocks to get updated order_index values
        if (currentTourId) {
          const blocksResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks?tourId=${currentTourId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const blocksData = await blocksResponse.json();
          if (blocksData.success && blocksData.blocks) {
            setBlocks(blocksData.blocks.sort((a, b) => {
              if (a.block_type === 'map' && b.block_type !== 'map') return 1;
              if (b.block_type === 'map' && a.block_type !== 'map') return -1;
              const byOrder = (a.order_index || 0) - (b.order_index || 0);
              if (byOrder !== 0) return byOrder;
              const byCreated = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
              if (byCreated !== 0) return byCreated;
              return String(a.id || '').localeCompare(String(b.id || ''));
            }));
          }
        }
        showNotificationMessage('Block duplicated successfully!');
      } else {
        alert(data.error || 'Failed to duplicate block');
      }
    } catch (error) {
      console.error('Error duplicating block:', error);
      alert('Error duplicating block. Please try again.');
    }
  };

  const handleMoveBlock = async (blockId, direction) => {
    if (layoutBusy) return;
    console.log('Moving block:', blockId, direction);

    const nonMapBlocks = blocks.filter(b => b.block_type !== 'map');
    const mapBlock = blocks.find(b => b.block_type === 'map') || null;
    const currentIndex = nonMapBlocks.findIndex(b => b.id === blockId);
    if (currentIndex === -1) return;

    let targetIndex;
    if (direction === 'up') {
      if (currentIndex === 0) return;
      targetIndex = currentIndex - 1;
    } else {
      if (currentIndex === nonMapBlocks.length - 1) return;
      targetIndex = currentIndex + 1;
    }

    // Reorder based on visual position, then fully normalize order_index values.
    // This fixes legacy tours with duplicated/invalid order_index.
    const reordered = [...nonMapBlocks];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const normalizedNonMap = reordered.map((block, idx) => ({
      ...block,
      order_index: idx
    }));

    const normalizedAll = mapBlock
      ? [...normalizedNonMap, { ...mapBlock, order_index: normalizedNonMap.length }]
      : normalizedNonMap;

    const sortedNext = normalizedAll.sort((a, b) => {
      if (a.block_type === 'map' && b.block_type !== 'map') return 1;
      if (b.block_type === 'map' && a.block_type !== 'map') return -1;
      return (a.order_index || 0) - (b.order_index || 0);
    });

    const snapshot = JSON.parse(JSON.stringify(blocks));
    setLayoutBusyMessage('Saving order');
    setLayoutBusy(true);
    setBlocks(sortedNext);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        setBlocks(snapshot);
        setLayoutBusy(false);
        setLayoutBusyMessage('');
        alert('Please log in to move blocks');
        return;
      }

      // Persist only changed blocks
      const previousById = new Map(snapshot.map(b => [b.id, b]));
      const blocksToUpdate = sortedNext.filter(b => {
        const prev = previousById.get(b.id);
        return (prev?.order_index ?? null) !== (b.order_index ?? null);
      });

      const responses = await Promise.all(
        blocksToUpdate.map(b =>
          fetch(`${import.meta.env.VITE_API_URL}/api/tour-content-blocks`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              blockId: b.id,
              content: b.content,
              orderIndex: b.order_index
            })
          })
        )
      );

      const payloads = await Promise.all(responses.map(r => r.json().catch(() => ({ success: false }))));
      const allGood = payloads.every(p => p.success);

      if (!allGood) {
        setBlocks(snapshot);
        alert('Failed to move block. Please try again.');
        return;
      }

      setLastDraftSavedAt(null);
    } catch (error) {
      console.error('Error moving block:', error);
      setBlocks(snapshot);
      alert('Error moving block. Please try again.');
    } finally {
      setLayoutBusy(false);
      setLayoutBusyMessage('');
    }
  };

  // Build map markers strictly from Location blocks only.
  // Never parse text blocks: mentions inside descriptions can create false positives in other countries.
  const extractAddressesFromBlocks = (allBlocks) => {
    const addresses = [];
    let locationNumber = 1;

    allBlocks.forEach((block) => {
      if (block.block_type === 'location' && block.content) {
        const mainLocation = block.content.mainLocation || block.content;
        if (mainLocation.address) {
          // Get first photo for the map card
          const mainPhotos = mainLocation.photos || (mainLocation.photo ? [mainLocation.photo] : []);
          const mainPhotoUrl = mainPhotos.find(p => p && typeof p === 'string' && !p.startsWith('data:')) || mainPhotos[0] || null;
          addresses.push({
            number: locationNumber++,
            title: mainLocation.title || mainLocation.name || 'Location',
            address: mainLocation.address,
            place_id: mainLocation.place_id || null,
            lat: mainLocation.lat || null,
            lng: mainLocation.lng || null,
            photo: mainPhotoUrl,
            blockId: block.id // Store block ID for scrolling
          });
        }

        // Check alternative locations
        const alternativeLocations = block.content.alternativeLocations || [];
        alternativeLocations.forEach((altLoc) => {
          if (altLoc.address) {
            const altPhotos = altLoc.photos || (altLoc.photo ? [altLoc.photo] : []);
            const altPhotoUrl = altPhotos.find(p => p && typeof p === 'string' && !p.startsWith('data:')) || altPhotos[0] || null;
            addresses.push({
              number: locationNumber++,
              title: altLoc.title || altLoc.name || 'Location',
              address: altLoc.address,
              place_id: altLoc.place_id || null,
              lat: altLoc.lat || null,
              lng: altLoc.lng || null,
              photo: altPhotoUrl,
              blockId: block.id // Store block ID for scrolling
            });
          }
        });
      }
    });

    return addresses;
  };

  // Reload tour when user or isAdmin changes to update isEditingOtherTour
  useEffect(() => {
    if (user && tour) {
      // Re-check if admin is editing someone else's tour
      if (isAdmin) {
        const tourOwnerId = tour.guide_id || tour.creator_id || tour.user_id || tour.created_by;
        const isOwnTour = tourOwnerId === user.id;
        setIsEditingOtherTour(!isOwnTour);
      } else {
        setIsEditingOtherTour(false);
      }
    }
  }, [user, isAdmin, tour]);

  useEffect(() => {
    if ((tour?.status || '').toLowerCase() === 'pending' && !lastSubmittedAt) {
      setLastSubmittedAt(Date.now());
    }
  }, [tour?.status, lastSubmittedAt]);

  const tourLastUpdatedLabel = useMemo(
    () => formatTourLastUpdatedLabel(tour),
    [tour]
  );

  if (loading) {
    const skeletonBlock = {
      background: 'linear-gradient(90deg, #ece9e4 0%, #f3f1ed 45%, #ece9e4 100%)',
      backgroundSize: '220% 100%',
      animation: 'visualizer-shimmer 1.3s ease-in-out infinite',
      borderRadius: '6px',
    };
    return (
      <div style={{ minHeight: '100vh', backgroundColor: VISUALIZER_PAGE_BG }}>
        <style>{`
          @keyframes visualizer-shimmer {
            0% { background-position: 100% 0; }
            100% { background-position: -100% 0; }
          }
        `}</style>
        <header className="guide-dashboard-header">
          <div className="guide-dashboard-header-inner" style={{ maxWidth: VISUALIZER_CONTENT_MAX_WIDTH }}>
            <div style={{ ...skeletonBlock, width: '88px', height: '32px' }} />
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ ...skeletonBlock, width: '90px', height: '16px' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ ...skeletonBlock, width: '28px', height: '28px', borderRadius: '50%' }} />
              <div style={{ ...skeletonBlock, width: '52px', height: '12px' }} />
              <div style={{ ...skeletonBlock, width: '110px', height: '28px', borderRadius: 0 }} />
            </div>
          </div>
        </header>
        {/* Skeleton Content */}
        <div style={{ maxWidth: VISUALIZER_CONTENT_MAX_WIDTH, margin: '0 auto', padding: '40px 20px' }}>
          {/* Hero image skeleton */}
          <div style={{ ...skeletonBlock, width: '100%', height: '320px', borderRadius: 0, marginBottom: '20px' }} />
          {/* Title */}
          <div style={{ ...skeletonBlock, width: '55%', height: '28px', marginBottom: '10px' }} />
          {/* City */}
          <div style={{ ...skeletonBlock, width: '80px', height: '16px', marginBottom: '20px' }} />
          {/* Author row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <div style={{ ...skeletonBlock, width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }} />
            <div>
              <div style={{ ...skeletonBlock, width: '90px', height: '12px', marginBottom: '6px' }} />
              <div style={{ ...skeletonBlock, width: '130px', height: '16px' }} />
            </div>
          </div>
          {/* About section */}
          <div style={{ ...skeletonBlock, width: '120px', height: '22px', marginBottom: '12px' }} />
          <div style={{ ...skeletonBlock, width: '100%', height: '14px', marginBottom: '8px' }} />
          <div style={{ ...skeletonBlock, width: '92%', height: '14px', marginBottom: '8px' }} />
          <div style={{ ...skeletonBlock, width: '70%', height: '14px', marginBottom: '40px' }} />
          {/* Content blocks skeleton */}
          {[1, 2].map((i) => (
            <div key={i} style={{ marginBottom: '32px' }}>
              <div style={{ ...skeletonBlock, width: '100%', height: '220px', borderRadius: '12px', marginBottom: '12px' }} />
              <div style={{ ...skeletonBlock, width: '45%', height: '20px', marginBottom: '8px' }} />
              <div style={{ ...skeletonBlock, width: '100%', height: '14px', marginBottom: '6px' }} />
              <div style={{ ...skeletonBlock, width: '85%', height: '14px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const visualizerLocationLabel = tourInfo.city?.trim() ? tourInfo.city : null;
  const guideDisplayName = guideProfile?.name || user?.name || 'Author';
  const headerDisplayName = (user?.name || 'User').trim();
  const headerAvatarSrc = (guideProfile?.avatar && String(guideProfile.avatar).trim()) || (user?.avatar && String(user.avatar).trim()) || '';

  /** Onboarding hint: only right after creating a tour (?newTour=1), until dismissed (stored per tour). */
  const showStep1Hint = searchParams.get('newTour') === '1' && !!tourId && !step1HintDismissed;

  /** Cover image (optional) + single “Header” copy block (replaces old empty hero placeholder). */
  const visualizerFirstBlock = (
    <div style={{ width: '100%', marginBottom: '0' }}>
      {tourInfo.preview ? (
        <div
          style={{
            width: '100%',
            height: isMobile ? VISUALIZER_HERO_HEIGHT.mobile : VISUALIZER_HERO_HEIGHT.desktop,
            borderRadius: 0,
            overflow: 'hidden',
            marginBottom: 0,
            boxSizing: 'border-box',
            backgroundImage: `url(${tourInfo.preview})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : null}
      {/* Plain tour copy — matches public itinerary (ItineraryPage description block); no “Header” label, no bordered plate */}
      <div
        style={{
          marginTop: tourInfo.preview ? '40px' : 0,
          padding: 0,
          boxSizing: 'border-box',
        }}
      >
        {tourInfo.description?.trim() ? (
          <p
            style={{
              fontSize: '20px',
              fontWeight: 500,
              color: '#111827',
              lineHeight: 1.5,
              margin: 0,
              whiteSpace: 'pre-line',
            }}
          >
            {tourInfo.description}
          </p>
        ) : (
          <>
            <p
              style={{
                fontSize: '16px',
                fontWeight: 400,
                color: '#6b7280',
                lineHeight: 1.6,
                margin: '0 0 14px 0',
              }}
            >
              {`This is where you describe your tour. Tell travelers what they'll discover, what makes this route unique, and why they should follow it.`}
            </p>
            <p
              style={{
                fontSize: '16px',
                fontWeight: 400,
                color: '#6b7280',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {`Click 'Edit block' above to add your description.`}
            </p>
          </>
        )}
      </div>
    </div>
  );

  const visualizerStep1HintBox = showStep1Hint ? (
    <div
      style={{
        maxWidth: '300px',
        padding: '10px 12px',
        backgroundColor: VISUALIZER_PAGE_BG,
        border: `1px solid ${VISUALIZER_HEADER_BLOCK_BORDER}`,
        borderRadius: 0,
        fontSize: '12px',
        lineHeight: 1.45,
        color: '#4b5563',
        position: 'relative',
        paddingRight: '28px',
      }}
    >
      <strong style={{ color: '#111827' }}>Step 1.</strong>{' '}
      Open Edit block and set your city and tour title to continue building your tour.
      <button
        type="button"
        aria-label="Dismiss hint"
        onClick={dismissStep1Hint}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          width: '22px',
          height: '22px',
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: '#9ca3af',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  ) : null;

  const desktopVisualizerMetaRow = (
    <div style={{ width: '100%', boxSizing: 'border-box', paddingTop: '0' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px 20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #BCBCBC'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#e5e7eb',
              overflow: 'hidden',
              flexShrink: 0
            }}
          >
            {(guideProfile?.avatar || user?.avatar) ? (
              <img src={guideProfile?.avatar || user?.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#9ca3af' }}>👤</div>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#111827', lineHeight: 1.4, fontWeight: 500 }}>
            <span style={{ fontWeight: 400 }}>Author: </span>
            <span style={{ fontWeight: 500 }}>{guideDisplayName}</span>
          </p>
        </div>
        {visualizerLocationLabel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#111827', fontWeight: 500 }}>
            <span style={{ fontSize: '14px' }}>📍</span>
            {visualizerLocationLabel}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', fontWeight: 500 }}>📍 City</div>
        )}
        {tourLastUpdatedLabel && (
          <span style={{ color: '#a2a2a2', fontSize: '12px', fontWeight: 500 }}>{tourLastUpdatedLabel}</span>
        )}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <button
            type="button"
            style={{
              backgroundColor: 'transparent',
              color: '#111827',
              border: 'none',
              borderRadius: 0,
              padding: 0,
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'default',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: 0.85
            }}
          >
            <img src={PDFIcon} alt="" style={{ width: '14px', height: '15px', flexShrink: 0 }} />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );

  const desktopVisualizerTitleRow = (
    <div style={{ marginTop: '28px', marginBottom: '28px', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <h1 style={{
          fontSize: '50px',
          fontWeight: 500,
          color: tourInfo.title ? '#111827' : '#9ca3af',
          margin: 0,
          lineHeight: '1.15',
          fontStyle: tourInfo.title ? 'normal' : 'italic',
          width: '100%',
          paddingRight: '132px',
          boxSizing: 'border-box',
        }}>
          {tourInfo.title || 'Your Tour Title'}
        </h1>
        <button
          type="button"
          onClick={() => setShowTourEditor(true)}
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2,
            padding: '8px 14px',
            backgroundColor: '#FFDD00',
            color: '#111827',
            border: 'none',
            borderRadius: 0,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '700',
            flexShrink: 0,
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f59e0b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFDD00'; }}
        >
          Edit block
        </button>
      </div>
      {visualizerStep1HintBox ? (
        <div style={{ marginTop: '12px' }}>{visualizerStep1HintBox}</div>
      ) : null}
    </div>
  );

  const mobileVisualizerTitleSection = (
        <div style={{ paddingTop: '24px' }}>
          <div style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: tourInfo.title ? '#111827' : '#9ca3af',
              margin: 0,
              lineHeight: '1.2',
              fontStyle: tourInfo.title ? 'normal' : 'italic',
              width: '100%',
              paddingRight: '108px',
              boxSizing: 'border-box',
            }}>
              {tourInfo.title || 'Your Tour Title'}
            </h1>
            <button
              type="button"
              onClick={() => setShowTourEditor(true)}
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                padding: '8px 12px',
                backgroundColor: '#FFDD00',
                color: '#111827',
                border: 'none',
                borderRadius: 0,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              Edit block
            </button>
          </div>
          {visualizerStep1HintBox ? (
            <div style={{ marginBottom: '16px' }}>{visualizerStep1HintBox}</div>
          ) : null}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            {tourInfo.city ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#374151' }}>
                <span style={{ fontSize: '15px' }}>📍</span>
                {tourInfo.city}
              </div>
            ) : (
              <div style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>📍 City</div>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#e5e7eb',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {(guideProfile?.avatar || user?.avatar) ? (
                  <img src={guideProfile?.avatar || user?.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#9ca3af' }}>👤</div>
                )}
              </div>
              <div style={{ lineHeight: '1.3' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Trip created by</div>
                <div style={{ fontWeight: '600', color: '#111827', fontSize: '15px' }}>{guideDisplayName}</div>
              </div>
            </div>
            <button
              type="button"
              style={{
                backgroundColor: '#2059ff',
                color: '#ebf6fa',
                border: 'none',
                borderRadius: '24px',
                padding: '12px 20px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'default',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: 0.7
              }}
            >
              <img src={PDFIcon} alt="PDF" style={{ width: '18px', height: '19px' }} />
              Download PDF
            </button>
          </div>
        </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: VISUALIZER_PAGE_BG }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {(isSavingDraft || isSubmittingForModeration) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(17,24,39,0.25)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '18px',
              height: '18px',
              border: '2px solid #d1d5db',
              borderTop: '2px solid #2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ color: '#111827', fontWeight: '600', fontSize: '14px' }}>
              {isSubmittingForModeration ? 'Submitting tour for moderation...' : 'Saving draft...'}
            </span>
          </div>
        </div>
      )}
      <header className="guide-dashboard-header">
        <div className="guide-dashboard-header-inner" style={{ maxWidth: VISUALIZER_CONTENT_MAX_WIDTH }}>
          <Link to="/" className="explore-logo-link" aria-label="FlipTrip home">
            <img src={FlipTripLogo} alt="FlipTrip" className="explore-logo" />
          </Link>
          <h1 className="guide-dashboard-header-title">Visualizer</h1>
          <div className="guide-dashboard-header-user">
            {headerAvatarSrc ? (
              <img src={headerAvatarSrc} alt="" className="guide-dashboard-avatar" />
            ) : (
              <span className="guide-dashboard-avatar-fallback" aria-hidden>
                {headerDisplayName.charAt(0).toUpperCase() || '?'}
              </span>
            )}
            <span className="guide-dashboard-user">{headerDisplayName}</span>
            <button type="button" className="guide-dashboard-logout" onClick={handleBackToDashboard}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content — desktop: 60px below top bar */}
      <div style={{ maxWidth: VISUALIZER_CONTENT_MAX_WIDTH, margin: '0 auto', padding: isMobile ? '40px 20px' : '60px 24px 40px', boxSizing: 'border-box' }}>
        {/* Admin editing indicator */}
        {isEditingOtherTour && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '2px solid #fbbf24',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <span style={{ fontSize: '20px' }}>👤</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                Admin Edit Mode
              </div>
              <div style={{ fontSize: '14px', color: '#78350f' }}>
                You are editing this tour as an administrator. The original author remains unchanged.
              </div>
            </div>
          </div>
        )}
        
        {/* Desktop: meta → title row → first block. Mobile: title row → first block */}
        {!isMobile && desktopVisualizerMetaRow}
        {!isMobile && desktopVisualizerTitleRow}
        {isMobile && mobileVisualizerTitleSection}
        <div style={{ marginBottom: '32px' }}>{visualizerFirstBlock}</div>

        {/* Interest tags — only author-defined tags */}
        {Array.isArray(tourInfo.tags) && tourInfo.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {tourInfo.tags.map(tagId => {
              const tagIdString = String(tagId);
              const interest = allInterestsForDisplay.find(i => String(i.id) === tagIdString);
              if (!interest) return null;
              return (
                <div key={tagId} style={{
                  height: '35px',
                  padding: '0 12px',
                  backgroundColor: 'white',
                  color: '#111827',
                  borderRadius: 0,
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid #DEDEDE'
                }}>
                  {interest.name}
                </div>
              );
            })}
          </div>
        )}

        {/* Content Blocks - Appear after author block */}
        {blocks.map((block, index) => (
          <div 
            key={block.id}
            data-block-id={block.id}
            style={{ marginBottom: '40px', position: 'relative' }}
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
              allBlocks={blocks}
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
                backgroundColor: VISUALIZER_PAGE_BG,
                padding: '8px',
                borderRadius: 0,
                boxShadow: '0px 1px 19px 0px rgba(0, 0, 0, 0.21)'
              }}
            >
              {/* Hide up/down buttons for map block - map always stays at the bottom */}
              {block.block_type !== 'map' && (
                <>
                  <button
                    onClick={() => handleMoveBlock(block.id, 'up')}
                    disabled={index === 0 || layoutBusy}
                    style={{
                      width: '30px',
                      height: '30px',
                      backgroundColor: (index === 0 || layoutBusy) ? '#e5e7eb' : '#3E85FC',
                      color: 'white',
                      border: 'none',
                      borderRadius: 0,
                      cursor: (index === 0 || layoutBusy) ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: '500',
                      opacity: (index === 0 || layoutBusy) ? 0.5 : 1,
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
                    disabled={layoutBusy || index === blocks.length - 1 || (blocks[index + 1] && blocks[index + 1].block_type === 'map')}
                    style={{
                      width: '30px',
                      height: '30px',
                      backgroundColor: (layoutBusy || index === blocks.length - 1 || (blocks[index + 1] && blocks[index + 1].block_type === 'map')) ? '#e5e7eb' : '#3E85FC',
                      color: 'white',
                      border: 'none',
                      borderRadius: 0,
                      cursor: (layoutBusy || index === blocks.length - 1 || (blocks[index + 1] && blocks[index + 1].block_type === 'map')) ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: '500',
                      opacity: (layoutBusy || index === blocks.length - 1 || (blocks[index + 1] && blocks[index + 1].block_type === 'map')) ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                    title="Move down"
                  >
                    ↓
                  </button>
                </>
              )}
              {/* Add New Block button - only for non-map blocks */}
              {block.block_type !== 'map' && (
                <button
                  onClick={() => handleAddBlockAfter(block.id)}
                  disabled={layoutBusy}
                  style={{
                    width: '30px',
                    height: '30px',
                    backgroundColor: layoutBusy ? '#e5e7eb' : '#FFDD00',
                    color: '#111827',
                    border: 'none',
                    borderRadius: 0,
                    cursor: layoutBusy ? 'not-allowed' : 'pointer',
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                  title="Add new block below"
                >
                  +
                </button>
              )}
              <button
                onClick={() => handleDuplicateBlock(block.id)}
                style={{
                  width: '90px',
                  height: '30px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 0,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                title="Make a copy"
              >
                Make a copy
              </button>
              <button
                onClick={() => handleEditBlock(block)}
                style={{
                  width: '80px',
                  height: '30px',
                  backgroundColor: '#FFDD00',
                  color: '#111827',
                  border: 'none',
                  borderRadius: 0,
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
                  borderRadius: 0,
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
        <div style={{ height: isTourSettingsCollapsed ? (isMobile ? `calc(115px + env(safe-area-inset-bottom, 0px))` : '65px') : '80vh' }} />
      </div>

      {/* In-progress: block create / reorder (minimal bar + spinner) */}
      {layoutBusy && (
        <>
          <style>{'@keyframes tripVizLayoutSpin { to { transform: rotate(360deg); } }'}</style>
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              minHeight: '28px',
              backgroundColor: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              zIndex: 1002,
              padding: '4px 12px',
              boxSizing: 'border-box',
              borderBottom: '1px solid #bfdbfe'
            }}
          >
            <span
              aria-hidden
              style={{
                width: '14px',
                height: '14px',
                border: '2px solid #2563eb',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'tripVizLayoutSpin 0.65s linear infinite',
                display: 'inline-block',
                flexShrink: 0
              }}
            />
            <span style={{ fontSize: '14px', color: '#1e3a8a', fontWeight: 500 }}>
              <AnimatedProgressText label={layoutBusyMessage} />
            </span>
          </div>
        </>
      )}

      {/* Notification Banner - fixed to top of browser */}
      {showNotification && !layoutBusy && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '25px',
          backgroundColor: '#CEF1D6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          transition: 'opacity 0.3s ease',
          opacity: showNotification ? 1 : 0
        }}>
          <span style={{
            fontSize: '14px',
            color: '#111827',
            fontWeight: '500'
          }}>
            {notificationMessage}
          </span>
        </div>
      )}

      {/* Fixed Bottom Panel - Action buttons and Tour Settings */}
      <div style={{
        position: 'fixed',
        bottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : '0',
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* White button panel - dynamic height: 115px on mobile (increased for safe area), 65px on desktop */}
        <div style={{
          width: '100%',
          height: isMobile ? '115px' : '65px',
          backgroundColor: VISUALIZER_PAGE_BG,
          boxShadow: '0px -20px 18.4px 0px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          padding: isMobile ? `30px 0 calc(30px + env(safe-area-inset-bottom, 0px)) 0` : '0'
        }}>
          {/* Inner container matching content width */}
          <div style={{
            maxWidth: VISUALIZER_CONTENT_MAX_WIDTH,
            width: '100%',
            margin: '0 auto',
            padding: '0 20px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: isMobile ? 'flex-start' : 'space-between',
            gap: '12px',
            marginTop: isMobile ? '30px' : '0' // Поднимаем все кнопки на 30px в мобильной версии (было 20px, добавили еще 10px)
          }}>
            {/* First row on mobile: Add New Block and Save as Draft side by side */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'row',
              alignItems: 'center',
              gap: '12px',
              width: isMobile ? '100%' : 'auto',
              flex: isMobile ? '1' : '0 0 auto'
            }}>
              {/* Add New Block button */}
              <button
                type="button"
                onClick={() => !layoutBusy && setShowBlockSelector(true)}
                disabled={layoutBusy}
                style={{
                  width: isMobile ? '50%' : '145px',
                  height: '40px',
                  backgroundColor: layoutBusy ? '#e5e7eb' : '#FFDD00',
                  color: '#111827',
                  border: 'none',
                  borderRadius: 0,
                  cursor: layoutBusy ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  flex: isMobile ? '1' : '0 0 auto',
                  opacity: layoutBusy ? 0.75 : 1
                }}
                onMouseEnter={(e) => {
                  if (layoutBusy) return;
                  e.target.style.backgroundColor = '#f59e0b';
                }}
                onMouseLeave={(e) => {
                  if (layoutBusy) return;
                  e.target.style.backgroundColor = '#FFDD00';
                }}
              >
                <span style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1 }}>+</span>
                Add New Block
              </button>

              {/* Refresh Photos button - only show if there are location blocks */}
              {blocks.some(b => b.block_type === 'location') && (
                <button
                  onClick={() => handleRefreshPhotos(true)}
                  disabled={isRefreshingPhotos}
                  style={{
                    width: isMobile ? 'auto' : 'auto',
                    height: '40px',
                    backgroundColor: isRefreshingPhotos ? '#dbeafe' : '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #93c5fd',
                    borderRadius: 0,
                    cursor: isRefreshingPhotos ? 'wait' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Refresh expired Google Places photos for all locations"
                >
                  {isRefreshingPhotos ? '⏳' : '🔄'} {isRefreshingPhotos ? <AnimatedProgressText label="Refreshing" /> : 'Refresh Photos'}
                </button>
              )}

              {/* Save as Draft button */}
              <button
                onClick={handleSaveAsDraft}
                disabled={isSavingDraft || isSubmittingForModeration}
                style={{
                  width: isMobile ? '50%' : '105px',
                  height: '40px',
                  backgroundColor: isSavingDraft
                    ? '#bfdbfe'
                    : (lastDraftSavedAt ? '#d1fae5' : '#E9EBEF'),
                  color: '#111827',
                  border: 'none',
                  borderRadius: 0,
                  cursor: (!isSavingDraft && !isSubmittingForModeration) ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  opacity: (!isSavingDraft && !isSubmittingForModeration) ? 1 : 0.6,
                  flex: isMobile ? '1' : '0 0 auto'
                }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#d1d5db';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#E9EBEF';
                  }
                }}
                title=""
              >
                {isSavingDraft ? <AnimatedProgressText label="Saving" /> : (lastDraftSavedAt ? 'Saved' : 'Save as Draft')}
              </button>
            </div>

            {/* Second row on mobile: Submit for Moderation button */}
            {isMobile ? (
              <button
                onClick={() => setIsTourSettingsCollapsed(!isTourSettingsCollapsed)}
                style={{
                  width: '100%',
                  height: '40px',
                  backgroundColor: 'white',
                  color: '#111827',
                  border: '1px solid #D5D7DC',
                  borderRadius: 0,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  marginBottom: '15px'
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
            ) : (
              /* Desktop: Submit for Moderation button on the right */
              <button
                onClick={() => setIsTourSettingsCollapsed(!isTourSettingsCollapsed)}
                style={{
                  width: '185px',
                  height: '40px',
                  backgroundColor: 'white',
                  color: '#111827',
                  border: '1px solid #D5D7DC',
                  borderRadius: 0,
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
            )}
          </div>
        </div>

        {/* Tour Settings Block - Collapsible */}
        {!isTourSettingsCollapsed && (
          <div style={{
            backgroundColor: VISUALIZER_PAGE_BG,
            padding: '24px 0',
            maxHeight: 'calc(80vh - 65px)',
            overflowY: 'auto'
          }}>
            <div style={{
              maxWidth: VISUALIZER_CONTENT_MAX_WIDTH,
              width: '100%',
              margin: '0 auto',
              padding: '0 24px',
              boxSizing: 'border-box',
            }}>
              <div
                role="tablist"
                aria-label="Tour submission"
                style={{
                  display: 'flex',
                  gap: '0',
                  marginBottom: '20px',
                  borderBottom: `1px solid ${VISUALIZER_HEADER_BLOCK_BORDER}`,
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={bottomPanelTab === 'finalization'}
                  onClick={() => setBottomPanelTab('finalization')}
                  style={{
                    padding: '12px 18px',
                    fontSize: '15px',
                    fontWeight: bottomPanelTab === 'finalization' ? 600 : 500,
                    color: bottomPanelTab === 'finalization' ? '#0d0d0d' : '#6b7280',
                    background: 'none',
                    border: 'none',
                    borderBottom: bottomPanelTab === 'finalization' ? '2px solid #0d0d0d' : '2px solid transparent',
                    marginBottom: '-1px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Tour finalization
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={bottomPanelTab === 'settings'}
                  onClick={() => setBottomPanelTab('settings')}
                  style={{
                    padding: '12px 18px',
                    fontSize: '15px',
                    fontWeight: bottomPanelTab === 'settings' ? 600 : 500,
                    color: bottomPanelTab === 'settings' ? '#0d0d0d' : '#6b7280',
                    background: 'none',
                    border: 'none',
                    borderBottom: bottomPanelTab === 'settings' ? '2px solid #0d0d0d' : '2px solid transparent',
                    marginBottom: '-1px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Tour settings
                </button>
              </div>

              {bottomPanelTab === 'finalization' && (
                <TourFinalizationContent
                  tourInfo={tourInfo}
                  tourId={tourId}
                  tourBlocks={blocks}
                  onChange={setTourInfo}
                />
              )}

              {bottomPanelTab === 'settings' && (
              <>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Tour settings
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  Self-guided is the default format. Submit when your tour is ready for moderation (review up to 24 hours).
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500', fontSize: '16px' }}>
                  Tour format
                </label>

                <div style={{
                  padding: '16px',
                  border: `1px solid ${VISUALIZER_HEADER_BLOCK_BORDER}`,
                  borderRadius: 0,
                  marginBottom: '16px',
                  backgroundColor: '#f0fdf4'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked
                      readOnly
                      disabled
                      style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'not-allowed', opacity: 0.9 }}
                    />
                    <strong style={{ fontSize: '16px' }}>Self-guided Tour (PDF)</strong>
                  </div>
                  <div style={{ marginLeft: '26px', color: '#6b7280', fontSize: '14px' }}>
                    Fixed price: <strong style={{ color: '#059669' }}>€{tourSettings.price.pdfPrice || DEFAULT_SELF_GUIDED_PRICE}</strong>
                    <br />
                    <span style={{ fontSize: '12px' }}>Travelers can download the PDF route and explore independently</span>
                  </div>
                </div>

                <div style={{
                  padding: '16px',
                  border: `1px solid ${VISUALIZER_HEADER_BLOCK_BORDER}`,
                  borderRadius: 0,
                  marginBottom: '16px',
                  backgroundColor: '#f9fafb',
                  opacity: 0.85,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={false}
                      readOnly
                      disabled
                      style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'not-allowed' }}
                    />
                    <strong style={{ fontSize: '16px', color: '#6b7280' }}>With guide</strong>
                  </div>
                  <div style={{ marginLeft: '26px', color: '#9ca3af', fontSize: '13px' }}>
                    Coming soon — guided tours will be available in a future update.
                  </div>
                </div>
              </div>

              {/* Submit for Moderation Button */}
              <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={handleSubmitForModeration}
                  disabled={
                    !isHeaderValid() ||
                    !isTourSettingsValid() ||
                    isSavingDraft ||
                    isSubmittingForModeration ||
                    (tour?.status || '').toLowerCase() === 'pending'
                  }
                  style={{
                    width: '100%',
                    padding: '14px 28px',
                    backgroundColor: isSubmittingForModeration
                      ? '#bbf7d0'
                      : ((tour?.status || '').toLowerCase() === 'pending'
                        ? '#d1fae5'
                        : ((isHeaderValid() && isTourSettingsValid()) ? '#4ade80' : '#d1d5db')),
                    color: (isHeaderValid() && isTourSettingsValid()) ? '#111827' : '#9ca3af',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: (isHeaderValid() && isTourSettingsValid() && !isSavingDraft && !isSubmittingForModeration && (tour?.status || '').toLowerCase() !== 'pending')
                      ? 'pointer'
                      : 'not-allowed',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    opacity: (isHeaderValid() && isTourSettingsValid() && !isSavingDraft && !isSubmittingForModeration) ? 1 : 0.6
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
                  title={!isHeaderValid()
                    ? 'Please fill in City, Title, Description, and Preview Photo'
                    : (!isTourSettingsValid()
                      ? 'Tour format settings are incomplete'
                      : ((tour?.status || '').toLowerCase() === 'pending' ? 'Already submitted for moderation' : '')
                    )}
                >
                  {isSubmittingForModeration
                    ? <AnimatedProgressText label="Submitting" />
                    : (((tour?.status || '').toLowerCase() === 'pending' || lastSubmittedAt) ? 'Submitted' : 'Submit for Moderation')}
                </button>
              </div>
              </>
              )}
            </div>
          </div>
        )}
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
          tourId={tourId}
          locationCount={blocks.filter(b => b.block_type === 'location').length}
          tourBlocks={blocks}
          onClose={async () => {
            // Auto-save interests when closing modal if tour exists
            if (tourId && tourInfo.tags && tourInfo.tags.length > 0) {
              console.log('💾 Auto-saving interests on modal close:', tourInfo.tags);
              try {
                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                if (token) {
                  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tours-update?id=${tourId}`, {
                    method: 'PUT',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      city: tourInfo.city,
                      title: tourInfo.title,
                      tags: tourInfo.tags,
                      saveAsDraft: true
                    })
                  });
                  if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Auto-saved interests response:', data);
                    // Update tags from response if available
                    if (data.tour?.tour_tags) {
                      const interestIds = data.tour.tour_tags.map(tt => String(tt.interest?.id || tt.interest_id)).filter(Boolean);
                      console.log('✅ Auto-saved interests IDs from response:', interestIds);
                      if (interestIds.length > 0) {
                        setTourInfo(prev => ({ ...prev, tags: interestIds }));
                      }
                    }
                  } else {
                    const errorText = await response.text();
                    console.error('❌ Could not auto-save interests:', errorText);
                  }
                } else {
                  console.warn('⚠️ No auth token for auto-saving interests');
                }
              } catch (error) {
                console.error('❌ Error auto-saving interests:', error);
              }
            } else {
              console.log('📋 Skipping auto-save - no tourId or no interests:', { tourId, hasTags: !!tourInfo.tags, tagsCount: tourInfo.tags?.length || 0 });
            }
            setShowTourEditor(false);
          }}
          onSave={handleSaveTour}
          isSaving={isSavingHeaderModal || isSavingDraft}
          onChange={setTourInfo}
          onImageUpload={handleImageUpload}
          onAdjustPreviewImage={() => {
            if (!tourInfo.preview) return;
            setImageToCrop(tourInfo.preview);
            setShowImageCrop(true);
          }}
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
          isSaving={isSavingBlock}
          isDeleting={isDeletingBlock}
          onImageUpload={handleImageUpload}
          onOpenLocationSelector={(locationIndex) => {
            // Save current editingLocationIndex to editingBlock before opening selector
            if (editingBlock) {
              setEditingBlock({ ...editingBlock, editingLocationIndex: locationIndex });
            }
            setShowLocationSelector(true);
          }}
          tourCity={tourInfo.city}
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
              // Always use new photos from Google Maps if available, otherwise keep existing
              const newPhotos = locationData.photos || (locationData.photo ? [locationData.photo] : []);
              const existingPhotos = currentContent.mainLocation?.photos || 
                                    (currentContent.mainLocation?.photo ? [currentContent.mainLocation.photo] : []);
              // Use new photos if available, otherwise keep existing
              const finalPhotos = newPhotos.length > 0 ? newPhotos : existingPhotos;
              
              // Ensure we use Google Maps data if available, otherwise keep existing
              const updatedContent = {
                ...currentContent,
                mainLocation: {
                  ...(currentContent.mainLocation || {}),
                  title: locationData.title || currentContent.mainLocation?.title || '',
                  address: locationData.address || currentContent.mainLocation?.address || '',
                  // Coordinates from Google Places
                  lat: locationData.location?.lat || currentContent.mainLocation?.lat || null,
                  lng: locationData.location?.lng || currentContent.mainLocation?.lng || null,
                  // Price level: use Google Maps value if it exists and is not empty
                  price_level: locationData.price_level && locationData.price_level !== '' 
                    ? String(locationData.price_level) 
                    : (currentContent.mainLocation?.price_level || ''),
                  // Approximate cost: use Google Maps value if it exists and is not empty
                  approx_cost: (() => {
                    const googleApproxCost = locationData.approximate_cost || locationData.approx_cost;
                    if (googleApproxCost && String(googleApproxCost).trim() !== '') {
                      return String(googleApproxCost);
                    }
                    return currentContent.mainLocation?.approx_cost || '';
                  })(),
                  photos: finalPhotos, // Use photos array from Google Maps
                  photo: finalPhotos[0] || null, // Keep single photo for backward compatibility
                  place_id: locationData.place_id || currentContent.mainLocation?.place_id || null, // Save place_id for photo refresh
                  rating: locationData.rating !== null && locationData.rating !== undefined 
                    ? Number(locationData.rating) 
                    : (currentContent.mainLocation?.rating || null),
                  user_ratings_total: locationData.user_ratings_total !== null && locationData.user_ratings_total !== undefined 
                    ? Number(locationData.user_ratings_total) 
                    : (currentContent.mainLocation?.user_ratings_total || null),
                  city_id: locationData.city_id || currentContent.mainLocation?.city_id || null,
                  city_name: locationData.city_name || currentContent.mainLocation?.city_name || null
                }
              };
              
              // Force update by creating new object reference
              setEditingBlock({ 
                ...editingBlock, 
                content: updatedContent,
                // Add timestamp to force re-render
                _updated: Date.now()
              });
              
              console.log('🔍 Updated editingBlock with location data:', {
                title: locationData.title,
                address: locationData.address,
                price_level_from_locationData: locationData.price_level,
                price_level_in_updatedContent: updatedContent.mainLocation.price_level,
                approx_cost_from_locationData: locationData.approximate_cost || locationData.approx_cost,
                approx_cost_in_updatedContent: updatedContent.mainLocation.approx_cost,
                rating: locationData.rating,
                user_ratings_total: locationData.user_ratings_total,
                photos: finalPhotos.length,
                city_name: locationData.city_name,
                full_updatedContent_mainLocation: updatedContent.mainLocation
              });
            } else {
              // Updating alternative location
              const alternativeLocations = [...(currentContent.alternativeLocations || [])];
              const newAltPhotos = locationData.photos || (locationData.photo ? [locationData.photo] : []);
              const existingAltPhotos = alternativeLocations[editingLocationIndex]?.photos || 
                                        (alternativeLocations[editingLocationIndex]?.photo ? [alternativeLocations[editingLocationIndex].photo] : []);
              // Use new photos if available, otherwise keep existing
              const finalAltPhotos = newAltPhotos.length > 0 ? newAltPhotos : existingAltPhotos;
              
              alternativeLocations[editingLocationIndex] = {
                ...(alternativeLocations[editingLocationIndex] || {}),
                title: locationData.title || alternativeLocations[editingLocationIndex]?.title || '',
                address: locationData.address || alternativeLocations[editingLocationIndex]?.address || '',
                // Coordinates from Google Places
                lat: locationData.location?.lat || alternativeLocations[editingLocationIndex]?.lat || null,
                lng: locationData.location?.lng || alternativeLocations[editingLocationIndex]?.lng || null,
                // Price level: use Google Maps value if it exists and is not empty
                price_level: locationData.price_level && locationData.price_level !== '' 
                  ? String(locationData.price_level) 
                  : (alternativeLocations[editingLocationIndex]?.price_level || ''),
                // Approximate cost: use Google Maps value if it exists and is not empty
                approx_cost: (() => {
                  const googleApproxCost = locationData.approximate_cost || locationData.approx_cost;
                  if (googleApproxCost && String(googleApproxCost).trim() !== '') {
                    return String(googleApproxCost);
                  }
                  return alternativeLocations[editingLocationIndex]?.approx_cost || '';
                })(),
                photos: finalAltPhotos, // Use photos array from Google Maps
                photo: finalAltPhotos[0] || null, // Keep single photo for backward compatibility
                place_id: locationData.place_id || alternativeLocations[editingLocationIndex]?.place_id || null, // Save place_id for photo refresh
                rating: locationData.rating || alternativeLocations[editingLocationIndex]?.rating || null,
                user_ratings_total: locationData.user_ratings_total || alternativeLocations[editingLocationIndex]?.user_ratings_total || null,
                city_id: locationData.city_id || alternativeLocations[editingLocationIndex]?.city_id || null,
                city_name: locationData.city_name || alternativeLocations[editingLocationIndex]?.city_name || null
              };
              const updatedContent = {
                ...currentContent,
                alternativeLocations
              };
              
              // Force update by creating new object reference
              setEditingBlock({ 
                ...editingBlock, 
                content: updatedContent,
                // Add timestamp to force re-render
                _updated: Date.now()
              });
              
              console.log('Updated alternative location with data:', {
                index: editingLocationIndex,
                title: locationData.title,
                address: locationData.address,
                photos: finalAltPhotos.length
              });
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
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageDisplayHeight, setImageDisplayHeight] = useState(0);
  const containerHeight = 400;

  useEffect(() => {
    setImageLoaded(false);
    setImageLoadError(false);
    if (imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth > 0) {
      handleImageLoad();
    }
  }, [imageSrc]);

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
      setImageLoadError(false);
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

    try {
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
      onCrop(croppedBase64);
    } catch (error) {
      console.error('Failed to crop image:', error);
      alert('Unable to crop this image source. Please re-upload the image and try again.');
    }
  };

  return (
    <VisualizerSidePanel onClose={onClose} zIndex={2000}>
      <div style={{
        width: '100%',
        boxSizing: 'border-box',
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
          <img
            ref={imageRef}
            src={imageSrc}
            crossOrigin="anonymous"
            alt="Crop"
            onLoad={handleImageLoad}
            onError={() => {
              setImageLoadError(true);
              setImageLoaded(false);
            }}
            style={{
              width: '100%',
              height: 'auto',
              display: imageLoadError ? 'none' : 'block',
              transform: `translateY(-${imagePosition}px)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              opacity: imageLoaded ? 1 : 0
            }}
          />
          {!imageLoaded && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6b7280'
            }}>
              {imageLoadError ? 'Failed to load image' : 'Loading image...'}
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
    </VisualizerSidePanel>
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
    <VisualizerSidePanel onClose={onClose} panelBackground="#F0F1F3">
      <div
        style={{
          width: '100%',
          minHeight: '100%',
          boxSizing: 'border-box',
        }}
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
    </VisualizerSidePanel>
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

/** PDF + AI “Generated content” — bottom panel “Tour finalization” (was in Edit tour modal). */
function TourFinalizationContent({ tourInfo, tourId, tourBlocks, onChange }) {
  const [generatingHighlights, setGeneratingHighlights] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [generatingStyledPdf, setGeneratingStyledPdf] = useState(false);
  const [deletingStyledPdf, setDeletingStyledPdf] = useState(false);

  const handleGenerateHighlights = async () => {
    setGeneratingHighlights(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app';
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/generate-highlights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          tourId: tourId,
          tourTitle: tourInfo.title,
          tourDescription: tourInfo.description,
          language: 'English',
          city: tourInfo.city,
          blocks: tourBlocks.map(b => {
            const content = b.content || {};
            const stripped = {};
            for (const [key, value] of Object.entries(content)) {
              if (key === 'photos' || key === 'photo' || key === 'image') continue;
              if (typeof value === 'string' && value.startsWith('data:image/')) continue;
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const nestedStripped = {};
                for (const [nk, nv] of Object.entries(value)) {
                  if (nk === 'photos' || nk === 'photo' || nk === 'image') continue;
                  if (typeof nv === 'string' && nv.startsWith('data:image/')) continue;
                  nestedStripped[nk] = nv;
                }
                stripped[key] = nestedStripped;
              } else {
                stripped[key] = value;
              }
            }
            return {
              block_type: b.block_type,
              content: stripped,
              sort_order: b.sort_order
            };
          })
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Generate highlights server error:', response.status, errorText);
        alert(`Failed to generate highlights (${response.status}). The AI service may be temporarily unavailable. You can fill in the highlights manually.`);
        return;
      }

      const data = await response.json();
      if (data.success && data.highlights) {
        onChange({
          ...tourInfo,
          shortDescription: data.shortDescription || tourInfo.shortDescription || '',
          highlights: {
            ...(tourInfo.highlights || {}),
            icon3: data.highlights.icon3 || (tourInfo.highlights || {}).icon3 || '',
            text3: data.highlights.text3 || (tourInfo.highlights || {}).text3 || '',
            icon4: data.highlights.icon4 || (tourInfo.highlights || {}).icon4 || '',
            text4: data.highlights.text4 || (tourInfo.highlights || {}).text4 || '',
            icon5: data.highlights.icon5 || (tourInfo.highlights || {}).icon5 || '',
            text5: data.highlights.text5 || (tourInfo.highlights || {}).text5 || ''
          }
        });
      } else {
        console.error('Failed to generate highlights:', data.error);
        alert(`Failed to generate highlights: ${data.error || 'Unknown error'}. You can fill in the highlights manually.`);
      }
    } catch (error) {
      console.error('Error generating highlights:', error);
      alert(`Failed to generate highlights: ${error.message}. Please check your connection and try again.`);
    } finally {
      setGeneratingHighlights(false);
    }
  };

  const handleTourPdfUpload = async (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert('PDF is too large. Maximum file size is 50MB.');
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      alert('Please upload a PDF file.');
      return;
    }

    if (!tourId) {
      alert('Please save the tour as draft first, then upload the PDF.');
      return;
    }

    setUploadingPdf(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://fliptripback.vercel.app';
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      const signedResp = await fetch(`${API_BASE_URL}/api/upload-tour-pdf-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          tourId,
          fileName: file.name,
          contentType: 'application/pdf',
          fileSize: file.size
        })
      });

      const signedData = await signedResp.json();
      if (!signedResp.ok || !signedData?.success) {
        throw new Error(signedData?.error || 'Failed to initialize PDF upload');
      }

      const uploadTarget = signedData.uploadUrl || signedData.signedUrl;
      const uploadResp = await fetch(uploadTarget, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf'
        },
        body: file
      });

      if (!uploadResp.ok) {
        const uploadErrorText = await uploadResp.text().catch(() => '');
        throw new Error(`Failed to upload PDF (${uploadResp.status}) ${uploadErrorText ? `- ${uploadErrorText.slice(0, 240)}` : ''}`);
      }

      onChange({ ...tourInfo, tourPdfUrl: signedData.publicUrl });
      alert('Tour PDF uploaded successfully.');
    } catch (error) {
      console.error('Error uploading tour PDF:', error);
      alert(`Failed to upload PDF: ${error.message}`);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleGenerateStyledPdf = async () => {
    if (!tourId) {
      alert('Please save the tour as draft first, then generate styled PDF.');
      return;
    }

    setGeneratingStyledPdf(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://fliptripback.vercel.app';
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      const previewResponse = await fetch(`${API_BASE_URL}/api/generate-styled-tour-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          tourId,
          template: tourInfo.pdfTemplate || 'classic',
          layout: tourInfo.pdfLayout || {},
          previewHtml: true
        })
      });

      const previewData = await previewResponse.json();
      if (!previewResponse.ok || !previewData?.success || !previewData?.previewHtml) {
        throw new Error(previewData?.error || 'Failed to build styled PDF HTML');
      }

      const pdfBlob = await buildPdfBlobFromStyledPreviewHtml(previewData.previewHtml);

      const generatedFile = new File([pdfBlob], `styled-${Date.now()}.pdf`, {
        type: 'application/pdf'
      });

      const signedResp = await fetch(`${API_BASE_URL}/api/upload-tour-pdf-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          tourId,
          fileName: generatedFile.name,
          contentType: 'application/pdf',
          fileSize: generatedFile.size
        })
      });
      const signedData = await signedResp.json();
      if (!signedResp.ok || !signedData?.success) {
        throw new Error(signedData?.error || 'Failed to initialize PDF upload');
      }

      const uploadTarget = signedData.uploadUrl || signedData.signedUrl;
      const uploadResp = await fetch(uploadTarget, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: generatedFile
      });
      if (!uploadResp.ok) {
        const uploadErrorText = await uploadResp.text().catch(() => '');
        throw new Error(`Failed to upload generated PDF (${uploadResp.status}) ${uploadErrorText ? `- ${uploadErrorText.slice(0, 240)}` : ''}`);
      }

      onChange({
        ...tourInfo,
        tourPdfUrl: signedData.publicUrl || tourInfo.tourPdfUrl || '',
        pdfTemplate: tourInfo.pdfTemplate || 'classic',
        pdfLayout: tourInfo.pdfLayout || {}
      });

      if (previewData?.mapIncluded === false) {
        alert(`PDF generated, but map was not included: ${previewData?.mapIssue || 'Map generation failed.'}`);
      } else {
        alert('PDF generated successfully.');
      }
    } catch (error) {
      console.error('Error generating styled PDF:', error);
      alert(`Failed to generate styled PDF: ${error.message}`);
    } finally {
      setGeneratingStyledPdf(false);
    }
  };

  const handleDeleteStyledPdf = async () => {
    if (!tourId || !tourInfo?.tourPdfUrl) return;
    if (!window.confirm('Delete generated PDF?')) return;

    setDeletingStyledPdf(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://fliptripback.vercel.app';
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/delete-tour-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ tourId })
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to delete PDF');
      }

      onChange({ ...tourInfo, tourPdfUrl: '' });
      alert('PDF deleted.');
    } catch (error) {
      console.error('Error deleting styled PDF:', error);
      alert(`Failed to delete PDF: ${error.message}`);
    } finally {
      setDeletingStyledPdf(false);
    }
  };

  const quick = mergeTourQuickStats(tourInfo.tourQuickStats);
  /** Functional update so rapid edits / multiple fields don’t clobber each other */
  const setQuick = (patch) =>
    onChange((prev) => ({
      ...prev,
      tourQuickStats: mergeTourQuickStats({
        ...mergeTourQuickStats(prev.tourQuickStats),
        ...patch,
      }),
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
      <div style={{ padding: '0', backgroundColor: 'transparent', boxSizing: 'border-box' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '15px' }}>
          Tour at a glance
        </label>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 12px 0' }}>
          Optional. Shown on the public tour preview between the description and &quot;What&apos;s Inside This Walk&quot; when at least one value is filled. Sub-labels on the site are fixed (Walking tour, Total route distance, Estimated budget).
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px',
          }}
        >
          {[
            {
              title: 'Time',
              valueKey: 'durationValue',
              valuePh: '~8 hours',
            },
            {
              title: 'Distance',
              valueKey: 'distanceValue',
              valuePh: '23.3 km',
            },
            {
              title: 'Budget',
              valueKey: 'budgetValue',
              valuePh: '€100–200',
            },
          ].map((col) => (
            <div key={col.title} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{col.title}</span>
              <input
                type="text"
                value={quick[col.valueKey] || ''}
                onChange={(e) => setQuick({ [col.valueKey]: e.target.value })}
                placeholder={col.valuePh}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #bfdbfe',
                  borderRadius: 0,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0', backgroundColor: 'transparent', boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px 14px',
            marginBottom: '10px',
          }}
        >
          <span style={{ fontWeight: '600', fontSize: '15px', color: '#111827' }}>Tour PDF presentation</span>
          <span style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>
            Generate or upload a PDF (max 50MB).
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={handleGenerateStyledPdf}
            disabled={generatingStyledPdf}
            style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: generatingStyledPdf ? '#9ca3af' : '#2563eb', color: 'white', border: 'none', borderRadius: 0, cursor: generatingStyledPdf ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '500' }}
          >
            {generatingStyledPdf ? 'Generating PDF...' : 'Generate PDF'}
          </button>
          {tourInfo.tourPdfUrl ? (
            <>
              <a href={tourInfo.tourPdfUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#2563eb', padding: '8px 4px', whiteSpace: 'nowrap' }}>
                View PDF
              </a>
              <button
                type="button"
                onClick={handleDeleteStyledPdf}
                disabled={deletingStyledPdf}
                style={{ padding: '8px 12px', backgroundColor: deletingStyledPdf ? '#9ca3af' : '#ef4444', color: 'white', border: 'none', borderRadius: 0, cursor: deletingStyledPdf ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '500' }}
              >
                {deletingStyledPdf ? 'Deleting...' : 'Delete PDF'}
              </button>
            </>
          ) : null}
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleTourPdfUpload(file);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
            id="tour-pdf-upload-panel"
          />
          <label htmlFor="tour-pdf-upload-panel" style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: uploadingPdf ? '#9ca3af' : '#111827', color: 'white', border: 'none', borderRadius: 0, cursor: uploadingPdf ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '500' }}>
            {uploadingPdf ? 'Uploading PDF...' : 'Upload tour PDF'}
          </label>
        </div>
      </div>

      <div style={{ padding: '0', backgroundColor: 'transparent', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '2px', fontWeight: '600' }}>
              Generated content
            </label>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
              Three editable bullets + short homepage description.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateHighlights}
            disabled={generatingHighlights || tourBlocks.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              border: 'none',
              borderRadius: 0,
              background: generatingHighlights ? 'linear-gradient(135deg, #a78bfa, #818cf8)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: 'white',
              fontSize: '13px',
              fontWeight: '600',
              cursor: generatingHighlights || tourBlocks.length === 0 ? 'not-allowed' : 'pointer',
              opacity: tourBlocks.length === 0 ? 0.5 : 1
            }}
          >
            {generatingHighlights ? 'Generating...' : '✨ Generate with AI'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                Creative tagline
              </label>
              <input
                type="text"
                value={(tourInfo.highlights || {}).text3 || ''}
                onChange={(e) => onChange({ ...tourInfo, highlights: { ...(tourInfo.highlights || {}), text3: e.target.value } })}
                placeholder="What makes this tour unique?"
                style={{ width: '100%', padding: '10px', border: '1px solid #bfdbfe', borderRadius: 0, fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                Theme / vibe
              </label>
              <input
                type="text"
                value={(tourInfo.highlights || {}).text4 || ''}
                onChange={(e) => onChange({ ...tourInfo, highlights: { ...(tourInfo.highlights || {}), text4: e.target.value } })}
                placeholder="What kind of experience is it?"
                style={{ width: '100%', padding: '10px', border: '1px solid #bfdbfe', borderRadius: 0, fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                What&apos;s also inside
              </label>
              <input
                type="text"
                value={(tourInfo.highlights || {}).text5 || ''}
                onChange={(e) => onChange({ ...tourInfo, highlights: { ...(tourInfo.highlights || {}), text5: e.target.value } })}
                placeholder="Add one specific detail"
                style={{ width: '100%', padding: '10px', border: '1px solid #bfdbfe', borderRadius: 0, fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
              Short description for homepage card
            </label>
            <textarea
              value={tourInfo.shortDescription || ''}
              onChange={(e) => onChange({ ...tourInfo, shortDescription: e.target.value.slice(0, 180) })}
              placeholder="Two short vivid sentences for the homepage card"
              maxLength={180}
              rows={8}
              style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: 0, fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <p style={{ marginTop: '4px', marginBottom: 0, fontSize: '12px', color: '#6b7280' }}>
              {(tourInfo.shortDescription || '').length}/180 chars
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TourEditorModal({ tourInfo, tourId, onClose, onSave, isSaving = false, onChange, onImageUpload, onAdjustPreviewImage, locationCount = 0, tourBlocks = [], cities = [], citySuggestions = [], showCitySuggestions = false, setCitySuggestions, setShowCitySuggestions }) {
  const [interestsStructure, setInterestsStructure] = useState(null);
  const [availableInterests, setAvailableInterests] = useState([]);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [newInterestInput, setNewInterestInput] = useState('');
  const [interestSuggestions, setInterestSuggestions] = useState([]);
  const [showInterestSuggestions, setShowInterestSuggestions] = useState(false);

  // Load interests structure
  useEffect(() => {
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
          console.log('✅ Loaded interests for modal:', {
            totalCount: allInterests.length,
            interestIds: allInterests.slice(0, 10).map(i => i.id),
            categoriesCount: data.categories.length
          });
          setAvailableInterests(allInterests);
        } else {
          console.warn('⚠️ Failed to load interests structure:', data);
        }
      } catch (err) {
        console.error('Error loading interests:', err);
      } finally {
        setLoadingInterests(false);
      }
    };
    loadInterests();
  }, []);

  // Get current tags (interests) from tourInfo - use useMemo to ensure reactivity
  const currentTags = useMemo(
    () => (Array.isArray(tourInfo.tags) ? tourInfo.tags : []),
    [tourInfo.tags]
  );
  
  // Handle interest selection - save immediately to DB
  const handleInterestSelect = async (interestId) => {
    if (!currentTags.includes(interestId)) {
      const newTags = [...currentTags, interestId];
      onChange({ ...tourInfo, tags: newTags });
      
      // CRITICAL: Save to DB immediately if tour exists
      if (tourId) {
        console.log('💾 Auto-saving interest immediately on select:', interestId);
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://fliptripback.vercel.app';
          const token = localStorage.getItem('authToken') || localStorage.getItem('token');
          if (token) {
            const response = await fetch(`${API_BASE_URL}/api/tours-update?id=${tourId}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                city: tourInfo.city,
                title: tourInfo.title,
                tags: newTags,
                saveAsDraft: true
              })
            });
            if (response.ok) {
              const data = await response.json();
              console.log('✅ Interest saved immediately on select');
              // Update from response to ensure sync
              if (data.tour?.tour_tags) {
                const interestIds = data.tour.tour_tags.map(tt => String(tt.interest?.id || tt.interest_id)).filter(Boolean);
                if (interestIds.length > 0) {
                  onChange({ ...tourInfo, tags: interestIds });
                }
              }
            } else {
              console.error('❌ Failed to save interest:', await response.text());
            }
          }
        } catch (error) {
          console.error('❌ Error auto-saving interest:', error);
        }
      }
    }
  };

  // Handle interest removal - save immediately to DB
  const handleInterestRemove = async (interestId) => {
    const newTags = currentTags.filter(id => id !== interestId);
    onChange({ ...tourInfo, tags: newTags });
    
    // CRITICAL: Save to DB immediately if tour exists
    if (tourId) {
      console.log('💾 Auto-saving interest removal immediately:', interestId);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://fliptripback.vercel.app';
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (token) {
          const response = await fetch(`${API_BASE_URL}/api/tours-update?id=${tourId}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              city: tourInfo.city,
              title: tourInfo.title,
              tags: newTags,
              saveAsDraft: true
            })
          });
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Interest removal saved immediately');
            // Update from response to ensure sync
            if (data.tour?.tour_tags) {
              const interestIds = data.tour.tour_tags.map(tt => String(tt.interest?.id || tt.interest_id)).filter(Boolean);
              onChange({ ...tourInfo, tags: interestIds });
            }
          } else {
            console.error('❌ Failed to save interest removal:', await response.text());
          }
        }
      } catch (error) {
        console.error('❌ Error auto-saving interest removal:', error);
      }
    }
  };

  // Handle new interest input with suggestions
  const handleNewInterestInput = (value) => {
    setNewInterestInput(value);
    if (value.length > 1) {
      // Search across all interests (not just selected category) to avoid duplicates
      const matches = availableInterests.filter(interest =>
        interest.name.toLowerCase().includes(value.toLowerCase()) &&
        !currentTags.includes(interest.id)
      );
      setInterestSuggestions(matches.slice(0, 5));
      setShowInterestSuggestions(matches.length > 0);
    } else {
      setInterestSuggestions([]);
      setShowInterestSuggestions(false);
    }
  };

  const handleAddInterestFromInput = async () => {
    const value = newInterestInput.trim();
    if (!value) return;

    const existingInterest = availableInterests.find(
      (interest) => String(interest.name || '').trim().toLowerCase() === value.toLowerCase()
    );

    if (existingInterest) {
      await handleInterestSelect(existingInterest.id);
      setNewInterestInput('');
      setInterestSuggestions([]);
      setShowInterestSuggestions(false);
      return;
    }

    await handleCreateNewInterest();
  };

  // Create new interest
  const handleCreateNewInterest = async () => {
    if (!newInterestInput.trim()) return;
    
    // Check if suggestion was selected
    if (interestSuggestions.length > 0 && showInterestSuggestions) {
      // User should select from suggestions instead
      return;
    }
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://fliptripback.vercel.app';
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      const fallbackCategoryId =
        interestsStructure?.[0]?.id ||
        interestsStructure?.find((category) => category.id)?.id ||
        null;

      if (!fallbackCategoryId) {
        alert('Failed to create interest: category list is not loaded yet.');
        return;
      }

      // Create new interest
      const response = await fetch(`${API_BASE_URL}/api/interests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newInterestInput.trim(),
          category_id: fallbackCategoryId
        })
      });
      
      const data = await response.json();
      if (data.success && data.interest) {
        const newTags = [...currentTags, data.interest.id];
        // Add new interest to tags
        onChange({ ...tourInfo, tags: newTags });
        setNewInterestInput('');
        setInterestSuggestions([]);
        setShowInterestSuggestions(false);
        
        // CRITICAL: Save to DB immediately if tour exists
        if (tourId) {
          console.log('💾 Auto-saving newly created interest immediately:', data.interest.id);
          try {
            const saveResponse = await fetch(`${API_BASE_URL}/api/tours-update?id=${tourId}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                city: tourInfo.city,
                title: tourInfo.title,
                tags: newTags,
                saveAsDraft: true
              })
            });
            if (saveResponse.ok) {
              const saveData = await saveResponse.json();
              console.log('✅ Newly created interest saved immediately');
              // Update from response to ensure sync
              if (saveData.tour?.tour_tags) {
                const interestIds = saveData.tour.tour_tags.map(tt => String(tt.interest?.id || tt.interest_id)).filter(Boolean);
                if (interestIds.length > 0) {
                  onChange({ ...tourInfo, tags: interestIds });
                }
              }
            } else {
              console.error('❌ Failed to save newly created interest:', await saveResponse.text());
            }
          } catch (error) {
            console.error('❌ Error saving newly created interest:', error);
          }
        }
        
        // Reload interests structure to include new interest
        const reloadResponse = await fetch(`${API_BASE_URL}/api/interests?full_structure=true`);
        const reloadData = await reloadResponse.json();
        if (reloadData.success && reloadData.categories) {
          setInterestsStructure(reloadData.categories || []);
          const allInterests = [];
          reloadData.categories.forEach(category => {
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
      } else {
        alert(data.error || 'Failed to create interest');
      }
    } catch (error) {
      console.error('Error creating interest:', error);
      alert('Failed to create interest. Please try again.');
    }
  };

  return (
    <VisualizerSidePanel onClose={onClose}>
      <style>{`@keyframes highlightSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Edit tour</h2>
          <button onClick={onClose} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        
        <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <div>
            <div style={{ marginBottom: '14px', position: 'relative' }} className="city-autocomplete-container">
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                City *
                <HintButton hintKey="city" />
              </label>
              <input
                type="text"
                value={tourInfo.city}
                onChange={async (e) => {
                  const value = e.target.value;
                  onChange({ ...tourInfo, city: value });
                  if (value.length > 1) {
                    try {
                      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://fliptripback.vercel.app';
                      const response = await fetch(`${API_BASE_URL}/api/admin-cities?search=${encodeURIComponent(value)}`);
                      const data = await response.json();
                      if (data.success && data.cities) {
                        if (setCitySuggestions) setCitySuggestions(data.cities);
                        if (setShowCitySuggestions) setShowCitySuggestions(data.cities.length > 0);
                      } else {
                        if (setCitySuggestions) setCitySuggestions([]);
                        if (setShowCitySuggestions) setShowCitySuggestions(false);
                      }
                    } catch (err) {
                      console.error('Error searching cities:', err);
                      if (setCitySuggestions) setCitySuggestions([]);
                      if (setShowCitySuggestions) setShowCitySuggestions(false);
                    }
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
                onBlur={() => {
                  // Do not clear free-typed cities: list is a hint only (many places are not in DB)
                  setTimeout(() => {
                    if (setShowCitySuggestions) setShowCitySuggestions(false);
                  }, 200);
                }}
                style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}
              />
              {showCitySuggestions && citySuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  {citySuggestions.map((city, index) => {
                    const cityName = typeof city === 'string' ? city : city.name;
                    const displayName = typeof city === 'string' ? city : (city.displayName || city.name);
                    return (
                      <div
                        key={city.id || cityName || index}
                        onClick={() => {
                          onChange({ ...tourInfo, city: cityName });
                          if (setCitySuggestions) setCitySuggestions([]);
                          if (setShowCitySuggestions) setShowCitySuggestions(false);
                        }}
                        style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: index < citySuggestions.length - 1 ? '1px solid #e5e7eb' : 'none' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        {displayName}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                Trip name *
                <HintButton hintKey="tripName" />
              </label>
              <input
                type="text"
                value={tourInfo.title}
                onChange={(e) => onChange({ ...tourInfo, title: e.target.value })}
                style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                Tour Description *
                <HintButton hintKey="noteFromAuthor" />
              </label>
              <textarea
                value={tourInfo.description}
                onChange={(e) => onChange({ ...tourInfo, description: e.target.value })}
                rows={10}
                style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                Preview Photo *
                <HintButton hintKey="previewPhoto" />
              </label>
              <div style={{ width: '100%', height: '280px', border: '2px dashed #d1d5db', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', backgroundColor: '#f9fafb' }}>
                {tourInfo.preview ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <img src={tourInfo.preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                    <button
                      onClick={() => onAdjustPreviewImage && onAdjustPreviewImage()}
                      style={{ position: 'absolute', top: '8px', right: '8px', padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
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
                      onChange({ ...tourInfo, preview: base64, previewOriginal: base64 });
                    });
                  }
                }}
                style={{ display: 'none' }}
                id="tour-preview-upload"
              />
              <label htmlFor="tour-preview-upload" style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                Choose photo
              </label>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', marginBottom: 0 }}>
                JPG, PNG or GIF. Max size 5MB
              </p>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Additional images
              </label>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 0, marginBottom: '10px' }}>
                Upload multiple photos and choose which one is the main image.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {(Array.isArray(tourInfo.previewImages) ? tourInfo.previewImages : []).map((img, idx) => (
                  <div
                    key={idx}
                    title="Click to make this the main preview"
                    onClick={() => {
                      const galleryImages = [...(Array.isArray(tourInfo.previewImages) ? tourInfo.previewImages : [])];
                      const selectedMain = galleryImages[idx];
                      const currentMain = tourInfo.preview;
                      galleryImages.splice(idx, 1);
                      const nextImages = currentMain ? [currentMain, ...galleryImages] : galleryImages;
                      onChange({ ...tourInfo, preview: selectedMain, previewOriginal: selectedMain, previewImages: nextImages });
                    }}
                    style={{ position: 'relative', width: '62px', height: '62px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb', cursor: 'pointer' }}
                  >
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={(e) => {
                        // Prevent triggering "set as main" click on parent
                        e.stopPropagation();
                        const newImages = (Array.isArray(tourInfo.previewImages) ? tourInfo.previewImages : []).filter((_, i) => i !== idx);
                        onChange({ ...tourInfo, previewImages: newImages });
                      }}
                      style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '10px', lineHeight: '1', padding: '0' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <label
                  htmlFor="tour-gallery-upload"
                  style={{ width: '62px', height: '62px', borderRadius: '8px', border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9ca3af', fontSize: '20px' }}
                >
                  +
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    if (files.length > 0 && onImageUpload) {
                      let currentImages = [...(Array.isArray(tourInfo.previewImages) ? tourInfo.previewImages : [])];
                      files.forEach(file => {
                        onImageUpload(file, (base64) => {
                          currentImages = [...currentImages, base64];
                          onChange({ ...tourInfo, previewImages: currentImages });
                        });
                      });
                    }
                    e.target.value = '';
                  }}
                  style={{ display: 'none' }}
                  id="tour-gallery-upload"
                />
              </div>
            </div>

          </div>
        </div>

        <div style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px', position: 'relative' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
            Tour interests
          </label>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 0, marginBottom: '10px' }}>
            Add interests in one field. Existing interests are suggested automatically.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              value={newInterestInput}
              onChange={(e) => handleNewInterestInput(e.target.value)}
              onFocus={() => {
                if (interestSuggestions.length > 0) setShowInterestSuggestions(true);
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  await handleAddInterestFromInput();
                }
              }}
              placeholder="Enter interest and press Add"
              style={{ flex: 1, padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={handleAddInterestFromInput}
              disabled={!newInterestInput.trim()}
              style={{ padding: '12px 16px', backgroundColor: !newInterestInput.trim() ? '#9ca3af' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: !newInterestInput.trim() ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              Add
            </button>
          </div>

          {showInterestSuggestions && interestSuggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '98px', left: '14px', right: '14px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              {interestSuggestions.map((interest, index) => (
                <div
                  key={interest.id}
                  onClick={() => {
                    handleInterestSelect(interest.id);
                    setNewInterestInput('');
                    setInterestSuggestions([]);
                    setShowInterestSuggestions(false);
                  }}
                  style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: index < interestSuggestions.length - 1 ? '1px solid #e5e7eb' : 'none' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  {interest.name}
                </div>
              ))}
            </div>
          )}

          {currentTags.length > 0 && (
            <div style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {currentTags.map(tagId => {
                  const tagIdString = String(tagId);
                  if (loadingInterests || availableInterests.length === 0) {
                    return (
                      <span key={tagIdString} style={{ padding: '6px 12px', backgroundColor: '#f3f4f6', borderRadius: '20px', fontSize: '14px', color: '#6b7280' }}>
                        Loading...
                      </span>
                    );
                  }
                  const interest = availableInterests.find(i => String(i.id) === tagIdString);
                  if (!interest) return null;
                  return (
                    <span key={tagId} style={{ height: '30px', padding: '0 12px', backgroundColor: 'white', color: '#111827', borderRadius: '10px', fontSize: '10px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #DEDEDE' }}>
                      {interest.name}
                      <button type="button" onClick={() => handleInterestRemove(tagId)} style={{ background: 'none', border: 'none', color: '#111827', cursor: 'pointer', fontSize: '14px', padding: '0', lineHeight: '1', fontWeight: 'bold', marginLeft: '4px' }}>
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            disabled={isSaving}
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Close
          </button>
          <button
            disabled={isSaving}
            onClick={onSave}
            style={{
              padding: '10px 20px',
              backgroundColor: isSaving ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </VisualizerSidePanel>
  );
}

function BlockEditorModal({ block, onClose, onSave, onDelete, onImageUpload, onOpenLocationSelector, tourCity, isSaving = false, isDeleting = false }) {
  // Helper function to normalize content
  const normalizeContent = (contentToNormalize) => {
    if (!contentToNormalize || Object.keys(contentToNormalize).length === 0) {
      // Return default content based on block type
      if (block.block_type === 'location') {
        // Get default enableTimeField from localStorage preference
        const localStoragePreference = localStorage.getItem('locationBlock_enableTimeField');
        const defaultEnableTimeField = localStoragePreference !== null 
          ? localStoragePreference === 'true' 
          : false; // Default to false if no preference
        
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
            approx_cost: '',
            city_id: null,
            city_name: null
          },
          alternativeLocations: [],
          enableTimeField: defaultEnableTimeField
        };
      }
      if (block.block_type === 'title') {
        return { text: '', size: 'large', fontWeight: 'medium' };
      }
      if (block.block_type === 'photo') {
        return { photos: [], caption: '', layout: 'container', isPlaceholder: true };
      }
      return {};
    }
    
    // Check if old format (for location blocks)
    const isOldFormat = !contentToNormalize.mainLocation && (contentToNormalize.title || contentToNormalize.time);
    
    if (block.block_type === 'location') {
      if (isOldFormat) {
        // Convert old format to new format
        // Get default enableTimeField from localStorage preference
        const localStoragePreference = localStorage.getItem('locationBlock_enableTimeField');
        const defaultEnableTimeField = localStoragePreference !== null 
          ? localStoragePreference === 'true' 
          : false; // Default to false if no preference
        
        return {
          mainLocation: {
            ...contentToNormalize,
            city_id: contentToNormalize.city_id || null,
            city_name: contentToNormalize.city_name || null
          },
          alternativeLocations: [],
          enableTimeField: defaultEnableTimeField
        };
      }
      
      // Ensure mainLocation structure exists
      // Preserve enableTimeField from saved content or get from localStorage preference
      const savedEnableTimeField = contentToNormalize.enableTimeField;
      const localStoragePreference = localStorage.getItem('locationBlock_enableTimeField');
      const defaultEnableTimeField = localStoragePreference !== null 
        ? localStoragePreference === 'true' 
        : false; // Default to false if no preference
      
      return {
        mainLocation: contentToNormalize.mainLocation ? {
          ...contentToNormalize.mainLocation,
          city_id: contentToNormalize.mainLocation.city_id || null,
          city_name: contentToNormalize.mainLocation.city_name || null
        } : {
          time: '09:00 - 12:00',
          title: '',
          address: '',
          description: '',
          photo: null,
          recommendations: '',
          category: null,
          interests: [],
          price_level: '',
          approx_cost: '',
          city_id: null,
          city_name: null
        },
        alternativeLocations: contentToNormalize.alternativeLocations || [],
        enableTimeField: savedEnableTimeField !== undefined ? savedEnableTimeField : defaultEnableTimeField
      };
    }

    if (block.block_type === 'title') {
      return {
        ...contentToNormalize,
        text: contentToNormalize.text ?? '',
        size: contentToNormalize.size || 'large',
        fontWeight: contentToNormalize.fontWeight || 'medium'
      };
    }

    if (block.block_type === 'photo') {
      const raw = contentToNormalize.photos || (contentToNormalize.photo ? [contentToNormalize.photo] : []);
      const photosArr = Array.isArray(raw) ? raw.filter(Boolean) : [];
      return {
        ...contentToNormalize,
        photos: photosArr,
        photo: undefined,
        caption: contentToNormalize.caption || '',
        layout: contentToNormalize.layout || 'container'
      };
    }
    
    // For other blocks, return as is
    return contentToNormalize;
  };
  
  const initialContent = block.content || {};
  const [content, setContent] = useState(() => normalizeContent(initialContent));
  
  // Update content when block changes (e.g., after save and reload, or when Google Maps selection updates it)
  useEffect(() => {
    const updatedContent = normalizeContent(block.content || {});
    setContent(updatedContent);
  }, [block.id, block.content, block._updated]); // Add _updated to dependencies to catch Google Maps updates
  
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

  // Interests structure loading removed - interests are now edited in tour header only

  const handleSave = async () => {
    if (isSaving || isDeleting) return;
    await onSave({ ...block, content });
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
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Font weight
              </label>
              <select
                value={content.fontWeight || 'medium'}
                onChange={(e) => setContent({ ...content, fontWeight: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="light">Light</option>
                <option value="regular">Regular</option>
                <option value="medium">Medium</option>
                <option value="semibold">Semibold</option>
                <option value="bold">Bold</option>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                Photos
                <HintButton hintKey="photoText" />
              </label>
              
              {/* Photo preview carousel */}
              <div style={{
                width: '100%',
                height: '200px',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                backgroundColor: '#f9fafb',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {(() => {
                  const photos = content.photos || (content.photo ? [content.photo] : []);
                  if (photos.length > 0) {
                    const currentPhoto = photos[0];
                    return (
                      <>
                        <img 
                          src={currentPhoto} 
                          alt="Preview" 
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%', 
                            objectFit: 'contain' 
                          }} 
                        />
                        {photos.length > 1 && (
                          <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: '4px'
                          }}>
                            {photos.map((_, index) => (
                              <div
                                key={index}
                                style={{
                                  width: index === 0 ? '20px' : '6px',
                                  height: '6px',
                                  borderRadius: '3px',
                                  backgroundColor: index === 0 ? '#3b82f6' : '#d1d5db',
                                  transition: 'all 0.3s ease'
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    );
                  }
                  return <span style={{ color: '#6b7280' }}>No photos selected</span>;
                })()}
              </div>
              
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0 && onImageUpload) {
                    // Upload all files
                    const uploadPromises = files.map(file => 
                      new Promise((resolve) => {
                        onImageUpload(file, (base64) => {
                          resolve(base64);
                        });
                      })
                    );
                    
                    const uploadedPhotos = await Promise.all(uploadPromises);
                    const existingPhotos = content.photos || (content.photo ? [content.photo] : []);
                    setContent({ 
                      ...content, 
                      photos: [...existingPhotos, ...uploadedPhotos],
                      photo: undefined // Remove old single photo field
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
                  fontWeight: '500',
                  marginBottom: '8px',
                  marginRight: '8px'
                }}
              >
                Add photos
              </label>
              
              {/* Remove photos button */}
              {(() => {
                const photos = content.photos || (content.photo ? [content.photo] : []);
                if (photos.length > 0) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setContent({ 
                          ...content, 
                          photos: [],
                          photo: undefined
                        });
                      }}
                      style={{
                        display: 'inline-block',
                        padding: '10px 20px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '8px'
                      }}
                    >
                      Remove all photos
                    </button>
                  );
                }
                return null;
              })()}
              
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                JPG, PNG or GIF. Max size 5MB per image. You can select multiple photos at once.
              </p>
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
                Layout
              </label>
              <select
                value={content.layout || 'container'}
                onChange={(e) => setContent({ ...content, layout: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="container">Full width of content column</option>
                <option value="gallery">Gallery (next photo peeks in)</option>
                <option value="fullBleed">Full screen width (scroll, natural proportions)</option>
              </select>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '8px 0 0 0' }}>
                Gallery matches the location strip (fixed slide width, next photo peeks). Full screen width spans the viewport edge to edge with a horizontal scroll row: each photo keeps its aspect ratio and sits one after another.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Photos *
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0 && onImageUpload) {
                    const uploadPromises = files.map(file =>
                      new Promise((resolve) => {
                        onImageUpload(file, (base64) => {
                          resolve(base64);
                        });
                      })
                    );
                    const uploadedPhotos = await Promise.all(uploadPromises);
                    const existingPhotos = content.photos || (content.photo ? [content.photo] : []);
                    setContent({
                      ...content,
                      photos: [...existingPhotos, ...uploadedPhotos],
                      photo: undefined
                    });
                  }
                }}
                style={{ display: 'none' }}
                id={`photo-upload-${block.id}`}
              />
              <label
                htmlFor={`photo-upload-${block.id}`}
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
                  marginBottom: '8px',
                  marginRight: '8px'
                }}
              >
                Add photos
              </label>

              {(() => {
                const photos = content.photos || (content.photo ? [content.photo] : []);
                if (photos.length === 0) return null;
                const movePhoto = (fromIndex, toIndex) => {
                  if (toIndex < 0 || toIndex >= photos.length) return;
                  const updated = [...photos];
                  const [moved] = updated.splice(fromIndex, 1);
                  updated.splice(toIndex, 0, moved);
                  setContent({ ...content, photos: updated, photo: undefined });
                };
                const removePhotoAt = (indexToRemove) => {
                  const updated = photos.filter((_, idx) => idx !== indexToRemove);
                  setContent({ ...content, photos: updated, photo: undefined });
                };
                return (
                  <div style={{
                    marginBottom: '12px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
                    gap: '10px'
                  }}>
                    {photos.map((photo, index) => (
                      <div
                        key={`${index}-${photo?.slice?.(0, 30) || 'p'}`}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '6px',
                          backgroundColor: '#fff'
                        }}
                      >
                        <img
                          src={refreshPhotoUrl(photo)}
                          alt={`Photo ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '72px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            marginBottom: '6px'
                          }}
                        />
                        <div style={{
                          fontSize: '11px',
                          color: '#6b7280',
                          marginBottom: '6px',
                          textAlign: 'center',
                          fontWeight: index === 0 ? '600' : '400'
                        }}>
                          {index === 0 ? '1 (cover)' : index + 1}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => movePhoto(index, index - 1)}
                            disabled={index === 0}
                            style={{
                              flex: 1,
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              backgroundColor: index === 0 ? '#f3f4f6' : '#fff',
                              color: index === 0 ? '#9ca3af' : '#111827',
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                              fontSize: '11px',
                              padding: '4px 0'
                            }}
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            onClick={() => movePhoto(index, index + 1)}
                            disabled={index === photos.length - 1}
                            style={{
                              flex: 1,
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              backgroundColor: index === photos.length - 1 ? '#f3f4f6' : '#fff',
                              color: index === photos.length - 1 ? '#9ca3af' : '#111827',
                              cursor: index === photos.length - 1 ? 'not-allowed' : 'pointer',
                              fontSize: '11px',
                              padding: '4px 0'
                            }}
                          >
                            →
                          </button>
                          <button
                            type="button"
                            onClick={() => removePhotoAt(index)}
                            style={{
                              flex: 1,
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              backgroundColor: '#fff5f5',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontSize: '11px',
                              padding: '4px 0'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {(() => {
                const photos = content.photos || (content.photo ? [content.photo] : []);
                if (photos.length > 0) {
                  return (
                    <button
                      type="button"
                      onClick={() => setContent({ ...content, photos: [], photo: undefined })}
                      style={{
                        display: 'inline-block',
                        padding: '10px 20px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '8px'
                      }}
                    >
                      Remove all photos
                    </button>
                  );
                }
                return null;
              })()}

              <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                JPG, PNG or GIF. Max size 5MB per image. You can select multiple photos at once. The first photo is the cover.
              </p>
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
                Photos
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0 && onImageUpload) {
                    const uploadPromises = files.map(file =>
                      new Promise((resolve) => {
                        onImageUpload(file, (base64) => {
                          resolve(base64);
                        });
                      })
                    );
                    const uploadedPhotos = await Promise.all(uploadPromises);
                    const existingPhotos = content.photos || (content.photo ? [content.photo] : []);
                    setContent({
                      ...content,
                      photos: [...existingPhotos, ...uploadedPhotos],
                      photo: undefined
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
                  fontWeight: '500',
                  marginBottom: '8px',
                  marginRight: '8px'
                }}
              >
                Add photos
              </label>

              {(() => {
                const photos = content.photos || (content.photo ? [content.photo] : []);
                if (photos.length === 0) return null;
                const movePhoto = (fromIndex, toIndex) => {
                  if (toIndex < 0 || toIndex >= photos.length) return;
                  const updated = [...photos];
                  const [moved] = updated.splice(fromIndex, 1);
                  updated.splice(toIndex, 0, moved);
                  setContent({ ...content, photos: updated, photo: undefined });
                };
                const removePhotoAt = (indexToRemove) => {
                  const updated = photos.filter((_, idx) => idx !== indexToRemove);
                  setContent({ ...content, photos: updated, photo: undefined });
                };
                return (
                  <div style={{
                    marginBottom: '12px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
                    gap: '10px'
                  }}>
                    {photos.map((photo, index) => (
                      <div
                        key={`${index}-${photo?.slice?.(0, 30) || 'p'}`}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '6px',
                          backgroundColor: '#fff'
                        }}
                      >
                        <img
                          src={refreshPhotoUrl(photo)}
                          alt={`Photo ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '72px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            marginBottom: '6px'
                          }}
                        />
                        <div style={{
                          fontSize: '11px',
                          color: '#6b7280',
                          marginBottom: '6px',
                          textAlign: 'center',
                          fontWeight: index === 0 ? '600' : '400'
                        }}>
                          {index === 0 ? '1 (cover)' : index + 1}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => movePhoto(index, index - 1)}
                            disabled={index === 0}
                            style={{
                              flex: 1,
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              backgroundColor: index === 0 ? '#f3f4f6' : '#fff',
                              color: index === 0 ? '#9ca3af' : '#111827',
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                              fontSize: '11px',
                              padding: '4px 0'
                            }}
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            onClick={() => movePhoto(index, index + 1)}
                            disabled={index === photos.length - 1}
                            style={{
                              flex: 1,
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              backgroundColor: index === photos.length - 1 ? '#f3f4f6' : '#fff',
                              color: index === photos.length - 1 ? '#9ca3af' : '#111827',
                              cursor: index === photos.length - 1 ? 'not-allowed' : 'pointer',
                              fontSize: '11px',
                              padding: '4px 0'
                            }}
                          >
                            →
                          </button>
                          <button
                            type="button"
                            onClick={() => removePhotoAt(index)}
                            style={{
                              flex: 1,
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              backgroundColor: '#fff5f5',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontSize: '11px',
                              padding: '4px 0'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {(() => {
                const photos = content.photos || (content.photo ? [content.photo] : []);
                if (photos.length > 0) {
                  return (
                    <button
                      type="button"
                      onClick={() => setContent({ ...content, photos: [], photo: undefined })}
                      style={{
                        display: 'inline-block',
                        padding: '10px 20px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '8px'
                      }}
                    >
                      Remove all photos
                    </button>
                  );
                }
                return null;
              })()}

              <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                JPG, PNG or GIF. Max size 5MB per image. You can select multiple photos at once.
              </p>
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
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && onImageUpload) {
                        onImageUpload(file, (base64) => {
                          const newColumns = [...(content.columns || [])];
                          newColumns[index] = { ...newColumns[index], photo: base64 };
                          setContent({ ...content, columns: newColumns });
                        });
                      }
                    }}
                    style={{ display: 'none' }}
                    id={`3columns-photo-upload-${block.id}-${index}`}
                  />
                  <label
                    htmlFor={`3columns-photo-upload-${block.id}-${index}`}
                    style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Choose photo
                  </label>
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
              <option value="transparent">Transparent (spacing only)</option>
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
          // If time field is enabled, use main location time, otherwise empty
          const defaultTime = content.enableTimeField && content.mainLocation?.time 
            ? content.mainLocation.time 
            : '';
          
          const newAltLocation = {
            time: defaultTime,
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
            {/* Main / alternative location — vertical list; add at bottom */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '20px',
            }}>
              <button
                type="button"
                onClick={() => setEditingLocationIndex(null)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: editingLocationIndex === null ? 'none' : '1px solid #e5e7eb',
                  backgroundColor: editingLocationIndex === null ? '#3b82f6' : '#f9fafb',
                  color: editingLocationIndex === null ? 'white' : '#374151',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: editingLocationIndex === null ? '600' : '500',
                  fontSize: '14px',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                }}
              >
                Main Location
              </button>
              {content.alternativeLocations.map((altLoc, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: '8px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setEditingLocationIndex(idx)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: editingLocationIndex === idx ? 'none' : '1px solid #e5e7eb',
                      backgroundColor: editingLocationIndex === idx ? '#3b82f6' : '#f9fafb',
                      color: editingLocationIndex === idx ? 'white' : '#374151',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: editingLocationIndex === idx ? '600' : '500',
                      fontSize: '14px',
                      textAlign: 'left',
                      boxSizing: 'border-box',
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
                      if (editingLocationIndex === idx) {
                        setEditingLocationIndex(null);
                      } else if (editingLocationIndex > idx) {
                        setEditingLocationIndex(editingLocationIndex - 1);
                      }
                    }}
                    style={{
                      flexShrink: 0,
                      width: '44px',
                      padding: '0',
                      border: '1px solid #fecaca',
                      backgroundColor: '#fff5f5',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '20px',
                      lineHeight: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                    }}
                    title="Delete alternative location"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddAlternativeLocation}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  padding: '10px 14px',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                + Add Alternative Location
              </button>
            </div>

            {/* Location Editor Form */}
            {currentLocation && (
              <>
                {/* Time for location — inline row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontWeight: '500', fontSize: '14px', whiteSpace: 'nowrap' }}>
                    Time
                    <HintButton hintKey="timeForLocation" />
                  </label>
                  <input
                    type="checkbox"
                    checked={content.enableTimeField || false}
                    onChange={(e) => {
                      const enableTime = e.target.checked;
                      localStorage.setItem('locationBlock_enableTimeField', enableTime.toString());
                      if (enableTime && editingLocationIndex === null && content.mainLocation?.time) {
                        const updatedAlternatives = content.alternativeLocations.map(alt => ({
                          ...alt,
                          time: alt.time || content.mainLocation.time
                        }));
                        setContent({ ...content, enableTimeField: enableTime, alternativeLocations: updatedAlternatives });
                      } else {
                        setContent({ ...content, enableTimeField: enableTime });
                      }
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  {content.enableTimeField && (
                    <input
                      type="text"
                      value={currentLocation.time || ''}
                      onChange={(e) => {
                        const newTime = e.target.value;
                        if (editingLocationIndex === null && content.enableTimeField) {
                          const updatedAlternatives = content.alternativeLocations.map(alt => {
                            const oldMainTime = content.mainLocation?.time || '';
                            const shouldSync = !alt.time || alt.time === oldMainTime;
                            return { ...alt, time: shouldSync ? newTime : alt.time };
                          });
                          setContent({ ...content, mainLocation: { ...content.mainLocation, time: newTime }, alternativeLocations: updatedAlternatives });
                        } else {
                          updateCurrentLocation({ time: newTime });
                        }
                      }}
                      placeholder="09:00 – 12:00"
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}
                </div>

                {/* Location label + Find on Google Maps — same row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontWeight: '500', fontSize: '14px' }}>
                    Location
                    <HintButton hintKey="locationName" />
                  </label>
                  <button
                    type="button"
                    onClick={() => onOpenLocationSelector && onOpenLocationSelector(editingLocationIndex)}
                    style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                  >
                    Find on Google Maps
                  </button>
                </div>

                {/* Name + Address — stacked for narrow side panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  <input
                    type="text"
                    value={currentLocation.title || ''}
                    onChange={(e) => updateCurrentLocation({ title: e.target.value })}
                    placeholder="Name *"
                    required
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <input
                    type="text"
                    value={currentLocation.address || ''}
                    onChange={(e) => updateCurrentLocation({ address: e.target.value })}
                    placeholder="Address *"
                    required
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Photos — label + buttons on one row, thumbnails below */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', fontWeight: '500', fontSize: '14px' }}>
                      Photos
                      <HintButton hintKey="locationPhoto" />
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0 && onImageUpload) {
                            const uploadPromises = files.map(file =>
                              new Promise((resolve) => { onImageUpload(file, (base64) => { resolve(base64); }); })
                            );
                            const uploadedPhotos = await Promise.all(uploadPromises);
                            const existingPhotos = currentLocation.photos || (currentLocation.photo ? [currentLocation.photo] : []);
                            updateCurrentLocation({ photos: [...existingPhotos, ...uploadedPhotos], photo: undefined });
                          }
                        }}
                        style={{ display: 'none' }}
                        id={`location-photos-upload-${block.id}-${editingLocationIndex === null ? 'main' : editingLocationIndex}`}
                      />
                      <label
                        htmlFor={`location-photos-upload-${block.id}-${editingLocationIndex === null ? 'main' : editingLocationIndex}`}
                        style={{ padding: '6px 14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                      >
                        Add photos
                      </label>
                      {(() => {
                        const photos = currentLocation.photos || (currentLocation.photo ? [currentLocation.photo] : []);
                        if (photos.length === 0) return null;
                        return (
                          <button
                            type="button"
                            onClick={() => updateCurrentLocation({ photos: [], photo: undefined })}
                            style={{ padding: '6px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                          >
                            Remove all
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {(() => {
                    const photos = currentLocation.photos || (currentLocation.photo ? [currentLocation.photo] : []);
                    if (photos.length === 0) return null;
                    const movePhoto = (fromIndex, toIndex) => {
                      if (toIndex < 0 || toIndex >= photos.length) return;
                      const updated = [...photos];
                      const [moved] = updated.splice(fromIndex, 1);
                      updated.splice(toIndex, 0, moved);
                      updateCurrentLocation({ photos: updated, photo: undefined });
                    };
                    const removePhotoAt = (indexToRemove) => {
                      const updated = photos.filter((_, idx) => idx !== indexToRemove);
                      updateCurrentLocation({ photos: updated, photo: undefined });
                    };
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                        {photos.map((photo, index) => (
                          <div key={`${index}-${photo?.slice?.(0, 30) || 'photo'}`} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '5px', backgroundColor: '#fff' }}>
                            <img src={refreshPhotoUrl(photo)} alt={`Photo ${index + 1}`} style={{ width: '100%', height: '60px', borderRadius: '5px', objectFit: 'cover', marginBottom: '4px' }} />
                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px', textAlign: 'center', fontWeight: index === 0 ? '600' : '400' }}>
                              {index === 0 ? '1 (cover)' : index + 1}
                            </div>
                            <div style={{ display: 'flex', gap: '3px' }}>
                              <button type="button" onClick={() => movePhoto(index, index - 1)} disabled={index === 0}
                                style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: '5px', backgroundColor: index === 0 ? '#f3f4f6' : '#fff', color: index === 0 ? '#9ca3af' : '#111827', cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: '10px', padding: '3px 0' }}>←</button>
                              <button type="button" onClick={() => movePhoto(index, index + 1)} disabled={index === photos.length - 1}
                                style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: '5px', backgroundColor: index === photos.length - 1 ? '#f3f4f6' : '#fff', color: index === photos.length - 1 ? '#9ca3af' : '#111827', cursor: index === photos.length - 1 ? 'not-allowed' : 'pointer', fontSize: '10px', padding: '3px 0' }}>→</button>
                              <button type="button" onClick={() => removePhotoAt(index)}
                                style={{ flex: 1, border: '1px solid #fecaca', borderRadius: '5px', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontSize: '10px', padding: '3px 0' }}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Location Description */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                    Description
                    <HintButton hintKey="locationDescription" />
                  </label>
                  <textarea
                    value={currentLocation.description || ''}
                    onChange={(e) => updateCurrentLocation({ description: e.target.value })}
                    placeholder="Describe this location..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Recommendations */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                    Recommendation
                    <HintButton hintKey="locationRecommendation" />
                  </label>
                  <textarea
                    value={currentLocation.recommendations || ''}
                    onChange={(e) => updateCurrentLocation({ recommendations: e.target.value })}
                    placeholder="Tips, best time to visit, what to try…"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>


                {/* Rating */}
                {currentLocation.rating && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '14px', 
                      fontWeight: '500',
                      color: '#6b7280'
                    }}>
                      Rating
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <span style={{ 
                        fontSize: '18px', 
                        fontWeight: '600',
                        color: '#f59e0b'
                      }}>
                        ⭐ {currentLocation.rating.toFixed(1)}
                      </span>
                      {currentLocation.user_ratings_total && (
                        <span style={{ 
                          fontSize: '14px', 
                          color: '#6b7280'
                        }}>
                          ({currentLocation.user_ratings_total} reviews)
                        </span>
                      )}
                    </div>
                  </div>
                )}

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
                      Price Level (0-4)
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
                      <option value="0">0 - Free</option>
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

      case 'map':
        const mapLocations = content.locations || [];
        
        return (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                <input
                  type="checkbox"
                  checked={!content.hidden}
                  onChange={(e) => setContent({ ...content, hidden: !e.target.checked, manuallyEdited: true })}
                  style={{ marginRight: '8px', width: '18px', height: '18px' }}
                />
                Show map to users
              </label>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Uncheck to hide this map from users (it will still be visible in the editor)
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Locations ({mapLocations.length})
              </label>
              <div style={{
                border: '1px solid #d1d5db',
                borderRadius: '8px',
              }}>
                {mapLocations.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    No locations found. Add location blocks to see them here.
                  </div>
                ) : (
                  mapLocations.map((location, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        borderBottom: index < mapLocations.length - 1 ? '1px solid #e5e7eb' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          {location.number}. {location.title || 'Location'}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          {location.address}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {index > 0 && (
                          <button
                            onClick={() => {
                              const newLocations = [...mapLocations];
                              [newLocations[index], newLocations[index - 1]] = [newLocations[index - 1], newLocations[index]];
                              // Update numbers
                              newLocations.forEach((loc, idx) => {
                                loc.number = idx + 1;
                              });
                              setContent({ ...content, locations: newLocations, manuallyEdited: true });
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            ↑
                          </button>
                        )}
                        {index < mapLocations.length - 1 && (
                          <button
                            onClick={() => {
                              const newLocations = [...mapLocations];
                              [newLocations[index], newLocations[index + 1]] = [newLocations[index + 1], newLocations[index]];
                              // Update numbers
                              newLocations.forEach((loc, idx) => {
                                loc.number = idx + 1;
                              });
                              setContent({ ...content, locations: newLocations, manuallyEdited: true });
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            ↓
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const newLocations = mapLocations.filter((_, idx) => idx !== index);
                            // Update numbers
                            newLocations.forEach((loc, idx) => {
                              loc.number = idx + 1;
                            });
                            setContent({ ...content, locations: newLocations, manuallyEdited: true });
                          }}
                          style={{
                            padding: '6px 12px',
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
                    </div>
                  ))
                )}
              </div>
            </div>

            {mapLocations.length > 0 && (
              <div style={{
                padding: '12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#0369a1'
              }}>
                💡 Tip: Locations are automatically extracted from your tour blocks. You can reorder or remove them here.
              </div>
            )}
          </>
        );

      default:
        return <p style={{ color: '#6b7280' }}>Editor for {block.block_type} not implemented yet</p>;
    }
  };

  return (
    <VisualizerSidePanel onClose={onClose}>
      <div style={{
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Edit block: {block.block_type}</h2>
          <button onClick={onClose} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        
        {renderEditor()}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
          <button
            onClick={() => {
              if (isSaving || isDeleting) return;
              if (onDelete && confirm('Are you sure you want to delete this block?')) {
                onDelete(block.id);
              }
            }}
            disabled={isSaving || isDeleting}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (isSaving || isDeleting) ? 'not-allowed' : 'pointer',
              opacity: (isSaving || isDeleting) ? 0.7 : 1,
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isDeleting ? <AnimatedProgressText label="Deleting" /> : 'Delete'}
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              disabled={isSaving || isDeleting}
              style={{
                padding: '10px 20px',
                backgroundColor: '#111827',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (isSaving || isDeleting) ? 'not-allowed' : 'pointer',
                opacity: (isSaving || isDeleting) ? 0.7 : 1,
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              style={{
                padding: '10px 20px',
                backgroundColor: (isSaving || isDeleting) ? '#93c5fd' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (isSaving || isDeleting) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {isSaving ? <AnimatedProgressText label="Saving" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </VisualizerSidePanel>
  );
}

