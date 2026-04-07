const DEFAULT_SITE_URL = 'https://www.flip-trip.com';
const DEFAULT_API_BASE_URL = 'https://fliptripback.vercel.app';

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

function xmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeApiBaseUrl() {
  const raw = process.env.VITE_API_URL || process.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
  return raw.replace(/\/api\/?$/, '');
}

function normalizeSiteUrl() {
  return (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
}

function toIsoDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

export default async function handler(req, res) {
  const siteUrl = normalizeSiteUrl();
  const apiBaseUrl = normalizeApiBaseUrl();

  try {
    const response = await fetch(`${apiBaseUrl}/api/tours?status=approved&limit=500&summary=1`, {
      headers: { Accept: 'application/json' }
    });
    const json = response.ok ? await response.json() : { tours: [] };
    const tours = Array.isArray(json?.tours) ? json.tours : [];

    const staticUrls = [
      { loc: `${siteUrl}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${siteUrl}/about`, changefreq: 'monthly', priority: '0.8' },
      { loc: `${siteUrl}/contact`, changefreq: 'monthly', priority: '0.75' },
      { loc: `${siteUrl}/join`, changefreq: 'monthly', priority: '0.7' },
      { loc: `${siteUrl}/become-local`, changefreq: 'monthly', priority: '0.7' }
    ];

    const tourUrls = tours
      .filter((tour) => tour?.id)
      .flatMap((tour) => {
        const lastmod = toIsoDate(tour.updated_at || tour.created_at);
        const cleanUrl = tour?.draft_data?.seo?.cleanUrl;

        if (cleanUrl) {
          return [{
            loc: `${siteUrl}${cleanUrl}`,
            lastmod,
            changefreq: 'weekly',
            priority: '0.9'
          }];
        }

        return [
          {
            loc: `${siteUrl}/tour/${buildTourSlug(tour)}`,
            lastmod,
            changefreq: 'weekly',
            priority: '0.8'
          },
          {
            loc: `${siteUrl}/itinerary?tourId=${encodeURIComponent(tour.id)}&previewOnly=true`,
            lastmod,
            changefreq: 'weekly',
            priority: '0.7'
          }
        ];
      });

    const urls = [...staticUrls, ...tourUrls];

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${xmlEscape(entry.loc)}</loc>
    ${entry.lastmod ? `<lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : ''}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
    return res.status(200).send(body);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${xmlEscape(`${siteUrl}/`)}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${xmlEscape(`${siteUrl}/about`)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${xmlEscape(`${siteUrl}/contact`)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
  </url>
  <url>
    <loc>${xmlEscape(`${siteUrl}/join`)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${xmlEscape(`${siteUrl}/become-local`)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).send(fallback);
  }
}
