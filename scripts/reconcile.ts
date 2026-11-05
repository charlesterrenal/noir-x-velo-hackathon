// Operator tool for a job in 'review'. Run where the server's DATA_DIR and secrets are (Railway service Console):
//   node scripts/reconcile.ts <job-id>
// It replays the saved authorization as a simulation with the same nonce. The contract rejects a used nonce
// with DuplicateAuth, so the simulation tells us whether the interrupted payment reached the chain.
import { NoirContractError, toStroops } from '@noirx402/agent-sdk';
import { XLM, describeError, noirClient, requireSecret } from '@goats/agent';
import { db, tx } from '../apps/server/src/db.ts';

type Row = Record<string, string | null>;

async function main() {
  const jobId = process.argv[2];
  if (!jobId) throw new Error('usage: node scripts/reconcile.ts <job-id>');
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as Row | undefined;
  if (job?.status !== 'review') throw new Error(`job ${jobId} is ${job?.status ?? 'missing'}, not review`);
  const purchase = db.prepare('SELECT * FROM purchases WHERE job_id = ?').get(jobId) as Row | undefined;
  if (!purchase) throw new Error('no purchase record; inspect manually');
  if (purchase.auth_hash) throw new Error(`authorization ${purchase.auth_hash} is confirmed; only the claim needs finishing`);

  const noir = noirClient();
  const agent = requireSecret('AGENT_SECRET').publicKey();
  try {
    await noir.prepare(agent, {
      kind: 'authorize',
      deviceHash: purchase.device_hash!,
      merchant: purchase.merchant!,
      asset: XLM,
      amount: toStroops(purchase.amount!),
      nonce: BigInt(purchase.nonce!),
    });
  } catch (err) {
    if (err instanceof NoirContractError && err.errorName === 'DuplicateAuth') {
      // shortcut: the paid-but-unrecorded case stays manual (find the tx on Stellar Expert, then claim); automate if it recurs.
      console.log('The interrupted authorization DID reach the chain. Left in review: record its hash and claim manually.');
      return;
    }
    throw new Error(`simulation failed, outcome still unknown: ${describeError(err)}`);
  }

  tx(() => {
    db.prepare('DELETE FROM purchases WHERE job_id = ?').run(jobId);
    db.prepare("UPDATE jobs SET status = 'queued', error = NULL, updated_at = datetime('now') WHERE id = ?").run(jobId);
  });
  console.log('The interrupted authorization never reached the chain. Job requeued; the worker will pay with a new nonce.');
}

main().catch((err) => {
  console.error(describeError(err));
  process.exit(1);
});
