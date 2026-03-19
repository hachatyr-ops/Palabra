import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Это критически важно для работы Gemini API
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  }
});