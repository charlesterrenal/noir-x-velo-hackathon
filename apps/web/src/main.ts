import { MAX_AGE_HOURS, formatAge } from '@goats/shared';
import type { CreateJobResponse, DecisionEntry, Freshness, JobStatus, JobView, OfferSummary } from '@goats/shared';

const app = document.querySelector<HTMLElement>('#app')!;
const progressEl = document.querySelector<HTMLElement>('#progress')!;
const pill = document.querySelector<HTMLButtonElement>('#pill')!;

const PRODUCT = { id: 'iphone-13-mini-256', name: 'iPhone 13 mini 256GB' };
const FEE = '1';
const CAP_XLM = '2.5'; // Noir per-payment limit, shown as copy only; Noir enforces it
const EXPLORER = 'https://stellar.expert/explorer/testnet/tx/';
const FRESH: Record<Freshness, { short: string; limit: string }> = {
  flexible: { short: 'Up to 30 days', limit: '30-day' },
  strict: { short: 'Up to 12 hours', limit: '12-hour' },
};
// Stage 0 is the start form; stages 1-5 match the five progress segments.
const STEPS = ['Velo confirms your payment', 'Agent compares research', 'Agent pays through Noir', 'Seller collects payment', 'Price ready'];
const STEP_OF: Record<JobStatus, number> = {
  awaiting_payment: 1, queued: 2, comparing: 2, purchasing: 3, claiming: 4, completed: 5,
  blocked: 0, review: 0, closed: 1, // failure stage comes from failedStage()
};
const TERMINAL: JobStatus[] = ['completed', 'blocked', 'closed']; // review resolves itself, so keep polling

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollMode = (): ScrollBehavior => (calm() ? 'auto' : 'smooth');
const view = (hash: string | null, what: string) =>
  hash ? `<a href="${EXPLORER}${esc(hash)}" target="_blank" rel="noopener">View<span class="visually-hidden"> ${what} on Stellar Expert</span></a>` : '';
const money = (amount: string, currency = 'PHP') => {
  const n = Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'PHP' ? `₱${n}` : `${esc(currency)} ${n}`;
};

let offers: OfferSummary[] = [];
const offerById = (id: string | null) => offers.find((o) => o.id === id);
const label = (id: string | null) => offerById(id)?.label ?? id ?? '';

// ---------- state ----------

type StageState = 'form' | 'locked' | 'current' | 'done' | 'fail' | 'warn' | 'open';
type Page = { job: JobView | null; step: number; bad: 'fail' | 'warn' | null; fresh: Freshness };
let page: Page = { job: null, step: 0, bad: null, fresh: 'flexible' };

// Where a blocked or review job stopped, as a stage number (1-4).
function failedStage(job: JobView) {
  if (job.authorizationTxHash) return 4;
  if (job.selectedOfferId) return 3;
  return 2;
}

function pageFor(job: JobView): Page {
  if (job.status === 'blocked') return { job, step: failedStage(job), bad: 'fail', fresh: job.freshness };
  if (job.status === 'review') return { job, step: failedStage(job), bad: 'warn', fresh: job.freshness };
  if (job.status === 'closed') return { job, step: 1, bad: 'fail', fresh: job.freshness };
  return { job, step: STEP_OF[job.status], bad: null, fresh: job.freshness };
}

function stageState(k: number): StageState {
  if (k === 0) return page.job ? 'done' : 'form';
  if (k === 5) return page.step >= 5 ? 'open' : 'locked';
  if (page.step < k) return 'locked';
  if (page.step > k) return 'done';
  return page.bad ?? 'current';
}

// ---------- offers ----------

type Row = { id: string; amount: string; ageHours: number; why: string; kind: 'pick' | 'out' | 'check' };

// Preview of the agent's rule before paying: cheapest offer with data inside the freshness limit.
// Noir's policy check runs at payment time, so the preview cannot show a policy refusal.
function previewRows(fresh: Freshness): Row[] {
  const now = Date.now();
  const rated = [...offers]
    .sort((a, b) => Number(a.amount) - Number(b.amount) || a.id.localeCompare(b.id))
    .map((o) => {
      const ageHours = Math.max(0, Math.round((now - new Date(o.snapshotTakenAt).getTime()) / 36e5));
      const skip = !o.listings ? 'no data collected yet' : ageHours > MAX_AGE_HOURS[fresh] ? `older than ${formatAge(MAX_AGE_HOURS[fresh])}` : '';
      return { o, ageHours, skip };
    });
  const pick = rated.find((r) => !r.skip);
  return rated.map(({ o, ageHours, skip }) => ({
    id: o.id, amount: o.amount, ageHours,
    kind: o === pick?.o ? ('pick' as const) : ('out' as const),
    why: o === pick?.o ? "Agent's pick: cheapest that qualifies" : skip ? `Skipped: ${skip}` : 'Qualifies, but costs more',
  }));
}

