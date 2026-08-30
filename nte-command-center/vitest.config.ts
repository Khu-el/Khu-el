import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// The test environment is jsdom because three of the four enforcement
// guarantees are only observable through rendered DOM, and the fourth
// (storage namespacing) needs a real localStorage to be worth asserting.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
