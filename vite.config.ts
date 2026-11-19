import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

// `npm run build`            -> dist/ (deploy ke hosting statis: Vercel, Netlify, GitHub Pages)
// `npm run build:standalone` -> standalone/index.html (satu file, bisa dibuka langsung tanpa server)
export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone';
  return {
    base: './',
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    plugins: [react(), ...(standalone ? [viteSingleFile()] : [])],
    build: {
      outDir: standalone ? 'standalone' : 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  };
});
