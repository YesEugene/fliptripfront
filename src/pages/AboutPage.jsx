import React from 'react';
import { Link } from 'react-router-dom';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import './AboutPage.css';

export default function AboutPage() {
  return (
    <main className="about-page">
      {/* Header */}
      <header className="about-topbar">
        <div className="about-topbar-inner">
          <Link to="/" className="about-logo-link" aria-label="FlipTrip home">
            <img src={FlipTripLogo} alt="FlipTrip" className="about-logo" />
          </Link>
          <Link to="/explore" className="about-back-link">
            Explore tours →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="about-hero">
        <h1>
          EVERY CITY HAS A STORY.<br />
          LOCALS KNOW IT BEST.
        </h1>
        <p className="about-hero-sub">
          FlipTrip connects you with people who actually live in the city — so you
          can skip the tourist traps and discover places worth remembering.
        </p>
      </section>

      {/* The Problem */}
      <section className="about-section">
        <div className="about-content">
          <h2>THE PROBLEM</h2>
          <p className="about-lead">
            You land in a new city. You open Google Maps. You scroll through
            hundreds of "top 10" lists, TripAdvisor reviews, and influencer
            reels — and somehow still end up at overpriced tourist spots with
            mediocre food.
          </p>
          <p>
            Sound familiar? We've all been there. The best version of any city
            isn't on a billboard — it's in the head of someone who walks those
            streets every day. The architect who knows which courtyard has the
            best light at noon. The chef who can tell you where locals actually
            eat on Sundays. The artist who knows where to catch the sunset
            nobody else sees.
          </p>
        </div>
      </section>

      {/* What FlipTrip Does */}
      <section className="about-section about-section-dark">
        <div className="about-content">
          <h2>WHAT WE DO</h2>
          <div className="about-grid">
            <div className="about-card">
              <span className="about-card-icon">🗺️</span>
              <h3>Curated Day Routes</h3>
              <p>
                Each tour is a ready-to-follow route through a city — with real
                places, walking directions, insider tips, and photos. No
                planning needed. Just pick a mood and go.
              </p>
            </div>
            <div className="about-card">
              <span className="about-card-icon">🏠</span>
              <h3>Made by Locals</h3>
              <p>
                Every route is created by someone who actually lives there.
                Architects, food lovers, history buffs, street art fans — real
                people sharing the city they know and love.
              </p>
            </div>
            <div className="about-card">
              <span className="about-card-icon">📄</span>
              <h3>Downloadable PDF</h3>
              <p>
                Buy a tour and get a beautifully designed PDF guide with a map,
                photos, and all the details. Works offline, fits your pocket,
                and stays with you forever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="about-section">
        <div className="about-content">
          <h2>HOW IT WORKS</h2>
          <div className="about-steps">
            <div className="about-step">
              <span className="about-step-num">1</span>
              <div>
                <h3>Pick a city and a vibe</h3>
                <p>
                  Browse routes by city and theme — hidden gems, food crawls,
                  architecture walks, romantic evenings, or underground history.
                </p>
              </div>
            </div>
            <div className="about-step">
              <span className="about-step-num">2</span>
              <div>
                <h3>Preview the route</h3>
                <p>
                  See the full itinerary, locations, photos, and the local
                  author who created it — before you buy anything.
                </p>
              </div>
            </div>
            <div className="about-step">
              <span className="about-step-num">3</span>
              <div>
                <h3>Download and explore</h3>
                <p>
                  Get your PDF guide, open the map, and follow the route at
                  your own pace. No guides, no groups, no schedule — just
                  you and the city.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Where We Are Now */}
      <section className="about-section about-section-accent">
        <div className="about-content">
          <h2>WHERE WE ARE NOW</h2>
          <p className="about-lead">
            We're just getting started — with <strong>Paris</strong> and{' '}
            <strong>Rome</strong>.
          </p>
          <p>
            Right now FlipTrip has a small, hand-picked collection of tours
            from local creators in two of the world's most visited cities.
            We're focused on getting the experience right: the quality of
            routes, the ease of buying, and the feeling that you've found
            something genuinely worth your time.
          </p>
          <p>
            More cities, more authors, and more features are coming — but the
            core idea stays the same: <strong>the best way to see a city
            is through the eyes of someone who lives there.</strong>
          </p>
        </div>
      </section>

      {/* For Locals */}
      <section className="about-section">
        <div className="about-content">
          <h2>FOR LOCALS</h2>
          <p className="about-lead">
            Know your city inside out? Share it with the world.
          </p>
          <p>
            If you're an architect, a chef, a photographer, a history nerd, or
            just someone who genuinely loves where they live — you can create
            a tour on FlipTrip. Build a route, add your favorite places, write
            your tips, and earn money every time someone downloads your guide.
          </p>
          <div className="about-cta-row">
            <Link to="/become-local" className="about-cta-btn">
              Become a Local →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about-section about-section-dark about-cta-section">
        <div className="about-content" style={{ textAlign: 'center' }}>
          <h2>READY TO EXPLORE?</h2>
          <p>
            Skip the tourist traps. Follow the locals.
          </p>
          <Link to="/explore" className="about-cta-btn about-cta-btn-light">
            Browse tours in Paris & Rome
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="about-footer">
        <img src={FlipTripLogo} alt="FlipTrip" className="about-footer-logo" />
        <span>© flip-trip 2026</span>
      </footer>
    </main>
  );
}
