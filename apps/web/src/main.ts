// Lane D builds the seller form, job status and receipt here.
const health = document.querySelector('#health')!;

fetch('/healthz')
  .then((r) => r.json())
  .then((h: { ok: boolean }) => (health.textContent = h.ok ? 'Server ready' : 'Server not ready'))
  .catch(() => (health.textContent = 'Server unreachable'));
