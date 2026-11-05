import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { NoirContractError, type NoirSigner } from '@noirx402/agent-sdk';
import { OFFERS, buildListing, type Offer } from '@goats/agent';

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'goats-worker-'));
const { db } = await import('./db.ts');
const { runOnce, recoverAfterRestart } = await import('./worker.ts');

// Fixture offers: basic data is 3 days old, recent data 2 hours old (relative to the fixed 'now' below).
const comparable = { url: 'https://example.test/listing', observedAt: '2026-11-06', price: '20000', condition: 'used' };
const TEST_OFFERS: Offer[] = [
  { id: 'basic', productId: 'iphone-13-mini-256', label: 'Basic research', merchant: 'basic', amount: '1',
    snapshot: { id: 'b', takenAt: '2026-11-03T12:00:00+08:00', currency: 'PHP', comparables: [comparable] } },
  { id: 'recent', productId: 'iphone-13-mini-256', label: 'Recent research', merchant: 'recent', amount: '2',
    snapshot: { id: 'r', takenAt: '2026-11-06T10:00:00+08:00', currency: 'PHP', comparables: [comparable] } },
];

const signer = (publicKey: string): NoirSigner => ({ publicKey, signTransaction: async (x) => x });
const CAP = 25_000_000n; // 2.5 XLM

function fakeNoir(opts: { refuseAll?: boolean; authError?: Error } = {}) {
  let pending = 0n;
  const auths: { amount: bigint; merchant: string; nonce?: bigint }[] = [];
  return {
    auths,
    noir: {
      checkPayment: async (p: { amount: bigint }) =>
        opts.refuseAll ? { ok: false as const, reason: 'expired' as const }
        : p.amount <= CAP ? { ok: true as const } : { ok: false as const, reason: 'over_limit' as const },
      authorizePayment: async (p: { amount: bigint; merchant: string; nonce?: bigint }) => {
        if (opts.authError) throw opts.authError;
        auths.push(p);
        pending += p.amount;
        return { hash: 'authhash', nonce: p.nonce ?? 0n };
      },
      getPendingBalance: async () => pending,
      prepare: async (): Promise<string> => 'xdr',
      claim: async () => {
        pending = 0n;
        return { hash: 'claimhash' };
      },
    },
  };
}

const deps = (noir: ReturnType<typeof fakeNoir>['noir']) => ({
  noir,
  agent: signer('GAGENT'),
  merchants: { basic: signer('GBASIC'), recent: signer('GRECENT') },
  now: () => new Date('2026-11-06T12:00:00+08:00'),
  offers: TEST_OFFERS,
});

let n = 0;
function queueJob(freshness: 'flexible' | 'strict') {
  const id = `job${++n}`;
  db.prepare(
    `INSERT INTO jobs (id, request_id, product_id, freshness, checkout_amount, checkout_asset, device_hash, status)
     VALUES (?, ?, 'iphone-13-mini-256', ?, '1', 'native', ?, 'queued')`,
  ).run(id, `req-${id}`, freshness, `dev${n}`.padEnd(64, '0'));
  db.prepare("INSERT INTO slots (device_hash, job_id, status) VALUES (?, ?, 'reserved')").run(`dev${n}`.padEnd(64, '0'), id);
  return id;
}
const job = (id: string) => db.prepare('SELECT status, error, result_json FROM jobs WHERE id = ?').get(id) as Record<string, string>;
const purchase = (id: string) => db.prepare('SELECT * FROM purchases WHERE job_id = ?').get(id) as Record<string, string> | undefined;

test('flexible freshness buys the cheaper, older offer and completes', async () => {
  const id = queueJob('flexible');
  const fake = fakeNoir();
  assert.equal(await runOnce(deps(fake.noir)), id);
  assert.equal(job(id).status, 'completed');
  const p = purchase(id)!;
  assert.equal(p.offer_id, 'basic');
  assert.equal(p.merchant, 'GBASIC');
  assert.equal(p.auth_hash, 'authhash');
  assert.equal(p.claim_hash, 'claimhash');
  assert.equal(String(fake.auths[0].nonce), p.nonce); // the saved nonce is the one sent
  assert.equal((db.prepare('SELECT status FROM slots WHERE job_id = ?').get(id) as { status: string }).status, 'spent');
  assert.ok(JSON.parse(job(id).result_json).listing);
});

