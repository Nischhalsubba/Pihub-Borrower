import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');

test('GET requests are coalesced and short-lived caches prevent duplicate startup reads', () => {
  const api = read('src/services/platformApi.ts');
  assert.match(api, /const inflightReads = new Map/);
  assert.match(api, /SESSION_CACHE_TTL_MS = 20_000/);
  assert.match(api, /BOOTSTRAP_CACHE_TTL_MS = 5_000/);
  assert.match(api, /if \(inflight\) return inflight as Promise<T>/);
  assert.match(api, /invalidatePlatformReadCache/);
});

test('safe duplicate commands are suppressed without deduping non-idempotent actions', () => {
  const api = read('src/services/platformApi.ts');
  assert.match(api, /COMMAND_DEDUPE_TTL_MS = 5_000/);
  assert.match(api, /DEDUPE_SAFE_COMMANDS/);
  assert.match(api, /'application\.section\.update'/);
  assert.match(api, /'profile\.update'/);
  assert.doesNotMatch(api, /DEDUPE_SAFE_COMMANDS[\s\S]*'support\.request\.create'/);
  assert.doesNotMatch(api, /DEDUPE_SAFE_COMMANDS[\s\S]*'payment\.notice\.create'/);
});

test('accepted commands can return canonical state and legacy responses reconcile once per burst', () => {
  const api = read('src/services/platformApi.ts');
  const store = read('src/state/store.tsx');
  assert.match(api, /snapshot\?: BorrowerState/);
  assert.match(store, /COMMAND_RECONCILE_DELAY_MS = 4_000/);
  assert.match(store, /scheduleReconciliation/);
  assert.match(store, /if \(result\.snapshot\)/);
  assert.doesNotMatch(store, /sendBorrowerCommand\([\s\S]{0,250}\)\.then\(async \(\) => \{\s*await reloadFromApi\(\)/);
});

test('API autosave uses a longer floor so pauses while typing do not become write storms', () => {
  const autosave = read('src/hooks/useAutosave.ts');
  assert.match(autosave, /API_AUTOSAVE_MIN_DELAY_MS = 3_000/);
  assert.match(autosave, /runtimeMode\(\) === 'api'/);
  assert.match(autosave, /Math\.max\(delay, API_AUTOSAVE_MIN_DELAY_MS\)/);
});

test('telemetry is batched and duplicate events are compressed before transport', () => {
  const telemetry = read('src/services/telemetry.ts');
  assert.match(telemetry, /TELEMETRY_FLUSH_MS = 15_000/);
  assert.match(telemetry, /TELEMETRY_MAX_BATCH = 50/);
  assert.match(telemetry, /pendingBySignature/);
  assert.match(telemetry, /JSON\.stringify\(\{ events \}\)/);
  assert.match(telemetry, /pagehide/);
  assert.match(telemetry, /visibilityState === 'hidden'/);
});

test('request budget documentation forbids polling and per-keystroke API calls', () => {
  const doc = read('docs/API_REQUEST_BUDGET.md');
  assert.match(doc, /Background idle tab \| 0 polling requests/);
  assert.match(doc, /one API request per keystroke/);
  assert.match(doc, /reloading the entire Borrower state after every mutation/);
});