function traceRows(job: JobView): Row[] {
  const pick = job.decisionTrace.find((t) => t.offerId === job.selectedOfferId);
  return job.decisionTrace.map((t: DecisionEntry) => {
    const isPick = t.offerId === job.selectedOfferId;
    const why = isPick ? "Agent's pick: cheapest that qualifies"
      : t.filteredOut ? `Skipped: ${t.filteredOut}`
      : t.checkPayment && !t.checkPayment.ok ? `Refused by Noir: ${t.checkPayment.reason ?? 'policy check failed'}`
      : pick ? `Skipped: costs ${Number(t.amount) - Number(pick.amount)} XLM more` : 'Qualified';
    return { id: t.offerId, amount: t.amount, ageHours: t.snapshotAgeHours, why, kind: isPick ? ('pick' as const) : ('out' as const) };
  });
}

function offerRows(rows: Row[]) {
  if (!rows.length) return '<p class="muted">Research offers could not load. The agent still checks them after you pay.</p>';
  return `<div class="rows">${rows.map((r) => `<div class="offer is-${r.kind}">
      <h3>${esc(label(r.id))}</h3><p class="cost num"><span class="visually-hidden">Agent pays </span>${esc(r.amount)} XLM</p>
      <p class="why">${esc(r.why)}</p><p class="age num">${esc(formatAge(r.ageHours))} old</p>
    </div>`).join('')}</div>`;
}

const checking = (): Row[] => offers.map((o) => ({ id: o.id, amount: o.amount, ageHours: Math.round((Date.now() - new Date(o.snapshotTakenAt).getTime()) / 36e5), why: 'Checking data age and Noir policy…', kind: 'check' as const }));

// ---------- stages ----------

const line = (st: 'done' | 'locked', text: string, right = '') =>
  `<div class="line ${st}"><span class="tick" aria-hidden="true">${st === 'done' ? '✓' : ''}</span><span>${text}${st === 'locked' ? '<span class="visually-hidden"> (not started)</span>' : ''}</span><span class="right">${right}</span></div>`;
const open = (title: string, lede: string, body = '', fail = false) =>
  `<div class="open"><div><h2 class="disp${fail ? ' fail' : ''}">${title}</h2>${lede ? `<p class="lede${fail ? ' fail' : ''}">${lede}</p>` : ''}</div>${body}</div>`;
const startOver = (text: string) => `<a class="btn" href="/">${text}</a>`;

function startForm() {
  return `<form class="open" id="start">
    <div><h1 class="disp">What should you charge for your used phone?</h1>
      <p class="lede">An agent buys price research for you and pays the seller itself.</p></div>
    <div class="rows">
      <div class="row"><span>Phone</span><span>${esc(PRODUCT.name)}</span></div>
      <fieldset class="row"><legend class="visually-hidden">How recent the price data must be</legend><span aria-hidden="true">Data age</span>
        <div class="segmented">${(['flexible', 'strict'] as const).map((f) => `<label><input type="radio" name="freshness" value="${f}"${page.fresh === f ? ' checked' : ''} />${FRESH[f].short}</label>`).join('')}</div></fieldset>
    </div>
    <section class="group" aria-labelledby="buy-h"><h2 id="buy-h">The agent buys the cheapest research that qualifies, from its own allowance</h2>
      <div id="quote-offers" aria-live="polite">${offerRows(previewRows(page.fresh))}</div></section>
    <div class="group">
      <div class="total"><span>You pay</span><b>${FEE} test XLM</b></div>
      <button type="submit" class="btn full">Pay with Velo</button>
      <p class="error" id="start-error" role="alert" hidden></p>
      <p class="note">Stellar Testnet. Test money only. Noir limits each agent payment to ${CAP_XLM} XLM.</p>
    </div>
  </form>`;
}

