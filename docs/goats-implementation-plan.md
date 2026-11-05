# The GOATS — Overnight implementation plan

**Event:** Velo x Noir Agentic Payment Hackathon  
**Kickoff:** Thursday, November 5, 2026, 9:00 PM Manila time  
**Submission deadline:** Saturday, November 7, 2026, noon Manila time  
**Overnight target:** one complete public demo by Friday, November 6, 5:00 AM  
**Submission target:** Saturday at 10:00 AM, with two hours of buffer

## What we are building

An online seller pays for a draft listing through Velo. A verified checkout starts a job. The agent compares two paid research offers, chooses one based on price and freshness, and purchases it with the Noir SDK using a pre-funded Testnet allowance. The service's merchant wallet claims the payment. The seller receives a suggested price, a description, source links, and a receipt.

The overnight deliverable is one product, one confirmed checkout, one autonomous purchase, and one merchant claim. Both research services operate in our backend with separate merchant wallets. They can use curated, dated product data. Live API research, shipping quotes, an owner dashboard, and a live revocation demonstration are stretch work for Friday. External API billing stays separate from the Testnet payments.

### Definition of done

- [ ] A visitor can load the app at a public HTTPS URL.
- [ ] A seller can pay using Velo Pay on Testnet. A verified event starts one job.
- [ ] The agent compares two offers and selects an eligible merchant and amount. A change in the freshness requirement can change the selection.
- [ ] The agent successfully authorizes the purchase using the official Noir SDK. The merchant claims the payment.
- [ ] The listing and receipt show sources, the selection reason, and separate Stellar Expert links for the seller's Velo payment and the agent's Noir authorization.
- [ ] Redelivered webhooks and restarts do not create a second purchase. Dashboard sample events, and any event that does not match a saved payment intent, cannot spend from escrow.
- [ ] The public monorepo, required README, two-minute video, write-up, team details, and proof links are ready for submission.

## Team ownership and schedule

Assign the four lanes at kickoff based on who is most comfortable with each integration. Give the deployment owner access to the repository and hosting account. Confirm the team leader submitted the Google Form by November 4 at 11:59 PM Manila time and that it lists all four members. Confirm the Luma RSVP separately. The submitted form and complete member list are required for eligibility.

| Lane | First independent milestone | Integration handoff |
| --- | --- | --- |
| A — Velo | Create a checkout, complete a real Testnet payment, verify a webhook on a public endpoint | Persist the Velo payment intent ID and queue the matching job once |
| B — Noir | Provision one allowance, authorize a small payment, and claim it through the published SDK | Expose payment checks and purchase/claim functions, with transaction hashes and explicit failure states |
| C — Agent and data | Two real source-backed offers and a selection function that changes with freshness | Return the selected offer, the reason, and a listing assembled from purchased data |
| D — Web, deployment, submission | Public HTTPS app with a health endpoint and a persistent database | Seller form, job status and receipt, required README, video, and submission checklist |

| Time (Manila) | Checkpoint | Evidence |
| --- | --- | --- |
| Thu 9:00 PM, until the call ends | Attend Google Meet onboarding and kickoff. Confirm SDK guidance, submission instructions, and team roles. | Organizer decisions and team assignments |
| After kickoff, first 20–30 minutes | Agree on shared job fields and route names, pin dependencies, and set up the workspace and public shell. | Shared repository, deployed health endpoint, confirmed accounts and access |
| After setup–midnight | Run checkout and Noir independently. Build the two data offers and status page in parallel. | Verified Velo payment event and an agent authorization plus merchant claim on Testnet |
| Fri midnight–2:00 AM | Join the two flows using the durable job table. Display listing and receipt. | One real checkout starts one agent purchase from the web app |
| Fri 2:00–5:00 AM | Run the same path on the public host. Verify replay behavior and capture a recording and explorer proof. | A usable public demo and a recording of a completed run |
| Friday daytime | Fix issues found in the overnight run, prepare spare funded demo slots, finish the README and submission package, and record the final video. | Clean install, verified links, working deployment, two-minute video |
| Saturday morning | Run a fresh hosted demo, check remaining allowance and expiry, and submit by 10:00 AM. | Completed submission before noon |

