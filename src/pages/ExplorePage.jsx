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

function getTourImage(tour) {
  if (tour?.preview_media_url && tour.preview_media_url.trim()) return tour.preview_media_url;
  if (tour?.preview && tour.preview.trim()) return tour.preview;
  return DEFAULT_IMAGE;
}

function getTourTags(tour) {
  if (!Array.isArray(tour?.tour_tags)) return [];
  return tour.tour_tags
    .map((tt) => tt?.tag?.name || tt?.interest?.name)
    .filter(Boolean)
    .slice(0, 4);
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

function TourCard({ tour, className = '', onClick }) {
  const creatorName = tour?.guide?.name || 'Local Insider';
  const creatorAvatar = tour?.guide?.avatar_url || '';
  const tags = getTourTags(tour);
  const cardTitle = tour?.title || 'Explore city with a local';
  const description = tour?.description || tour?.subtitle || 'Curated route with authentic places and local context.';

  return (
    <article className={`explore-tour-card ${className}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
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
        <span className="explore-city-pill">{tour?.city || 'City'}</span>
      </div>

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
    </article>
  );
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <h1>Explore cities. Like a local.</h1>
        <p>Your personal, curated city guide from the people who live there. Just Paris and Rome. For now.</p>
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
            let cardClass = 'explore-card-medium';
            if (index === 0) cardClass = 'explore-card-tall';
            if (index === 3) cardClass = 'explore-card-tall';
            if (index === 4) cardClass = 'explore-card-wide';
            return (
              <TourCard
                key={tour.id || index}
                tour={tour}
                className={cardClass}
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
