import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // base: '/', // O padrão é '/', adequado para deploy na raiz do domínio Railway.
});
