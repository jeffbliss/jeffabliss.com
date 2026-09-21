// Identity plumbing through the Worker: no token means no access, and the DO's identity header is ours, never the client's.
import { SELF, env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

/** Opens a socket through the Worker (not straight at the DO) and returns the first message. */
async function firstMessage(url, headers) {
  const res = await SELF.fetch(url, { headers: { upgrade: 'websocket', ...headers } });
  expect(res.status).toBe(101);
  const ws = res.webSocket; ws.accept();
  const msg = await new Promise(resolve => ws.addEventListener('message', e => resolve(JSON.parse(e.data)), { once: true }));
  ws.close();
  return msg;
}

describe('access', () => {
  it('403s a page request with no Access token when DEV_IDENTITY is unset', async () => {
    const dev = env.DEV_IDENTITY;
    delete env.DEV_IDENTITY;                       // production shape: identity must come from a verified Access JWT
    try {
      const res = await SELF.fetch('http://localhost/valheim-mapper/');
      expect(res.status).toBe(403);
      expect(await res.text()).toBe('forbidden');  // fixed body: no verification detail leaks
    } finally { env.DEV_IDENTITY = dev; }
  });

  it('ignores DEV_IDENTITY off localhost', async () => {
    const res = await SELF.fetch('https://jeffabliss.com/valheim-mapper/');
    expect(res.status).toBe(403);
  });

  it('ignores a client-supplied x-user-email header', async () => {
    const hello = await firstMessage('http://localhost/valheim-mapper/api/ws', { 'x-user-email': 'mallory@x' });
    expect(hello.t).toBe('hello');
    expect(hello.you.email).toBe(env.DEV_IDENTITY);
    expect(hello.you.email).not.toBe('mallory@x');
  });
});