function stageHTML(k: number, st: StageState): string {
  const job = page.job;
  if (k === 0) return st === 'form' ? startForm() : line('done', `${esc(PRODUCT.name)} · data ${FRESH[page.fresh].short.toLowerCase()}`, `<span class="num">${FEE} test XLM</span>`);
  if (st === 'locked') return (k === 1 && !job ? '<p class="after">After you pay</p>' : '') + line('locked', STEPS[k - 1]);
  if (!job) return '';
  const pick = offerById(job.selectedOfferId);
  const amount = job.decisionTrace.find((t) => t.offerId === job.selectedOfferId)?.amount ?? pick?.amount ?? '';
  const err = job.error ? ` ${esc(job.error)}` : '';

  if (k === 1) {
    if (st === 'done') return line('done', 'Velo confirmed your payment', view(job.sellerTxHash, 'Velo payment'));
    if (st === 'fail') return open('This checkout expired', 'Nothing was charged. Start a new order to try again.', startOver('Start a new order'), true);
    return open('Waiting for Velo to confirm your payment', 'This page updates on its own. Keep it open.');
  }
  if (st === 'warn') return open('This payment needs a check', `It resolves itself within a few minutes. This page updates on its own.${err}`);
  if (k === 2) {
    if (st === 'current') return open('Comparing research offers', `Checking each offer against your ${FRESH[page.fresh].limit} limit and the Noir spending policy.`, offerRows(checking()));
    if (st === 'fail') return open('The agent did not pay', `${esc(job.selectionReason ?? job.error ?? '')} Start a new order with data up to 30 days old, or come back later.`, offerRows(traceRows(job)) + startOver('Start a new order'), true);
    // the decision stays open after it finishes
    return open(`Agent picked <mark>${esc(label(job.selectedOfferId))}</mark>`, esc(job.selectionReason ?? ''), offerRows(traceRows(job)));
  }
  if (st === 'fail') return open('The agent did not finish paying', `${err.trim() || 'The payment was refused.'} Start a new order to try again.`, startOver('Start a new order'), true);
  if (k === 3) {
    if (st === 'done') return line('done', `Agent paid ${esc(label(job.selectedOfferId))} through Noir`, `<span class="num">${esc(amount)} XLM</span>${view(job.authorizationTxHash, 'Noir authorization')}`);
    return open(`Paying ${esc(label(job.selectedOfferId))} through Noir`, `<span class="num">${esc(amount)}</span> XLM from the agent's allowance. Noir checks its spending policy, then signs.`);
  }
  if (k === 4) {
    if (st === 'done') return line('done', 'Seller collected the payment', `<span class="num">${esc(amount)} XLM</span>${view(job.claimTxHash, "seller's claim")}`);
    return open('Seller is collecting the payment', `The research seller claims the <span class="num">${esc(amount)}</span> XLM on Stellar.`);
  }
  return resultHTML(job, amount);
}

function resultHTML(job: JobView, amount: string) {
  const l = job.listing;
  if (!l || l.suggestedPrice === 'n/a') return open('No price yet', 'The research had no comparable listings for this phone. Try again later.', startOver('Price another phone'));
  const seen = [...new Set(l.sources.map((s) => s.observedAt.slice(0, 10)))].join(', ');
  return `<div class="open">
    <div><p class="muted">Suggested listing price for ${esc(PRODUCT.name)}</p>
      <h2 class="price" aria-label="Suggested listing price: ${money(l.suggestedPrice, l.currency)}"><span id="price-value" data-value="${esc(l.suggestedPrice)}" data-currency="${esc(l.currency)}" aria-hidden="true">${money(l.suggestedPrice, l.currency)}</span></h2>
      <p class="lede">Median of <span class="num">${l.sources.length}</span> listings sellers are asking${seen ? `, seen ${esc(seen)}` : ''}.</p></div>
    <div class="rows">${l.sources.map((s) => `<div class="listing"><a href="${esc(s.url)}" target="_blank" rel="noopener"><span>${esc(s.condition)}</span><small>${esc(new URL(s.url).hostname.replace(/^www\./, ''))}</small></a><span class="num">${money(s.price, l.currency)}</span></div>`).join('')}</div>
    <section class="group" aria-labelledby="rc-h">
      <h2 id="rc-h">Receipt</h2>
      <div class="rows">
        <div class="rc"><span>You paid, through Velo</span><span class="num">${FEE} test XLM</span>${view(job.sellerTxHash, 'Velo payment')}</div>
        <div class="rc"><span>Agent paid ${esc(label(job.selectedOfferId))}, through Noir</span><span class="num">${esc(amount)} XLM</span>${view(job.authorizationTxHash, 'Noir authorization')}</div>
        <div class="rc"><span>Seller collected</span><span class="num">${esc(amount)} XLM</span>${view(job.claimTxHash, "seller's claim")}</div>
      </div>
      <p class="muted">Stellar Testnet. Test money only.</p>
    </section>
    ${startOver('Price another phone')}
  </div>`;
}

// ---------- progress bar ----------

let prevMarks: string[] = [];
const marks = () => [1, 2, 3, 4, 5].map((k) => ({ form: 'todo', locked: 'todo', current: 'current', done: 'done', open: 'done', fail: 'fail', warn: 'warn' })[stageState(k)]);

