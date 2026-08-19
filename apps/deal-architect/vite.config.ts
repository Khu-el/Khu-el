import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE_PATH is only set by CI when building for a GitHub Pages subpath
// (e.g. "/deal-architect/"). Local dev and `npm run build` on their own
// still serve from "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
});
