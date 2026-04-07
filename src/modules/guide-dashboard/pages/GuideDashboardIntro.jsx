/**
 * Intro long-read for new tour authors (English). PNGs from Imgs/Author (1–3); no extra CSS shadows.
 */
import { Link } from 'react-router-dom';
import imgWhatWeBuild from '../../../assets/guide-author/what-we-build.webp';
import imgAuthors from '../../../assets/guide-author/authors.webp';
import imgTripVisualizer from '../../../assets/guide-author/trip-visualizer.webp';

export default function GuideDashboardIntro() {
  return (
    <article className="guide-intro">
      <header className="guide-intro-hero">
        <h1 className="guide-intro-h1">Welcome to FlipTrip</h1>
        <p className="guide-intro-lead">
          This short guide explains what we expect from local authors, how our tools work, and how to turn your
          favourite day in the city into a tour travelers can actually follow.
        </p>
      </header>

      <section className="guide-intro-split">
        <div className="guide-intro-panel-img" aria-hidden="true">
          <img src={imgWhatWeBuild} alt="" className="guide-intro-png" />
        </div>
        <div className="guide-intro-split-text">
          <h2 className="guide-intro-section-title">What we are building together</h2>
          <p>
            FlipTrip is a place for curated, self-guided day trips that feel personal, like a walk you would plan for a
            friend who only has one day. We are not looking for encyclopaedic lists of sights. We want routes with a
            point of view: your neighbourhoods, your timing, your reasons to stop.
          </p>
          <p>
            Travelers get a clear itinerary they can open on their phone, follow on a map, and optionally download
            as a PDF. Your job is to make that route coherent, honest, and enjoyable to read.
          </p>
        </div>
      </section>

      <section className="guide-intro-split guide-intro-split--authors">
        <div className="guide-intro-split-text">
          <h2 className="guide-intro-section-title">The authors we are looking for</h2>
          <p className="guide-intro-authors-sub">We work best with people who:</p>
          <ul className="guide-intro-list guide-intro-list--authors">
            <li>
              <strong>Know the city beyond the postcard</strong>
              <span> — backstreets, small museums, lunch spots, and the logic of how to move between them in a day.</span>
            </li>
            <li>
              <strong>Can explain why a place matters</strong>
              <span> — a sentence of context beats a paragraph of generic history. We want your angle.</span>
            </li>
            <li>
              <strong>Respect the traveler&apos;s time</strong>
              <span> — realistic pacing, clear order, no filler stops that only exist to lengthen the route.</span>
            </li>
            <li>
              <strong>Are willing to iterate</strong>
              <span>
                {' '}
                — first drafts are fine; we care that you refine structure, copy, and map pins until the trip is easy
                to follow.
              </span>
            </li>
          </ul>
        </div>
        <div className="guide-intro-panel-img guide-intro-panel-img--right" aria-hidden="true">
          <img src={imgAuthors} alt="" className="guide-intro-png" />
        </div>
      </section>

      <section className="guide-intro-quote-section" aria-label="Note for authors">
        <blockquote className="guide-intro-quote">
          You do not need to be a professional guide. You do need to be specific, structured, and genuinely excited to
          share how you would spend a day.
        </blockquote>
      </section>

      <section className="guide-intro-split guide-intro-split--visualizer">
        <div className="guide-intro-panel-img" aria-hidden="true">
          <img src={imgTripVisualizer} alt="" className="guide-intro-png" />
        </div>
        <div className="guide-intro-split-text">
          <h2 className="guide-intro-section-title">The Trip Visualizer</h2>
          <p>
            The <strong>Trip Visualizer</strong> is where you build and edit your tour. It is not a single long
            document — it is a <strong>sequence of blocks</strong>. Each block is one piece of the page: a title, a
            location, a photo with text, a map, and so on.
          </p>
          <p>
            You can <strong>add</strong> blocks, <strong>reorder</strong> them, and <strong>edit</strong> their
            content until the story of the day reads in the right order. Think of it as laying out a magazine
            feature: one block at a time, each with a clear job.
          </p>
          <p>
            Location blocks are the backbone: they carry the place name, address or map pin, your description,
            tips, and photos. Other blocks help you set tone — section titles, full-width photos, short essays, or
            a route map that pulls pins from your locations.
          </p>
          <p className="guide-intro-visualizer-outro">
            Instead of a thousand words, try building a tour once — you will see how the pieces fit. Welcome aboard.
          </p>
          <Link to="/guide/tours/visualizer" className="guide-intro-cta">
            Create trip guide
          </Link>
        </div>
      </section>
    </article>
  );
}
