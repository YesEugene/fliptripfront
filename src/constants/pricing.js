/** Default self-guided price when tour/DB has none (matches Stripe Flip-Trip €12) */
export const DEFAULT_SELF_GUIDED_PRICE = 12;
export const DEFAULT_TOUR_CURRENCY = 'EUR';

/**
 * Legacy rows often have price_pdf = 16 and currency USD (old site default).
 * Catalogue / Stripe is €12 — map that legacy default to the live price for display.
 * Custom prices (≠16) are left as-is.
 */
export function normalizeSelfGuidedDisplay(pricePdf, currency) {
  const raw = pricePdf != null && pricePdf !== '' ? Number(pricePdf) : NaN;
  const cur = String(currency || '').toUpperCase();
  if (Number.isFinite(raw) && raw === 16) {
    return { amount: DEFAULT_SELF_GUIDED_PRICE, currency: DEFAULT_TOUR_CURRENCY };
  }
  if (!Number.isFinite(raw) || raw <= 0) {
    return { amount: DEFAULT_SELF_GUIDED_PRICE, currency: DEFAULT_TOUR_CURRENCY };
  }
  return { amount: raw, currency: cur || DEFAULT_TOUR_CURRENCY };
}
