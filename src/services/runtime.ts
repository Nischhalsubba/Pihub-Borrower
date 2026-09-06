export type RuntimeMode = 'demo' | 'api';

function configuredRuntime(): string {
  return String(import.meta.env.VITE_PIHUB_RUNTIME ?? '').trim().toLowerCase();
}

export function runtimeMode(): RuntimeMode {
  const configured = configuredRuntime();
  if (!configured) return 'demo';
  if (configured === 'demo' || configured === 'api') return configured;
  throw new Error(`Unsupported PiHub runtime mode: ${configured}`);
}

function isLoopbackHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch {
    return false;
  }
}

export function apiBaseUrl(): string {
  const value = String(import.meta.env.VITE_PIHUB_API_BASE_URL ?? '').trim().replace(/\/$/, '');

  // Empty is valid for the same-origin production BFF (/api/v1/*).
  if (!value) return '';
  if (/^https:\/\//i.test(value) || isLoopbackHttpUrl(value)) return value;

  throw new Error('PiHub API base URL must use HTTPS; localhost HTTP is allowed only for local development.');
}

export function isApiRuntime(): boolean {
  return runtimeMode() === 'api';
}
