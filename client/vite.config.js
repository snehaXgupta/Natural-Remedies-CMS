import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API is proxied in development so the session cookie is same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      'landowner-dentist-capped.ngrok-free.dev',
      '.ngrok-free.dev',
      '.ngrok.io',
      'localhost',
      '127.0.0.1',
    ],
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false },
      '/externalsource1': { target: 'http://127.0.0.1:4000', changeOrigin: false },
    },
  },
});