**Midnight decision.** Continue with the overnight target if both payment legs have live evidence. If one is blocked, report the exact version, error, and transaction hash or request ID in #noir-sdk-and-extension for Noir, #velo-integration for Velo, or #dev-help for general integration and deployment. Keep the data and UI scope fixed until the payment works. Preserve Friday as recovery time.

**Overnight build versus Friday hardening.** Overnight, build only what the happy path and double-spend safety need: webhook signature verification, delivery dedupe, matching the payment intent to a saved job, a single transition out of awaiting payment, and saving the purchase record and nonce before the Noir call. Move these to Friday: slot release on checkout expiry, review reconciliation tooling, the restart-during-write and sample-event checks, the cap and revocation demonstrations, and spare funded slots.

## Stack and repository

Use TypeScript, npm workspaces, a Vite web app, and an Express server. The production server serves both the built web app and the API over one origin. Run one long-lived Node process on a host that supports the pinned Node runtime and a persistent disk. Put SQLite on that disk and use one worker. This keeps webhook delivery and purchase state durable without another service.

| Dependency | Baseline |
| --- | --- |
| Node.js | 26.13.0 for local development and the host image |
| Noir SDK | Pin `@noirx402/agent-sdk@0.3.0` |
| Stellar SDK | Pin `@stellar/stellar-sdk@16.4.1`, which satisfies Noir's peer requirement `^16.0.1` |
| Velo SDK | `1.0.0` is npm `latest`. Confirm the organizer preference and pin the exact version. Use the handbook's `0.1.0-alpha.4` as the fallback while awaiting an answer. |
| Persistence | Node's `node:sqlite` on a mounted persistent directory |

Velo `1.0.0` became npm `latest` on November 5 at 1:23 PM Manila time and requires Node `>=22.6.0`. Noir `0.3.0` requires Node `^22.23.4 || ^24.22.1 || >=26.12.1`. The planned Node `26.13.0` meets both. Pin the exact Noir and Stellar versions so every teammate and the host install the same build; npm currently resolves Stellar SDK 16.4.1 for Noir's peer range, and the pin keeps it there. Confirm the deployed runtime and commit the lockfile after choosing the Velo version. [Velo npm registry](https://registry.npmjs.org/@carts1024%2fvelo-sdk) · [Noir package metadata](https://registry.npmjs.org/@noirx402%2fagent-sdk/0.3.0) · [Stellar SDK 16.4.1](https://registry.npmjs.org/@stellar%2fstellar-sdk/16.4.1) · [Node SQLite documentation](https://nodejs.org/api/sqlite.html)

Lane A asks in **#velo-integration** before freezing dependencies. “For judging, should we pin the newly published Velo SDK `1.0.0` or use `0.1.0-alpha.4` as shown in the November 5 handbook? We’re using Velo Pay checkout and signed webhooks on Testnet.”

~~~text
apps/
  web/       Seller form, progress, listing, and receipt
  server/    HTTP routes, Velo client, SQLite, worker, and merchant claim
packages/
  agent/     Offer selection and Noir SDK operations
  shared/    Request, status, receipt, and configuration types
docs/        Architecture, screenshots, and demo evidence
scripts/     Local allowance provisioning and integration smoke commands
.env.example
package.json
package-lock.json
README.md
~~~

Set up root commands for dependency install, development, type checks, production build, start, and Noir provisioning. The repository is a single npm workspace with a committed lockfile. Keep local secrets in ignored environment files. The README gives the exact commands once they exist.

~~~mermaid
flowchart LR
  S[Seller] --> W[Public web app]
  W --> API[Node API]
  API --> V[Velo Pay]
  V --> H[Verified webhook]
  H --> DB[(SQLite jobs and purchases)]
  DB --> A[Agent worker]
  A --> O[Two research offers]
  A --> N[Noir SDK]
  N --> D[Device registry]
  N --> P[Agent registry]
  N --> E[Payment escrow]
  E --> M[Selected merchant claim]
  A --> DB
  DB --> W
~~~

## Shared interface before teammates split up

