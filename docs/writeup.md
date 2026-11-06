# Listo: write-up

## The problem

Someone selling a used phone in the Philippines usually guesses the asking price from a few marketplace searches. The same model can differ by thousands of pesos depending on the seller and its condition, so people underprice and lose money, or overprice and wait. Reliable price data exists, but gathering it takes time, and someone has to decide which data is worth paying for.

## How the agent works

The seller chooses how fresh the price data must be and pays a small fee. From then on a rule-based agent does the work. It looks at two paid research sellers, run by our team, each selling a dated snapshot of real Philippine listings: Basic research is cheaper but older, Recent research costs more and is refreshed by a re-check script so it stays under 12 hours old. The agent drops any seller whose data is too old for the seller's choice, asks Noir whether its own spending policy allows each remaining payment, and buys from the cheapest seller that passes. It records every step of that decision. It then builds the listing from the data it bought: a suggested price (the median of comparable listings) with a link and date for every source.

The agent, not a person, decides whom to pay and how much, and it signs the payment with its own constrained key. Changing the freshness setting changes the decision: a flexible order pays the Basic seller 1 XLM, a strict order pays the Recent seller 2 XLM.

## The payment flow through Velo and the Noir contracts

1. The seller pays a 1 test XLM fee through a Velo checkout. Velo confirms it on the ledger and sends a signed webhook. Our server verifies the signature, ignores repeated deliveries and test events, and queues exactly one job for a matching payment.
2. The agent calls `checkPayment` on Noir's `agent_registry` and `payment_escrow` for each eligible seller, then `authorizePayment` for the one it chose. The amount moves from the device escrow, capped at 2.5 XLM per payment, into the research seller's pending balance.
3. The research seller calls `claim` and collects the payment.

Every step is on Stellar Testnet and linked from the order's receipt.

Live site: https://listoapp.up.railway.app
Repository: https://github.com/charlesterrenal/noir-x-velo-hackathon
Demo video: https://youtu.be/TJXpd783OTc
Example agent payment: https://stellar.expert/explorer/testnet/tx/1f5f9bb469098dbaa88f69a96a9c80fb30e9217bf06d262c2b7e7e220e4e4296
