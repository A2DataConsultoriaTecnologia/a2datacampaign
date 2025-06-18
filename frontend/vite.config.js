import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Se precisar de proxy para o backend em dev (opcional):
    // proxy: {
    //   '/api': 'http://localhost:3001'
    // }
  },
  // Se o front e back estiverem em origens diferentes, configure CORS no backend.
});