test('strict freshness filters the old snapshot and buys the recent offer', async () => {
  const id = queueJob('strict');
  await runOnce(deps(fakeNoir().noir));
  assert.equal(purchase(id)!.offer_id, 'recent');
  const trace = JSON.parse(job(id).result_json).decisionTrace;
  assert.match(trace.find((t: { offerId: string }) => t.offerId === 'basic').filteredOut, /older than 12 hours/);
});

test('policy refusal on every offer blocks without paying', async () => {
  const id = queueJob('flexible');
  const fake = fakeNoir({ refuseAll: true });
  await runOnce(deps(fake.noir));
  assert.equal(job(id).status, 'blocked');
  assert.equal(purchase(id), undefined);
  assert.equal(fake.auths.length, 0);
  // Nothing was spent, so the slot goes back to the pool.
  assert.equal(db.prepare('SELECT 1 FROM slots WHERE job_id = ?').get(id), undefined);
});

test('contract refusal during authorization blocks the job', async () => {
  const id = queueJob('flexible');
  await runOnce(deps(fakeNoir({ authError: new NoirContractError('paymentEscrow', 2, 'InsufficientBalance', 'authorize') }).noir));
  assert.equal(job(id).status, 'blocked');
  assert.equal(purchase(id)!.status, 'refused');
});

test('unknown authorization outcome goes to review and pauses further purchases', async () => {
  const id = queueJob('flexible');
  await runOnce(deps(fakeNoir({ authError: new Error('timeout') }).noir));
  assert.equal(job(id).status, 'review');
  const next = queueJob('flexible');
  assert.equal(await runOnce(deps(fakeNoir().noir)), null);
  assert.equal(job(next).status, 'queued');
});

test('review job whose authorization never landed is requeued after it expires, then completes', async () => {
  // The previous test left a job in review with a purchase in 'unknown'.
  const stuck = db.prepare("SELECT job_id FROM purchases WHERE status = 'unknown'").get() as { job_id: string };
  db.prepare("UPDATE purchases SET updated_at = datetime('now', '-10 minutes') WHERE job_id = ?").run(stuck.job_id);
  const fake = fakeNoir();
  const prepare = async () => 'xdr';
  // The paused queued job runs first, then the requeued one.
  await runOnce(deps({ ...fake.noir, prepare }));
  await runOnce(deps({ ...fake.noir, prepare }));
  assert.equal(job(stuck.job_id).status, 'completed');
});

test('review job whose authorization did land stays for the operator', async () => {
  const id = queueJob('flexible');
  await runOnce(deps({ ...fakeNoir({ authError: new Error('timeout') }).noir, prepare: async () => 'xdr' }));
  assert.equal(job(id).status, 'review');
  db.prepare("UPDATE purchases SET updated_at = datetime('now', '-10 minutes') WHERE job_id = ?").run(id);
  const prepare = async () => {
    throw new NoirContractError('paymentEscrow', 6, 'DuplicateAuth', 'authorize');
  };
  await runOnce(deps({ ...fakeNoir().noir, prepare }));
  assert.equal(job(id).status, 'review');
  assert.equal(purchase(id)!.status, 'needs_operator');
  db.prepare("UPDATE jobs SET status = 'blocked' WHERE id = ?").run(id); // unpause for later tests
});

test('restart: mid-comparison job requeues, mid-payment job goes to review', () => {
  const a = queueJob('flexible');
  const b = queueJob('flexible');
  db.prepare("UPDATE jobs SET status = 'comparing' WHERE id = ?").run(a);
  db.prepare("UPDATE jobs SET status = 'purchasing' WHERE id = ?").run(b);
  recoverAfterRestart();
  assert.equal(job(a).status, 'queued');
  assert.equal(job(b).status, 'review');
});

test('real basic snapshot prices the listing at the median of its comparables', () => {
  const listing = buildListing(OFFERS.find((o) => o.id === 'basic')!, 'iPhone 13 mini 256GB');
  assert.equal(listing.suggestedPrice, '19700.40');
  assert.equal(listing.sources.length, 6);
});
