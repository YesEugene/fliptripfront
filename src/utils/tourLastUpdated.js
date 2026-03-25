/** Format tour row date as DD.MM.YYYY (matches Figma). Returns null if missing/invalid. */
export function formatTourLastUpdatedLabel(tourLike) {
  if (!tourLike || typeof tourLike !== 'object') return null;
  const raw =
    tourLike.draft_data?.updated_at ||
    tourLike.updated_at ||
    tourLike.created_at;
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  } catch {
    return null;
  }
}
