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

test('api mode keeps privileged mutations server-authoritative', () => {
  const store = read('src/state/store.tsx');
  assert.match(store, /const updateDemo = useCallback/);
  for (const command of [
    'application.status.request',
    'application.withdraw',
    'organization.member.invite',
    'organization.member.update',
    'terms.decide',
    'closing.item.set',
    'servicing.request.create',
    'servicing.request.withdraw',
    'reporting.submit',
    'payment.notice.create',
    'privacy.request.create'
  ]) {
    const commandIndex = store.indexOf(`dispatchCommand('${command}'`);
    assert.notEqual(commandIndex, -1, `${command} must remain wired to the server command API`);
    const statementStart = store.lastIndexOf('\n    ', commandIndex);
    const statement = store.slice(statementStart, commandIndex);
    assert.match(statement, /updateDemo\(/, `${command} must not optimistically mutate authoritative API state`);
  }
});

test('borrower UI consumes safe cross-module projections without regressing funded servicing', () => {
  const overview = read('src/pages/OverviewPage.tsx');
  const requests = read('src/pages/RequestsPage.tsx');
  const qualification = read('src/pages/QualificationPage.tsx');
  const financing = read('src/pages/FinancingPage.tsx');
  assert.match(overview, /PiHub financing timeline/);
  assert.match(overview, /Borrower \/ Funded facility/);
  assert.match(overview, /Open loan servicing/);
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
  assert.match(edge, /caller_user_id\s*:\s*user\.id/);
  assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edge, /origin_not_allowed/);
  assert.doesNotMatch(edge, /access-control-allow-origin['"]?:\s*['"]\*['"]/i);
});
