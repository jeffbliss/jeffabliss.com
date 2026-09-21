// vitest-pool-workers 0.22 (vitest 4) dropped the `/config` subpath: the pool is now a Vite plugin.
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' }, miniflare: { compatibilityDate: '2026-08-22', bindings: { DEV_IDENTITY: 'test@localhost' } } })],
  test: { include: ['tests/do/**/*.test.js'] },
});
