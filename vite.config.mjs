import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sharedPackageResolve } from './tooling/vite-shared-package-resolve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: sharedPackageResolve(import.meta.url),
  server: { fs: { allow: [here] } },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 650 },
  test: { globals: true, environment: 'jsdom', include: ['src/**/*.{test,spec}.{js,jsx}'] },
});