function progressHTML() {
  const m = marks();
  const i = m.findIndex((x) => x !== 'done');
  const [count, step, cls] =
    !page.job ? ['0 of 5', 'Pay to begin', ''] :
    i === -1 ? ['5 of 5', 'Price ready', ''] :
    m[i] === 'fail' ? [`Stopped at ${i + 1} of 5`, STEPS[i], 'fail'] :
    m[i] === 'warn' ? [`${i + 1} of 5`, 'Payment needs a check', ''] :
    [`${i + 1} of 5`, STEPS[i], ''];
  return `<div class="prog ${cls}">
    <p aria-live="polite"><b>${step}</b><span class="num">${count}</span></p>
    <ol class="segs">${m.map((x, k) => {
      const fresh = x === 'done' && prevMarks[k] && prevMarks[k] !== 'done'; // animate only newly finished steps
      return `<li class="${x}${fresh ? ' fresh' : ''}"><button type="button" data-jump="${k + 1}" ${x === 'todo' ? 'disabled' : ''} aria-label="Go to: ${STEPS[k]}"><i></i></button></li>`;
    }).join('')}</ol></div>`;
}

// ---------- rendering: only stages whose HTML changed are replaced, so only new content animates ----------

const rendered = new Map<number, string>();
let firstPaint = true;

function update() {
  for (let k = 0; k <= 5; k++) {
    let el = document.getElementById(`stage-${k}`);
    if (!el) {
      el = document.createElement('section');
      el.id = `stage-${k}`;
      el.className = 'stage';
      app.appendChild(el);
    }
    const html = stageHTML(k, stageState(k));
    if (rendered.get(k) === html) continue;
    rendered.set(k, html);
    el.innerHTML = html;
    el.classList.remove('enter');
    if (!firstPaint) { void el.offsetWidth; el.classList.add('enter'); }
    const price = el.querySelector<HTMLElement>('#price-value');
    if (price && !firstPaint) countUp(price);
  }
  progressEl.innerHTML = progressHTML();
  prevMarks = marks();
  if (stageState(0) === 'form') bindStart();
  firstPaint = false;
}

const nearBottom = () => innerHeight + scrollY >= document.documentElement.scrollHeight - 200;
const target = () => document.getElementById(`stage-${Math.min(Math.max(page.step, 1), 5)}`)!;

function reveal(follow: boolean) {
  if (follow) { pill.hidden = true; target().scrollIntoView({ behavior: scrollMode(), block: 'start' }); return; }
  pill.textContent = `New: ${page.step >= 5 ? 'Price ready' : STEPS[page.step - 1]} ↓`;
  pill.hidden = false;
}

// Price rolls up to its final value once; reduced motion shows it directly.
function countUp(el: HTMLElement) {
  if (calm()) return;
  const final = el.textContent ?? '', value = Number(el.dataset.value), currency = el.dataset.currency;
  const t0 = performance.now() + 300, dur = 900;
  const tick = (t: number) => {
    const k = Math.max(0, Math.min(1, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
    el.textContent = k < 1 ? money(String(value * e), currency) : final;
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- start form ----------

const requestId = crypto.randomUUID(); // stable for this page, so a double submit reuses one checkout

function bindStart() {
  const form = document.querySelector<HTMLFormElement>('#start');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';
  form.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.name !== 'freshness') return;
    page.fresh = input.value as Freshness;
    document.querySelector('#quote-offers')!.innerHTML = offerRows(previewRows(page.fresh));
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    const error = document.querySelector<HTMLElement>('#start-error')!;
    button.disabled = true;
    error.hidden = true;
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestId, productId: PRODUCT.id, freshness: page.fresh }),
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

// ---------- job polling ----------

async function watchJob(id: string) {
  let first = true;
  for (;;) {
    let job: JobView | null = null;
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        app.innerHTML = `<div class="open"><div><h1 class="disp">Order not found</h1><p class="lede">Check the link, or start a new order.</p></div>${startOver('Start an order')}</div>`;
        return;
      }
      job = (await res.json()) as JobView;
    } catch {
      // Network blip: keep polling.
    }
    if (job) {
      const before = page.step, beforeBad = page.bad, follow = nearBottom();
      page = pageFor(job);
      update();
      if (first) { if (page.step > 1) target().scrollIntoView({ block: 'start' }); first = false; }
      else if (page.step !== before || page.bad !== beforeBad) reveal(follow);
      if (TERMINAL.includes(job.status)) return;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

// ---------- events ----------

progressEl.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-jump]');
  if (b) document.getElementById(`stage-${b.dataset.jump}`)?.scrollIntoView({ behavior: scrollMode(), block: 'start' });
});
pill.addEventListener('click', () => { target().scrollIntoView({ behavior: scrollMode(), block: 'start' }); pill.hidden = true; });
addEventListener('scroll', () => { if (!pill.hidden && nearBottom()) pill.hidden = true; }, { passive: true });

try {
  offers = await (await fetch('/api/offers')).json();
} catch {
  offers = [];
}
const jobId = new URLSearchParams(location.search).get('job');
if (jobId) watchJob(jobId);
else update();
