import type { CreateJobResponse, DecisionEntry, JobStatus, JobView, OfferSummary } from '@goats/shared';

const work = document.querySelector<HTMLElement>('#work')!;
const receipt = document.querySelector<HTMLElement>('#receipt')!;
const PRODUCT = { id: 'demo', name: 'Demo product' }; // shortcut: placeholder until lane C picks the product
const FEE = '1';
const EXPLORER = 'https://stellar.expert/explorer/testnet/tx/';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const days = (iso: string) => plural(Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 864e5)), 'day');
const txLink = (hash: string | null) =>
  hash ? `<a href="${EXPLORER}${esc(hash)}" target="_blank" rel="noopener">${esc(hash.slice(0, 10))}… on Stellar Expert</a>` : '';

let offers: OfferSummary[] = [];

async function loadOffers() {
  try {
    offers = await (await fetch('/api/offers')).json();
  } catch {
    offers = [];
  }
}
const offerById = (id: string | null) => offers.find((o) => o.id === id);

// ---------- Start screen ----------

function renderStart() {
  const basic = offerById('basic');
  const recent = offerById('recent');
  work.innerHTML = `
    <h1>What should you charge for it?</h1>
    <p class="lede">Pay a small fee and an agent buys price research for your item, chooses whom to pay based on how fresh you need the data, and pays from its own capped allowance.</p>
    <span class="product">${esc(PRODUCT.name)}</span>
    <form id="start">
      <fieldset>
        <legend>How recent should the price data be?</legend>
        <label class="choice">
          <input type="radio" name="freshness" value="flexible" checked />
          <strong>Up to 30 days old</strong>
          <span>The agent can buy older data.${basic ? ` Cheapest option: ${esc(basic.label)}, ${esc(basic.amount)} XLM, ${days(basic.snapshotTakenAt)} old.` : ''}</span>
        </label>
        <label class="choice">
          <input type="radio" name="freshness" value="strict" />
          <strong>Up to 7 days old</strong>
          <span>The agent must buy recent data.${recent ? ` Option: ${esc(recent.label)}, ${esc(recent.amount)} XLM, ${days(recent.snapshotTakenAt)} old.` : ''}</span>
        </label>
      </fieldset>
      <button class="pay" type="submit">Pay ${FEE} test XLM with Velo</button>
      <p class="note">You pay the fee with your own Testnet wallet. The agent pays for research separately, from an allowance limited to 2.5 XLM per payment.</p>
      <p class="error" id="start-error" role="alert" hidden></p>
    </form>`;
  receipt.innerHTML = `<div class="receipt"><h3>Receipt</h3><p class="empty">Your receipt appears here after you pay.</p></div>`;

  const form = document.querySelector<HTMLFormElement>('#start')!;
  const requestId = crypto.randomUUID(); // stable for this page, so a double submit reuses one checkout
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('button')!;
    const error = document.querySelector<HTMLElement>('#start-error')!;
    button.disabled = true;
    error.hidden = true;
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestId, productId: PRODUCT.id, freshness: new FormData(form).get('freshness') }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(startError(res.status, body.error));
      window.location.href = (body as CreateJobResponse).checkoutUrl;
    } catch (err) {
      error.textContent = err instanceof Error ? err.message : 'Checkout could not start. Try again.';
      error.hidden = false;
      button.disabled = false;
    }
  });
}

function startError(status: number, message?: string) {
  if (status === 503 && message === 'no demo slot available') return 'All funded demo allowances are in use. Ask the team to add one, then try again.';
  if (status === 502) return 'Velo did not return a checkout. Press the button again to retry the same order.';
  return message ? `Checkout could not start: ${message}.` : 'Checkout could not start. Try again.';
}

// ---------- Job screen ----------

const STEPS = ['Your payment confirmed by Velo', 'Agent compares research offers', 'Agent pays through Noir', 'Merchant collects payment', 'Listing ready'];
const STEP_INDEX: Record<JobStatus, number> = {
  awaiting_payment: 0, queued: 1, comparing: 1, purchasing: 2, claiming: 3, completed: 5,
  blocked: -1, review: -1, closed: -1,
};
const TERMINAL: JobStatus[] = ['completed', 'blocked', 'review', 'closed'];

function failedStep(job: JobView) {
  if (job.status === 'closed') return 0;
  if (job.claimTxHash) return 4;
  if (job.authorizationTxHash) return 3;
  if (job.selectedOfferId && job.status === 'review') return 2;
  return job.decisionTrace.length ? (job.selectedOfferId ? 2 : 1) : 1;
}

function statusMessage(job: JobView): { text: string; bad?: boolean } {
  switch (job.status) {
    case 'awaiting_payment': return { text: 'Waiting for Velo to confirm your payment. This page updates on its own.' };
    case 'queued': return { text: 'Payment confirmed. The agent is starting.' };
    case 'comparing': return { text: 'The agent is checking each offer against your freshness choice and its spending policy.' };
    case 'purchasing': return { text: 'The agent is paying for the research from its Noir allowance.' };
    case 'claiming': return { text: 'The research seller is collecting the payment.' };
    case 'completed': return { text: 'Done. Your listing and receipt are ready.' };
    case 'blocked': return { text: `The agent did not pay. ${job.error ?? ''}`, bad: true };
    case 'review': return { text: `The payment outcome needs a manual check before anything else happens. ${job.error ?? ''}`, bad: true };
    case 'closed': return { text: 'This checkout expired before payment.', bad: true };
  }
}

