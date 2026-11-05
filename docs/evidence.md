# Testnet evidence

Every transaction below ran on Stellar Testnet on 2026-11-06 (Manila). Links open on [Stellar Expert](https://stellar.expert/explorer/testnet). A Testnet reset would invalidate them.

## End-to-end order, flexible freshness

Order `a1a77d64`. The seller paid the fee through Velo; the agent chose Basic research for 1 XLM and paid through Noir; the research seller claimed.

| What | Transaction | Note |
| --- | --- | --- |
| Seller pays the fee (Velo checkout) | [c218cb9c…](https://stellar.expert/explorer/testnet/tx/c218cb9c89f2036957d989fa06b50b7b1a2684206f29736d0553e397fa55e663) | 1 XLM to the Listo Velo project |
| Agent pays the research seller (Noir `authorizePayment`) | [1f5f9bb4…](https://stellar.expert/explorer/testnet/tx/1f5f9bb469098dbaa88f69a96a9c80fb30e9217bf06d262c2b7e7e220e4e4296) | 1 XLM from the device escrow, signed by the agent key |
| Research seller collects (Noir `claim`) | [a36c0eae…](https://stellar.expert/explorer/testnet/tx/a36c0eae7b271383f15a652026510dea9df0bc1ea421f49fa798e9382696f172) | Basic research merchant |

## End-to-end order, strict freshness

Order `69d890dd`. Strict freshness skipped the older snapshot, so the agent chose Recent research for 2 XLM. A redeploy interrupted the first payment attempt; the worker found the saved nonce unused on chain, requeued the order and paid once.

| What | Transaction | Note |
| --- | --- | --- |
| Agent pays the research seller (Noir `authorizePayment`) | [04efd55e…](https://stellar.expert/explorer/testnet/tx/04efd55e5f272dd760c7f01fcedc0e0a3314f3c3939c5ad0a8f2477f3f1fe902) | 2 XLM |
| Research seller collects (Noir `claim`) | [71550d0d…](https://stellar.expert/explorer/testnet/tx/71550d0d79f02b1b46e66bd564b7f6a042207442fbcfbd3512d5314916981a89) | Recent research merchant |

## Velo setup and first payment

| What | Transaction | Note |
| --- | --- | --- |
| Register the Velo project | [3cb9b07b…](https://stellar.expert/explorer/testnet/tx/3cb9b07bfe66337f539f0b9b911e14fc627f2a73d7ae14599e804980b229fcdc) | On-chain project registry |
| Activate Velo Pay | [bb15207a…](https://stellar.expert/explorer/testnet/tx/bb15207a85d52eb85cfc7b6ef4a1aee952a661b15ffdc9ab7d48877157c17ce9) | PayAccess contract |
| First checkout payment (smoke test) | [519ad826…](https://stellar.expert/explorer/testnet/tx/519ad8267b508f89fabe2ee4a48be6c34fa02e6ddc3f73700805911528198a68) | Verified webhook queued exactly one job |

## Noir provisioning (demo device `1a49bb07…`)

| What | Transaction | Note |
| --- | --- | --- |
| `registerDevice` | [a6761fa5…](https://stellar.expert/explorer/testnet/tx/a6761fa5446cd6efa9e5445b934134691f1fdefe22158d628f1f8e302db3da5a) | Card hash linked to the owner wallet with the agent key |
| `registerAgent` | [09310d70…](https://stellar.expert/explorer/testnet/tx/09310d704bfc914a4c68d9e010947617ebe0320120b89bf3b25595de1ad5e9ba) | XLM only, 2.5 XLM per payment, expires 2026-11-09 00:00 Manila |
| `fundEscrow` | [2bdeb124…](https://stellar.expert/explorer/testnet/tx/2bdeb124b557964ceb0a8d475f9222f7926563dd0a51f3bcf19fb281fac8677e) | 5 XLM |

## Noir smoke test (device `64594e6f…`)

| What | Transaction | Note |
| --- | --- | --- |
| `checkPayment` for 3 XLM against the 2.5 XLM cap | read-only, no transaction | Returned `{"ok":false,"reason":"over_limit"}` |
| `authorizePayment` | [d221da83…](https://stellar.expert/explorer/testnet/tx/d221da839d215e334495ee4a898cb1323ff1359b12ecd5e2c28feaf664d7c5cb) | 1 XLM |
| `claim` | [bb515902…](https://stellar.expert/explorer/testnet/tx/bb5159024aacb915e9a314e9cf7ac370fdb10c2cb293132d78b9423ff68484cb) | Merchant collected 1 XLM |
