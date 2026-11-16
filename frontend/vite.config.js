import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo, /api se redirige al backend local.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
