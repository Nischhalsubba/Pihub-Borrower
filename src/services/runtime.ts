export type RuntimeMode = 'demo' | 'api';

export function runtimeMode(): RuntimeMode {
  return import.meta.env.VITE_PIHUB_RUNTIME === 'api' ? 'api' : 'demo';
}

export function apiBaseUrl(): string {
  return (import.meta.env.VITE_PIHUB_API_BASE_URL ?? '').replace(/\/$/, '');
}

export function isApiRuntime(): boolean {
  // Empty base URL is intentional for the production same-origin BFF.
  return runtimeMode() === 'api';
}
