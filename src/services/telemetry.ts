type TelemetryValue = string | number | boolean | null | undefined;

type TelemetryEvent = {
  name: string;
  properties: Record<string, string | number | boolean | null>;
  at: string;
  count: number;
};

const BLOCKED_KEYS = /email|name|phone|address|description|message|note|password|token|document|file/i;
const TELEMETRY_FLUSH_MS = 15_000;
const TELEMETRY_MAX_BATCH = 50;
const pendingEvents: TelemetryEvent[] = [];
const pendingBySignature = new Map<string, TelemetryEvent>();
let flushTimer: number | undefined;
let lifecycleInstalled = false;

function scrub(properties: Record<string, TelemetryValue>): Record<string, string | number | boolean | null> {
  return Object.fromEntries(Object.entries(properties)
    .filter(([key, value]) => !BLOCKED_KEYS.test(key) && (['string', 'number', 'boolean'].includes(typeof value) || value === null))
    .map(([key, value]) => [key, value ?? null]));
}

function signature(name: string, properties: Record<string, string | number | boolean | null>): string {
  return `${name}:${JSON.stringify(Object.entries(properties).sort(([left], [right]) => left.localeCompare(right)))}`;
}

function sendBatch(events: TelemetryEvent[]): void {
  const endpoint = import.meta.env.VITE_PIHUB_TELEMETRY_URL;
  if (!endpoint || !events.length) return;
  const body = JSON.stringify({ events });
  if (navigator.sendBeacon && navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))) return;
  void fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

export function flushTelemetry(): void {
  if (flushTimer !== undefined) {
    window.clearTimeout(flushTimer);
    flushTimer = undefined;
  }
  if (!pendingEvents.length) return;
  const batch = pendingEvents.splice(0, pendingEvents.length);
  pendingBySignature.clear();
  sendBatch(batch);
}

function ensureLifecycleHooks(): void {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  window.addEventListener('pagehide', flushTelemetry);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushTelemetry();
  });
}

function scheduleFlush(): void {
  if (flushTimer !== undefined) return;
  flushTimer = window.setTimeout(flushTelemetry, TELEMETRY_FLUSH_MS);
}

export function trackUiEvent(name: string, properties: Record<string, TelemetryValue> = {}): void {
  if (navigator.doNotTrack === '1') return;
  const clean = scrub(properties);
  const detail = { name, properties: clean, at: new Date().toISOString() };
  window.dispatchEvent(new CustomEvent('pihub:telemetry', { detail }));

  if (!import.meta.env.VITE_PIHUB_TELEMETRY_URL) return;
  ensureLifecycleHooks();
  const key = signature(name, clean);
  const duplicate = pendingBySignature.get(key);
  if (duplicate) {
    duplicate.count += 1;
    duplicate.at = detail.at;
  } else {
    const event: TelemetryEvent = { ...detail, count: 1 };
    pendingEvents.push(event);
    pendingBySignature.set(key, event);
  }

  if (pendingEvents.length >= TELEMETRY_MAX_BATCH) flushTelemetry();
  else scheduleFlush();
}
