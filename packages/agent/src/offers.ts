import type { DecisionEntry, Freshness, Listing, OfferSummary } from '@goats/shared';

export type MerchantKey = 'basic' | 'recent';

export type Comparable = { url: string; observedAt: string; price: string; condition: string };

export type Offer = {
  id: string;
  productId: string;
  label: string;
  merchant: MerchantKey;
  amount: string; // XLM
  snapshot: { id: string; takenAt: string; currency: string; comparables: Comparable[] };
};

// shortcut: placeholder offers with no comparables; lane C replaces them with dated, source-backed snapshots.
export const OFFERS: Offer[] = [
  {
    id: 'basic',
    productId: 'demo',
    label: 'Basic research',
    merchant: 'basic',
    amount: '1',
    snapshot: { id: 'basic-2026-10-25', takenAt: '2026-10-25T00:00:00+08:00', currency: 'PHP', comparables: [] },
  },
  {
    id: 'recent',
    productId: 'demo',
    label: 'Recent research',
    merchant: 'recent',
    amount: '2',
    snapshot: { id: 'recent-2026-11-05', takenAt: '2026-11-05T12:00:00+08:00', currency: 'PHP', comparables: [] },
  },
];

// Oldest snapshot each freshness setting accepts.
export const MAX_AGE_HOURS: Record<Freshness, number> = { flexible: 30 * 24, strict: 7 * 24 };

export const ageHours = (offer: Offer, now: Date) =>
  Math.round((now.getTime() - new Date(offer.snapshot.takenAt).getTime()) / 36e5);

export function offerSummaries(): OfferSummary[] {
  return OFFERS.map((o) => ({
    id: o.id,
    productId: o.productId,
    label: o.label,
    amount: o.amount,
    snapshotId: o.snapshot.id,
    snapshotTakenAt: o.snapshot.takenAt,
  }));
}

export type PaymentCheckResult = { ok: true } | { ok: false; reason: string };

export type Selection = { offer: Offer | null; reason: string; trace: DecisionEntry[] };

/**
 * Deterministic agent rule: drop offers for another product or older than the freshness limit,
 * ask Noir whether each remaining offer could be paid, then take the cheapest payable one (tie-break: id).
 */
export async function selectOffer(
  offers: Offer[],
  job: { productId: string; freshness: Freshness },
  now: Date,
  checkPayment: (offer: Offer) => Promise<PaymentCheckResult>,
): Promise<Selection> {
  const maxAge = MAX_AGE_HOURS[job.freshness];
  const sorted = [...offers].sort((a, b) => Number(a.amount) - Number(b.amount) || a.id.localeCompare(b.id));
  const trace: DecisionEntry[] = [];
  let chosen: Offer | null = null;

  for (const offer of sorted) {
    const entry: DecisionEntry = { offerId: offer.id, amount: offer.amount, snapshotAgeHours: ageHours(offer, now) };
    trace.push(entry);
    if (offer.productId !== job.productId) entry.filteredOut = 'different product';
    else if (entry.snapshotAgeHours > maxAge) entry.filteredOut = `snapshot older than ${maxAge / 24} days`;
    if (entry.filteredOut) continue;
    const check = await checkPayment(offer);
    entry.checkPayment = check.ok ? { ok: true } : { ok: false, reason: check.reason };
    if (check.ok && !chosen) chosen = offer;
  }

  const limit = `${job.freshness} freshness (max ${maxAge / 24} days)`;
  const reason = chosen
    ? `Cheapest offer that meets ${limit} and passes the Noir policy check: ${chosen.label} at ${chosen.amount} XLM, data ${Math.round(ageHours(chosen, now) / 24)} days old.`
    : `No offer meets ${limit} and passes the Noir policy check.`;
  return { offer: chosen, reason, trace };
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function buildListing(offer: Offer, productName: string): Listing {
  const prices = offer.snapshot.comparables.map((c) => Number(c.price)).filter(Number.isFinite);
  const m = median(prices);
  return {
    title: productName,
    description: m === null
      ? `No comparable listings in this snapshot yet.`
      : `Priced from ${prices.length} comparable listings observed up to ${offer.snapshot.takenAt.slice(0, 10)}.`,
    suggestedPrice: m === null ? 'n/a' : m.toFixed(2),
    currency: offer.snapshot.currency,
    sources: offer.snapshot.comparables,
  };
}
