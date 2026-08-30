import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  // Hosted demos stay in demo mode unless API runtime is explicitly enabled.
  const runtime = process.env.VITE_PIHUB_RUNTIME ?? 'demo';
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_PIHUB_RUNTIME': JSON.stringify(runtime)
    },
    server: { port: 4173 },
    preview: { port: 4173 }
  };
});
