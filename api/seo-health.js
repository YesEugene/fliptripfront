const DEFAULT_SITE_URL = 'https://www.flip-trip.com';
const DEFAULT_API_BASE_URL = 'https://fliptripback.vercel.app';

function normalizeApiBaseUrl() {
  const raw = process.env.VITE_API_URL || process.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
  return raw.replace(/\/api\/?$/, '');
}

function normalizeSiteUrl() {
  return (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
}

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
  return `${slugifyTourTitle(tour?.title || 'tour')}-${id}`;
}

export default async function handler(req, res) {
  const apiBaseUrl = normalizeApiBaseUrl();
  const siteUrl = normalizeSiteUrl();

  try {
    const toursResponse = await fetch(`${apiBaseUrl}/api/tours?status=approved&limit=200&summary=1`, {
      headers: { Accept: 'application/json' }
    });
    const toursJson = toursResponse.ok ? await toursResponse.json() : { tours: [] };
    const tours = Array.isArray(toursJson?.tours) ? toursJson.tours : [];

    const sample = tours.slice(0, 5).map((tour) => ({
      id: tour.id,
      title: tour.title,
      canonicalUrl: `${siteUrl}/tour/${buildTourSlug(tour)}`
    }));

    return res.status(200).json({
      success: true,
      checkedAt: new Date().toISOString(),
      siteUrl,
      indexedRoutes: ['/', '/explore', '/tour/:slug'],
      noindexRoutes: ['/admin/*', '/guide/*', '/profile/*', '/login', '/register', '/payment', '/success'],
      approvedToursCount: tours.length,
      sampleCanonicalUrls: sample
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      checkedAt: new Date().toISOString(),
      error: error?.message || 'Unknown SEO health error'
    });
  }
}
