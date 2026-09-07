type TelemetryValue = string | number | boolean | null | undefined;

type TelemetryEvent = {
  name: string;
  properties: Record<string, string | number | boolean | null>;
  at: string;
  count: number;
};

const SAFE_PROPERTY_KEYS = new Set([
  'action',
  'component',
  'count',
  'durationBucket',
  'errorType',
  'feature',
  'locale',
  'mode',
  'result',
  'route',
  'section',
  'source',
  'state',
  'status',
  'step'
]);
const SAFE_EVENT_NAME = /^[a-z][a-z0-9_]{0,79}$/;
const SENSITIVE_STRING = /@|https?:|\b(?:\d[ -]?){6,}\b|\.(?:pdf|docx?|xlsx?|csv|png|jpe?g|webp)\b|bearer\s|eyj[a-z0-9_-]*\.|[a-f0-9]{24,}/i;
const TELEMETRY_FLUSH_MS = 15_000;
const TELEMETRY_MAX_BATCH = 50;
const pendingEvents: TelemetryEvent[] = [];
const pendingBySignature = new Map<string, TelemetryEvent>();
let flushTimer: number | undefined;
let lifecycleInstalled = false;

function safeString(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized || normalized.length > 80 || SENSITIVE_STRING.test(normalized)) return undefined;
  return normalized;
}

export function scrubTelemetryProperties(
  properties: Record<string, TelemetryValue>
): Record<string, string | number | boolean | null> {
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!SAFE_PROPERTY_KEYS.has(key)) continue;
    if (value === null) {
      clean[key] = null;
      continue;
    }
    if (typeof value === 'boolean') {
      clean[key] = value;
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      clean[key] = value;
      continue;
    }
    if (typeof value === 'string') {
      const safe = safeString(value);
      if (safe !== undefined) clean[key] = safe;
    }
  }
  return clean;
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
  if (navigator.doNotTrack === '1' || !SAFE_EVENT_NAME.test(name)) return;
  const clean = scrubTelemetryProperties(properties);
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
