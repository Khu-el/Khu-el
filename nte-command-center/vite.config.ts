import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Single output, no code-split chunks fetched at runtime. The console has
    // to work with the network off.
    rollupOptions: { output: { manualChunks: undefined } },
  },
})
