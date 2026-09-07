import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('e-sign webhook is externally reachable but verifies Documenso itself', async () => {
  const webhook = await read('supabase/functions/esign-webhook/index.ts');
  const config = await read('supabase/config.toml');

  assert.ok(config.includes('[functions.esign-webhook]'));
  assert.ok(config.includes('verify_jwt = false'));
  assert.ok(webhook.includes("request.headers.get('x-documenso-secret')"));
  assert.ok(webhook.includes('secretsMatch(suppliedSecret, webhookSecret)'));
  assert.ok(webhook.includes('MAX_WEBHOOK_BYTES'));
  assert.ok(webhook.includes("Deno.env.get('SUPABASE_SECRET_KEY')"));
  assert.ok(webhook.includes("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')"));
  assert.ok(!webhook.includes('console.log('));
  assert.ok(!webhook.includes('console.error('));
});

test('e-sign webhook hashes payloads and delegates idempotent state to PostgreSQL', async () => {
  const webhook = await read('supabase/functions/esign-webhook/index.ts');
  const migration = await read('supabase/migrations/0016_esign_integrity.sql');

  assert.ok(webhook.includes('const payloadHash = await sha256(rawBody)'));
  assert.ok(webhook.includes("service.rpc('pihub_apply_signature_webhook'"));
  assert.ok(migration.includes('provider_event_id text not null unique'));
  assert.ok(migration.includes('for update;'));
  assert.ok(migration.includes('signature_events_immutable'));
  assert.ok(migration.includes('before update or delete on public.signature_events'));
  assert.ok(migration.includes("'duplicate', true"));
});

test('new e-sign envelopes capture verified source document hashes', async () => {
  const migration = await read('supabase/migrations/0016_esign_integrity.sql');
  const scanner = await read('supabase/functions/document-scan/index.ts');
  const platform = await read('supabase/functions/platform-api/index.ts');

  assert.ok(scanner.includes("update({malware_status:'clean',sha256:hash})"));
  assert.ok(platform.includes("version.malware_status!=='clean'"));
  assert.ok(migration.includes('source_document_hashes jsonb'));
  assert.ok(migration.includes("v.malware_status = 'clean'"));
  assert.ok(migration.includes("signature_document_hash_missing_or_unverified"));
  assert.ok(migration.includes('signature_envelopes_capture_hashes'));
});

test('provider events can advance but not silently rewrite terminal envelope states', async () => {
  const migration = await read('supabase/migrations/0016_esign_integrity.sql');

  assert.ok(migration.includes("target.status not in ('completed','voided','expired')"));
  assert.ok(migration.includes("when 'DOCUMENT_COMPLETED' then 'completed'"));
  assert.ok(migration.includes("when 'DOCUMENT_REJECTED' then 'voided'"));
  assert.ok(migration.includes("when 'DOCUMENT_CANCELLED' then 'voided'"));
  assert.ok(migration.includes("when 'RECIPIENT_EXPIRED' then 'expired'"));
  assert.ok(migration.includes("provider_expires_at"));
  assert.ok(migration.includes("completed_at"));
});
