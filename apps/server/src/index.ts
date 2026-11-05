import express from 'express';
import { fileURLToPath } from 'node:url';
import { db } from './db.ts';

const app = express();

// Lane A: mount POST /api/webhooks/velo here with express.raw() BEFORE any JSON parser.

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
