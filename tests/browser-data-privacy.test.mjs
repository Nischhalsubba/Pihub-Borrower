import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const store = readFileSync(new URL('../src/state/store.tsx', import.meta.url), 'utf8');
const documentStore = readFileSync(new URL('../src/state/indexedDb.ts', import.meta.url), 'utf8');
const localHelper = readFileSync(new URL('../src/local-state.js', import.meta.url), 'utf8');
const telemetry = readFileSync(new URL('../src/services/telemetry.ts', import.meta.url), 'utf8');

test('borrower state and documents are not persisted in browser storage', () => {
  for (const [name, source] of [
    ['store.tsx', store],
    ['indexedDb.ts', documentStore],
    ['local-state.js', localHelper]
  ]) {
    assert.doesNotMatch(source, /\blocalStorage\b/, `${name} must not use localStorage`);
    assert.doesNotMatch(source, /\bsessionStorage\b/, `${name} must not use sessionStorage`);
    assert.doesNotMatch(source, /\bindexedDB\b|\bIDBDatabase\b/, `${name} must not use IndexedDB`);
  }

  assert.doesNotMatch(store, /pihub\.borrower\.v[0-9]/);
  assert.doesNotMatch(documentStore, /pihub-borrower-documents/);
  assert.match(store, /Session only · cleared on refresh/);
  assert.match(documentStore, /const documentBlobs = new Map<string, Blob>\(\)/);
});

test('telemetry is an explicit operational-metadata allowlist', () => {
  assert.match(telemetry, /const SAFE_PROPERTY_KEYS = new Set\(\[/);
  assert.doesNotMatch(telemetry, /const BLOCKED_KEYS/);
  assert.match(telemetry, /scrubTelemetryProperties/);
  assert.match(telemetry, /SENSITIVE_STRING/);
  assert.match(telemetry, /SAFE_EVENT_NAME/);

  const safeSet = telemetry.match(/const SAFE_PROPERTY_KEYS = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? '';
  for (const key of [
    'email',
    'name',
    'phone',
    'address',
    'document',
    'file',
    'account',
    'bank',
    'amount',
    'application',
    'payload',
    'token',
    'message',
    'note'
  ]) {
    assert.doesNotMatch(safeSet, new RegExp(`['\"]${key}['\"]`, 'i'), `${key} must not be telemetry-safe`);
  }

  for (const key of ['errorType', 'route', 'source', 'status']) {
    assert.match(safeSet, new RegExp(`['\"]${key}['\"]`), `${key} should remain available for operations`);
  }
});
