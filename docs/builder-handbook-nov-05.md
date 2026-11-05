# **![][image1]Velo x Noir Agentic Payment Hackathon — Builder Handbook**

Updated Nov 5, 2026

## **Welcome**

Build an AI agent that can pay, get paid and settle on Stellar, using Velo and the Noir SDK. The top 10 teams pitch face-to-face on Sunday, Nov 8, for a 10K prize pool.

| Place | Prize |
| :---- | :---- |
| 1st | 5,000 |
| 2nd | 3,000 |
| 3rd | 2,000 |

Noir and Velo are two separate projects: Noir doesn't use Velo, and Velo doesn't use Noir. Your project is where they meet, and it must use both.

> * **Noir** is a contactless payment wallet on Stellar, powered by the x402 protocol. Its Soroban contracts and SDK let an owner give an agent a key that can spend only within set limits.  
> * **Velo** is an application operations layer for Stellar, with checkout sessions, confirmed payments and signed webhooks.

The rule is strict: your agent's payments must go through the deployed Noir Testnet contracts, called with the Noir SDK, and you use Velo to build the other parts of your application.  
**Not registered through the Google Form yet?** Register at [forms.gle/wL8tPiCwGkK8YENV9](https://forms.gle/wL8tPiCwGkK8YENV9). Without it, your project is not eligible for judging or prizes.  
**Join the Discord** for updates and help during the hackathon: [discord.gg/Mt2hD7DG](https://discord.gg/Mt2hD7DG)

## **Schedule**

Registration closes Wednesday, Nov 4 at 11:59 PM; you build from Thursday, Nov 5 until submissions close at 12:00 PM on Saturday, Nov 7\. All times are Philippine time (UTC+8).

| When | What happens |
| :---- | :---- |
| Wed, Nov 4, 11:59 PM | Registration closes (Luma RSVP and the registration form) |
| Thu, Nov 5 | Onboarding & Kickoff on Google Meet at 9:00 PM (meet.google.com/app-dquo-nxp), then the online build starts |
| Nov 5 to Nov 7 (noon) | Build days: office hours and help on Discord |
| Sat, Nov 7, 12:00 PM | Submissions close |
| Sat, Nov 7, 4:00 PM | Top 10 teams announced |
| Sun, Nov 8, 1:00 PM | Face-to-face round for the top 10 teams, 1:00 PM to 8:00 PM: pitching and awarding. Certificates of participation go to every participant after the winners are announced |

## **How to register**

You are registered only when you have done both steps before Wed, Nov 4, 11:59 PM: the Luma RSVP and the registration form.  
**Not registered through the Google Form yet? Register now.** A Luma RSVP alone is not enough. Without a submitted registration form, your project is not eligible for judging or prizes.

> 1. RSVP on Luma: [luma.com/gjclwpkd](https://luma.com/gjclwpkd)  
> 2. Fill out the registration form: [forms.gle/wL8tPiCwGkK8YENV9](https://forms.gle/wL8tPiCwGkK8YENV9)

**Solo or team.** The form asks first. Teams have 2 to 4 members, and the team leader submits one form for the whole team, with each member's name and email.  
**Proof of support.** The form asks for screenshots. Teams upload one screenshot per member for each item.

> * ☐ Starred the Noir GitHub repo: [github.com/noirx402/noir](https://github.com/noirx402/noir)  
> * ☐ Starred the Velo GitHub repo: [github.com/Velo-Ecosystem-Collection/Velo](https://github.com/Velo-Ecosystem-Collection/Velo)  
> * ☐ Following Noir on X: [x.com/Noirx402](https://x.com/Noirx402)  
> * ☐ Following Velo on X: [x.com/RunVeloDev](https://x.com/RunVeloDev)  
> * ☐ Following the community partners on X: [Highrable](https://x.com/highrable), [GigPay](https://x.com/GigPayPH), [TyFi](https://x.com/VertigralTech)

**Join the Discord** for updates and help during the hackathon: [discord.gg/Mt2hD7DG](https://discord.gg/Mt2hD7DG)

## **Build requirements**

Every project must meet all six requirements to be judged.

> 1. **It is an agentic payment.** An AI agent decides, requests or makes the payment. A human clicking "Pay" on a normal checkout does not count.  
> 2. **Noir: strictly through the SDK, on the deployed contracts.** Your agent must interact with the deployed Noir Testnet contracts listed in Using Noir, and only through the Noir SDK (@noirx402/agent-sdk). Deploying your own copies of the contracts, or calling other contract IDs, does not count.  
> 3. **Velo: for the rest of your application.** Use the Velo SDK (@carts1024/velo-sdk) to build the other parts of your app, such as checkout sessions, payment status and signed webhooks.  
> 4. **It runs on Stellar Testnet.** Never use real funds.  
> 5. **It has a public GitHub repo** set up as a monorepo, with a README in the required format (see Repo and README format). Judges score from this README.  
> 6. **Its website is live.** Your app must be deployed and reachable at a public URL when you submit. A localhost-only demo does not count.

**What counts as an agentic payment.** The agent holds a constrained Noir agent key or acts for a user, and it chooses when, whom and how much to pay. Examples: an agent that buys API calls as it needs them, an agent that pays a merchant when a card is tapped, or an agent that settles a bill once a task is done.  
Open-source code and libraries are welcome. Credit any code, libraries and ideas you use in your README.

## **Prerequisites**

You can build this with web development skills and no prior Stellar experience. Before kickoff, make sure your team has:

> * ☐ **JavaScript or TypeScript**, plus async/await  
> * ☐ **Node.js and a package manager** (npm, pnpm or yarn), with workspaces for the monorepo  
> * ☐ **Git and a GitHub account**  
> * ☐ **A frontend framework** for the live website (React, Next.js, Vite or similar)  
> * ☐ **A hosting account** for the live website and server (Vercel, Netlify, Render, Railway or similar)  
> * ☐ **Chrome**, for the Noir extension  
> * ☐ **An AI agent approach**: an LLM API, an agent framework, or rule-based logic that decides when to pay  
> * ☐ **The Stellar basics below**, read once

## **Stellar developer guide**

Everything in this hackathon runs on Stellar Testnet, a free copy of the network where test XLM has no value. This is what you need to know to work with it.  
**Key concepts**

| Term | What it means here |
| :---- | :---- |
| Account / keypair | A public key (G...) is the address; the secret key (S...) signs. Never commit a secret key. |
| Testnet | The test network. Its passphrase is Networks.TESTNET in the SDK. Testnet can be reset, so keep setup scripts that rebuild your state. |
| Friendbot | Free Testnet XLM. It funds a new account with 10,000 test XLM. |
| XLM and stroops | XLM is the native asset. 1 XLM \= 10,000,000 stroops; the Noir SDK uses stroops as bigint. |
| Minimum balance | An account must keep a small XLM reserve, so never drain it to zero. |
| Soroban | Stellar's smart contract platform. The Noir contracts are Soroban contracts (IDs start with C...). |
| Stellar Asset Contract | The contract form of an asset. Native XLM's is Asset.native().contractId(Networks.TESTNET). |
| Fees | Every transaction pays a small fee in XLM. Soroban calls cost more; a Noir card's first tap costs the agent about 2.3 XLM on Testnet. |
| Horizon | The API for accounts, balances, payments and transaction history. |
| Stellar RPC | The API for Soroban: simulating and sending contract calls, and reading contract events. |
| Wallet / signer | Signs transactions for the user (the Noir extension, or any Stellar Wallets Kit wallet). |

**Testnet endpoints**

| Service | URL |
| :---- | :---- |
| Horizon | https\://horizon-testnet.stellar.org |
| Stellar RPC | https\://soroban-testnet.stellar.org |
| Friendbot | https\://friendbot.stellar.org?addr=\<G... address\> |
| Explorer | [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet) |
| Stellar Laboratory | [lab.stellar.org](https://lab.stellar.org) |

The Noir SDK already points at Testnet by default, so you only need these for your own calls and debugging.  
**First steps: create and fund a Testnet account**  
`npm install @stellar/stellar-sdk`  
`import { Keypair, Horizon } from '@stellar/stellar-sdk'`

`// 1. Make a keypair. Save the secret in .env, never in code.`  
`const kp = Keypair.random()`  
`console.log('Public:', kp.publicKey())`

`// 2. Fund it with Friendbot.`  
``await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`)``

`// 3. Check the balance on Horizon.`  
`const horizon = new Horizon.Server('https://horizon-testnet.stellar.org')`  
`const account = await horizon.loadAccount(kp.publicKey())`  
`console.log(account.balances)`  
You need at least three funded Testnet accounts for a Noir flow: the **card owner**, the **agent** (it pays its own fees) and the **merchant**. The Noir extension can also create and fund a wallet for you from its popup.  
**Good habits**

> 1. Keep one .env per app, with every key listed (empty) in .env.example.  
> 2. Run agent keys only on the server, never in the browser.  
> 3. Simulate before you send: the Noir SDK does this for you, and checkPayment tells you why a payment would fail before you pay a fee.  
> 4. Paste every transaction hash into Stellar Expert to see what happened.  
> 5. If a call fails with an account error, check that the account exists and has XLM for fees.

**Learn more:** [Stellar docs](https://developers.stellar.org) · [Smart contracts](https://developers.stellar.org/docs/build/smart-contracts) · [x402 on Stellar](https://developers.stellar.org/docs/build/agentic-payments/x402) · [JavaScript SDK](https://github.com/stellar/js-stellar-sdk) · [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit) · [Noir's Stellar development guide](https://github.com/noirx402/noir/blob/main/docs/stellar-development-guide.md)

## **What you need**

Set these up before kickoff. Everything runs on free Testnet XLM.

| Tool | What it's for | Get it |
| :---- | :---- | :---- |
| Node.js | Runs the Noir and Velo SDKs. The Noir SDK needs ^22.23.4, ^24.22.1 or \>=26.12.1 (yarn refuses other versions) | [nodejs.org](https://nodejs.org) |
| Noir SDK | Reads card policies, checks payments, runs authorize and claim, events and webhooks | npm install @noirx402/agent-sdk @stellar/stellar-sdk |
| Stellar SDK v16 | Peer dependency of the Noir SDK | installed with the line above |
| Velo SDK | Checkout sessions, confirmed payments, signed webhooks | npm install @carts1024/velo-sdk@alpha |
| Velo API key | Authenticates your Velo calls on Testnet | [velo-build.dev (dashboard)](https://www.velo-build.dev) |
| Noir Chrome extension | A Stellar wallet that signs for your dApp at window.noir.stellar, links Noir cards and runs tap-to-pay | [Chrome Web Store](https://chromewebstore.google.com/detail/noir/gikfhchijjljpbhokmdmaadgmpbchmjl) |
| Testnet XLM | Funds wallets, escrows and fees | Friendbot in the extension popup, or [Stellar Laboratory](https://lab.stellar.org) |
| GitHub account | Your public project repo | [github.com](https://github.com) |

**Fee tip.** A card's first tap costs the agent about 2.3 XLM in Soroban fees on Testnet, so fund the agent key as well as the escrow.  
**NFC cards are optional.** The extension can link a card by typing its UID instead of scanning it, so you can test tap-to-pay without hardware.

> * ☐ Node installed at a supported version (node \-v)  
> * ☐ Noir extension installed, wallet created and funded with Friendbot  
> * ☐ Velo API key in a .env file, never committed  
> * ☐ Both SDKs install cleanly in an empty project

## **Using Noir**

Noir links an NFC card to a constrained payment agent: the card owner picks which key may spend, which asset, how much per payment and until when. The SDK talks straight to three Soroban contracts, so there is no Noir server and no API key, and it never handles a user's secret key.  
**Latest Testnet contracts** (redeployed 2026-10-24, built into the SDK as TESTNET):

| Contract | What it does | Testnet ID |
| :---- | :---- | :---- |
| device\_registry | Maps a card (SHA-256 of the NFC tag UID) to its owner's wallet | [CAC4KOLHDLDYDWBOKXNKRN5KVHO56PLOIFXDLTBUWGVN6GVDEB7FQHU5](https://stellar.expert/explorer/testnet/contract/CAC4KOLHDLDYDWBOKXNKRN5KVHO56PLOIFXDLTBUWGVN6GVDEB7FQHU5) |
| agent\_registry | Holds each agent's policy: max amount, asset, expiry | [CCMZDSPTLX7IIJWCYEUM5DJUHOSOYSTHGK777S2TXZWEMC5ZZGPJ3EBV](https://stellar.expert/explorer/testnet/contract/CCMZDSPTLX7IIJWCYEUM5DJUHOSOYSTHGK777S2TXZWEMC5ZZGPJ3EBV) |
| payment\_escrow | Holds card funds; the agent authorizes, the merchant claims | [CC7EAW5FNJEDBS7THM5IT6XIOHO4AOYMLXT3KSZ3HWUIKEACTW7E5BFS](https://stellar.expert/explorer/testnet/contract/CC7EAW5FNJEDBS7THM5IT6XIOHO4AOYMLXT3KSZ3HWUIKEACTW7E5BFS) |

The older 2026-10-07 IDs are retired. Projects must use the IDs above.  
**The payment flow, in call order:**

> 1. The owner links the card: registerDevice (tag hash to wallet, with the agent key).  
> 2. The owner sets the agent's policy: registerAgent (asset, maxAmount, expiresAt).  
> 3. The owner funds the card: fundEscrow (XLM into escrow).  
> 4. Before paying, your agent checks: checkPayment returns { ok: true } or a reason such as over\_limit, expired or insufficient\_escrow.  
> 5. The agent pays: authorizePayment, which moves funds into the merchant's pending balance.  
> 6. The merchant collects: claim.

**Install and connect:**  
`npm install @noirx402/agent-sdk @stellar/stellar-sdk`  
`import { Asset, Networks } from '@stellar/stellar-sdk'`  
`import { NoirAgentClient, keypairSigner, toStroops } from '@noirx402/agent-sdk'`

`const noir = new NoirAgentClient()                        // Testnet by default`  
`const asset = Asset.native().contractId(Networks.TESTNET) // native XLM token contract`

`const check = await noir.checkPayment({ deviceHash, agent, asset, amount: toStroops('2.5') })`  
``if (!check.ok) throw new Error(`Card refused: ${check.reason}`)``

`const { hash } = await noir.authorizePayment({`  
  `agent: keypairSigner(process.env.AGENT_SECRET!),`  
  `deviceHash, merchant, asset, amount: toStroops('2.5'),`  
`})`  
**Signers.** noirExtensionSigner() connects to the Noir Chrome extension, walletSigner(wallet, address) wraps any Stellar Wallets Kit wallet, and keypairSigner(secret) is for servers and agents that hold their own key.  
**Amounts are in stroops** (bigint, 1 XLM \= 10,000,000). Use toStroops and fromStroops, never floats.  
**React to payments.** noir.watch({ types: \['payment.authorized'\], onEvent }) streams contract events, and startWebhookRelay POSTs them to your endpoint signed with HMAC-SHA256. Check each delivery with verifyWebhookSignature and dedupe on event.id.  
**Errors** throw NoirContractError with the contract's own name, for example InsufficientBalance, AgentNotAuthorized or NothingToClaim.

### **Noir references**

Use the SDK pages to build. The contract and architecture pages explain what the SDK is calling under the hood.  
**Noir website and docs:** [noirx402.github.io/noir](https://noirx402.github.io/noir/)

| Page | What's in it |
| :---- | :---- |
| [Docs home](https://noirx402.github.io/noir/docs/) | Start page for developers |
| [Quickstart](https://noirx402.github.io/noir/docs/quickstart/) | Get a first Noir call working |
| [SDK](https://noirx402.github.io/noir/docs/sdk/) | @noirx402/agent-sdk guide |
| [Contracts](https://noirx402.github.io/noir/docs/contracts/) | The three deployed contracts and their IDs |
| [Extension](https://noirx402.github.io/noir/docs/extension/) | Connecting the Noir Chrome extension to your dApp |
| [Webhooks](https://noirx402.github.io/noir/docs/webhooks/) | Signed event delivery to your server |
| [API](https://noirx402.github.io/noir/docs/api/) | REST gateway reference |

**Noir GitHub repo:** [github.com/noirx402/noir](https://github.com/noirx402/noir)

| File | What's in it |
| :---- | :---- |
| [SDK README](https://github.com/noirx402/noir/tree/main/sdk/agent-sdk) | Install, signers, checkPayment, authorizePayment, claim, card lifecycle, events, webhooks, networks |
| [SDK examples](https://github.com/noirx402/noir/tree/main/sdk/agent-sdk/examples) | check-and-pay.ts, webhook-relay.ts, webhook-receiver.ts |
| [Noir RPS example](https://github.com/noirx402/noir/tree/main/examples/noir-rps) | A full dApp using the extension signer and a server signer |
| [Docs index](https://github.com/noirx402/noir/blob/main/docs/README.md) | Every developer doc, by task |
| [API reference](https://github.com/noirx402/noir/blob/main/docs/api-reference.md) | SDK, REST gateway and app module |
| [Smart contract reference](https://github.com/noirx402/noir/blob/main/docs/contracts.md) | Methods, errors and the live Testnet IDs |
| [Architecture](https://github.com/noirx402/noir/blob/main/docs/architecture.md) | How the parts fit, with diagrams |
| [Walkthrough](https://github.com/noirx402/noir/blob/main/docs/walkthrough.md) | The whole payment flow, step by step, with Testnet transactions |
| [Stellar development guide](https://github.com/noirx402/noir/blob/main/docs/stellar-development-guide.md) | Stellar SDK, auth, events |
| [Supported NFC hardware](https://github.com/noirx402/noir/blob/main/docs/nfc-hardware.md) | Which NFC tags work and how they are hashed |
| [Installation guide](https://github.com/noirx402/noir/blob/main/docs/installation.md) | Running Noir locally |
| [Extension README](https://github.com/noirx402/noir/tree/main/extension) | What the Chrome extension does and how dApps connect |
| [REST gateway](https://github.com/noirx402/noir/tree/main/sdk/noir-api) | For apps that can't run JavaScript |
| [Deploy evidence](https://github.com/noirx402/noir/tree/main/deploy-evidence) | Contract IDs, WASM hashes and deploy records |

**Noir Chrome extension:** [Chrome Web Store](https://chromewebstore.google.com/detail/noir/gikfhchijjljpbhokmdmaadgmpbchmjl) · **npm:** [@noirx402/agent-sdk](https://www.npmjs.com/package/@noirx402/agent-sdk) · **X:** [@Noirx402](https://x.com/Noirx402)

## **Using Velo**

Velo gives your agent a checkout and a source of truth: it marks a payment as paid only after the Stellar ledger confirms it, then sends your server a signed payment.succeeded webhook. The SDK is in alpha and runs server-side only.  
**Get a key.** Sign in to the Velo dashboard at [velo-build.dev](https://www.velo-build.dev) with a Stellar wallet, create a project, and generate a Testnet API key. Keep it in .env as VELO\_API\_KEY.  
**Install** (use the alpha tag; latest still points at an older build):  
`npm install @carts1024/velo-sdk@alpha`  
**Create a checkout session:**  
`import { Velo } from '@carts1024/velo-sdk'`

`const velo = new Velo({ apiKey: process.env.VELO_API_KEY!, environment: 'testnet' })`

`const { checkoutUrl, paymentIntentId } = await velo.checkout.sessions.create({`  
  `amount: '10.00', asset: 'native', description: 'Agent purchase',`  
  `successUrl: 'http://localhost:3000/success', cancelUrl: 'http://localhost:3000/cancel',`  
`})`

`const intent = await velo.paymentIntents.retrieve(paymentIntentId)`  
`console.log(intent.status)`  
**Verify webhooks.** Pass the raw, unparsed request body and the x-velo-signature header. Keep VELO\_WEBHOOK\_SECRET on the server.  
`const event = await Velo.webhooks.verify({`  
  `payload: rawBody,`  
  `signature: req.headers['x-velo-signature'],`  
  `secret: process.env.VELO_WEBHOOK_SECRET!,`  
`})`  
A bad or missing signature throws VeloWebhookSignatureVerificationError; return a 400 and ignore the event.  
Full reference: [Velo docs](https://www.velo-build.dev/docs) · [SDK README](https://github.com/Velo-Ecosystem-Collection/Velo/blob/main/packages/velo-sdk/README.md) · [Velo Pay demo](https://pay-demo.velo-build.dev) · examples for [Express](https://github.com/Velo-Ecosystem-Collection/Velo/blob/main/examples/express/README.md) and [Next.js](https://github.com/Velo-Ecosystem-Collection/Velo/blob/main/examples/nextjs-app-router/README.md)

## **Reference architecture and project ideas**

Noir and Velo don't connect to each other; your agent connects to both. A common shape: the card owner sets limits in Noir, your agent pays within them through the Noir contracts, and your agent also uses Velo for checkout and confirmed-payment webhooks.

| Part | Talks to | How |
| :---- | :---- | :---- |
| Card owner (NFC card \+ wallet) | Noir Testnet contracts | Registers the card, sets the agent policy, funds the escrow |
| Your AI agent (holds the agent key) | Noir Testnet contracts | checkPayment, then authorizePayment, through the Noir SDK |
| Merchant | Noir Testnet contracts | claim collects the pending XLM |
| Your AI agent | Velo | Creates checkout sessions; Velo confirms on the ledger |
| Velo | Your server | Sends a signed payment.succeeded webhook that your server verifies |

The two halves only meet in your code: the Noir side limits what the agent may spend, and the Velo side gives you a checkout and a signed webhook when a payment lands. How you combine them is up to your project.  
**Ideas to start from:**

> * **Pay-per-use agent:** an AI assistant that pays for each API call or dataset it uses, within a daily cap  
> * **Tap-to-pay with an agent:** a shop where a card tap lets an agent check the policy and pay the merchant  
> * **Freelance payouts:** an agent that pays gig workers once their task is checked as done  
> * **Subscription manager:** an agent that renews, pauses or cancels services against a budget  
> * **Group expense settler:** an agent that splits a bill and pays each person's share  
> * **Merchant assistant:** an agent that watches payment.authorized events and claims the pending balance

## **Repo and README format**

Every project is one public GitHub monorepo, and its root README follows the template below. Judges read this README first and score from it, so a missing section costs you points.  
**Monorepo layout.** Keep every part of your project in one repo, with each part in its own folder:  
`your-project/`  
`├── apps/`  
`│   ├── web/          # the live website (frontend)`  
`│   └── server/       # API, Velo webhooks, agent runtime`  
`├── packages/`  
`│   ├── agent/        # agent logic and its Noir SDK calls`  
`│   └── shared/       # shared types and config`  
`├── docs/             # screenshots, diagrams, extra docs`  
`├── .env.example      # every variable, no real values`  
`├── package.json      # workspace root`  
`└── README.md         # the judging README`  
Use npm, pnpm or yarn workspaces (Turborepo is optional). Folder names can change to fit your project, but the root package.json must declare the workspaces and one command must install everything.  
**README template.** Copy this into your root README.md and fill in every section, in this order:  
`# Project name`

`One-line pitch: what your agent does and who it is for.`

`**Live website:** https://...`  
`**Demo video (2 min):** https://...`  
`**Team:** Name (Discord handle), Name (Discord handle)`

`## Problem`  
`Who has the problem and why it matters. 2 to 4 sentences.`

`## Solution`  
`What you built and how the agent solves it.`

`## How the agentic payment works`  
`Step by step: what the agent decides, when it pays, whom and how much.`

`## Architecture`  
`A diagram (image or Mermaid) of your apps, the agent, the Noir contracts and Velo.`

`## Noir integration`  
`- Noir SDK version used (@noirx402/agent-sdk)`  
`- Which contracts you call (device_registry, agent_registry, payment_escrow)`  
`- Which SDK methods you use, with links to the files and lines`

`## Velo integration`  
`- Velo SDK version used (@carts1024/velo-sdk)`  
`- What Velo does in your app (checkout, payment status, webhooks)`  
`- Links to the files that call Velo`

`## Testnet proof`  
`At least one Stellar Expert link to a transaction your agent made.`

`## Repo structure`  
`The monorepo tree, one line per folder.`

`## Run it locally`  
`1. Prerequisites (Node version, wallet, Testnet XLM)`  
``2. `npm install` (or pnpm / yarn) at the root``  
``3. Copy `.env.example` to `.env` and fill it in``  
`4. The start command`

`## Environment variables`  
`| Name | What it is | Where to get it |`

`## Screenshots`

`## What's next`

`## Credits`  
`Libraries, code and ideas you used.`  
The judges check the Noir integration, Velo integration and Testnet proof sections against the code, so the links must point to real files.

## **Submission checklist**

Submit before Saturday, Nov 7, 12:00 PM. The official submission link will be posted in Discord \#submissions and \#announcements before kickoff.

> * ☐ **Public GitHub monorepo** link, with a root README in the required format  
> * ☐ **2-minute demo video** that shows the agent making or requesting a payment  
> * ☐ **Short write-up**: the problem, how your agent works, and the payment flow through Velo and the Noir contracts  
> * ☐ **Live website** link (required: the app must be deployed and working)  
> * ☐ **Team members**: names and Discord handles, all already registered through the Google Form  
> * ☐ **Proof on Testnet**: at least one transaction hash or [Stellar Expert](https://stellar.expert/explorer/testnet) link from your demo

Before you submit, check that a stranger could clone your repo and run it: no secrets in the code, a .env.example file, and setup steps in order.

## **Judging and pitching**

Projects are scored on five criteria. The top 10 are announced Saturday, Nov 7, at 4:00 PM and pitch face-to-face at 1:00 PM on Sunday, Nov 8\.

| Criterion | Weight | What judges look for |
| :---- | :---- | :---- |
| Agentic payments fit | 30% | The agent truly decides, requests or makes the payment |
| Technical execution | 25% | Velo and the Noir contracts work end to end on Testnet |
| Innovation | 20% | A new idea or a new use of agent payments |
| Real-world potential | 15% | Someone would use it beyond the hackathon |
| Pitch and demo | 10% | Clear story, working live demo |

**Pitch format:** a 5-minute pitch with a live demo, then 3 minutes of Q\&A. Bring a laptop with the demo running and a backup video in case the network fails.

## **Rules and code of conduct**

Breaking these rules can get your messages removed, you muted or banned, or your project disqualified, at the organizers' discretion.

> 1. **Be respectful.** No harassment, hate speech, discrimination or personal attacks.  
> 2. **No scams or shilling.** No token promotions, airdrops or unsolicited DMs. The Noir team will never DM you first asking for funds.  
> 3. **Protect your keys.** Never share a seed phrase, secret key or API key, and never commit one to GitHub. No one from the team will ever ask for them.  
> 4. **Testnet only.** Projects run on Stellar Testnet. Don't send real funds while testing.  
> 5. **Give credit** for code, libraries and ideas you use.  
> 6. **Stay on topic** in Discord: questions in \#dev-help, Noir talk in \#noir-sdk-and-extension, Velo talk in \#velo-integration, demos in \#showcase.  
> 7. **English or Filipino**, so everyone can follow along.  
> 8. Follow Discord's [Terms of Service](https://discord.com/terms) and [Community Guidelines](https://discord.com/guidelines).

## **Getting help**

Join the Discord for updates and help during the hackathon: [discord.gg/Mt2hD7DG](https://discord.gg/Mt2hD7DG). The Noir and Velo teams answer in the channels below during the build.

| Channel | Use it for |
| :---- | :---- |
| \#hackathon-info | Schedule, rules and official updates |
| \#find-a-team | Post an intro to find teammates |
| \#hackathon-help | Questions about the event |
| \#dev-help | Build questions and bugs in your code |
| \#noir-sdk-and-extension | Noir SDK, contracts and Chrome extension |
| \#velo-integration | Velo SDK, checkout and webhooks |
| \#submissions | Submission link and deadlines |
| Office Hours (voice) | Talk a problem through live |

Found a bug in Noir itself? Report it: [forms.gle/MrfvC8NaFFFogcRt8](https://forms.gle/MrfvC8NaFFFogcRt8)  
**Links**

| What | Link |
| :---- | :---- |
| Luma RSVP | [luma.com/gjclwpkd](https://luma.com/gjclwpkd) |
| Registration form | [forms.gle/wL8tPiCwGkK8YENV9](https://forms.gle/wL8tPiCwGkK8YENV9) |
| Noir GitHub | [github.com/noirx402/noir](https://github.com/noirx402/noir) |
| Noir SDK | [@noirx402/agent-sdk](https://www.npmjs.com/package/@noirx402/agent-sdk) |
| Noir Chrome extension | [Chrome Web Store](https://chromewebstore.google.com/detail/noir/gikfhchijjljpbhokmdmaadgmpbchmjl) |
| Velo GitHub | [github.com/Velo-Ecosystem-Collection/Velo](https://github.com/Velo-Ecosystem-Collection/Velo) |
| Velo docs | [velo-build.dev/docs](https://www.velo-build.dev/docs) |
| Stellar docs | [developers.stellar.org](https://developers.stellar.org) |
| x402 on Stellar | [developers.stellar.org/docs/build/agentic-payments/x402](https://developers.stellar.org/docs/build/agentic-payments/x402) |
| Testnet explorer | [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet) |
| Noir on X | [x.com/Noirx402](https://x.com/Noirx402) |
| Velo on X | [x.com/RunVeloDev](https://x.com/RunVeloDev) |

**Community partners:** [Highrable](https://x.com/highrable), [GigPay](https://x.com/GigPayPH) and [TyFi](https://x.com/VertigralTech).

[image1]: <data:image/png;base64,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>