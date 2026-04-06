/**
 * Intro long-read for new tour authors (English). Layout aligned with Figma guide dashboard.
 */
import { Link } from 'react-router-dom';
import BarcelonaHero from '../../../assets/Barcelona-example.png';
import MontjuicImage from '../../../assets/Montjuïc Hill (Miradors & Paths).jpg';

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
        <div className="guide-intro-collage" aria-hidden="true">
          <div className="guide-intro-collage-main">
            <img src={BarcelonaHero} alt="" className="guide-intro-collage-photo" />
          </div>
          <div className="guide-intro-collage-phone">
            <div className="guide-intro-phone-frame">
              <div className="guide-intro-phone-notch" />
              <p className="guide-intro-phone-title">Back in time: a perfect date</p>
              <span className="guide-intro-phone-pill">Download PDF</span>
            </div>
          </div>
          <div className="guide-intro-collage-map">
            <img src={MontjuicImage} alt="" className="guide-intro-map-thumb" />
            <div className="guide-intro-map-pins">
              <span className="guide-intro-map-pin">1</span>
              <span className="guide-intro-map-pin">2</span>
            </div>
          </div>
        </div>
        <div className="guide-intro-split-text">
          <h2 className="guide-intro-section-title">What we are building together</h2>
          <p>
            FlipTrip is a place for <strong>curated, self-guided day trips</strong> that feel personal — like a
            walk you would plan for a friend who only has one day. We are not looking for encyclopaedic lists of
            sights. We want routes with a point of view: your neighbourhoods, your timing, your reasons to stop.
          </p>
          <p>
            Travelers get a clear itinerary they can open on their phone, follow on a map, and optionally download
            as a PDF. Your job is to make that route coherent, honest, and enjoyable to read.
          </p>
        </div>
      </section>

      <section className="guide-intro-authors">
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
        <blockquote className="guide-intro-quote">
          You do not need to be a professional guide. You do need to be specific, structured, and genuinely excited
          to share how you would spend a day.
        </blockquote>
      </section>

      <section className="guide-intro-split guide-intro-split--visualizer">
        <div className="guide-intro-blocks-demo" aria-hidden="true">
          <div className="guide-intro-blocks-toolbar">
            <span className="guide-intro-blocks-tool">↕</span>
            <span className="guide-intro-blocks-tool">+</span>
            <span className="guide-intro-blocks-tool">Copy</span>
            <span className="guide-intro-blocks-tool">Edit</span>
            <span className="guide-intro-blocks-tool">Delete</span>
          </div>
          <div className="guide-intro-blocks-stack">
            <div className="guide-intro-block-card guide-intro-block-card--title">
              <span>Title</span>
            </div>
            <p className="guide-intro-block-plus">+</p>
            <div className="guide-intro-block-card guide-intro-block-card--location">
              <span>Location</span>
            </div>
            <p className="guide-intro-block-plus">+</p>
            <div className="guide-intro-block-card guide-intro-block-card--columns">
              <span>3 columns</span>
              <div className="guide-intro-block-columns-inner">
                <span /><span /><span />
              </div>
            </div>
            <p className="guide-intro-block-plus">+</p>
            <div className="guide-intro-block-card guide-intro-block-card--text">
              <span>Text block</span>
              <div className="guide-intro-block-lines">
                <span /><span /><span /><span />
              </div>
            </div>
          </div>
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
            Create your trip guide
          </Link>
        </div>
      </section>

      <section className="guide-intro-more">
        <h2 className="guide-intro-section-title guide-intro-section-title--smallcaps">Block types you can use</h2>
        <p className="guide-intro-more-lead">
          These are the main building blocks in the Visualizer (labels may vary slightly in the UI):
        </p>
        <dl className="guide-intro-dl">
          <div>
            <dt>Title</dt>
            <dd>Section headings to break the day into chapters.</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>Stops with place details, tips, photos, and map coordinates.</dd>
          </div>
          <div>
            <dt>Photo + text</dt>
            <dd>Image with caption or short story between stops.</dd>
          </div>
          <div>
            <dt>Text</dt>
            <dd>Standalone paragraphs for context.</dd>
          </div>
          <div>
            <dt>Slide</dt>
            <dd>A short visual sequence or gallery.</dd>
          </div>
          <div>
            <dt>3 columns</dt>
            <dd>Three compact columns for quick comparisons or highlights.</dd>
          </div>
          <div>
            <dt>Photo</dt>
            <dd>Full-width image when the picture leads the section.</dd>
          </div>
          <div>
            <dt>Divider</dt>
            <dd>A visual pause between major parts of the itinerary.</dd>
          </div>
          <div>
            <dt>Map</dt>
            <dd>Route or overview map, often using your location pins.</dd>
          </div>
        </dl>
        <p>
          You do not have to use every type. Strong tours usually combine a handful of location blocks with clear
          titles, one or two reflective text or photo blocks, and a map where it helps orientation.
        </p>
      </section>

      <section className="guide-intro-next">
        <h2 className="guide-intro-section-title guide-intro-section-title--smallcaps">What to do next</h2>
        <ol className="guide-intro-ol">
          <li>
            Open <strong>My tours</strong> when you are ready to attach a trip to your account, or open{' '}
            <strong>Trip Visualizer</strong> to start drafting.
          </li>
          <li>
            Complete <strong>Profile</strong> so travelers know who you are — a short bio and a clear photo build
            trust.
          </li>
          <li>
            Build the route in the Visualizer, preview often, and refine copy until someone new to the city could
            follow your day without guessing.
          </li>
        </ol>
      </section>
    </article>
  );
}
