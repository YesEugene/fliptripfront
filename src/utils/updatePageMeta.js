const SITE_URL = 'https://www.flip-trip.com';
const DEFAULTS = {
  title: 'FlipTrip — Curated City Routes by Local Insiders',
  description: 'Discover curated city walks and self-guided tours created by locals who actually live there. Paris, Rome and more.',
};

function setAttr(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el && value) el.setAttribute(attr, value);
}

function setMetaContent(nameOrProp, value) {
  if (!value) return;
  const el = document.querySelector(`meta[name="${nameOrProp}"], meta[property="${nameOrProp}"]`);
  if (el) el.setAttribute('content', value);
}

export function updatePageMeta({ title, description, canonicalPath, ogTitle, ogDescription, ogImage }) {
  document.title = title || DEFAULTS.title;

  setMetaContent('description', description || DEFAULTS.description);

  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : `${SITE_URL}${window.location.pathname}`;
  setAttr('#canonical-link', 'href', canonical);

  setMetaContent('og:title', ogTitle || title || DEFAULTS.title);
  setMetaContent('og:description', ogDescription || description || DEFAULTS.description);
  setAttr('#og-url', 'content', canonical);
  if (ogImage) setMetaContent('og:image', ogImage);

  setMetaContent('twitter:title', ogTitle || title || DEFAULTS.title);
  setMetaContent('twitter:description', ogDescription || description || DEFAULTS.description);
}

export function resetPageMeta() {
  updatePageMeta({
    title: DEFAULTS.title,
    description: DEFAULTS.description,
    canonicalPath: window.location.pathname,
  });
}
