import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Company Vault reuse links canonical documents instead of copying records', () => {
  const sql = read('supabase/migrations/0011_company_vault_application_reuse.sql');
  assert.match(sql, /create table if not exists public\.application_document_links/i);
  assert.match(sql, /unique \(application_id, document_id\)/i);
  assert.match(sql, /source_document\.status::text <> 'accepted'/);
  assert.match(sql, /latest_malware_status is distinct from 'clean'/);
  assert.match(sql, /document\.vault_reused/);
  assert.doesNotMatch(sql, /insert into public\.documents/i);
  assert.doesNotMatch(sql, /insert into public\.document_versions/i);
});

test('Vault reuse mutation is service-role-only and organization scoped', () => {
  const sql = read('supabase/migrations/0011_company_vault_application_reuse.sql');
  assert.match(sql, /revoke all on function public\.pihub_borrower_reuse_vault_item\(text,text,uuid\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.pihub_borrower_reuse_vault_item\(text,text,uuid\) to service_role/i);
  assert.match(sql, /v\.organization_id = target_org/);
  assert.match(sql, /source_app\.organization_id = target_org/);
});

test('Data Room offers explicit reusable-document linking', () => {
  const page = read('src/pages/DataRoomPage.tsx');
  const context = read('src/platform/PlatformIntegrationContext.tsx');
  const api = read('src/services/platformVaultApi.ts');
  assert.match(page, /Reuse in application/);
  assert.match(page, /Used in this application/);
  assert.match(context, /reuseVaultItem/);
  assert.match(api, /credentials: 'include'/);
  assert.doesNotMatch(api, /localStorage/i);
});

test('platform-api delegates vault reuse using the verified caller id', () => {
  const edge = read('supabase/functions/platform-api/index.ts');
  assert.match(edge, /\/borrower\\\/vault/);
  assert.match(edge, /pihub_borrower_reuse_vault_item/);
  assert.match(edge, /caller_user_id: user\.id/);
});
