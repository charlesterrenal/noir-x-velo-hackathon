import { randomUUID } from 'node:crypto';
import type { CreateJobRequest, Freshness, JobStatus, JobView } from '@goats/shared';
import { db, tx } from './db.ts';
import { velo } from './velo.ts';

// shortcut: one placeholder product until lane C picks the real one and its offers.
export const PRODUCTS: Record<string, { name: string; checkoutFee: string }> = {
  demo: { name: 'Demo product', checkoutFee: '1' },
};
const FRESHNESS: Freshness[] = ['flexible', 'strict'];
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

type Row = Record<string, string | null>;
type Result = { status: number; body: unknown };

export async function createJob(input: unknown): Promise<Result> {
  const req = input as Partial<CreateJobRequest> | null;
  if (
    typeof req?.requestId !== 'string' ||
    !/^[\w-]{8,100}$/.test(req.requestId) ||
    typeof req.productId !== 'string' ||
    !(req.productId in PRODUCTS) ||
    !FRESHNESS.includes(req.freshness as Freshness)
  ) {
    return { status: 400, body: { error: 'invalid request' } };
  }
  if (!velo) return { status: 503, body: { error: 'checkout not configured' } };
  const { requestId, productId, freshness } = req as CreateJobRequest;
  const product = PRODUCTS[productId];

  // Reuse the job for a repeated requestId; otherwise reserve a funded slot and create the job atomically.
  const job = tx(() => {
    const existing = db.prepare('SELECT * FROM jobs WHERE request_id = ?').get(requestId) as Row | undefined;
    if (existing) return existing;
    const slot = db.prepare("SELECT device_hash FROM slots WHERE status = 'available' LIMIT 1").get() as
      | { device_hash: string }
      | undefined;
    if (!slot) return null;
    const id = randomUUID();
    db.prepare(
      `INSERT INTO jobs (id, request_id, product_id, freshness, checkout_amount, checkout_asset, device_hash)
       VALUES (?, ?, ?, ?, ?, 'native', ?)`,
    ).run(id, requestId, productId, freshness, product.checkoutFee, slot.device_hash);
    db.prepare("UPDATE slots SET status = 'reserved', job_id = ? WHERE device_hash = ?").run(id, slot.device_hash);
    return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Row;
  });
  if (!job) return { status: 503, body: { error: 'no demo slot available' } };
  const jobId = job.id!;
  if (job.checkout_url) return { status: 200, body: { jobId, checkoutUrl: job.checkout_url } };
  if (job.status !== 'awaiting_payment') return { status: 409, body: { error: 'job already closed' } };

  let intent;
  try {
    intent = await velo.checkout.sessions.create(
      {
        amount: product.checkoutFee,
        asset: 'native',
        description: `Listing research: ${product.name}`,
        successUrl: `${PUBLIC_BASE_URL}/?job=${jobId}`,
        cancelUrl: `${PUBLIC_BASE_URL}/?job=${jobId}`,
      },
      { idempotencyKey: `job-${jobId}` },
    );
  } catch (err) {
    console.error('velo checkout failed', jobId, err instanceof Error ? err.message : err);
    return { status: 502, body: { error: 'checkout failed, retry with the same requestId' } };
  }

  // Store the amount and asset as Velo echoes them; the webhook must match these.
  db.prepare(
    `UPDATE jobs SET payment_intent_id = ?, checkout_url = ?, checkout_expires_at = ?,
       checkout_amount = ?, checkout_asset = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(intent.id, intent.checkoutUrl, intent.expiresAt, intent.amount, intent.asset, jobId);
  console.log('velo checkout', JSON.stringify({ jobId, id: intent.id, paymentIntentId: intent.paymentIntentId, status: intent.status }));

  if (!intent.checkoutUrl) return { status: 502, body: { error: 'checkout URL missing, retry with the same requestId' } };
  return { status: 200, body: { jobId, checkoutUrl: intent.checkoutUrl } };
}

export function getJobView(id: string): JobView | undefined {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Row | undefined;
  if (!job) return undefined;
  const purchase = db.prepare('SELECT * FROM purchases WHERE job_id = ?').get(id) as Row | undefined;
  const result = job.result_json ? JSON.parse(job.result_json) : {};
  return {
    id,
    status: job.status as JobStatus,
    productId: job.product_id!,
    freshness: job.freshness as Freshness,
    checkoutUrl: job.checkout_url,
    sellerTxHash: job.seller_tx_hash,
    selectedOfferId: purchase?.offer_id ?? null,
    selectionReason: result.selectionReason ?? null,
    decisionTrace: result.decisionTrace ?? [],
    authorizationTxHash: purchase?.auth_hash ?? null,
    claimTxHash: purchase?.claim_hash ?? null,
    error: job.error,
    listing: result.listing ?? null,
  };
}
