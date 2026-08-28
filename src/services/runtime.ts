export type RuntimeMode = 'demo' | 'api';

export function runtimeMode(): RuntimeMode {
  return import.meta.env.VITE_PIHUB_RUNTIME === 'api' ? 'api' : 'demo';
}

export function apiBaseUrl(): string {
  return (import.meta.env.VITE_PIHUB_API_BASE_URL ?? '').replace(/\/$/, '');
}

export function isApiRuntime(): boolean {
  return runtimeMode() === 'api' && Boolean(apiBaseUrl());
}
