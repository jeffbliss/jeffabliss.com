import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
export default defineWorkersConfig({
  test: { include: ['tests/do/**/*.test.js'], poolOptions: { workers: { wrangler: { configPath: './wrangler.jsonc' }, miniflare: { bindings: { DEV_IDENTITY: 'test@localhost' } } } } },
});