| Endpoint | Contract |
| --- | --- |
| `GET /healthz` | Returns readiness for the server and its database without exposing configuration |
| `GET /api/offers` | Returns public offer metadata for the supported product, including amount and snapshot age |
| `POST /api/jobs` | Accepts product ID and freshness preference. Uses a stable request ID to avoid duplicate checkout creation. Returns an opaque job ID and hosted checkout URL. |
| `POST /api/webhooks/velo` | Receives the raw signed Velo event, matches its payment intent to a job, and durably queues it |
| `GET /api/jobs/:id` | Returns the job's payment status, selected offer and reason, transaction references, and completed listing when available |

Define the API shape in `packages/shared` before implementing it. Browser requests supply product and freshness only. The server chooses the checkout fee, asset, return URL, offer price, and merchant addresses. Use decimal strings for XLM values on the wire. Convert them with the Noir SDK's `toStroops` for `bigint` contract arguments and `fromStroops` for display and receipts.

### Durable records

| Record | Minimum fields and uniqueness |
| --- | --- |
| Job | Opaque ID, unique request ID, product, freshness requirement, expected checkout amount and asset, unique Velo payment intent ID, checkout expiry, seller payment hash, assigned device hash, status, and result |
| Webhook delivery | Unique `x-velo-delivery` header value as the dedupe key (as the Velo SDK README requires), signed `event.id`, payment intent ID, event type, `test` flag, and time received |
| Purchase | Unique job ID, offer and snapshot IDs, merchant, amount, asset, device hash, persisted nonce, status, and authorization and claim hashes when known |
| Demo allowance slot | Unique device hash, reservation or assigned job, and status |

Reserve an allowance slot atomically before creating checkout. Start with one slot, then provision additional independently funded slots for the recording and judging. Treat a reserved or spent slot as unavailable for a new order. Use the intent's `expiresAt` to schedule a status lookup. Release an unpaid slot after the Velo API confirms `expired` or `cancelled` with no payment recorded. Close the old job and release the slot in the same database transaction. Hold the slot while the intent state is uncertain. Route any late success for a closed job to review so it cannot spend from a slot assigned to another job.

## Velo checkout and webhook

1. Create the job and reserve a slot. Validate the supported product and that at least one eligible offer is available. The agent still chooses the actual offer after the payment.
2. Create a hosted Velo checkout through the SDK with a stable idempotency key for that job. Use the Testnet project and an XLM checkout asset confirmed during the smoke check. Persist the payment intent ID and checkout URL before redirecting the seller. Store `expiresAt` from the intent. The SDK types allow `checkoutUrl` to be `null`. In that case, do not redirect. Show an error, look up the intent with `paymentIntents.retrieve`, and retry only with the same idempotency key.
3. Use the checkout return page to display job status. The payment confirmation comes from Velo on the server.
4. Mount the webhook route with `express.raw({ type: 'application/json', limit: '1mb' })` before any global JSON parser, and pass `req.body.toString('utf8')` as the payload. Velo `1.0.0` rejects a Buffer. Verify `x-velo-signature` with `Velo.webhooks.verify` and the webhook secret. Return 400 for a missing or invalid signature.
5. Record the `test` flag on every delivery. The SDK documentation does not define it, so set its handling from the first real Testnet checkout. If real checkouts arrive with `test: false`, acknowledge `test: true` events without processing them. If real checkouts also arrive with `test: true`, do not filter on the flag. In both cases, only an event whose payment intent ID, amount, and asset match a saved job can queue work, so a dashboard sample event cannot spend from escrow.
6. For a matching `payment.succeeded` event, normalize the amount and asset using the SDK's actual response. Save the `x-velo-delivery` ID, the signed `event.id`, and the seller's transaction hash from `event.paymentIntent.txHash` when present. Record the delivery and transition the job from awaiting payment to queued in one database transaction. Acknowledge a repeated delivery ID without changes. A new delivery for a job that already left awaiting payment leaves its purchase state unchanged. This single transition is the real guard against a second purchase.
7. Acknowledge the event after the database commit. The worker takes the job asynchronously. Use the SDK's payment intent lookup to inspect delayed or ambiguous checkout state. An organizer-approved recovery path must still verify payment through Velo before queuing a job.

