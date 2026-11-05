// Re-checks the Allo Allo iPhone 13 mini 256GB pages and writes the 'Recent research' snapshot.
// Usage: npm run recheck-prices   then review the diff of packages/agent/src/recent-snapshot.json, commit and push.
// Reads the schema.org Offer in each page's JSON-LD: the lowest grade currently listed on that page.
import { writeFileSync } from 'node:fs';
import type { Comparable } from '@goats/agent';

const BASE = 'https://www.alloallo.com/ph/refurbished-iphone-1/iphone-13-mini-10/iphone-13-mini-256-gb-';
const PAGES: Record<string, string> = {
  'random-1499': 'random colour',
  'midnight-130': 'midnight',
  'blue-129': 'blue',
  'green-127': 'green',
  'pink-128': 'pink',
  'red-132': 'red',
  'starlight-131': 'starlight',
  'midnight-new-battery-2013': 'midnight, new battery',
  'starlight-new-battery-2014': 'starlight, new battery',
};
const OUT = 'packages/agent/src/recent-snapshot.json';
const MANILA_DATE = new Date(Date.now() + 8 * 36e5).toISOString().slice(0, 10); // observation date in Manila time
const OFFER = /"offers":\{"@type":"Offer","price":"([0-9.]+)","priceCurrency":"([A-Z]+)","availability":"https:\/\/schema\.org\/(\w+)"/;

async function check(slug: string, label: string): Promise<Comparable | null> {
  const url = `${BASE}${slug}/`;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36' } });
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  const m = OFFER.exec(await res.text());
  if (!m) throw new Error(`${slug}: no schema.org Offer found; the page layout changed`);
  const [, price, currency, availability] = m;
  if (currency !== 'PHP' || !(Number(price) >= 10000 && Number(price) <= 50000)) {
    throw new Error(`${slug}: implausible price ${price} ${currency}`);
  }
  if (availability !== 'InStock') return null; // only live offers count as recent evidence
  return { url, observedAt: MANILA_DATE, price, condition: `Allo Allo, refurbished, ${label}, lowest listed grade` };
}

const takenAt = new Date().toISOString();

const results = await Promise.all(Object.entries(PAGES).map(([slug, label]) => check(slug, label)));
const comparables = results.filter((c): c is Comparable => c !== null);
if (comparables.length < 3) throw new Error(`only ${comparables.length} in-stock listings; keeping the previous snapshot`);
writeFileSync(OUT, `${JSON.stringify({ takenAt, comparables }, null, 2)}\n`);
console.log(`wrote ${comparables.length} listings to ${OUT}, taken ${takenAt}`);
for (const c of comparables) console.log(`  PHP ${c.price}  ${c.condition}`);
