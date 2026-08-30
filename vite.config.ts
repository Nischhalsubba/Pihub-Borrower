import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const runtime = process.env.VITE_PIHUB_RUNTIME ?? (process.env.VERCEL === '1' ? 'api' : 'demo');
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_PIHUB_RUNTIME': JSON.stringify(runtime)
    },
    server: { port: 4173 },
    preview: { port: 4173 }
  };
});
