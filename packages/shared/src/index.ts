// API contract shared by apps/web, apps/server and packages/agent.
// XLM amounts travel as decimal strings ("1.5"); convert with the Noir SDK's toStroops/fromStroops.

export type Freshness = 'flexible' | 'strict';

// Oldest research data each freshness setting accepts. Hours-based because snapshots are collected days apart at most.
export const MAX_AGE_HOURS: Record<Freshness, number> = { flexible: 30 * 24, strict: 12 };

export const formatAge = (hours: number) =>
  hours < 1 ? 'under an hour' : hours < 48 ? `${hours} hour${hours === 1 ? '' : 's'}` : `${Math.round(hours / 24)} days`;

export type JobStatus =
  | 'awaiting_payment' // checkout created, waiting for a verified Velo payment.succeeded
  | 'queued' // payment verified, waiting for the worker
  | 'comparing' // agent is selecting an offer
  | 'purchasing' // Noir authorizePayment in progress
  | 'claiming' // merchant claim in progress
  | 'completed'
  | 'blocked' // definite refusal (no eligible offer, policy refusal)
  | 'review' // ambiguous chain outcome; operator must reconcile
  | 'closed'; // checkout expired or cancelled unpaid

// GET /api/offers
export type OfferSummary = {
  id: string;
  productId: string;
  label: string;
  amount: string; // XLM
  snapshotId: string;
  snapshotTakenAt: string; // ISO 8601
  listings: number; // comparable listings in the snapshot
  low: string | null; // lowest and highest listing price, PHP
  high: string | null;
};

// POST /api/jobs
export type CreateJobRequest = {
  requestId: string; // client-generated, stable across retries
  productId: string;
  freshness: Freshness;
};
export type CreateJobResponse = {
  jobId: string;
  checkoutUrl: string;
};

export type DecisionEntry = {
  offerId: string;
  amount: string;
  snapshotAgeHours: number;
  filteredOut?: string; // reason, when the offer was excluded
  checkPayment?: { ok: boolean; reason?: string };
};

export type Listing = {
  title: string;
  description: string;
  suggestedPrice: string;
  currency: string;
  sources: { url: string; observedAt: string; price: string; condition: string }[];
};

// GET /api/jobs/:id
export type JobView = {
  id: string;
  status: JobStatus;
  productId: string;
  freshness: Freshness;
  checkoutUrl: string | null;
  sellerTxHash: string | null;
  selectedOfferId: string | null;
  selectionReason: string | null;
  decisionTrace: DecisionEntry[];
  authorizationTxHash: string | null;
  claimTxHash: string | null;
  error: string | null;
  listing: Listing | null;
};
