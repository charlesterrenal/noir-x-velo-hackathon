import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dataDir = process.env.DATA_DIR ?? './data';
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, 'goats.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS jobs (
    id                  TEXT PRIMARY KEY,
    request_id          TEXT NOT NULL UNIQUE,
    product_id          TEXT NOT NULL,
    freshness           TEXT NOT NULL,
    checkout_amount     TEXT NOT NULL,
    checkout_asset      TEXT NOT NULL,
    payment_intent_id   TEXT UNIQUE,
    checkout_url        TEXT,
    checkout_expires_at TEXT,
    seller_tx_hash      TEXT,
    device_hash         TEXT,
    status              TEXT NOT NULL DEFAULT 'awaiting_payment',
    result_json         TEXT,
    error               TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS webhook_deliveries (
    delivery_id       TEXT PRIMARY KEY, -- x-velo-delivery header
    event_id          TEXT,
    payment_intent_id TEXT,
    event_type        TEXT,
    test              INTEGER,
    received_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id          INTEGER PRIMARY KEY,
    job_id      TEXT NOT NULL UNIQUE REFERENCES jobs(id),
    offer_id    TEXT NOT NULL,
    snapshot_id TEXT NOT NULL,
    merchant    TEXT NOT NULL,
    amount      TEXT NOT NULL,
    asset       TEXT NOT NULL,
    device_hash TEXT NOT NULL,
    nonce       TEXT NOT NULL, -- bigint as string, saved before authorizePayment
    status      TEXT NOT NULL,
    auth_hash   TEXT,
    claim_hash  TEXT,
    error       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS slots (
    device_hash TEXT PRIMARY KEY,
    job_id      TEXT UNIQUE REFERENCES jobs(id),
    status      TEXT NOT NULL DEFAULT 'available' -- available | reserved | spent
  );
`);
