import { Asset, Keypair, Networks } from '@stellar/stellar-sdk';
import { NoirAgentClient, NoirContractError } from '@noirx402/agent-sdk';

// Handbook (Nov 5) Testnet IDs; the SDK's built-in TESTNET config must match.
const HANDBOOK_CONTRACTS = {
  deviceRegistry: 'CAC4KOLHDLDYDWBOKXNKRN5KVHO56PLOIFXDLTBUWGVN6GVDEB7FQHU5',
  agentRegistry: 'CCMZDSPTLX7IIJWCYEUM5DJUHOSOYSTHGK777S2TXZWEMC5ZZGPJ3EBV',
  paymentEscrow: 'CC7EAW5FNJEDBS7THM5IT6XIOHO4AOYMLXT3KSZ3HWUIKEACTW7E5BFS',
};

export function noirClient(): NoirAgentClient {
  const noir = new NoirAgentClient();
  for (const [name, id] of Object.entries(HANDBOOK_CONTRACTS)) {
    const actual = noir.contracts[name as keyof typeof HANDBOOK_CONTRACTS];
    if (actual !== id) throw new Error(`Noir ${name} is ${actual}, handbook says ${id}`);
  }
  return noir;
}

export const XLM = Asset.native().contractId(Networks.TESTNET);

export const explorerTx = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;

export function requireSecret(name: string): Keypair {
  const secret = process.env[name];
  if (!secret) throw new Error(`${name} is not set`);
  return Keypair.fromSecret(secret);
}

export function describeError(err: unknown): string {
  if (err instanceof NoirContractError) return `${err.errorName} (${err.contract}.${err.method})`;
  return err instanceof Error ? err.message : String(err);
}
