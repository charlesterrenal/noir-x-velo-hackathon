# Operations

Procedures for running the Listo demo on Stellar Testnet. Commands run from the repo root on the operator's machine, where `.env` holds the keys `npm run noir:setup` created.

## Add order slots

Each order uses one funded Noir device. A slot is freed again only when the agent is blocked before paying.

1. Run `npm run noir:setup -- --count 3`. Run one setup at a time: parallel runs sign with the same owner account and their transactions collide.
2. Check that every device prints `done: escrow 5 XLM`.
3. Append the printed hashes to `DEVICE_HASHES` in Railway (comma-separated), then deploy.

If a run stops partway, run `npm run noir:setup -- <card-uid>` with the UID it printed. Every step reads the chain first and only does what's missing.

## Refresh Recent research

Strict-freshness orders only buy data under 12 hours old. Refresh before recording and on the morning of the pitch.

1. Run `npm run recheck-prices`. It reads the Allo Allo iPhone 13 mini 256GB pages and writes `packages/agent/src/recent-snapshot.json`.
2. Look over the diff: prices should be in pesos, roughly ₱18,000 to ₱23,000.
3. Commit and push. The new snapshot is live after the deploy finishes.

The script stops without writing if a page changes layout, a price is outside ₱10,000 to ₱50,000, or fewer than 3 listings are in stock.

## A job in `review`

A job goes to `review` when the server can't tell whether the agent's Noir payment reached the chain, for example after a restart mid-payment. New purchases pause until it resolves.

To see why, query the database on the Railway volume (`$DATA_DIR/goats.db`) with any SQLite client:

```sql
SELECT j.id, j.error, p.status, p.error, p.auth_hash, p.claim_hash
FROM jobs j LEFT JOIN purchases p ON p.job_id = j.id
WHERE j.status = 'review';
```

There is no admin endpoint yet, and the Railway console's shell doesn't have `node` on its PATH, so this needs direct access to the volume.

| What you see | What happened | What to do |
| --- | --- | --- |
| No `auth_hash`, purchase `authorizing` or `unknown` | Interrupted while authorizing | Wait 6 minutes. Noir SDK transactions expire after 300 seconds; the worker then replays the saved authorization as a simulation and, if the nonce was never used, requeues the job and pays once. |
| Purchase `needs_operator`, error says the authorization reached the chain | The payment landed but its hash wasn't recorded | Find it on [Stellar Expert](https://stellar.expert/explorer/testnet) under the agent's account, then finish the order by hand. |
| Purchase `needs_operator`, error starts with `reconcile failed:` | The simulation itself failed, so the outcome is still unknown | Read the error, fix the cause (often RPC), then set the purchase back to `unknown` so the worker retries. |
| `auth_hash` set, no `claim_hash` (job was `claiming`, or purchase `claim_failed`) | The agent paid but the research seller's claim didn't finish | Never retried automatically. Have the seller claim (its key is `MERCHANT_BASIC_SECRET` or `MERCHANT_RECENT_SECRET`), then close the job. |

To release the pause once an order is resolved: `UPDATE jobs SET status = 'blocked', error = 'resolved by operator' WHERE id = '<job id>';`

## Deploys

Every push to `main` redeploys the server. The worker finishes a payment in flight before stopping, but don't push during an order, the recording or the pitch.

## Pitch-day checklist

1. `npm run recheck-prices`, commit, push, and wait for the deploy.
2. Count free slots and add more if fewer than 4 remain.
3. Check the agent account has at least 20 XLM for fees on [Stellar Expert](https://stellar.expert/explorer/testnet).
4. Device policies expire 2026-11-09 00:00 Manila, after the 1:00 to 8:00 PM pitch window.
5. Place one flexible order end to end.
6. No pushes until the pitch is over.
