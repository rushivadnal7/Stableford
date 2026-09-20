import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    // Unit tests only. Integration tests need a running local Supabase: see vitest.integration.config.mts.
    include: ['src/**/*.test.ts'],
  },
});
