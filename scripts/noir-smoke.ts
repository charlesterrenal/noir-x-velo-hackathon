// Local only. One real agent payment and merchant claim on a smoke-test device.
// Usage: npm run noir:smoke -- <device-hash> [amount-xlm=1]
import { keypairSigner, normalizeDeviceHash, toStroops, fromStroops } from '@noirx402/agent-sdk';
import { XLM, describeError, explorerTx, noirClient, requireSecret } from './noir-common.ts';

async function main() {
  if (!process.argv[2]) throw new Error('usage: npm run noir:smoke -- <device-hash> [amount-xlm]');
  const deviceHash = normalizeDeviceHash(process.argv[2]);
  const amount = toStroops(process.argv[3] ?? '1');
  const noir = noirClient();
  const agent = requireSecret('AGENT_SECRET');
  const merchant = requireSecret('MERCHANT_BASIC_SECRET');

  // Policy check, as the worker will run it. Also show the cap refusing an over-limit amount.
  const check = await noir.checkPayment({ deviceHash, agent: agent.publicKey(), asset: XLM, amount, requireEscrow: true });
  const overCap = await noir.checkPayment({ deviceHash, agent: agent.publicKey(), asset: XLM, amount: toStroops('3') });
  console.log(`checkPayment ${fromStroops(amount)} XLM: ${JSON.stringify(check)}`);
  console.log(`checkPayment 3 XLM (cap 2.5): ${JSON.stringify(overCap)}`);
  if (!check.ok) throw new Error(`payment refused: ${check.reason}`);

  const pendingBefore = await noir.getPendingBalance(merchant.publicKey());
  if (pendingBefore !== 0n) console.warn(`warning: merchant already has ${fromStroops(pendingBefore)} XLM pending`);

  const nonce = BigInt(Date.now());
  const auth = await noir.authorizePayment({
    agent: keypairSigner(agent.secret()),
    deviceHash,
    merchant: merchant.publicKey(),
    asset: XLM,
    amount,
    nonce,
  });
  console.log(`authorizePayment nonce=${nonce} ${explorerTx(auth.hash)}`);

  const pending = (await noir.getPendingBalance(merchant.publicKey())) - pendingBefore;
  if (pending !== amount) throw new Error(`expected ${fromStroops(amount)} XLM pending, found ${fromStroops(pending)}`);

  const claim = await noir.claim({ merchant: keypairSigner(merchant.secret()), token: XLM });
  console.log(`claim ${explorerTx(claim.hash)}`);
  console.log(`escrow left ${fromStroops(await noir.getEscrowBalance(deviceHash))} XLM`);
}

main().catch((err) => {
  console.error(describeError(err));
  process.exit(1);
});
