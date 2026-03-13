/**
 * /api/og-image?tourId=xxx
 *
 * Serves the tour preview image as a real JPEG/PNG response.
 * Needed because preview images are stored as base64 data-URIs in the DB,
 * which cannot be used as og:image URLs.
 *
 * Cache-Control: public, 1 hour CDN cache + 24 h stale-while-revalidate.
 */

const API_BASE_URL = (process.env.VITE_API_URL || process.env.VITE_API_BASE_URL || 'https://fliptripback.vercel.app').replace(/\/api\/?$/, '');

export default async function handler(req, res) {
  const { tourId } = req.query;

  if (!tourId) {
    return res.status(400).json({ error: 'tourId is required' });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/tours?id=${encodeURIComponent(tourId)}&preview=1`, {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      return res.status(404).end();
    }

    const data = await response.json();
    const tour = data?.tour;
    if (!tour) {
      return res.status(404).end();
    }

    // Try to get the image (prefer previewOriginal which is full-res)
    const rawImage =
      tour?.draft_data?.previewOriginal ||
      tour?.draft_data?.preview ||
      tour?.preview_media_url ||
      tour?.preview ||
      '';

    // ── base64 data URI ────────────────────────────────────
    if (rawImage.startsWith('data:')) {
      const match = rawImage.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) {
        return res.status(404).end();
      }
      const mimeType = match[1];
      const buffer = Buffer.from(match[2], 'base64');

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(buffer);
    }

    // ── external URL — proxy it ────────────────────────────
    if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
      const imgResponse = await fetch(rawImage);
      if (!imgResponse.ok) {
        return res.status(404).end();
      }
      const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await imgResponse.arrayBuffer();

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(Buffer.from(arrayBuffer));
    }

    // Nothing useful
    return res.status(404).end();
  } catch (err) {
    console.error('og-image error:', err);
    return res.status(500).end();
  }
}
