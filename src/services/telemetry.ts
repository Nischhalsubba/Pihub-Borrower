type TelemetryValue = string | number | boolean | null | undefined;

const BLOCKED_KEYS = /email|name|phone|address|description|message|note|password|token|document|file/i;

function scrub(properties: Record<string, TelemetryValue>): Record<string, string | number | boolean | null> {
  return Object.fromEntries(Object.entries(properties)
    .filter(([key, value]) => !BLOCKED_KEYS.test(key) && (['string', 'number', 'boolean'].includes(typeof value) || value === null))
    .map(([key, value]) => [key, value ?? null]));
}

export function trackUiEvent(name: string, properties: Record<string, TelemetryValue> = {}): void {
  if (navigator.doNotTrack === '1') return;
  const detail = { name, properties: scrub(properties), at: new Date().toISOString() };
  window.dispatchEvent(new CustomEvent('pihub:telemetry', { detail }));
  const endpoint = import.meta.env.VITE_PIHUB_TELEMETRY_URL;
  if (!endpoint) return;
  const body = JSON.stringify(detail);
  if (navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
  else void fetch(endpoint, { method: 'POST', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json' }, body });
}
