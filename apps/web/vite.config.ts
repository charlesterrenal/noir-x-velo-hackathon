import { defineConfig } from 'vite';

// Dev: forward API calls to the Express server on :3000.
export default defineConfig({
  server: {
    proxy: { '/api': 'http://localhost:3000', '/healthz': 'http://localhost:3000' },
  },
});
