import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Integration tests run against a real local Supabase (Postgres, Auth, Storage, PostgREST):
 *   npm run db:start   then   npm run test:integration
 * They are kept out of `npm test` so CI and quick runs do not need Docker.
 */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // One database, so files run one after another.
    fileParallelism: false,
  },
});
