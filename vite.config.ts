import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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