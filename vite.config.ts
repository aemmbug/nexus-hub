import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'genai-vendor': ['@google/genai'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});