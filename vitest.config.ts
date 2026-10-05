import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only: every module under test here is pure (no DOM, no network,
    // no database). Anything needing a browser or a live server belongs in a
    // separate suite, not this one.
    environment: 'node',
    include: ['apps/*/src/**/*.test.ts', 'packages/*/src/**/*.test.ts', 'server/src/**/*.test.ts'],
  },
});
