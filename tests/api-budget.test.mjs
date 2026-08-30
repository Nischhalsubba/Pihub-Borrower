import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');

test('GET requests are coalesced and short-lived caches prevent duplicate startup reads', () => {
  const api = read('src/services/platformApi.ts');
  assert.match(api, /const\s+inflightReads\s*=\s*new Map/);
  assert.match(api, /SESSION_CACHE_TTL_MS\s*=\s*20_000/);
  assert.match(api, /BOOTSTRAP_CACHE_TTL_MS\s*=\s*5_000/);
  assert.match(api, /if\s*\(\s*inflight\s*\)\s*return\s+inflight\s+as\s+Promise<T>/);
  assert.match(api, /invalidatePlatformReadCache/);
});

test('session and login may hydrate Borrower state in the same request', () => {
  const api = read('src/services/platformApi.ts');
  const store = read('src/state/store.tsx');
  const doc = read('docs/API_REQUEST_BUDGET.md');
  assert.match(api, /interface\s+SessionResult[\s\S]*snapshot\?\s*:\s*BorrowerState/);
  assert.match(api, /getSession[\s\S]*if\s*\(\s*result\.snapshot\s*\)\s*primeBorrowerSnapshot\(result\.snapshot/);
  assert.match(api, /signIn[\s\S]*if\s*\(\s*result\.snapshot\s*\)\s*primeBorrowerSnapshot\(result\.snapshot/);
  assert.match(store, /if\s*\(\s*mode\s*===\s*'api'\s*&&\s*auth\.status\s*===\s*'authenticated'\s*\)\s*void\s+loadFromApi\(false\)/);
  assert.match(store, /const\s+reloadFromApi\s*=\s*useCallback\(\(\)\s*=>\s*loadFromApi\(true\)/);
  assert.match(doc, /Existing authenticated app load \| 1 request when session includes snapshot/);
});

test('safe duplicate commands are suppressed without deduping non-idempotent actions', () => {
  const api = read('src/services/platformApi.ts');
  assert.match(api, /COMMAND_DEDUPE_TTL_MS\s*=\s*5_000/);
  assert.match(api, /DEDUPE_SAFE_COMMANDS/);
  assert.match(api, /'application\.section\.update'/);
  assert.match(api, /'profile\.update'/);
  assert.doesNotMatch(api, /DEDUPE_SAFE_COMMANDS[\s\S]*'support\.request\.create'/);
  assert.doesNotMatch(api, /DEDUPE_SAFE_COMMANDS[\s\S]*'payment\.notice\.create'/);
});

test('accepted commands can return canonical state and legacy responses reconcile once per burst', () => {
  const api = read('src/services/platformApi.ts');
  const store = read('src/state/store.tsx');
  assert.match(api, /snapshot\?\s*:\s*BorrowerState/);
  assert.match(store, /COMMAND_RECONCILE_DELAY_MS\s*=\s*4_000/);
  assert.match(store, /scheduleReconciliation/);
  assert.match(store, /if\s*\(\s*result\.snapshot\s*\)/);
  assert.match(store, /loadFromApi\(true\)/);
  assert.doesNotMatch(store, /sendBorrowerCommand\([\s\S]{0,250}\)\.then\(async \(\) => \{\s*await reloadFromApi\(\)/);
});

test('API autosave uses a longer floor so pauses while typing do not become write storms', () => {
  const autosave = read('src/hooks/useAutosave.ts');
  assert.match(autosave, /API_AUTOSAVE_MIN_DELAY_MS\s*=\s*3_000/);
  assert.match(autosave, /runtimeMode\(\)\s*===\s*'api'/);
  assert.match(autosave, /Math\.max\(delay,\s*API_AUTOSAVE_MIN_DELAY_MS\)/);
});

test('telemetry is batched and duplicate events are compressed before transport', () => {
  const telemetry = read('src/services/telemetry.ts');
  assert.match(telemetry, /TELEMETRY_FLUSH_MS\s*=\s*15_000/);
  assert.match(telemetry, /TELEMETRY_MAX_BATCH\s*=\s*50/);
  assert.match(telemetry, /pendingBySignature/);
  assert.match(telemetry, /JSON\.stringify\(\{\s*events\s*\}\)/);
  assert.match(telemetry, /pagehide/);
  assert.match(telemetry, /visibilityState\s*===\s*'hidden'/);
});

test('completed malware scans do not call the external scanner again on retries', () => {
  const scan = read('supabase/functions/document-scan/index.ts');
  assert.match(scan, /malware_status,sha256/);
  assert.match(scan, /version\.malware_status\s*===\s*'clean'\s*\|\|\s*version\.malware_status\s*===\s*'blocked'/);
  assert.match(scan, /cached\s*:\s*true/);
});

test('request budget documentation forbids polling and per-keystroke API calls', () => {
  const doc = read('docs/API_REQUEST_BUDGET.md');
  assert.match(doc, /Background idle tab \| 0 polling requests/);
  assert.match(doc, /one API request per keystroke/);
  assert.match(doc, /reloading the entire Borrower state after every mutation/);
});
