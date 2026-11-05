import { NoirContractError, keypairSigner, toStroops, type NoirAgentClient, type NoirSigner } from '@noirx402/agent-sdk';
import {
  OFFERS,
  XLM,
  buildListing,
  describeError,
  noirClient,
  requireSecret,
  selectOffer,
  type MerchantKey,
} from '@goats/agent';
import type { Freshness } from '@goats/shared';
import { db, tx } from './db.ts';
import { PRODUCTS } from './jobs.ts';

export type WorkerDeps = {
  noir: Pick<NoirAgentClient, 'checkPayment' | 'authorizePayment' | 'claim' | 'getPendingBalance'>;
  agent: NoirSigner;
  merchants: Record<MerchantKey, NoirSigner>;
  now?: () => Date;
};

type JobRow = { id: string; product_id: string; freshness: Freshness; device_hash: string; result_json: string | null };

const setJob = (id: string, status: string, error: string | null = null) =>
  db.prepare("UPDATE jobs SET status = ?, error = ?, updated_at = datetime('now') WHERE id = ?").run(status, error, id);
const setResult = (id: string, result: object) =>
  db.prepare("UPDATE jobs SET result_json = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(result), id);
const setPurchase = (jobId: string, fields: Record<string, string>) => {
  const cols = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE purchases SET ${cols}, updated_at = datetime('now') WHERE job_id = ?`).run(...Object.values(fields), jobId);
};
// Only for refusals where no money left the device: the slot's allowance is intact, so another order can use it.
const blockAndReleaseSlot = (id: string, error: string) => {
  setJob(id, 'blocked', error);
  db.prepare(`UPDATE slots SET status = 'available', job_id = NULL WHERE job_id = ? AND ${REAL_DEVICE}`).run(id);
};
// Placeholder smoke-test slots (not 64-char hashes) are never handed out again.
const REAL_DEVICE = 'length(device_hash) = 64';

/**
 * Runs after a restart: a job left mid-comparison has written nothing on chain and can start over;
 * a job left mid-payment may or may not have reached the chain, so an operator must reconcile it.
 */
export function recoverAfterRestart() {
  db.prepare("UPDATE jobs SET status = 'queued' WHERE status = 'comparing'").run();
  db.prepare(
    "UPDATE jobs SET status = 'review', error = 'interrupted during payment; reconcile on Stellar Expert' WHERE status IN ('purchasing', 'claiming')",
  ).run();
  // Blocked jobs that never authorized a payment leave the device allowance untouched.
  db.prepare(
    `UPDATE slots SET status = 'available', job_id = NULL
     WHERE ${REAL_DEVICE} AND job_id IN (
       SELECT j.id FROM jobs j WHERE j.status = 'blocked'
       AND NOT EXISTS (SELECT 1 FROM purchases p WHERE p.job_id = j.id AND p.auth_hash IS NOT NULL))`,
  ).run();
}

/** Takes and fully processes at most one queued job. Returns the job ID it handled, if any. */
export async function runOnce(deps: WorkerDeps): Promise<string | null> {
  // Any job awaiting reconciliation pauses new purchases.
  if (db.prepare("SELECT 1 FROM jobs WHERE status = 'review' LIMIT 1").get()) return null;

  const job = tx(() => {
    const next = db.prepare("SELECT * FROM jobs WHERE status = 'queued' ORDER BY created_at LIMIT 1").get() as
      | JobRow
      | undefined;
    if (next) setJob(next.id, 'comparing');
    return next;
  });
  if (!job) return null;

  const now = deps.now?.() ?? new Date();
  const agentAddress = deps.agent.publicKey;

  // 1. Decide whom to pay and how much. Nothing on chain yet, so any failure here is a clean block.
  let selection;
  try {
    selection = await selectOffer(OFFERS, { productId: job.product_id, freshness: job.freshness }, now, (offer) =>
      deps.noir.checkPayment({
        deviceHash: job.device_hash,
        agent: agentAddress,
        asset: XLM,
        amount: toStroops(offer.amount),
        requireEscrow: true,
      }),
    );
  } catch (err) {
    tx(() => blockAndReleaseSlot(job.id, `offer comparison failed: ${describeError(err)}`));
    return job.id;
  }
  const decision = { selectionReason: selection.reason, decisionTrace: selection.trace };
  setResult(job.id, decision);
  const offer = selection.offer;
  if (!offer) {
    tx(() => blockAndReleaseSlot(job.id, selection.reason));
    return job.id;
  }

  const merchant = deps.merchants[offer.merchant];
  const amount = toStroops(offer.amount);
  const nonce = BigInt(Date.now());

  // 2. Persist the purchase and its nonce before any chain write.
  tx(() => {
    db.prepare(
      `INSERT INTO purchases (job_id, offer_id, snapshot_id, merchant, amount, asset, device_hash, nonce, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'authorizing')`,
    ).run(job.id, offer.id, offer.snapshot.id, merchant.publicKey, offer.amount, XLM, job.device_hash, String(nonce));
    setJob(job.id, 'purchasing');
  });

  // 3. Agent pays from the device escrow.
  try {
    const { hash } = await deps.noir.authorizePayment({
      agent: deps.agent,
      deviceHash: job.device_hash,
      merchant: merchant.publicKey,
      asset: XLM,
      amount,
      nonce,
    });
    tx(() => {
      setPurchase(job.id, { auth_hash: hash, status: 'authorized' });
      setJob(job.id, 'claiming');
    });
  } catch (err) {
    if (err instanceof NoirContractError) {
      tx(() => {
        setPurchase(job.id, { status: 'refused', error: err.errorName });
        blockAndReleaseSlot(job.id, `Noir refused the payment: ${err.errorName}`);
      });
    } else {
      tx(() => {
        setPurchase(job.id, { status: 'unknown', error: describeError(err) });
        setJob(job.id, 'review', `authorization outcome unknown: ${describeError(err)}`);
      });
    }
    return job.id;
  }

  // 4. Merchant collects. Only this purchase should be pending; anything else needs a human.
  try {
    const pending = await deps.noir.getPendingBalance(merchant.publicKey);
    if (pending !== amount) throw new Error(`merchant has ${pending} stroops pending, expected ${amount}`);
    const { hash } = await deps.noir.claim({ merchant, token: XLM });
    setPurchase(job.id, { claim_hash: hash, status: 'claimed' });
  } catch (err) {
    tx(() => {
      setPurchase(job.id, { status: 'claim_failed', error: describeError(err) });
      setJob(job.id, 'review', `payment authorized but claim failed: ${describeError(err)}`);
    });
    return job.id;
  }

  // 5. Deliver the result. The slot's allowance is used; it never takes another order.
  const listing = buildListing(offer, PRODUCTS[job.product_id]?.name ?? job.product_id);
  tx(() => {
    setResult(job.id, { ...decision, listing });
    setJob(job.id, 'completed');
    db.prepare("UPDATE slots SET status = 'spent' WHERE job_id = ?").run(job.id);
  });
  return job.id;
}

export function startWorker() {
  let deps: WorkerDeps;
  try {
    deps = {
      noir: noirClient(),
      agent: keypairSigner(requireSecret('AGENT_SECRET').secret()),
      merchants: {
        basic: keypairSigner(requireSecret('MERCHANT_BASIC_SECRET').secret()),
        recent: keypairSigner(requireSecret('MERCHANT_RECENT_SECRET').secret()),
      },
    };
  } catch (err) {
    console.warn(`worker not started: ${describeError(err)}`);
    return;
  }
  recoverAfterRestart();
  let busy = false;
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const id = await runOnce(deps);
      if (id) console.log('worker', JSON.stringify(db.prepare('SELECT id, status, error FROM jobs WHERE id = ?').get(id)));
    } catch (err) {
      console.error('worker error', describeError(err));
    } finally {
      busy = false;
    }
  }, 3000);
  console.log('worker started');
}
