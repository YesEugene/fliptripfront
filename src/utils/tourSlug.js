export function slugifyTourTitle(title = '') {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'tour';
}

export function buildTourSlug(tour = {}) {
  const id = String(tour?.id || '').trim();
  if (!id) return '';
  const titleSlug = slugifyTourTitle(tour?.title || 'tour');
  return `${titleSlug}-${id}`;
}

export function extractTourIdFromSlug(slug = '') {
  const value = String(slug || '').trim();
  // Any standard hex UUID suffix (not only RFC "v4-looking" variants — avoids rare crawl misses)
  const match = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  return match ? match[0] : null;
}
