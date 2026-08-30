import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('platform projection keeps privileged data behind service-role-only RPCs', () => {
  const sql = read('supabase/migrations/0010_borrower_consumer_foundation.sql');
  assert.match(sql, /create table if not exists public\.application_approvals/i);
  assert.match(sql, /revoke all on function public\.pihub_borrower_integration_projection\(text,uuid\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.pihub_borrower_integration_projection\(text,uuid\) to service_role/i);
  assert.doesNotMatch(sql, /'internal_summary'/i);
  assert.doesNotMatch(sql, /'risk_rating'/i);
  assert.match(sql, /borrowerCompletable/);
  assert.match(sql, /work_item_requires_pihub_validation/);
});

test('browser integration never embeds service credentials or bearer-token storage', () => {
  const client = read('src/services/platformApi.ts');
  const context = read('src/platform/PlatformIntegrationContext.tsx');
  assert.doesNotMatch(client, /SERVICE_ROLE/);
  assert.doesNotMatch(context, /SERVICE_ROLE/);
  assert.doesNotMatch(client, /localStorage.*token|token.*localStorage/i);
  assert.match(client, /fetchBorrowerIntegrationProjection/);
});

test('borrower UI consumes safe cross-module projections', () => {
  const overview = read('src/pages/OverviewPage.tsx');
  const requests = read('src/pages/RequestsPage.tsx');
  const qualification = read('src/pages/QualificationPage.tsx');
  const financing = read('src/pages/FinancingPage.tsx');
  assert.match(overview, /PiHub financing timeline/);
  assert.match(requests, /PiHub Request Center/);
  assert.match(requests, /borrowerCompletable/);
  assert.match(qualification, /Compliance readiness/);
  assert.match(qualification, /Internal notes, provider evidence and risk reasoning are deliberately not exposed/);
  assert.match(financing, /Organization approvals/);
  assert.match(financing, /submissionReady/);
});

test('platform edge API verifies caller before service-role RPC delegation', () => {
  const edge = read('supabase/functions/platform-api/index.ts');
  assert.match(edge, /auth\.getUser\(token\)/);
  assert.match(edge, /caller_user_id: user\.id/);
  assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edge, /origin_not_allowed/);
  assert.doesNotMatch(edge, /access-control-allow-origin['"]?:\s*['"]\*['"]/i);
});
