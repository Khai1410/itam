import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Avoid colliding with the app's own "/assets" route (Vite defaults to
    // outputting bundles under dist/assets, which nginx would then match
    // before falling through to the SPA's index.html).
    assetsDir: 'static',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
