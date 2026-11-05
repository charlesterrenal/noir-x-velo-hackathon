# The GOATS

Work in progress for the Velo x Noir Agentic Payment Hackathon. The judging README (handbook template) replaces this before submission.

## Run it locally

1. Node 26.13.0 (see `.node-version`).
2. `npm install` at the root.
3. Copy `.env.example` to `.env` and fill it in.
4. Two terminals: `npm run dev:server` (API on :3000) and `npm run dev:web` (Vite, proxies `/api` to :3000).

Production: `npm run build && npm start` serves the web app and API from one origin. Set `DATA_DIR` to the host's persistent disk.

Checks: `npm run typecheck`. Health: `GET /healthz`.
