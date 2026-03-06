import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import { getTours } from '../services/api';
import './ExplorePage.css';

const FILTER_PILLS = [
  { label: 'Rome', active: false },
  { label: 'Paris', active: true },
  { label: 'Active' },
  { label: 'Culture' },
  { label: 'Family' },
  { label: 'Food', accent: 'blue' },
  { label: 'Nature' }
];

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=1200&h=1600&fit=crop&q=80&auto=format';
const FALLBACK_GUIDE_BIO = 'Local creator sharing authentic city routes, hidden places, and personal recommendations.';
const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getTourImage(tour) {
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

  if (unique.length > 0) return unique.slice(0, 5);

  // Fallback so every tour card still shows meaningful chips.
  return [tour?.city || 'City walk', tour?.format || 'Local route'].filter(Boolean).slice(0, 3);
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
  return {
    id: `fallback-${tour.id}`,
    name: 'Local Insider',
    avatar: '',
    bio: FALLBACK_GUIDE_BIO,
    city: tour.city || 'Paris',
    interests: 'Culture, Food, Coffee'
  };
}

function TourCard({ tour, className = '', variant = 'below', onClick, interestNameById }) {
  const creatorName = tour?.guide?.name || 'Local Insider';
  const creatorAvatar = tour?.guide?.avatar_url || '';
  const tags = getTourTags(tour, interestNameById);
  const cardTitle = tour?.title || 'Explore city with a local';
  const description = tour?.description || tour?.subtitle || 'Curated route with authentic places and local context.';
  const isOverlay = variant === 'overlay';

  return (
    <article className={`explore-tour-card ${className} ${isOverlay ? 'is-overlay' : 'is-below'}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="explore-tour-media">
        <img src={getTourImage(tour)} alt={cardTitle} className="explore-tour-card-image" />
        <div className="explore-tour-card-overlay" />
        <div className="explore-tour-card-meta">
          <div className="explore-creator-row">
            <img
              src={creatorAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&q=80&auto=format'}
              alt={creatorName}
              className="explore-creator-avatar"
            />
            <span className="explore-creator-name">{creatorName}</span>
          </div>
          {isOverlay && <span className="explore-city-pill">{tour?.city || 'City'}</span>}
        </div>
        {!isOverlay && <span className="explore-city-pill explore-city-pill-bottom">{tour?.city || 'City'}</span>}

        {isOverlay && (
          <div className="explore-tour-card-content">
            <h3>{cardTitle}</h3>
            <p>{description}</p>
            <div className="explore-tags-row">
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
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interestNameById, setInterestNameById] = useState(new Map());

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
    const loadTours = async () => {
      try {
        setLoading(true);
        const result = await getTours({ limit: 20 });
        if (result?.success && Array.isArray(result.tours)) {
          setTours(result.tours);
        } else {
          setTours([]);
        }
      } catch (error) {
        console.error('Failed to load explore tours:', error);
        setTours([]);
      } finally {
        setLoading(false);
      }
    };

    loadTours();
  }, []);

  const displayedTours = useMemo(() => tours.slice(0, 5), [tours]);

  const insiders = useMemo(() => {
    const unique = new Map();
    tours.forEach((tour) => {
      const guide = getGuideFromTour(tour);
      if (!unique.has(guide.id)) unique.set(guide.id, guide);
    });
    return Array.from(unique.values()).slice(0, 2);
  }, [tours]);

  return (
    <main className="explore-page">
      <header className="explore-topbar">
        <div className="explore-topbar-inner">
          <Link to="/" className="explore-logo-link" aria-label="FlipTrip home">
            <img src={FlipTripLogo} alt="FlipTrip" className="explore-logo" />
          </Link>
          <div className="explore-auth-actions">
            <button type="button" className="become-local-btn" onClick={() => navigate('/register')}>
              Become a Local
            </button>
            <button type="button" className="login-btn" onClick={() => navigate('/login')}>
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

      <section className="explore-pills-wrap">
        {FILTER_PILLS.map((pill) => (
          <span
            key={pill.label}
            className={`explore-pill ${pill.active ? 'active' : ''} ${pill.accent === 'blue' ? 'accent-blue' : ''}`}
          >
            {pill.label}
          </span>
        ))}
      </section>

      <section className="explore-trips-section">
        <div className="explore-trips-grid">
          {displayedTours.map((tour, index) => {
            const cardClass = `explore-card-pos-${index}`;
            const variant = index === 4 ? 'overlay' : 'below';
            return (
              <TourCard
                key={tour.id || index}
                tour={tour}
                className={cardClass}
                variant={variant}
                interestNameById={interestNameById}
                onClick={() => navigate(`/preview?tourId=${tour.id}`)}
              />
            );
          })}
        </div>
        {loading && <p className="explore-loading">Loading trips...</p>}
      </section>

      <section className="more-trips-row">
        <button type="button" className="more-trips-btn" onClick={() => navigate('/')}>
          More Trips
        </button>
      </section>

      <section className="explore-insiders">
        <h2>Meet Your Local Insiders</h2>
        <p>
          Whenever we land in a new city, the first thing we do is text a friend for advice. Flip-Trip does that for you.
          We&apos;ve brought together a community of locals to share personal city secrets and routes they truly love.
        </p>
        <div className="insiders-grid">
          {insiders.map((insider) => (
            <article className="insider-card" key={insider.id}>
              <img
                src={insider.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=340&h=340&fit=crop&q=80&auto=format'}
                alt={insider.name}
                className="insider-avatar"
              />
              <div className="insider-content">
                <h3>{insider.name}</h3>
                <p>{insider.bio}</p>
                <div className="insider-meta">
                  <div><strong>City:</strong> {insider.city || 'Paris'}</div>
                  <div><strong>Interests:</strong> {insider.interests || 'Culture, Food, Art'}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="insiders-nav">← &nbsp;&nbsp; →</div>
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
