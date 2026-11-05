import express from 'express';
import { fileURLToPath } from 'node:url';
import { db } from './db.ts';
import { createJob, getJobView } from './jobs.ts';
import { handleVeloWebhook } from './velo.ts';
import { startWorker } from './worker.ts';
import { offerSummaries } from '@goats/agent';

const app = express();

// Raw body for signature verification; must stay before any JSON parser.
app.post('/api/webhooks/velo', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  const secret = process.env.VELO_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).send('webhook secret not configured');
    return;
  }
  const payload = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  const result = await handleVeloWebhook(
    payload,
    req.get('x-velo-signature') ?? null,
    req.get('x-velo-delivery') ?? null,
    secret,
  );
  res.status(result.status).send(result.body);
});

app.use(express.json({ limit: '16kb' }));

app.post('/api/jobs', async (req, res) => {
  const result = await createJob(req.body);
  res.status(result.status).json(result.body);
});

app.get('/api/offers', (_req, res) => {
  res.json(offerSummaries());
});

app.get('/api/jobs/:id', (req, res) => {
  const view = getJobView(req.params.id);
  if (view) res.json(view);
  else res.status(404).json({ error: 'not found' });
});

app.get('/healthz', (_req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// Production: serve the built web app from the same origin.
const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
app.use(express.static(webDist));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`server listening on :${port}`));
startWorker();
