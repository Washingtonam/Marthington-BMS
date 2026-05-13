// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Move recharts and other heavy libs to a separate vendor file
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'recharts';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600, // Slightly increase limit to suppress warning
  },
});