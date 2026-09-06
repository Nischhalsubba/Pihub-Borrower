import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function assertRuntimeConfiguration(runtime: string, apiBaseUrl: string): void {
  if (!['demo', 'api'].includes(runtime)) {
    throw new Error(`VITE_PIHUB_RUNTIME must be "demo" or "api"; received "${runtime}".`);
  }

  const normalizedApiUrl = apiBaseUrl.trim().replace(/\/$/, '');
  if (!normalizedApiUrl) return;

  let parsed: URL;
  try {
    parsed = new URL(normalizedApiUrl);
  } catch {
    throw new Error('VITE_PIHUB_API_BASE_URL must be an absolute URL or empty for the same-origin BFF.');
  }

  const hostname = parsed.hostname.toLowerCase();
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && loopback)) {
    throw new Error('VITE_PIHUB_API_BASE_URL must use HTTPS; localhost HTTP is allowed only for local development.');
  }
}

export default defineConfig(() => {
  // Hosted demos stay in demo mode unless API runtime is explicitly enabled.
  const runtime = String(process.env.VITE_PIHUB_RUNTIME ?? 'demo').trim().toLowerCase();
  const apiBaseUrl = String(process.env.VITE_PIHUB_API_BASE_URL ?? '').trim();
  assertRuntimeConfiguration(runtime, apiBaseUrl);

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_PIHUB_RUNTIME': JSON.stringify(runtime)
    },
    server: { port: 4173 },
    preview: { port: 4173 }
  };
});
