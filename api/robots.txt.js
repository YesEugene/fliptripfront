const DEFAULT_SITE_URL = 'https://flip-trip.com';

function normalizeSiteUrl() {
  return (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
}

export default function handler(req, res) {
  const siteUrl = normalizeSiteUrl();
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    'Disallow: /admin',
    'Disallow: /guide',
    'Disallow: /profile',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
  return res.status(200).send(body);
}
