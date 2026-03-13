import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import { getTours } from '../services/api';
import { buildTourSlug } from '../utils/tourSlug';
import './ExplorePage.css';

const CITY_PILLS = ['Rome', 'Paris'];
const EXPLORE_TOURS_CACHE_KEY = 'fliptrip_explore_tours_cache_v1';
const EXPLORE_INITIAL_BATCH = 60;

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=1200&h=1600&fit=crop&q=80&auto=format';
const FALLBACK_GUIDE_BIO = 'Local creator sharing authentic city routes, hidden places, and personal recommendations.';
const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function getTourImage(tour) {
  if (tour?.draft_data?.previewOriginal && String(tour.draft_data.previewOriginal).trim()) return tour.draft_data.previewOriginal;
  if (tour?.preview_media_url && tour.preview_media_url.trim()) return tour.preview_media_url;
  if (tour?.preview && tour.preview.trim()) return tour.preview;
  return DEFAULT_IMAGE;
}

function getTourTags(tour, interestNameById = new Map()) {
  const directTourTags = Array.isArray(tour?.tour_tags)
    ? tour.tour_tags
    .map((tt) => tt?.tag?.name || tt?.interest?.name)
    .filter(Boolean)
    : [];

  const draftTags = Array.isArray(tour?.draft_data?.tags)
    ? tour.draft_data.tags
        .map((tag) => {
          if (typeof tag !== 'string') return '';
          const value = tag.trim();
          if (!value) return '';
          if (interestNameById.has(value)) return interestNameById.get(value);
          // Hide raw UUIDs from UI when we can't map them to a label.
          if (UUID_LIKE.test(value)) return '';
          return value;
        })
        .filter(Boolean)
    : [];

  const guideInterests = typeof tour?.guide?.interests === 'string'
    ? tour.guide.interests.split(',').map((value) => value.trim()).filter(Boolean)
    : [];

  const merged = [...directTourTags, ...draftTags, ...guideInterests];
  const unique = Array.from(new Set(merged));

  return unique.slice(0, 5);
}

function getGuideFromTour(tour) {
  if (tour?.guide?.name) {
    return {
      id: tour.guide.id || tour.guide_id || tour.id,
      name: tour.guide.name,
      avatar: tour.guide.avatar_url || '',
      bio: tour.guide.bio || FALLBACK_GUIDE_BIO,
      city: tour.guide.city || tour.city || 'Paris',
      interests: tour.guide.interests || 'Culture, Food, Coffee'
    };
  }
  return null;
}

function mergeToursById(primary = [], secondary = []) {
  const map = new Map();
  [...primary, ...secondary].forEach((tour) => {
    const key = String(tour?.id || '');
    if (key) map.set(key, tour);
  });
  return Array.from(map.values());
}

function mergeToursPreserveOrder(current = [], incoming = []) {
  const incomingById = new Map(incoming.map((tour) => [String(tour?.id || ''), tour]));
  const currentIds = new Set(current.map((tour) => String(tour?.id || '')));
  const merged = current.map((tour) => {
    const key = String(tour?.id || '');
    const next = incomingById.get(key);
    return next ? { ...tour, ...next } : tour;
  });
  incoming.forEach((tour) => {
    const key = String(tour?.id || '');
    if (key && !currentIds.has(key)) merged.push(tour);
  });
  return merged;
}

function TourCardSkeleton() {
  return (
    <article className="explore-tour-card explore-tour-card-skeleton" aria-hidden="true">
      <div className="explore-tour-media">
        <div className="explore-skeleton-block explore-skeleton-image" />
      </div>
      <div className="explore-tour-card-body">
        <div className="explore-skeleton-block explore-skeleton-title" />
        <div className="explore-skeleton-block explore-skeleton-line" />
        <div className="explore-skeleton-block explore-skeleton-line short" />
        <div className="explore-skeleton-tags">
          <div className="explore-skeleton-block explore-skeleton-pill" />
          <div className="explore-skeleton-block explore-skeleton-pill" />
        </div>
      </div>
    </article>
  );
}

