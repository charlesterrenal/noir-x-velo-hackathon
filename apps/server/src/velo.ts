import { Velo, VeloWebhookSignatureVerificationError } from '@carts1024/velo-sdk';
import { db, tx } from './db.ts';

export const velo = process.env.VELO_API_KEY
  ? new Velo({ apiKey: process.env.VELO_API_KEY, environment: 'testnet' })
  : null;

// Decimal string to 7-decimal integer units, so "1", "1.0" and "1.0000000" compare equal.
function toUnits(amount: string): bigint | null {
  const m = /^(\d+)(?:\.(\d{1,7}))?$/.exec(amount.trim());
  return m ? BigInt(m[1] + (m[2] ?? '').padEnd(7, '0')) : null;
}
export function sameAmount(a: string, b: string): boolean {
  const x = toUnits(a);
  return x !== null && x === toUnits(b);
}
const assetKey = (asset: string) => (['native', 'xlm'].includes(asset.toLowerCase()) ? 'native' : asset);

type JobRow = { id: string; status: string; checkout_amount: string; checkout_asset: string };

export async function handleVeloWebhook(
  payload: string,
  signature: string | null,
  deliveryId: string | null,
  secret: string,
): Promise<{ status: number; body: string }> {
  let event;
  try {
    event = await Velo.webhooks.verify({ payload, signature, secret });
  } catch (err) {
    if (err instanceof VeloWebhookSignatureVerificationError) return { status: 400, body: 'invalid signature' };
    throw err;
  }

  const intent = 'paymentIntent' in event ? event.paymentIntent : undefined;
  const key = deliveryId ?? `event:${event.id}`;

  const outcome = tx(() => {
    const inserted = db
      .prepare(
        `INSERT INTO webhook_deliveries (delivery_id, event_id, payment_intent_id, event_type, test)
         VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
      )
      .run(key, event.id, intent?.id ?? null, event.type, event.test ? 1 : 0);
    if (inserted.changes === 0) return 'duplicate';
    if (event.type !== 'payment.succeeded' || !intent) return 'ignored';

    const job = db
      .prepare('SELECT id, status, checkout_amount, checkout_asset FROM jobs WHERE payment_intent_id = ?')
      .get(intent.id) as JobRow | undefined;
    if (!job) return 'no_matching_job';
    if (job.status !== 'awaiting_payment') return 'already_processed';
    if (!sameAmount(intent.amount, job.checkout_amount) || assetKey(intent.asset) !== assetKey(job.checkout_asset)) {
      return 'amount_or_asset_mismatch';
    }

    // The single transition out of awaiting_payment: the guard against a second purchase.
    db.prepare(
      `UPDATE jobs SET status = 'queued', seller_tx_hash = ?, updated_at = datetime('now')
       WHERE id = ? AND status = 'awaiting_payment'`,
    ).run(intent.txHash ?? null, job.id);
    return 'queued';
  });

  console.log(
    'velo webhook',
    JSON.stringify({
      delivery: key,
      eventId: event.id,
      type: event.type,
      test: event.test,
      paymentIntentId: intent?.id,
      txHash: intent?.txHash,
      outcome,
    }),
  );
  return { status: 200, body: outcome };
}
