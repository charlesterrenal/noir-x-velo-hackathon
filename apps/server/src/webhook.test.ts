import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'goats-test-'));
const { db } = await import('./db.ts');
const { handleVeloWebhook, sameAmount } = await import('./velo.ts');

const SECRET = 'whsec_test';

// Same scheme as the SDK's verifier: header "t=<unix>,v1=<hex HMAC-SHA256 of `${t}.${payload}`>".
function sign(payload: string, secret = SECRET) {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;
}

function paymentEvent(id: string, intentId: string, amount = '1.0000000', asset = 'native') {
  return JSON.stringify({
    version: '1',
    id,
    type: 'payment.succeeded',
    test: false,
    sentAt: new Date().toISOString(),
    project: { id: 'p', registryProjectId: 'r', name: 'The Goats', slug: 'goats' },
    paymentIntent: {
      id: intentId,
      amount,
      asset,
      merchantName: 'The Goats',
      description: null,
      status: 'paid',
      txHash: 'abc123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
}

function addJob(id: string, intentId: string) {
  db.prepare(
    `INSERT INTO jobs (id, request_id, product_id, freshness, checkout_amount, checkout_asset, payment_intent_id)
     VALUES (?, ?, 'iphone-13-mini-256', 'flexible', '1', 'native', ?)`,
  ).run(id, `req-${id}`, intentId);
}
const status = (id: string) => (db.prepare('SELECT status FROM jobs WHERE id = ?').get(id) as { status: string }).status;

test('amount comparison normalizes decimals', () => {
  assert.ok(sameAmount('1', '1.0000000'));
  assert.ok(!sameAmount('1', '1.5'));
  assert.ok(!sameAmount('abc', 'abc'));
});

test('invalid signature is rejected and queues nothing', async () => {
  addJob('j1', 'pi_1');
  const body = paymentEvent('evt_1', 'pi_1');
  const r = await handleVeloWebhook(body, sign(body, 'wrong'), 'd1', SECRET);
  assert.equal(r.status, 400);
  assert.equal(status('j1'), 'awaiting_payment');
});

test('matching payment queues the job once; redelivery changes nothing', async () => {
  const body = paymentEvent('evt_2', 'pi_1');
  assert.equal((await handleVeloWebhook(body, sign(body), 'd2', SECRET)).body, 'queued');
  assert.equal(status('j1'), 'queued');
  assert.equal((await handleVeloWebhook(body, sign(body), 'd2', SECRET)).body, 'duplicate');
  const again = paymentEvent('evt_3', 'pi_1');
  assert.equal((await handleVeloWebhook(again, sign(again), 'd3', SECRET)).body, 'already_processed');
});

test('sample event with no saved job is recorded but queues nothing', async () => {
  const body = paymentEvent('evt_4', 'pi_unknown');
  const r = await handleVeloWebhook(body, sign(body), 'd4', SECRET);
  assert.equal(r.body, 'no_matching_job');
  assert.ok(db.prepare('SELECT 1 FROM webhook_deliveries WHERE delivery_id = ?').get('d4'));
});

test('signed payload with non-string project fields still queues; unsigned one does not', async () => {
  addJob('j3', 'pi_3');
  const body = paymentEvent('evt_6', 'pi_3').replace('"registryProjectId":"r"', '"registryProjectId":null');
  assert.equal((await handleVeloWebhook(body, sign(body, 'wrong'), 'd6', SECRET)).status, 400);
  assert.equal(status('j3'), 'awaiting_payment');
  assert.equal((await handleVeloWebhook(body, sign(body), 'd7', SECRET)).body, 'queued');
});

test('dashboard test event is recorded but never queues', async () => {
  addJob('j4', 'pi_4');
  const body = paymentEvent('evt_7', 'pi_4').replace('"test":false', '"test":true');
  assert.equal((await handleVeloWebhook(body, sign(body), 'd8', SECRET)).body, 'test_event');
  assert.equal(status('j4'), 'awaiting_payment');
});

test('wrong amount does not queue', async () => {
  addJob('j2', 'pi_2');
  const body = paymentEvent('evt_5', 'pi_2', '0.5');
  assert.equal((await handleVeloWebhook(body, sign(body), 'd5', SECRET)).body, 'amount_or_asset_mismatch');
  assert.equal(status('j2'), 'awaiting_payment');
});