The first smoke check must prove that the actual Velo project has checkout access, the seller can sign a Testnet payment, and the public endpoint receives a valid event. Capture the `x-velo-delivery` ID, signed event ID, payment intent ID, event type, test flag, and seller transaction hash. Keep secrets and the full raw body out of logs. [Velo SDK documentation](https://github.com/Velo-Ecosystem-Collection/Velo/blob/main/packages/velo-sdk/README.md)

## Noir provisioning and purchase

### Testnet targets

The November 5 handbook, the official repository, and the published SDK's built-in `TESTNET` defaults agree on these IDs.

| Contract | Address |
| --- | --- |
| `device_registry` | `CAC4KOLHDLDYDWBOKXNKRN5KVHO56PLOIFXDLTBUWGVN6GVDEB7FQHU5` |
| `agent_registry` | `CCMZDSPTLX7IIJWCYEUM5DJUHOSOYSTHGK777S2TXZWEMC5ZZGPJ3EBV` |
| `payment_escrow` | `CC7EAW5FNJEDBS7THM5IT6XIOHO4AOYMLXT3KSZ3HWUIKEACTW7E5BFS` |

Initialize `new NoirAgentClient()` and compare its contract configuration to the handbook targets at startup. Use the SDK for all Noir operations. The earlier registration draft contains a different set of addresses. [Noir deployment and contracts](https://github.com/noirx402/noir#smart-contracts)

### Local setup script

- Fund separate Testnet owner, agent, and two merchant accounts. The seller also needs a funded Testnet wallet. Give the agent and merchants sufficient XLM for their own fees.
- Choose and retain a unique card UID for each demo slot, written as a lowercase hex string such as a 7-byte NTAG213-style UID. Compute the device hash as SHA-256 over the UTF-8 bytes of that exact string, the same way Noir's app and extension do (`printf '%s' '<uid>' | sha256sum`), then pass the hex digest through the SDK's `normalizeDeviceHash`. To verify, set the extension's Settings → Card reader format to Hex and use Test the reader to confirm the same UID shows the same device hash. [How a tag becomes a device hash](https://github.com/noirx402/noir/blob/main/docs/nfc-hardware.md)
- Keep smoke-test devices separate from demo slots.
- Derive the native XLM token contract with `Asset.native().contractId(Networks.TESTNET)`. Use `expiresAt = new Date('2026-11-09T00:00:00+08:00')`, Monday at midnight Manila time, to cover Sunday's 1:00–8:00 PM pitch window. Start with a 5 XLM escrow, a 2.5 XLM per-payment cap, and offers at 1 and 2 XLM. Convert configured amounts with `toStroops`.
- Use the owner signer locally with the following SDK operations. Capture each successful transaction hash. On a setup retry, read the device owner, policy, asset, and balance before repeating an operation.

| Order | Call verified in the published SDK types |
| --- | --- |
| 1 | `noir.execute(ownerSigner, { kind: 'registerDevice', deviceHash, agent })` |
| 2 | `noir.execute(ownerSigner, { kind: 'registerAgent', deviceHash, agent, asset, maxAmount, expiresAt })` |
| 3 | `noir.execute(ownerSigner, { kind: 'fundEscrow', deviceHash, token: asset, amount })` |

Here `agent` in the operation data is a public address, `expiresAt` is a JavaScript `Date`, and `amount` and `maxAmount` are integer stroops. The SDK exposes these setup operations through `execute`. Keep the owner key on the operator's machine. The hosted app uses the constrained agent signer and merchant signers only. [Published Noir SDK package](https://registry.npmjs.org/@noirx402%2fagent-sdk/0.3.0)

### Worker and transaction recovery

1. A single worker atomically takes a queued job. It compares offers, runs `checkPayment` on suitable candidates, and chooses the cheapest offer that meets the product, freshness, and Noir constraints. Pass the public agent address and `requireEscrow: true` for the check.
2. Save one purchase record for the job, including the selected offer's fixed merchant address and amount and its nonce. Allocate the nonce once as the current time in milliseconds (`BigInt(Date.now())`), the same scheme as the SDK default, and save it before the call. The contract requires nonces to increase per device and agent, so a small counter would be rejected on any device that already paid with the default nonce. Mark authorization in progress before making the network call. Use a new device per allowance slot.
3. Call `authorizePayment({ agent: agentSigner, deviceHash, merchant, asset, amount, nonce })`. Record its confirmed hash and mark the merchant payment pending.
4. Verify the selected merchant's pending balance matches this purchase in the isolated demo flow. Then call `claim({ merchant: merchantSigner, token: asset })`. Save the claim hash separately. Merchant claims can collect multiple pending payments, so keep one authorization/claim in flight and investigate unexpected pending balances.
5. Read the purchased snapshot, generate the listing, and persist the completed result and receipt. If output generation fails after settlement, rebuild the listing from the saved purchase.
6. Record a definite policy refusal as blocked. Use the reason from `checkPayment` or the contract error name from a recognized `NoirContractError` on authorization, such as `AgentNotAuthorized` or `InsufficientBalance`. A timeout, crash after submission starts, or ambiguous SDK error goes to review. Pause further purchases until the operator reconciles the original attempt through the explorer and SDK reads or events. Resume an already authorized purchase from its pending claim after reconciliation. Treat unexpected claim failures as settlement issues and preserve the confirmed authorization.

A database transaction protects the job transition and purchase reservation. It cannot commit atomically with Stellar. Persist the progress state before each chain write, and use a review state after ambiguous outcomes. Keep network requests outside the database transaction. This is the prototype's recovery policy.

### Cap and revocation demonstrations

- After the happy path, run a 3 XLM check against a 2.5 XLM cap on a slot that still has at least 3 XLM. Show the reason returned by `checkPayment` as a policy check. For contract simulation evidence, use `noir.prepare` for an over-cap `authorize` operation on the same slot and label the result as a simulation.
- Add revocation after the core flow works. From the local owner script, execute `revokeAgent` and then `sweepOnRevoke` with the approved SDK. Confirm the subsequent check refuses the agent and record the sweep hash. Use a separate slot for this demonstration so the public demo retains a funded allowance.

## Agent decision and listing

Pick a single recognizable product model with comparable prices that can be sourced reliably. For each offer, collect several comparable listings or public retailer records for the same variant and currency. Save source URLs, observation dates, condition, and price. Use two snapshots with genuinely different freshness. Set the demo freshness thresholds after checking the actual dates. If both are collected overnight, use an hours-based threshold or use older dated source material with its date shown.

| Offer | Sample quote | What the buyer receives |
| --- | --- | --- |
| Basic research | 1 test XLM | Older source-backed comparisons |
| Recent research | 2 test XLM | More recent source-backed comparisons |

Use a small deterministic selection function. Filter by product, availability, and maximum age, check the remaining offers against Noir, and choose the lowest price with a stable tie-break. If there is no eligible offer, show the reason.

Save a decision trace for each job: the offers considered, each offer's price and snapshot age, which offers were filtered out and why, the `checkPayment` result for each candidate, and the final choice. Show it on the receipt and in the video so judges can see the agent decide whom to pay and how much.

Friday stretch: if the purchased snapshot has too few comparable listings, the agent also buys the other offer within the cap and remaining escrow. This needs purchase uniqueness on job and offer instead of job alone, and a separate authorization for each purchase.

For the walkthrough, compare a flexible freshness requirement with a strict one. Run one real paid purchase and show a clearly labeled decision preview for the other input. A second paid run is optional once spare slots are ready.

Use a median of comparable prices for the suggested selling price and a short template for the title and description. Render source links and dates. Use an optional LLM only for writing the description after purchase. The agent's purchasing rule and the final data used in the price suggestion stay inspectable.

## UI and deployment

The first screen shows the supported product, freshness choice, checkout fee, and Testnet label. The job screen shows waiting for payment, comparing offers, purchasing, merchant claim, or the result. A receipt distinguishes the Velo payment, the agent's decision trace, the Noir authorization, the merchant claim, and remaining allowance. Display separate Stellar Expert Testnet links for the seller payment from `paymentIntent.txHash`, the Noir authorization from the SDK result, and the merchant claim when its hash is available. Show purchase errors and review status explicitly.

| Configuration | Where it belongs |
| --- | --- |
| `VELO_API_KEY`, `VELO_WEBHOOK_SECRET`, optional documented Velo API base URL | Host secrets and local server environment |
| `AGENT_SECRET`, `MERCHANT_BASIC_SECRET`, `MERCHANT_RECENT_SECRET` | Host secrets and local server environment |
| `NOIR_SETUP_OWNER_SECRET` | Local provisioning environment only |
| `PUBLIC_BASE_URL`, `PORT`, `DATA_DIR` | Host configuration |
| Funded device hashes, offer IDs, public addresses, dataset references | Server configuration or a durable setup record |

Deploy a skeleton early to get the real HTTPS webhook URL. Confirm that the host runs the selected Node version, accepts the raw webhook body at the final path, and preserves SQLite across a restart. Use one running worker. Configure Velo webhook delivery to the deployed URL and verify it using a genuine checkout. Limit the demo to the supported product and the available funded slots.

## Verification and submission

| Check | Expected evidence |
| --- | --- |
| Fresh checkout | Verified Velo event, saved payment intent, seller transaction link, one job |
| Offer choice | Two freshness settings yield two eligible choices under the configured policy |
| Valid Noir purchase | Agent authorization hash and merchant claim hash on Testnet |
| Invalid signature | Webhook rejected and no job queued |
| Dashboard sample event | Signature verifies and the delivery is recorded, but no saved job matches, so nothing is queued |
| Redelivered payment event | The same `x-velo-delivery` ID is acknowledged without changes, with the same purchase record and no second authorization |
| Expired or cancelled intent | Velo confirms the unpaid terminal status, the old job closes, the slot becomes available, and a late event cannot trigger a purchase |
| Restart during an uncertain write | Job enters review and the worker does not create another purchase |
| No eligible offer or cap check | Clear refusal and no authorized payment |
| Hosted smoke run | Public URL works in a fresh browser and completed receipt links to explorer evidence |

Prepare the README at the root in the handbook's required order. Put the one-line pitch, live site, two-minute video, and team names with Discord handles at the top. Use the prescribed sections for Problem, Solution, How the agentic payment works, Architecture, Noir integration, Velo integration, Testnet proof, Repo structure, Run it locally, Environment variables, Screenshots, What's next, and Credits. Link actual integration files and line numbers once code exists. Confirm the public repository has a clean install and only empty example secrets. Identify the agent's choice of merchant and amount followed by Noir authorization as the agentic payment. Describe Velo checkout as the seller-authorized payment that starts the job.

**Two-minute recording.** Spend about 15 seconds on the seller problem, 25 on Velo checkout and job confirmation, 35 on the offer decision and Noir payment, 30 on the listing and receipt, and 15 on the cap check and explorer evidence. Show the agent making its decision and the actual Noir authorization. Label the seller's Velo checkout separately. Use the same working public build for the recording and submission.

**Pitch Q&A**

We fund the Noir allowance separately so the owner can set a spending limit for the agent independently of the seller fee that Velo confirms.

Submit the public app, public monorepo, video, short write-up, registered team names and Discord handles, and Testnet proof through the organizers' submission link. Keep a funded slot, adequate signer fees, and a policy expiry that covers the live pitch.

## Open items to settle at kickoff

- Assign the four lanes and confirm access to the Velo Testnet project, wallet, GitHub repository, and public host.
- Pick the product after checking that two useful dated research snapshots can be assembled.
- Confirm the organizer's Velo SDK preference in #velo-integration. Verify the checkout asset format, `x-velo-delivery` header, event ID, the `test` flag value on real Testnet events, and seller transaction hash with the first real payment.
- Check in the extension's Test the reader that the hex UID gives the script's device hash. Capture the Noir SDK transaction hashes.
- Confirm the submission link and collect the team's Discord handles.

These are build checkpoints. The SDK packages and Noir's configured addresses were inspected during planning. Live checkout, signing, settlement, and hosting are the first implementation checks.

## References

- [November 5 Builder Handbook](./builder-handbook-nov-05.md), a copy of the organizer-supplied guide. Save the handbook under this name next to the plan when sharing.
- [Organizer Discord](https://discord.gg/Mt2hD7DG) and [event page](https://luma.com/gjclwpkd) for updates.
- [Noir GitHub repository and contract references](https://github.com/noirx402/noir)
- [Noir SDK 0.3.0 package](https://registry.npmjs.org/@noirx402%2fagent-sdk/0.3.0)
- [Velo SDK documentation](https://github.com/Velo-Ecosystem-Collection/Velo/blob/main/packages/velo-sdk/README.md)
- [Stellar Expert Testnet explorer](https://stellar.expert/explorer/testnet)
