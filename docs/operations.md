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

1. Wait 6 minutes. Noir SDK transactions expire after 300 seconds, so after that the worker replays the saved authorization as a simulation. If the nonce was never used, it requeues the job and pays once.
2. If the job is still in `review` and its purchase shows `needs_operator`, the original payment did land. Find it on [Stellar Expert](https://stellar.expert/explorer/testnet) under the agent's account and finish the order by hand.

## Deploys

Every push to `main` redeploys the server. The worker finishes a payment in flight before stopping, but don't push during an order, the recording or the pitch.

## Pitch-day checklist

1. `npm run recheck-prices`, commit, push, and wait for the deploy.
2. Count free slots and add more if fewer than 4 remain.
3. Check the agent account has at least 20 XLM for fees on [Stellar Expert](https://stellar.expert/explorer/testnet).
4. Device policies expire 2026-11-09 00:00 Manila, after the 1:00 to 8:00 PM pitch window.
5. Place one flexible order end to end.
6. No pushes until the pitch is over.
