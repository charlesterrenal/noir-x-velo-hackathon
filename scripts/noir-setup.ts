// Local only. Provisions Noir demo devices: accounts, device, agent policy, escrow.
// Usage: npm run noir:setup [-- --count <n> | <card-uid-hex> ...]   (default: one device with a random 7-byte UID)
// Run one setup at a time: parallel runs sign with the same owner account and their transactions collide.
// Safe to re-run: every step reads chain state first and only does what is missing.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { keypairSigner, normalizeDeviceHash, toStroops, fromStroops } from '@noirx402/agent-sdk';
import { XLM, describeError, explorerTx, noirClient } from '@goats/agent';

const ENV_FILE = '.env';
const ESCROW = toStroops('5');
const MAX_PER_PAYMENT = toStroops('2.5');
const EXPIRES_AT = new Date('2026-11-09T00:00:00+08:00'); // covers the Sunday pitch window

const KEYS = ['NOIR_SETUP_OWNER_SECRET', 'AGENT_SECRET', 'MERCHANT_BASIC_SECRET', 'MERCHANT_RECENT_SECRET'];

function appendEnv(line: string) {
  const prefix = existsSync(ENV_FILE) && !readFileSync(ENV_FILE, 'utf8').endsWith('\n') ? '\n' : '';
  appendFileSync(ENV_FILE, `${prefix}${line}\n`);
}

async function ensureFunded(publicKey: string) {
  const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
  if (res.ok) return;
  const fund = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
  if (!fund.ok) throw new Error(`Friendbot failed for ${publicKey}: ${fund.status}`);
  console.log(`funded ${publicKey} with Friendbot`);
}

async function account(name: string): Promise<Keypair> {
  let secret = process.env[name];
  if (!secret) {
    secret = Keypair.random().secret();
    appendEnv(`${name}=${secret}`);
    process.env[name] = secret;
    console.log(`created ${name} (saved to ${ENV_FILE})`);
  }
  const kp = Keypair.fromSecret(secret);
  await ensureFunded(kp.publicKey());
  return kp;
}

async function provision(noir: ReturnType<typeof noirClient>, owner: Keypair, agent: Keypair, uid: string): Promise<string> {
  if (!/^[0-9a-f]+$/.test(uid)) throw new Error(`card UID must be hex, got ${uid}`);
  // Same as Noir's app and extension: SHA-256 over the UTF-8 bytes of the hex UID string.
  const deviceHash = normalizeDeviceHash(createHash('sha256').update(uid, 'utf8').digest('hex'));
  const ownerSigner = keypairSigner(owner.secret());
  console.log(`\ndevice uid=${uid} hash=${deviceHash}`);

  const deviceOwner = await noir.getDeviceOwner(deviceHash);
  if (deviceOwner === null) {
    const { hash } = await noir.execute(ownerSigner, { kind: 'registerDevice', deviceHash, agent: agent.publicKey() });
    console.log(`registerDevice  ${explorerTx(hash)}`);
  } else if (deviceOwner !== owner.publicKey()) {
    throw new Error(`device is owned by ${deviceOwner}, not this owner key`);
  } else console.log('registerDevice  already done');

  const policy = await noir.getPolicy(deviceHash);
  const policyOk =
    policy?.agent === agent.publicKey() &&
    policy.asset === XLM &&
    policy.maxAmount === MAX_PER_PAYMENT &&
    policy.expiresAt?.getTime() === EXPIRES_AT.getTime();
  if (!policyOk) {
    const { hash } = await noir.execute(ownerSigner, {
      kind: 'registerAgent',
      deviceHash,
      agent: agent.publicKey(),
      asset: XLM,
      maxAmount: MAX_PER_PAYMENT,
      expiresAt: EXPIRES_AT,
    });
    console.log(`registerAgent   ${explorerTx(hash)}`);
  } else console.log('registerAgent   already done');

  const balance = await noir.getEscrowBalance(deviceHash);
  if (balance < ESCROW) {
    const { hash } = await noir.execute(ownerSigner, {
      kind: 'fundEscrow',
      deviceHash,
      token: XLM,
      amount: ESCROW - balance,
    });
    console.log(`fundEscrow      ${explorerTx(hash)}`);
  } else console.log(`fundEscrow      already ${fromStroops(balance)} XLM`);

  appendEnv(`# noir device uid=${uid} hash=${deviceHash} (${new Date().toISOString()})`);
  console.log(`done: escrow ${fromStroops(await noir.getEscrowBalance(deviceHash))} XLM, cap 2.5 XLM, expires ${EXPIRES_AT.toISOString()}`);
  return deviceHash;
}

async function main() {
  const noir = noirClient();
  const [owner, agent] = await Promise.all(KEYS.map(account));
  const args = process.argv.slice(2);
  const count = args[0] === '--count' ? Number(args[1]) : 0;
  if (args[0] === '--count' && !(count >= 1 && count <= 20)) throw new Error('--count must be 1 to 20');
  const uids = count ? Array.from({ length: count }, () => randomBytes(7).toString('hex')) : args.length ? args.map((a) => a.toLowerCase()) : [randomBytes(7).toString('hex')];

  const hashes: string[] = [];
  for (const uid of uids) hashes.push(await provision(noir, owner, agent, uid)); // sequential on purpose
  console.log(`
Add to DEVICE_HASHES in Railway (comma-separated): ${hashes.join(',')}
Railway also needs AGENT_SECRET, MERCHANT_BASIC_SECRET, MERCHANT_RECENT_SECRET from ${ENV_FILE}. Never put NOIR_SETUP_OWNER_SECRET on the host.`);
}

main().catch((err) => {
  console.error(describeError(err));
  process.exit(1);
});