function TourCard({ tour, tags = [], className = '', variant = 'below', onClick, imagePriority = false }) {
  const creatorName = tour?.guide?.name || 'Guide';
  const creatorAvatar = tour?.guide?.avatar_url || '';
  const cardTitle = tour?.title || 'Explore city with a local';
  const description = tour?.draft_data?.shortDescription || tour?.shortDescription || tour?.description || tour?.subtitle || 'Curated route with authentic places and local context.';
  const isOverlay = variant === 'overlay';

  return (
    <article className={`explore-tour-card ${className} ${isOverlay ? 'is-overlay' : 'is-below'}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="explore-tour-media">
        <img
          src={getTourImage(tour)}
          alt={cardTitle}
          className="explore-tour-card-image"
          loading={imagePriority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={imagePriority ? 'high' : 'auto'}
        />
        <div className="explore-tour-card-overlay" />
        <div className="explore-tour-card-meta">
          <div className="explore-creator-row">
            {creatorAvatar ? (
              <img
                src={creatorAvatar}
                alt={creatorName}
                className="explore-creator-avatar"
              />
            ) : (
              <div className="explore-creator-avatar explore-creator-avatar-placeholder">
                {getInitials(creatorName)}
              </div>
            )}
            <span className="explore-creator-name">{creatorName}</span>
          </div>
        </div>
        {!isOverlay && <span className="explore-city-pill explore-city-pill-bottom">{tour?.city || 'City'}</span>}

        {isOverlay && (
          <div className="explore-tour-card-content">
            <h3>{cardTitle}</h3>
            <p>{description}</p>
            <div className="explore-tags-row">
              <span className="explore-tag-pill explore-tag-pill-city-overlay">
                {tour?.city || 'City'}
              </span>
              {tags.map((tag) => (
                <span className="explore-tag-pill" key={`${tour.id}-${tag}`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isOverlay && (
        <div className="explore-tour-card-body">
          <h3>{cardTitle}</h3>
          <p>{description}</p>
          <div className="explore-tags-row">
            {tags.map((tag) => (
              <span className="explore-tag-pill explore-tag-pill-dark" key={`${tour.id}-${tag}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const insidersScrollRef = useRef(null);
  const pillsScrollRef = useRef(null);
  const hasToursFromCacheRef = useRef(false);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interestNameById, setInterestNameById] = useState(new Map());
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    const loadInterestNames = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL
          ? import.meta.env.VITE_API_URL.replace('/api', '')
          : (import.meta.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app');
        const response = await fetch(`${apiBase}/api/interests?full_structure=true`);
        if (!response.ok) return;
        const data = await response.json();
        if (!data?.success || !Array.isArray(data?.categories)) return;

        const nextMap = new Map();
        data.categories.forEach((category) => {
          (category.direct_interests || []).forEach((interest) => {
            if (interest?.id && interest?.name) nextMap.set(String(interest.id), interest.name);
          });
          (category.subcategories || []).forEach((subcategory) => {
            (subcategory.interests || []).forEach((interest) => {
              if (interest?.id && interest?.name) nextMap.set(String(interest.id), interest.name);
            });
          });
        });
        setInterestNameById(nextMap);
      } catch (error) {
        console.warn('Failed to load interests for tag labels:', error);
      }
    };

    loadInterestNames();
  }, []);

  useEffect(() => {
    // Show last successful payload immediately while fresh data is loading.
    try {
      const rawCache = localStorage.getItem(EXPLORE_TOURS_CACHE_KEY) || sessionStorage.getItem(EXPLORE_TOURS_CACHE_KEY);
      if (!rawCache) return;
      const parsed = JSON.parse(rawCache);
      if (Array.isArray(parsed?.tours) && parsed.tours.length > 0) {
        setTours(parsed.tours);
        setLoading(false);
        hasToursFromCacheRef.current = true;
      }
    } catch (error) {
      console.warn('Failed to read explore tours cache:', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadTours = async () => {
      const persistCache = (nextTours) => {
        const payload = JSON.stringify({ savedAt: Date.now(), tours: nextTours });
        try {
          sessionStorage.setItem(EXPLORE_TOURS_CACHE_KEY, payload);
          localStorage.setItem(EXPLORE_TOURS_CACHE_KEY, payload);
        } catch (error) {
          console.warn('Failed to save explore tours cache:', error);
        }
      };

      try {
        // Avoid showing full-page loading state if cached tours are already rendered.
        setLoading(!hasToursFromCacheRef.current);

        // Phase 1: fetch a small batch for instant first paint.
        const firstBatch = await getTours({
          limit: hasToursFromCacheRef.current ? 16 : EXPLORE_INITIAL_BATCH,
          summary: true,
          fast: true
        });
        const firstTours = (firstBatch?.success && Array.isArray(firstBatch.tours)) ? firstBatch.tours : [];
        if (!cancelled && firstTours.length > 0) {
          setTours((prev) => mergeToursById(firstTours, prev));
          setLoading(false);
          hasToursFromCacheRef.current = true;
        }

        // Phase 2: fetch the full list in background for filters/more trips.
        void getTours({ limit: 200, summary: true })
          .then((fullResult) => {
            if (cancelled) return;
            if (fullResult?.success && Array.isArray(fullResult.tours) && fullResult.tours.length > 0) {
              setTours((prev) => mergeToursPreserveOrder(prev, fullResult.tours));
              hasToursFromCacheRef.current = true;
              persistCache(fullResult.tours);
            } else if (!hasToursFromCacheRef.current) {
              setTours([]);
            }
          })
          .catch((error) => {
            console.error('Failed to load full explore tours list:', error);
          });
      } catch (error) {
        console.error('Failed to load explore tours:', error);
        if (!cancelled && !hasToursFromCacheRef.current) setTours([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadTours();

    return () => {
      cancelled = true;
    };
  }, []);

  const toursWithResolvedTags = useMemo(
    () => tours.map((tour) => ({ ...tour, _resolvedTags: getTourTags(tour, interestNameById) })),
    [tours, interestNameById]
  );

  const availableTagPills = useMemo(() => {
    const unique = new Set();
    toursWithResolvedTags.forEach((tour) => {
      (tour._resolvedTags || []).forEach((tag) => {
        const normalized = String(tag || '').trim();
        if (normalized) unique.add(normalized);
      });
    });
    return Array.from(unique).slice(0, 10);
  }, [toursWithResolvedTags]);

  const filteredTours = useMemo(() => {
    return toursWithResolvedTags.filter((tour) => {
      const normalizedCity = String(tour.city || '').toLowerCase();
      const cityMatch = selectedCities.length === 0
        ? true
        : selectedCities.some((city) => city.toLowerCase() === normalizedCity);

      const tagMatch = selectedTags.length === 0
        ? true
        : (tour._resolvedTags || []).some((tag) =>
            selectedTags.some((selectedTag) => selectedTag.toLowerCase() === String(tag).toLowerCase())
          );

      return cityMatch && tagMatch;
    });
  }, [toursWithResolvedTags, selectedCities, selectedTags]);

  const displayedTours = useMemo(() => filteredTours.slice(0, visibleCount), [filteredTours, visibleCount]);
  const orderedDisplayedTours = useMemo(() => {
    return [...displayedTours].sort((a, b) => {
      const orderA = Number.isFinite(Number(a?.draft_data?.exploreOrder))
        ? Number(a.draft_data.exploreOrder)
        : null;
      const orderB = Number.isFinite(Number(b?.draft_data?.exploreOrder))
        ? Number(b.draft_data.exploreOrder)
        : null;
      if (orderA !== null && orderB !== null) return orderA - orderB;
      if (orderA !== null) return -1;
      if (orderB !== null) return 1;
      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [displayedTours]);
  const exploreLayoutItems = useMemo(() => {
    const items = [];
    let segment = [];
    orderedDisplayedTours.forEach((tour) => {
      const isWide = Boolean(tour?.draft_data?.exploreWideCard);
      if (isWide) {
        if (segment.length > 0) {
          items.push({ type: 'columns', tours: segment });
          segment = [];
        }
        items.push({ type: 'wide', tour });
      } else {
        segment.push(tour);
      }
    });
    if (segment.length > 0) {
      items.push({ type: 'columns', tours: segment });
    }
    return items;
  }, [orderedDisplayedTours]);
  const hasMoreTours = filteredTours.length > displayedTours.length;

  useEffect(() => {
    setVisibleCount(5);
  }, [selectedCities, selectedTags]);

  const toggleCity = (city) => {
    setSelectedCities((prev) => (prev.includes(city) ? prev.filter((value) => value !== city) : [...prev, city]));
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((value) => value !== tag) : [...prev, tag]));
  };

  const insiders = useMemo(() => {
    const unique = new Map();
    tours.forEach((tour) => {
      const guide = getGuideFromTour(tour);
      if (guide && !unique.has(guide.id)) unique.set(guide.id, guide);
    });
    return Array.from(unique.values());
  }, [tours]);

  const scrollInsiders = (direction) => {
    const container = insidersScrollRef.current;
    if (!container) return;
    const delta = Math.max(280, Math.floor(container.clientWidth * 0.85));
    container.scrollBy({
      left: direction * delta,
      behavior: 'smooth'
    });
  };

  const scrollPillsRight = () => {
    const container = pillsScrollRef.current;
    if (!container) return;
    const delta = Math.max(220, Math.floor(container.clientWidth * 0.7));
    container.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const openTourPreview = (tour) => {
    const slug = buildTourSlug(tour);
    if (!slug) return;
    navigate(`/tour/${slug}`);
  };

  return (
    <main className="explore-page">
      <header className="explore-topbar">
        <div className="explore-topbar-inner">
          <Link to="/" className="explore-logo-link" aria-label="FlipTrip home">
            <img src={FlipTripLogo} alt="FlipTrip" className="explore-logo" />
          </Link>
          <div className="explore-auth-actions">
            <button type="button" className="become-local-btn" onClick={() => navigate('/become-local')}>
              Become a Local
            </button>
            <button type="button" className="login-btn" onClick={() => navigate('/join?tab=traveler')}>
              Login
            </button>
          </div>
        </div>
      </header>

      <section className="explore-hero">
        <div className="explore-hero-title-container">
          <h1>Explore cities. Like a local.</h1>
        </div>
        <div className="explore-hero-subtitle-container">
          <p>Your personal, curated city guide from the people who live there. Just Paris and Rome. For now.</p>
        </div>
      </section>

      <section className="explore-pills-shell">
        <div className="explore-pills-wrap" ref={pillsScrollRef}>
          {CITY_PILLS.map((city) => (
            <button
              key={city}
              type="button"
              className={`explore-pill city-pill ${selectedCities.includes(city) ? 'active' : ''}`}
              onClick={() => toggleCity(city)}
            >
              {city}
            </button>
          ))}
          {availableTagPills.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`explore-pill tag-pill ${selectedTags.includes(tag) ? 'accent-blue' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="explore-pills-fade" aria-hidden="true" />
        <button type="button" className="explore-pills-arrow" onClick={scrollPillsRight} aria-label="Scroll tags">
          <svg className="explore-pills-arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12H19" />
            <path d="M13 6L19 12L13 18" />
          </svg>
        </button>
      </section>

      <section className="explore-trips-section">
        {loading && displayedTours.length === 0 && (
          <div className="explore-trips-columns explore-trips-columns-skeleton">
            <div className="explore-trips-column">
              <TourCardSkeleton />
              <TourCardSkeleton />
            </div>
            <div className="explore-trips-column">
              <TourCardSkeleton />
              <TourCardSkeleton />
            </div>
          </div>
        )}
        {exploreLayoutItems.map((item, itemIndex) => {
          if (item.type === 'wide') {
            const tour = item.tour;
            return (
              <div className="explore-layout-item" key={`wide-${tour.id || itemIndex}`}>
                <div className="explore-wide-tours">
                  <TourCard
                    tour={tour}
                    tags={tour._resolvedTags || []}
                    className="explore-wide-tour-card"
                    variant="overlay"
                    imagePriority={itemIndex === 0}
                    onClick={() => openTourPreview(tour)}
                  />
                </div>
              </div>
            );
          }

          const left = [];
          const right = [];
          item.tours.forEach((tour, index) => {
            if (index % 2 === 0) left.push(tour);
            else right.push(tour);
          });

          return (
            <div className="explore-layout-item" key={`columns-${itemIndex}`}>
              <div className="explore-trips-columns">
                <div className="explore-trips-column">
                  {left.map((tour, index) => (
                    <TourCard
                      key={`${tour.id || index}-left-${itemIndex}`}
                      tour={tour}
                      tags={tour._resolvedTags || []}
                      variant="below"
                      imagePriority={itemIndex === 0 && index === 0}
                      onClick={() => openTourPreview(tour)}
                    />
                  ))}
                </div>
                <div className="explore-trips-column">
                  {right.map((tour, index) => (
                    <TourCard
                      key={`${tour.id || index}-right-${itemIndex}`}
                      tour={tour}
                      tags={tour._resolvedTags || []}
                      variant="below"
                      imagePriority={itemIndex === 0 && index === 0}
                      onClick={() => openTourPreview(tour)}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {hasMoreTours && (
        <section className="more-trips-row">
          <button type="button" className="more-trips-btn" onClick={() => setVisibleCount((prev) => prev + 6)}>
            More Trips
          </button>
        </section>
      )}

      <section className="explore-insiders">
        <h2>Meet Your Local Insiders</h2>
        <p>
          Whenever we land in a new city, the first thing we do is text a friend for advice. Flip-Trip does that for you.
          We&apos;ve brought together a community of locals-from designers and actors to foodies and art experts-to share their
          personal city secrets. Each itinerary is a piece of their daily life: the spots they actually visit, the coffee they
          actually drink. No filters, no fake reviews-just the real city, curated by those who call it home.
        </p>
        <div className="insiders-grid" ref={insidersScrollRef}>
          {loading && insiders.length === 0
            ? Array.from({ length: 3 }).map((_, idx) => (
              <article className="insider-card insider-card-skeleton" key={`insider-skeleton-${idx}`} aria-hidden="true">
                <div className="insider-skeleton-block insider-skeleton-avatar" />
                <div className="insider-skeleton-column">
                  <div className="insider-skeleton-block insider-skeleton-line short" />
                  <div className="insider-skeleton-block insider-skeleton-line" />
                  <div className="insider-skeleton-block insider-skeleton-line" />
                </div>
              </article>
            ))
            : insiders.map((insider) => (
              <article className="insider-card" key={insider.id}>
                <div className="insider-left">
                  {insider.avatar ? (
                    <img
                      src={insider.avatar}
                      alt={insider.name}
                      className="insider-avatar"
                    />
                  ) : (
                    <div className="insider-avatar insider-avatar-placeholder">
                      {getInitials(insider.name)}
                    </div>
                  )}
                  <div className="insider-meta">
                    <div><strong>City:</strong> {insider.city || 'Paris'}</div>
                    <div><strong>Interests:</strong> {insider.interests || 'Culture, Food, Art'}</div>
                  </div>
                </div>
                <div className="insider-right">
                  <h3>{insider.name}</h3>
                  <p>{insider.bio}</p>
                </div>
              </article>
            ))}
        </div>
        {insiders.length > 0 && (
          <div className="insiders-nav">
            <button type="button" className="insiders-nav-btn" onClick={() => scrollInsiders(-1)} aria-label="Previous insiders">
              ←
            </button>
            <button type="button" className="insiders-nav-btn" onClick={() => scrollInsiders(1)} aria-label="Next insiders">
              →
            </button>
          </div>
        )}
      </section>

      <footer className="explore-footer">
        <img src={FlipTripLogo} alt="FlipTrip" className="explore-footer-logo" />
        <h4>About project</h4>
        <h4>Locals</h4>
        <span>© flip-trip 2026</span>
      </footer>
    </main>
  );
}
