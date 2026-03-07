const DEFAULT_SITE_URL = 'https://flip-trip.com';
const DEFAULT_API_BASE_URL = 'https://fliptripback.vercel.app';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeApiBaseUrl() {
  const raw = process.env.VITE_API_URL || process.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
  return raw.replace(/\/api\/?$/, '');
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} for ${url}`);
  }
  return response.json();
}

function buildPageHtml({ title, description, canonicalPath, bodyHtml, jsonLd }) {
  const siteUrl = process.env.SITE_URL || DEFAULT_SITE_URL;
  const canonical = `${siteUrl}${canonicalPath}`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:url" content="${canonical}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    ${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
  </head>
  <body>
    <main>
      ${bodyHtml}
    </main>
  </body>
</html>`;
}

function getTourDescription(tour) {
  const draftShort = tour?.draft_data?.shortDescription;
  if (draftShort && String(draftShort).trim()) return String(draftShort).trim();
  if (tour?.description && String(tour.description).trim()) return String(tour.description).trim();
  return 'A curated city route by a local insider.';
}

function renderExploreSeo(tours = []) {
  const listItems = tours
    .slice(0, 20)
    .map((tour) => {
      const cityName = tour?.city?.name || tour?.city || 'City';
      const tourTitle = tour?.title || 'Tour';
      const tourId = tour?.id || '';
      const desc = getTourDescription(tour);
      return `<article>
  <h2><a href="/itinerary?tourId=${escapeHtml(tourId)}&previewOnly=true">${escapeHtml(tourTitle)}</a></h2>
  <p><strong>${escapeHtml(cityName)}</strong></p>
  <p>${escapeHtml(desc)}</p>
</article>`;
    })
    .join('\n');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'FlipTrip Explore Tours',
    itemListElement: tours.slice(0, 20).map((tour, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${process.env.SITE_URL || DEFAULT_SITE_URL}/itinerary?tourId=${tour.id}&previewOnly=true`,
      name: tour.title || 'Tour'
    }))
  });

  return buildPageHtml({
    title: 'Explore Cities Like a Local | FlipTrip',
    description: 'Discover curated city walks and self-guided tours created by local insiders.',
    canonicalPath: '/explore',
    bodyHtml: `<h1>Explore cities. Like a local.</h1>${listItems || '<p>Tours are being prepared.</p>'}`,
    jsonLd
  });
}

function renderHomeSeo() {
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FlipTrip',
    url: process.env.SITE_URL || DEFAULT_SITE_URL
  });

  return buildPageHtml({
    title: 'FlipTrip | Curated city routes by locals',
    description: 'Find city routes created by local insiders and explore places beyond typical tourist paths.',
    canonicalPath: '/',
    bodyHtml: '<h1>FlipTrip</h1><p>Curated city guides from people who live there.</p>',
    jsonLd
  });
}

function renderTourSeo(tourId, tour) {
  const tourTitle = tour?.title || 'FlipTrip Tour';
  const description = stripHtml(getTourDescription(tour)).slice(0, 220);
  const cityName = tour?.city?.name || tour?.city || '';
  const canonicalPath = `/itinerary?tourId=${encodeURIComponent(tourId)}&previewOnly=true`;
  const previewImage = tour?.draft_data?.previewOriginal || tour?.preview_media_url || '';

  const bodyHtml = `
<article>
  <h1>${escapeHtml(tourTitle)}</h1>
  ${cityName ? `<p><strong>${escapeHtml(cityName)}</strong></p>` : ''}
  <p>${escapeHtml(description)}</p>
  <p><a href="${escapeHtml(canonicalPath)}">Open tour preview</a></p>
</article>`;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: tourTitle,
    description,
    image: previewImage || undefined,
    url: `${process.env.SITE_URL || DEFAULT_SITE_URL}${canonicalPath}`
  });

  return buildPageHtml({
    title: `${tourTitle} | FlipTrip`,
    description,
    canonicalPath,
    bodyHtml,
    jsonLd
  });
}

export default async function handler(req, res) {
  const route = req.query.route || '';
  const apiBaseUrl = normalizeApiBaseUrl();

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  try {
    if (route === 'explore') {
      const data = await fetchJson(`${apiBaseUrl}/api/tours?status=approved&limit=40&summary=1`);
      const tours = Array.isArray(data?.tours) ? data.tours : [];
      return res.status(200).send(renderExploreSeo(tours));
    }

    if (route === 'itinerary') {
      const tourId = req.query.tourId;
      if (!tourId) {
        return res.status(200).send(
          buildPageHtml({
            title: 'Tour preview | FlipTrip',
            description: 'Open curated city routes by local insiders.',
            canonicalPath: '/itinerary',
            bodyHtml: '<h1>FlipTrip tour preview</h1><p>Select a tour to continue.</p>'
          })
        );
      }

      const data = await fetchJson(`${apiBaseUrl}/api/tours?id=${encodeURIComponent(tourId)}`);
      const tour = data?.tour || null;

      if (!tour) {
        return res.status(404).send(
          buildPageHtml({
            title: 'Tour not found | FlipTrip',
            description: 'The requested tour was not found.',
            canonicalPath: '/itinerary',
            bodyHtml: '<h1>Tour not found</h1>'
          })
        );
      }

      return res.status(200).send(renderTourSeo(tourId, tour));
    }

    return res.status(200).send(renderHomeSeo());
  } catch (error) {
    console.error('SEO render error:', error);
    return res.status(200).send(renderHomeSeo());
  }
}
