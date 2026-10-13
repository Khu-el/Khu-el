import { defineConfig } from 'vitest/config';

// Component tests only. They render to static markup with react-dom/server, so they need
// no DOM and no new dependency; the node:test suites in test/*.test.ts cover the pure helpers.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['test/**/*.test.tsx'],
  },
});
