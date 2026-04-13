import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getGuidesBatch, getTours } from '../services/api';
import { getCurrentUser, logout } from '../modules/auth/services/authService';
import { buildTourSlug } from '../utils/tourSlug';
import { updatePageMeta } from '../utils/updatePageMeta';
import {
  TourCard,
  TourCardSkeleton,
  getTourTags,
  tourHasDistinctPreview,
} from './ExplorePage.jsx';
import './ExplorePage.css';
import './ExplorePage.figma.css';
import './TripsPage.css';

const BASE = import.meta.env.BASE_URL || '/';
const FIGMA_LOGO_WEBP = `${BASE}imgs/LogoV2.webp`;
const TRIPS_LOGO_PNG = `${BASE}imgs/LogoV2.png`;
const TRIPS_HERO_POSTER = `${BASE}imgs/Preview/roman-paris-one-day.webp`;
const TRIPS_HERO_VIDEO_DEFAULT = `${BASE}videos/FlipTrip.mp4`;
const PARIS_LANDING_HERO_IMG = `${BASE}imgs/Preview/pulse-of-paris.webp`;

const IMG = {
  logoMark: `${BASE}imgs/about-figma/logo-mark.webp`,
  lineFooter: `${BASE}imgs/about-figma/line-h.webp`,
};

const TRIPS_FETCH_LIMIT = 500;

function getDashboardPath(role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'guide') return '/guide/dashboard';
  return '/user/dashboard';
}

