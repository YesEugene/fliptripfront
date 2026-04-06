const DEFAULT_SITE_URL = 'https://www.flip-trip.com';
const DEFAULT_API_BASE_URL = 'https://fliptripback.vercel.app';
const DEFAULT_OG_IMAGE = 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=1200&h=630&fit=crop&q=80&auto=format';

function slugifyTourTitle(title = '') {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'tour';
}

function buildTourSlug(tour = {}) {
  const id = String(tour?.id || '').trim();
  if (!id) return '';
  const titleSlug = slugifyTourTitle(tour?.title || 'tour');
  return `${titleSlug}-${id}`;
}

function extractTourIdFromSlug(slug = '') {
  const value = String(slug || '').trim();
  const match = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  return match ? match[0] : null;
}

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

function normalizeSiteUrl() {
  return (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
}

function toAbsoluteUrl(url = '') {
  const siteUrl = normalizeSiteUrl();
  const value = String(url || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `${siteUrl}${value}`;
  return '';
}

function getOgImageUrl(rawImage = '', tourId = '') {
  const value = String(rawImage || '').trim();
  if (!value) return DEFAULT_OG_IMAGE;
  // base64 data-URIs can't be used as og:image — serve via /api/og-image proxy
  if (value.startsWith('data:') && tourId) {
    const siteUrl = normalizeSiteUrl();
    return `${siteUrl}/api/og-image?tourId=${encodeURIComponent(tourId)}`;
  }
  if (value.startsWith('data:')) return DEFAULT_OG_IMAGE;
  return toAbsoluteUrl(value) || DEFAULT_OG_IMAGE;
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

function buildPageHtml({ title, description, canonicalPath, bodyHtml, jsonLd, ogImage, pageType = 'website', noindex = false, tourId = '', alternateUrls = [], ogTitle, ogDescription }) {
  const siteUrl = normalizeSiteUrl();
  const canonical = `${siteUrl}${canonicalPath}`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeOgTitle = escapeHtml(ogTitle || title);
  const safeOgDescription = escapeHtml(ogDescription || description);
  const safeOgImage = escapeHtml(getOgImageUrl(ogImage, tourId));
  const robots = noindex ? 'noindex,follow,max-image-preview:large' : 'index,follow,max-image-preview:large';
  const altLinks = alternateUrls.map((u) => `    <link rel="alternate" href="${escapeHtml(u)}" />`).join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <link rel="icon" href="${siteUrl}/favicon.ico" sizes="48x48" />
    <link rel="icon" type="image/svg+xml" href="${siteUrl}/favicon.svg" />
    <link rel="icon" type="image/png" sizes="96x96" href="${siteUrl}/favicon-96x96.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="${siteUrl}/apple-touch-icon.png" />
    <link rel="manifest" href="${siteUrl}/site.webmanifest" />
    <meta name="theme-color" content="#fcfbf9" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <meta name="robots" content="${robots}" />
    <link rel="canonical" href="${canonical}" />
${altLinks}
    <meta property="og:type" content="${escapeHtml(pageType)}" />
    <meta property="og:site_name" content="FlipTrip" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:title" content="${safeOgTitle}" />
    <meta property="og:description" content="${safeOgDescription}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${safeOgImage}" />
    <meta name="twitter:image" content="${safeOgImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeOgTitle}" />
    <meta name="twitter:description" content="${safeOgDescription}" />
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
  const cityName = tour?.city?.name || tour?.city || 'the city';
  const guideName = tour?.guide?.name || 'a local insider';
  const title = tour?.title || 'A curated walk';
  return `${title} in ${cityName}. Discover local spots and practical recommendations from ${guideName}.`;
}

function renderExploreSeo(tours = []) {
  const siteUrl = normalizeSiteUrl();
  const listItems = tours
    .slice(0, 20)
    .map((tour) => {
      const cityName = tour?.city?.name || tour?.city || 'City';
      const tourTitle = tour?.title || 'Tour';
      const tourSlug = buildTourSlug(tour);
      const desc = getTourDescription(tour);
      const itineraryUrl = `/itinerary?tourId=${encodeURIComponent(tour.id)}&previewOnly=true`;
      return `<article>
  <h2><a href="/tour/${escapeHtml(tourSlug)}">${escapeHtml(tourTitle)}</a></h2>
  <p><strong>${escapeHtml(cityName)}</strong></p>
  <p>${escapeHtml(desc)}</p>
  <p><a href="${escapeHtml(itineraryUrl)}">View full tour</a></p>
</article>`;
    })
    .join('\n');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${siteUrl}/explore`,
        url: `${siteUrl}/explore`,
        name: 'Explore Cities Like a Local | FlipTrip',
        isPartOf: { '@id': `${siteUrl}/#website` },
        inLanguage: 'en'
      },
      {
        '@type': 'ItemList',
        name: 'FlipTrip Explore Tours',
        itemListElement: tours.slice(0, 20).map((tour, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${siteUrl}/tour/${buildTourSlug(tour)}`,
          name: tour.title || 'Tour',
          item: {
            '@type': 'TouristTrip',
            url: `${siteUrl}/tour/${buildTourSlug(tour)}`,
            name: tour.title || 'Tour',
            sameAs: `${siteUrl}/itinerary?tourId=${encodeURIComponent(tour.id)}&previewOnly=true`
          }
        }))
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Explore', item: `${siteUrl}/explore` }
        ]
      }
    ]
  });

  return buildPageHtml({
    title: 'Explore Cities Like a Local | FlipTrip',
    description: 'Discover curated city walks and self-guided tours created by local insiders.',
    canonicalPath: '/explore',
    bodyHtml: `<nav aria-label="Breadcrumb"><a href="/">Home</a> / <span>Explore</span></nav><h1>Explore cities. Like a local.</h1>${listItems || '<p>Tours are being prepared.</p>'}`,
    jsonLd,
    ogImage: tours[0]?.draft_data?.previewOriginal || tours[0]?.preview_media_url || DEFAULT_OG_IMAGE,
    tourId: tours[0]?.id || '',
    pageType: 'website'
  });
}

function renderHomeSeo() {
  const siteUrl = normalizeSiteUrl();
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'FlipTrip',
        url: siteUrl,
        inLanguage: 'en'
      },
      {
        '@type': 'WebPage',
        '@id': `${siteUrl}/`,
        url: `${siteUrl}/`,
        name: 'FlipTrip | Curated city routes by locals',
        isPartOf: { '@id': `${siteUrl}/#website` },
        inLanguage: 'en'
      }
    ]
  });

  return buildPageHtml({
    title: 'FlipTrip | Curated city routes by locals',
    description: 'Find city routes created by local insiders and explore places beyond typical tourist paths.',
    canonicalPath: '/',
    bodyHtml: `<h1>FlipTrip — Curated City Routes by Local Insiders</h1>
<p>Explore cities like a local. Skip the tourist traps — discover curated day trips created by people who actually live and breathe the city.</p>
<p>Whether it's hidden courtyards of Paris or ancient layers beneath Rome, these are the places locals recommend to their friends.</p>
<nav><a href="/explore">Explore all tours</a></nav>`,
    jsonLd,
    ogImage: DEFAULT_OG_IMAGE
  });
}

function renderTourSeo(tourId, tour) {
  const siteUrl = normalizeSiteUrl();
  const seo = tour?.draft_data?.seo || {};
  const hasSeo = !!seo.title;
  const tourTitle = tour?.draft_data?.title || tour?.title || 'FlipTrip Tour';
  const fallbackDescription = stripHtml(getTourDescription(tour)).slice(0, 220);
  const cityName = tour?.city?.name || tour?.city || '';
  const tourSlug = buildTourSlug({ ...tour, id: tourId });
  const canonicalPath = seo.cleanUrl || `/tour/${tourSlug}`;
  const openPath = `/itinerary?tourId=${encodeURIComponent(tourId)}&previewOnly=true`;
  const legacyTourPath = `/tour/${tourSlug}`;
  const previewImage = tour?.draft_data?.previewOriginal || tour?.preview_media_url || '';
  const guideName = tour?.guide?.name || 'Local insider';
  const relatedByAuthor = Array.isArray(tour?.authorOtherTours) ? tour.authorOtherTours.slice(0, 3) : [];
  const h2Text = seo.h2 || '';

  const pageTitle = hasSeo ? seo.title : `${tourTitle}${cityName ? ` in ${cityName}` : ''} | FlipTrip`;
  const pageDescription = hasSeo ? seo.metaDescription : fallbackDescription;

  const relatedLinks = relatedByAuthor
    .map((relatedTour) => {
      const relatedSlug = buildTourSlug(relatedTour);
      const relatedTitle = relatedTour?.title || 'More tours';
      if (!relatedSlug) return '';
      return `<li><a href="/tour/${escapeHtml(relatedSlug)}">${escapeHtml(relatedTitle)}</a></li>`;
    })
    .filter(Boolean)
    .join('');

  const bodyHtml = `
<nav aria-label="Breadcrumb">
  <a href="/">Home</a> / <a href="/explore">Explore</a> / <span>${escapeHtml(tourTitle)}</span>
</nav>
<article>
  <h1>${escapeHtml(tourTitle)}</h1>
  ${h2Text ? `<h2>${escapeHtml(h2Text)}</h2>` : ''}
  ${cityName ? `<p><strong>${escapeHtml(cityName)}</strong></p>` : ''}
  <p><strong>Guide:</strong> ${escapeHtml(guideName)}</p>
  <p>${escapeHtml(pageDescription)}</p>
  <p><a href="${escapeHtml(openPath)}">Open tour preview</a></p>
  ${relatedLinks ? `<section><h2>More by this local</h2><ul>${relatedLinks}</ul></section>` : ''}
</article>`;

  const alternateUrls = [`${siteUrl}${openPath}`];
  if (seo.cleanUrl && seo.cleanUrl !== legacyTourPath) {
    alternateUrls.push(`${siteUrl}${legacyTourPath}`);
  }

  let jsonLdStr;
  if (hasSeo && seo.schema) {
    const schemaWithBreadcrumb = {
      '@context': 'https://schema.org',
      '@graph': [
        seo.schema,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Explore', item: `${siteUrl}/explore` },
            { '@type': 'ListItem', position: 3, name: tourTitle, item: `${siteUrl}${canonicalPath}` }
          ]
        }
      ]
    };
    jsonLdStr = JSON.stringify(schemaWithBreadcrumb);
  } else {
    jsonLdStr = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'TouristTrip',
          '@id': `${siteUrl}${canonicalPath}#trip`,
          name: tourTitle,
          description: pageDescription,
          image: getOgImageUrl(previewImage, tourId),
          url: `${siteUrl}${canonicalPath}`,
          sameAs: `${siteUrl}${openPath}`,
          provider: { '@type': 'Organization', name: 'FlipTrip' },
          touristType: 'Independent travelers',
          itinerary: cityName ? { '@type': 'Place', name: cityName } : undefined
        },
        { '@type': 'Person', name: guideName },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Explore', item: `${siteUrl}/explore` },
            { '@type': 'ListItem', position: 3, name: tourTitle, item: `${siteUrl}${canonicalPath}` }
          ]
        }
      ]
    });
  }

  return buildPageHtml({
    title: pageTitle,
    description: pageDescription,
    canonicalPath,
    bodyHtml,
    jsonLd: jsonLdStr,
    ogImage: previewImage,
    pageType: hasSeo ? (seo.ogType || 'product') : 'article',
    tourId,
    alternateUrls,
    ogTitle: hasSeo ? seo.ogTitle : undefined,
    ogDescription: hasSeo ? seo.ogDescription : undefined
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
            canonicalPath: '/explore',
            bodyHtml: '<h1>FlipTrip tour preview</h1><p>Select a tour to continue.</p>',
            noindex: true
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
            canonicalPath: '/explore',
            bodyHtml: '<h1>Tour not found</h1>',
            noindex: true
          })
        );
      }

      // Render full SEO HTML directly (canonical → /tour/slug to avoid duplicate indexing)
      return res.status(200).send(renderTourSeo(tourId, tour));
    }

    if (route === 'tours-clean') {
      const city = String(req.query.city || '').trim();
      const slug = String(req.query.slug || '').trim();
      const cleanPath = `/tours/${city}/${slug}`;

      const allData = await fetchJson(`${apiBaseUrl}/api/tours?status=approved&limit=50&summary=0`);
      const allTours = Array.isArray(allData?.tours) ? allData.tours : [];
      const matched = allTours.find(t => t?.draft_data?.seo?.cleanUrl === cleanPath);

      if (!matched) {
        return res.status(404).send(
          buildPageHtml({
            title: 'Tour not found | FlipTrip',
            description: 'The requested tour was not found.',
            canonicalPath: '/explore',
            bodyHtml: '<h1>Tour not found</h1>',
            noindex: true
          })
        );
      }
      return res.status(200).send(renderTourSeo(matched.id, matched));
    }

    if (route === 'tour') {
      const slug = String(req.query.slug || '').trim();
      const tourId = extractTourIdFromSlug(slug);

      if (!tourId) {
        return res.status(404).send(
          buildPageHtml({
            title: 'Tour not found | FlipTrip',
            description: 'The requested tour was not found.',
            canonicalPath: '/explore',
            bodyHtml: '<h1>Tour not found</h1>',
            noindex: true
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
            canonicalPath: '/explore',
            bodyHtml: '<h1>Tour not found</h1>',
            noindex: true
          })
        );
      }
      return res.status(200).send(renderTourSeo(tourId, tour));
    }

    return res.status(200).send(renderHomeSeo());
  } catch (error) {
    console.error('SEO render error:', error);
    const r = String(req.query.route || '');
    if (r === 'tour' || r === 'itinerary') {
      return res.status(503).send(
        buildPageHtml({
          title: 'FlipTrip',
          description: 'Tour page is temporarily unavailable. Please try again.',
          canonicalPath: '/explore',
          bodyHtml: '<h1>Temporarily unavailable</h1><p>Please try again shortly.</p>',
          noindex: true
        })
      );
    }
    if (r === 'explore') {
      return res.status(503).send(
        buildPageHtml({
          title: 'Explore Cities Like a Local | FlipTrip',
          description: 'Discover curated city walks and self-guided tours created by local insiders.',
          canonicalPath: '/explore',
          bodyHtml: '<h1>Explore cities. Like a local.</h1><p>Please try again shortly.</p>',
          noindex: true
        })
      );
    }
    return res.status(200).send(renderHomeSeo());
  }
}
