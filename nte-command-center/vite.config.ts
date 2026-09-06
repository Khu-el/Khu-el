import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Single output, no code-split chunks fetched at runtime. The console has
    // to work with the network off.
    rollupOptions: { output: { manualChunks: undefined } },
    // The modulepreload polyfill ships a live `fetch(link.href)` into the
    // bundle. With a single chunk there is never a preload link for it to
    // fetch, so it never fires — but a request-capable call in a console that
    // claims zero network is a claim with an asterisk on it. Off.
    modulePreload: { polyfill: false },
  },
})