function parseTagsParam(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function normalizeCitySelections(raw, canonicalCities) {
  if (!raw || typeof raw !== 'string' || !canonicalCities?.length) return [];
  const canonLower = new Map(canonicalCities.map((c) => [String(c).toLowerCase(), c]));
  const out = [];
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((p) => {
      const c = canonLower.get(p.toLowerCase());
      if (c && !out.includes(c)) out.push(c);
    });
  return out;
}

function normalizeTagSelections(raw, canonicalTags) {
  if (!canonicalTags?.length) return [];
  const lowerSet = new Map(canonicalTags.map((t) => [String(t).toLowerCase(), t]));
  const out = [];
  parseTagsParam(raw).forEach((p) => {
    const c = lowerSet.get(p.toLowerCase());
    if (c && !out.includes(c)) out.push(c);
  });
  return out;
}

function isParisCity(city) {
  const raw = String(city || '')
    .trim()
    .toLowerCase();
  if (!raw) return false;
  const first = raw.split(',')[0].trim();
  return first === 'paris';
}

function mergeGuidePreferRicher(a, b) {
  if (!b && !a) return null;
  if (!a) return b;
  if (!b) return a;
  const merged = { ...a, ...b };
  const len = (g) => String(g?.bio ?? '').trim().length;
  if (len(a) > len(b) && a.bio) merged.bio = a.bio;
  const av = (g) => String(g?.avatar_url ?? '').trim();
  if (!av(merged)) {
    if (av(b)) merged.avatar_url = b.avatar_url;
    else if (av(a)) merged.avatar_url = a.avatar_url;
  }
  return merged;
}

export default function TripsPage({ parisLanding = false } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [interestNameById, setInterestNameById] = useState(new Map());
  const [user, setUser] = useState(null);
  const [figmaMobileNavOpen, setFigmaMobileNavOpen] = useState(false);
  const guideBioEnrichAttemptedRef = useRef(new Set());

  const heroVideoSrc = (import.meta.env.VITE_EXPLORE_HERO_VIDEO || TRIPS_HERO_VIDEO_DEFAULT).trim();

  useEffect(() => {
    if (parisLanding) {
      updatePageMeta({
        title: 'Paris Walking Tours | FlipTrip',
        description:
          'Self-guided walking tours through Paris, designed by locals. Seven curated full-day itineraries — on your phone instantly.',
        canonicalPath: '/trips/paris',
      });
    } else {
      updatePageMeta({
        title: 'All Tours | FlipTrip',
        description: 'Browse every curated city walk and self-guided tour from our local insiders.',
        canonicalPath: '/trips',
      });
    }
  }, [parisLanding]);

  useEffect(() => {
    try {
      const currentUser = getCurrentUser();
      if (currentUser) setUser(currentUser);
    } catch (e) {
      console.error('Trips: auth check failed', e);
    }
  }, []);

  useEffect(() => {
    if (!figmaMobileNavOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setFigmaMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [figmaMobileNavOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)');
    const onChange = () => {
      if (mq.matches) setFigmaMobileNavOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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
        console.warn('Trips: failed to load interests', error);
      }
    };
    loadInterestNames();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await getTours({ limit: TRIPS_FETCH_LIMIT });
        if (cancelled) return;
        if (res?.success && Array.isArray(res.tours)) {
          setTours(res.tours);
        } else {
          setTours([]);
          setLoadError('Could not load tours.');
        }
      } catch (e) {
        console.error('Trips: load failed', e);
        if (!cancelled) {
          setTours([]);
          setLoadError('Could not load tours. Please try again later.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allCities = useMemo(() => {
    const set = new Set();
    tours.forEach((t) => {
      if (t?.city && String(t.city).trim()) set.add(String(t.city).trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tours]);

  const allInterestLabels = useMemo(() => {
    const set = new Set();
    const source = parisLanding ? tours.filter((t) => isParisCity(t.city)) : tours;
    source.forEach((tour) => {
      getTourTags(tour, interestNameById).forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tours, interestNameById, parisLanding]);

  const selectedCities = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return normalizeCitySelections(p.get('city') || p.get('cities') || '', allCities);
  }, [location.search, allCities]);

  const selectedTags = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return normalizeTagSelections(p.get('tags') || p.get('tag') || '', allInterestLabels);
  }, [location.search, allInterestLabels]);

  const toursWithTags = useMemo(
    () => tours.map((tour) => ({ ...tour, _resolvedTags: getTourTags(tour, interestNameById) })),
    [tours, interestNameById]
  );

  const filteredTours = useMemo(() => {
    return toursWithTags.filter((tour) => {
      const normalizedCity = String(tour?.city || '')
        .trim()
        .toLowerCase();
      const cityMatch = parisLanding
        ? isParisCity(tour?.city)
        : selectedCities.length === 0 ||
          selectedCities.some((city) => city.toLowerCase() === normalizedCity);
      const tagMatch =
        selectedTags.length === 0 ||
        selectedTags.some((selectedTag) =>
          (tour._resolvedTags || []).some(
            (tag) => String(tag).toLowerCase() === String(selectedTag).toLowerCase()
          )
        );
      return cityMatch && tagMatch;
    });
  }, [toursWithTags, selectedCities, selectedTags, parisLanding]);

  const displayedTours = filteredTours;

  useEffect(() => {
    const needsGuideEnrichment = (t) => {
      if (!t?.guide_id) return false;
      const bioMissing = !String(t?.guide?.bio || '').trim();
      const avatarMissing = !String(t?.guide?.avatar_url || '').trim();
      return bioMissing || avatarMissing;
    };
    const needGuideIds = [
      ...new Set(
        tours
          .filter(needsGuideEnrichment)
          .map((t) => String(t.guide_id))
          .filter((id) => !guideBioEnrichAttemptedRef.current.has(id))
      ),
    ];
    if (needGuideIds.length === 0) return;

    const visibleGuideIdSet = new Set(
      displayedTours.filter((t) => t?.guide_id).map((t) => String(t.guide_id))
    );
    const priorityIds = needGuideIds.filter((id) => visibleGuideIdSet.has(id));
    const restIds = needGuideIds.filter((id) => !visibleGuideIdSet.has(id));

    let cancelled = false;

    const applyGuides = (guides) => {
      const byId = new Map(guides.map((g) => [String(g.id), g]));
      setTours((prev) =>
        prev.map((tour) => {
          const gid = tour.guide_id && String(tour.guide_id);
          const row = gid && byId.get(gid);
          if (!row) return tour;
          const guide = mergeGuidePreferRicher(tour.guide, row);
          return guide ? { ...tour, guide } : tour;
        })
      );
    };

    async function run() {
      const fetchOne = async (ids) => {
        if (ids.length === 0 || cancelled) return;
        ids.forEach((id) => guideBioEnrichAttemptedRef.current.add(id));
        try {
          const data = await getGuidesBatch(ids);
          if (cancelled || !data?.success || !Array.isArray(data.guides)) return;
          applyGuides(data.guides);
        } catch (e) {
          console.warn('Trips: guide enrich failed', e);
          ids.forEach((id) => guideBioEnrichAttemptedRef.current.delete(id));
        }
      };

      await fetchOne(priorityIds);
      if (cancelled || restIds.length === 0) return;
      await new Promise((resolve) => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          window.requestIdleCallback(() => resolve(), { timeout: 2500 });
        } else {
          setTimeout(resolve, 400);
        }
      });
      if (cancelled) return;
      await fetchOne(restIds);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [tours, displayedTours]);

  const toggleCity = useCallback(
    (city) => {
      const next = new URLSearchParams(location.search);
      const current = normalizeCitySelections(next.get('city') || next.get('cities') || '', allCities);
      const cities = current.includes(city) ? current.filter((value) => value !== city) : [...current, city];
      if (cities.length > 0) next.set('city', cities.join(','));
      else {
        next.delete('city');
        next.delete('cities');
      }
      setSearchParams(next, { replace: true });
    },
    [allCities, location.search, setSearchParams]
  );

  const toggleTag = useCallback(
    (tag) => {
      const next = new URLSearchParams(location.search);
      const current = normalizeTagSelections(next.get('tags') || next.get('tag') || '', allInterestLabels);
      const tags = current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag];
      if (tags.length > 0) {
        next.set('tags', tags.join(','));
        next.delete('tag');
      } else {
        next.delete('tags');
        next.delete('tag');
      }
      setSearchParams(next, { replace: true });
    },
    [allInterestLabels, location.search, setSearchParams]
  );

  const openTour = (tour) => {
    const slug = buildTourSlug(tour);
    if (!slug) return;
    navigate(`/tour/${slug}`);
  };

  const scrollToCatalog = () => {
    document.getElementById('trips-catalog')?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderFigmaAuth = (opts = {}) => {
    const { afterAction, className } = opts;
    const fire = (fn) => () => {
      fn();
      afterAction?.();
    };
    return (
      <div className={className || 'explore-figma-hero-auth'}>
        {user ? (
          <>
            <button
              type="button"
              className="explore-figma-btn-become"
              onClick={fire(() => navigate(getDashboardPath(user.role)))}
            >
              {user.role === 'admin' ? 'Admin' : user.name || 'Dashboard'}
            </button>
            <button
              type="button"
              className="explore-figma-btn-login"
              onClick={() => {
                logout();
                setUser(null);
                window.location.reload();
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button type="button" className="explore-figma-btn-become" onClick={fire(() => navigate('/become-local'))}>
              Become a Local
            </button>
            <button
              type="button"
              className="explore-figma-btn-login"
              onClick={fire(() => navigate('/join?tab=traveler&mode=login'))}
            >
              Login
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <main className={`trips-page explore-page--figma${parisLanding ? ' trips-page--paris' : ''}`}>
      <div className="explore-figma-hero">
        <div className="explore-figma-max explore-figma-hero-topbar-wrap explore-figma-hero-topbar-wrap--desktop">
          <div className="explore-figma-hero-topbar">
            <Link to="/" className="explore-logo-link" aria-label="FlipTrip home">
              <picture>
                <source srcSet={FIGMA_LOGO_WEBP} type="image/webp" />
                <img src={TRIPS_LOGO_PNG} alt="FlipTrip" className="explore-logo explore-logo--figma-v2" width={107} height={66} />
              </picture>
            </Link>
            {renderFigmaAuth()}
          </div>
        </div>
        <div className="explore-figma-max explore-figma-hero-shell-outer">
          <div className="explore-figma-hero-shell">
            <div className="explore-figma-hero-mobile-bar">
              <span className="explore-figma-burger-spacer" aria-hidden="true" />
              <Link to="/" className="explore-figma-hero-mobile-logo-link" aria-label="FlipTrip home">
                <picture>
                  <source srcSet={FIGMA_LOGO_WEBP} type="image/webp" />
                  <img
                    src={TRIPS_LOGO_PNG}
                    alt=""
                    className="explore-logo explore-logo--figma-v2"
                    width={107}
                    height={66}
                  />
                </picture>
              </Link>
              <button
                type="button"
                className="explore-figma-burger"
                aria-label={figmaMobileNavOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={figmaMobileNavOpen}
                aria-controls="trips-figma-nav-drawer"
                onClick={() => setFigmaMobileNavOpen(true)}
              >
                <span className="explore-figma-burger-lines" aria-hidden="true" />
              </button>
            </div>
            <div className="explore-figma-hero-media">
              {parisLanding ? (
                <img
                  className="explore-figma-hero-paris-img"
                  src={PARIS_LANDING_HERO_IMG}
                  alt=""
                  decoding="async"
                />
              ) : heroVideoSrc ? (
                <video
                  className="explore-figma-hero-video"
                  src={heroVideoSrc}
                  poster={TRIPS_HERO_POSTER}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="metadata"
                />
              ) : (
                <div
                  className="explore-figma-hero-fallback"
                  style={{ backgroundImage: `url(${TRIPS_HERO_POSTER})` }}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="explore-figma-hero-scrim" aria-hidden="true" />
            <div className="explore-figma-hero-center">
              <div className="explore-figma-hero-headlines">
                {parisLanding ? (
                  <>
                    <h1>Self-guided walking tours through Paris. Designed by locals.</h1>
                    <p>7 curated full-day itineraries. €12 each. On your phone instantly.</p>
                  </>
                ) : (
                  <>
                    <h1>Enjoy cities. Like a local.</h1>
                    <p>Your personal, curated city guide from the people who live there.</p>
                  </>
                )}
              </div>
              <div className="explore-figma-hero-cta-wrap">
                <button type="button" className="explore-figma-btn-cta-solid" onClick={scrollToCatalog}>
                  Browse tours
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`explore-figma-nav-modal ${figmaMobileNavOpen ? 'is-open' : ''}`}
        aria-hidden={!figmaMobileNavOpen}
      >
        <button
          type="button"
          className="explore-figma-nav-backdrop"
          tabIndex={figmaMobileNavOpen ? 0 : -1}
          aria-label="Close menu"
          onClick={() => setFigmaMobileNavOpen(false)}
        />
        <div
          id="trips-figma-nav-drawer"
          className="explore-figma-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trips-figma-nav-title"
        >
          <div className="explore-figma-nav-drawer-head">
            <h2 id="trips-figma-nav-title" className="explore-figma-nav-drawer-title">
              Menu
            </h2>
            <button type="button" className="explore-figma-nav-close" aria-label="Close menu" onClick={() => setFigmaMobileNavOpen(false)}>
              ×
            </button>
          </div>
          {renderFigmaAuth({
            afterAction: () => setFigmaMobileNavOpen(false),
            className: 'explore-figma-hero-auth explore-figma-hero-auth--drawer',
          })}
          <nav className="explore-figma-nav-drawer-links" aria-label="Site">
            <Link to="/" onClick={() => setFigmaMobileNavOpen(false)}>
              Home
            </Link>
            <Link to="/trips" onClick={() => setFigmaMobileNavOpen(false)}>
              Browse trips
            </Link>
            {parisLanding ? null : (
              <Link to="/trips/paris" onClick={() => setFigmaMobileNavOpen(false)}>
                Paris tours
              </Link>
            )}
            <Link to="/about" onClick={() => setFigmaMobileNavOpen(false)}>
              About FlipTrip
            </Link>
            <Link to="/contact" onClick={() => setFigmaMobileNavOpen(false)}>
              Contact Us
            </Link>
            <a href="mailto:hi@flip-trip.com" className="explore-figma-nav-drawer-email">
              hi@flip-trip.com
            </a>
          </nav>
        </div>
      </div>

      <section className="trips-catalog" id="trips-catalog" aria-labelledby="trips-heading">
        <div className="trips-catalog-inner">
          <div className="trips-catalog-grid">
            <div className="trips-filters-wrap">
              <div className="trips-filters-sticky">
                <h2 id="trips-heading" className="trips-page-title">
                  Pick your path
                </h2>

                {!parisLanding && (
                  <div className="trips-filters-block">
                    <h3 className="trips-filter-heading">City</h3>
                    <div className="trips-filter-pills" role="group" aria-label="Filter by city">
                      {allCities.map((city) => (
                        <button
                          key={city}
                          type="button"
                          className={`trips-filter-pill ${selectedCities.includes(city) ? 'is-active' : ''}`}
                          onClick={() => toggleCity(city)}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="trips-filters-block">
                  <h3 className="trips-filter-heading">Interests</h3>
                  <div className="trips-filter-pills" role="group" aria-label="Filter by interests">
                    {allInterestLabels.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`trips-filter-pill ${selectedTags.includes(tag) ? 'is-active' : ''}`}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="trips-results">
              <section className="explore-trips-section explore-trips-section--figma">
                {loadError && <p className="trips-empty">{loadError}</p>}
                {loading && displayedTours.length === 0 && !loadError && (
                  <div className="explore-trips-columns explore-trips-columns-skeleton explore-trips-columns--pair-grid">
                    <TourCardSkeleton />
                    <TourCardSkeleton />
                    <TourCardSkeleton />
                    <TourCardSkeleton />
                  </div>
                )}
                {!loading && displayedTours.length === 0 && !loadError && (
                  <p className="trips-empty">No tours match these filters yet.</p>
                )}
                {displayedTours.length > 0 && (
                  <div className="explore-trips-columns explore-trips-columns--pair-grid">
                    {displayedTours.map((tour, index) => (
                      <TourCard
                        key={tour.id || index}
                        tour={tour}
                        tags={tour._resolvedTags || []}
                        variant="below"
                        hideTags
                        imagePriority={index < 2}
                        useImageSkeleton={!tourHasDistinctPreview(tour)}
                        onClick={() => openTour(tour)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </section>

      <footer className="explore-footer about-figma-footer">
        <Link to="/" className="explore-footer-logo-link" aria-label="FlipTrip home">
          <img src={IMG.logoMark} alt="FlipTrip" className="explore-footer-logo about-figma-footer-logo" width={108} height={67} />
        </Link>
        <nav className="explore-footer-links about-figma-footer-nav" aria-label="Footer">
          <Link to="/about">About FlipTrip</Link>
          <Link to="/trips">Browse trips</Link>
          <Link to="/contact">Contact Us</Link>
        </nav>
        <a className="explore-footer-email" href="mailto:hi@flip-trip.com">
          hi@flip-trip.com
        </a>
        <div className="about-figma-footer-line" aria-hidden="true">
          <img src={IMG.lineFooter} alt="" className="about-figma-footer-line-img" />
        </div>
        <span className="explore-footer-copy">© flip-trip 2026</span>
      </footer>
    </main>
  );
}
