// Worker-level routing. Needs the DEV_IDENTITY binding in vitest.config.js: without it the /api/ws route verifies an Access token.
import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('worker routes', () => {
  it('redirects the bare prefix to the directory', async () => {
    const res = await SELF.fetch('https://x/valheim-mapper', { redirect: 'manual' });
    expect(res.status).toBe(301); expect(new URL(res.headers.get('location')).pathname).toBe('/valheim-mapper/');
  });
  it('404s anything outside the prefix', async () => {
    expect((await SELF.fetch('https://x/other')).status).toBe(404);
  });
  it('426s a websocket route without the upgrade header', async () => {
    expect((await SELF.fetch('https://x/valheim-mapper/api/ws')).status).toBe(426);
  });
});
