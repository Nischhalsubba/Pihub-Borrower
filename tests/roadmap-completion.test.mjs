import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');

test('production Vercel uses the same-origin authenticated PiHub BFF', () => {
  const runtime = read('src/services/runtime.ts');
  const vite = read('vite.config.ts');
  const vercel = read('vercel.json');
  const bff = read('api/platform.ts');
  assert.match(runtime, /Empty base URL is intentional/);
  assert.match(vite, /process\.env\.VERCEL === '1' \? 'api' : 'demo'/);
  assert.match(vercel, /\/api\/v1\/:path\*/);
  assert.match(bff, /__Host-pihub_at/);
  assert.match(bff, /HttpOnly; Secure; SameSite=Lax/);
  assert.match(bff, /VERCEL_OIDC_TOKEN/);
  assert.match(bff, /csrf_rejected/);
  assert.doesNotMatch(bff, /SUPABASE_SERVICE_ROLE_KEY/);
});

test('browser workspace synchronization uses revisions and bounded patches', () => {
  const api = read('src/services/platformApi.ts');
  const sql = read('supabase/migrations/0013_roadmap_completion.sql');
  assert.match(api, /sinceRevision=\$\{canonicalRevision\}/);
  assert.match(api, /envelope\.patch/);
  assert.match(sql, /top_level_json_delta/);
  assert.match(sql, /'patch',merged_patch/);
  assert.match(sql, /delta_count between 1 and 50/);
});

test('module consumers are deal scoped and domain consequences are automatic', () => {
  const sql = read('supabase/migrations/0013_roadmap_completion.sql');
  assert.match(sql, /application_access_grants/);
  assert.match(sql, /application_organization_access_grants/);
  assert.match(sql, /can_consume_module_event/);
  assert.match(sql, /advisory\.due_diligence\.updated/);
  assert.match(sql, /admin\.compliance\.updated/);
  assert.match(sql, /investor\.commitment\.updated/);
  assert.match(sql, /investor\.decision\.updated/);
  assert.doesNotMatch(sql, /internal_summary.*safe_payload|evidence.*safe_payload|rationale.*safe_payload/);
});

test('long forms have progress, validation summary, dirty-state guard and sticky save state', () => {
  const workflow = read('src/components/FormWorkflow.tsx');
  for (const page of ['CompanyPage.tsx','ProjectPage.tsx','FinancialsPage.tsx']) {
    const source = read(`src/pages/${page}`);
    assert.match(source, /FormWorkflowSummary/);
    assert.match(source, /StickyFormActions/);
    assert.match(source, /useFormDirty/);
  }
  assert.match(workflow, /beforeunload/);
  assert.match(workflow, /validation-summary/);
  assert.match(workflow, /scrollIntoView/);
});

test('application contextual navigation keeps frequent destinations visible and lower-frequency tools under More', () => {
  const shell = read('src/components/Shell.tsx');
  assert.match(shell, /APPLICATION_MORE_ROUTES/);
  for (const route of ['/applications/new','/connections','/data-room','/messages','/activity','/versions']) assert.match(shell, new RegExp(route.replaceAll('/','\\/')));
  assert.match(shell, /workspace-context-more/);
  assert.match(shell, />More</);
});

test('source-controlled platform API retains Vercel identity trust and permission-minimized module inboxes', () => {
  const fn = read('supabase/functions/platform-api/index.ts');
  assert.match(fn, /createRemoteJWKSet/);
  assert.match(fn, /x-pihub-bff-oidc/);
  assert.match(fn, /pihub_module_inbox/);
  assert.match(fn, /pihub_ack_module_event/);
  assert.match(fn, /pihub_borrower_commit_workspace_v2/);
});