function traceRow(t: DecisionEntry, chosen: string | null) {
  const result = t.filteredOut
    ? `Skipped: ${t.filteredOut}`
    : t.checkPayment && !t.checkPayment.ok
      ? `Refused by Noir policy: ${t.checkPayment.reason}`
      : t.offerId === chosen ? 'Chosen' : 'Allowed, not cheapest';
  const o = offerById(t.offerId);
  return `<tr class="${t.offerId === chosen ? 'chosen' : ''}">
    <td>${esc(o?.label ?? t.offerId)}</td><td>${esc(t.amount)} XLM</td><td>${plural(Math.round(t.snapshotAgeHours / 24), 'day')}</td><td>${esc(result)}</td></tr>`;
}

function renderJob(job: JobView) {
  const at = STEP_INDEX[job.status];
  const failAt = at < 0 ? failedStep(job) : -1;
  const msg = statusMessage(job);
  const steps = STEPS.map((s, i) => {
    const cls = failAt >= 0 ? (i < failAt ? 'done' : i === failAt ? 'failed' : '') : i < at ? 'done' : i === at ? 'now' : '';
    return `<li class="${cls}"${i === at ? ' aria-current="step"' : ''}>${esc(s)}</li>`;
  }).join('');

  const decision = job.decisionTrace.length
    ? `<h2>How the agent decided</h2>
       <p class="reason">${esc(job.selectionReason)}</p>
       <div class="table-scroll"><table><thead><tr><th>Offer</th><th>Price</th><th>Data age</th><th>Result</th></tr></thead>
       <tbody>${job.decisionTrace.map((t) => traceRow(t, job.selectedOfferId)).join('')}</tbody></table></div>`
    : '';

  const l = job.listing;
  const listing = l
    ? `<h2>Your listing</h2>
       <div class="listing">
         <div class="price">${l.suggestedPrice === 'n/a' ? 'No price yet' : `${esc(l.currency)} ${esc(l.suggestedPrice)}`}</div>
         <p><strong>${esc(l.title)}</strong></p>
         <p>${esc(l.description)}</p>
         ${l.sources.length
           ? `<ul>${l.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.price)} ${esc(l.currency)}, ${esc(s.condition)}</a>, seen ${esc(s.observedAt.slice(0, 10))}</li>`).join('')}</ul>`
           : ''}
       </div>`
    : '';

  work.innerHTML = `
    <h1>${job.status === 'completed' ? 'Your listing is ready' : 'Your agent is working'}</h1>
    <p class="status-msg${msg.bad ? ' bad' : ''}">${esc(msg.text)}</p>
    <ol class="steps">${steps}</ol>
    ${decision}
    ${listing}
    ${TERMINAL.includes(job.status) ? '<a class="again" href="/">Price another item</a>' : ''}`;

  renderReceipt(job);
}

function renderReceipt(job: JobView) {
  const chosen = offerById(job.selectedOfferId);
  const item = (title: string, value: string, detail: string) =>
    `<div class="item"><div class="row"><b>${title}</b><span>${value}</span></div>${detail ? `<p>${detail}</p>` : ''}</div>`;
  const pending = '<span class="pending">pending</span>';

  receipt.innerHTML = `<div class="receipt${job.status === 'completed' ? ' printed' : ''}">
    <h3>The GOATS</h3>
    <p class="sub">Order ${esc(job.id.slice(0, 8))}</p>
    ${item('Your payment', `${FEE} XLM`, job.sellerTxHash ? `Velo checkout, ${txLink(job.sellerTxHash)}` : pending)}
    ${item('Agent decision', chosen ? `${esc(chosen.label)}` : job.decisionTrace.length ? 'none' : '', chosen ? `${esc(chosen.amount)} XLM to the ${esc(chosen.label.toLowerCase())} seller` : job.decisionTrace.length ? 'No offer qualified' : pending)}
    ${item('Agent payment', chosen ? `${esc(chosen.amount)} XLM` : '', job.authorizationTxHash ? `Noir authorization, ${txLink(job.authorizationTxHash)}` : pending)}
    ${item('Seller collected', '', job.claimTxHash ? `Merchant claim, ${txLink(job.claimTxHash)}` : pending)}
  </div>`;
}

async function watchJob(id: string) {
  for (;;) {
    let job: JobView | null = null;
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        work.innerHTML = '<h1>Order not found</h1><p class="status-msg bad">Check the link, or start a new order.</p><a class="again" href="/">Start an order</a>';
        return;
      }
      job = await res.json();
    } catch {
      // Network blip: keep polling.
    }
    if (job) {
      renderJob(job);
      if (TERMINAL.includes(job.status)) return;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

await loadOffers();
const jobId = new URLSearchParams(location.search).get('job');
if (jobId) watchJob(jobId);
else renderStart();
