import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev proxy for Google Generative Language API (Gemini) — API key is in query string.
      '/google-ai-api': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/google-ai-api/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'], // Keep this if needed for lucide-react
  },
  resolve: {
    alias: {
      // Ensure src alias matches your project structure
      src: path.resolve(__dirname, './src'),
    },
  },
});