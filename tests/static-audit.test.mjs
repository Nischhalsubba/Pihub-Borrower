import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
const sourceFiles = files(join(root, 'src')).filter((path) => /\.(tsx|ts|css)$/.test(path));
const source = sourceFiles.map((path) => `${path}\n${readFileSync(path, 'utf8')}`).join('\n');

const forbidden = [
  ['blocking alert placeholders', /window\.alert\s*\(/],
  ['dead hash links', /href=["']#["']/],
  ['unfinished TODO markers', /\bTODO\b/],
  ['unfinished FIXME markers', /\bFIXME\b/],
  ['cross-module login routes', /\/login\/(investor|advisory|admin)/]
];

for (const [label, pattern] of forbidden) {
  test(`source contains no ${label}`, () => assert.equal(pattern.test(source), false));
}

test('keyboard skip navigation is implemented outside normal content geometry', () => {
  const shell = readFileSync(join(root, 'src/components/Shell.tsx'), 'utf8');
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
  assert.match(shell, /className="skip-link" href="#main-content"/);
  assert.match(css, /\.skip-link\{position:fixed/);
  assert.match(css, /\.skip-link:focus\{opacity:1/);
});

test('eligibility rows use structured layout and do not opt into IBM Plex Mono', () => {
  const detail = readFileSync(join(root, 'src/pages/ProductDetailPage.tsx'), 'utf8');
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
  assert.match(detail, /requirements-table/);
  assert.match(detail, /requirement-row/);
  const requirementRules = css.match(/\.requirement[^}]*}/g)?.join('\n') ?? '';
  assert.doesNotMatch(requirementRules, /IBM Plex Mono|monospace/);
});

test('minimum operational control geometry remains touch safe', () => {
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
  assert.match(css, /\.button\{min-height:44px/);
  assert.match(css, /input,select,textarea\{width:100%;min-height:46px/);
});

test('cross-module integration is explicit and canonical rather than localStorage handoff magic', () => {
  const model = readFileSync(join(root, 'src/state/model.ts'), 'utf8');
  const core = readFileSync(join(root, 'src/state/core.ts'), 'utf8');
  assert.match(model, /interface IntegrationEvent/);
  assert.match(core, /status === 'submitted'/);
  assert.match(core, /application\.\$\{status\}/);
  assert.match(core, /document\.uploaded/);
  assert.match(core, /request\.responded/);
  assert.match(core, /terms\.\$\{decision\}/);
  assert.doesNotMatch(source, /localStorage\.(setItem|getItem)\([^\n]*(advisory|investor|admin)/i);
});

test('post-funding servicing and privacy routes are first-class Borrower destinations', () => {
  const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
  const shell = readFileSync(join(root, 'src/components/Shell.tsx'), 'utf8');
  assert.match(app, /path="\/servicing"/);
  assert.match(app, /path="\/privacy"/);
  assert.match(shell, /'\/servicing'/);
  assert.match(shell, /'\/privacy'/);
});

test('production runtime does not persist canonical business state in localStorage', () => {
  const store = readFileSync(join(root, 'src/state/store.tsx'), 'utf8');
  assert.match(store, /if \(mode === 'demo'\) localStorage\.setItem/);
  assert.doesNotMatch(store, /localStorage\.setItem\([^\n]*token/i);
});

test('production authentication uses an HttpOnly-session API boundary instead of cross-app tokens', () => {
  const api = readFileSync(join(root, 'src/services/platformApi.ts'), 'utf8');
  const auth = readFileSync(join(root, 'src/auth/AuthContext.tsx'), 'utf8');
  assert.match(api, /credentials\s*:\s*'include'/);
  assert.match(api, /\/api\/v1\/session/);
  assert.match(auth, /modules\.includes\('borrower'\)/);
  assert.doesNotMatch(source, /localStorage\.(setItem|getItem)\([^\n]*(token|jwt|session)/i);
});

test('finance workflows use bounded GSAP motion without decorative WebGL or continuous animation loops', () => {
  const pkg = readFileSync(join(root, 'package.json'), 'utf8');
  const tour = readFileSync(join(root, 'src/pages/OnboardingPage.tsx'), 'utf8');
  const nonTourSource = source.replace(tour, '');
  assert.match(pkg, /"gsap": "\^3\.13\.0"/i);
  assert.doesNotMatch(pkg, /"three"|"@react-three/i);
  assert.doesNotMatch(nonTourSource, /<canvas|WebGLRenderer|requestAnimationFrame\(/i);
  assert.doesNotMatch(tour, /<canvas|WebGLRenderer/i);
  assert.equal((tour.match(/requestAnimationFrame\(/g) ?? []).length, 1, 'The tour may schedule only one bounded measurement frame at a time');
  assert.match(tour, /cancelAnimationFrame\(frame\)/);
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
  assert.match(css, /prefers-reduced-motion/);
});

test('route pages use React lazy loading for initial-bundle discipline', () => {
  const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
  assert.match(app, /lazy\(\(\) => import\('\.\/pages\/ServicingPage'\)/);
  assert.match(app, /<Suspense fallback=/);
});


test('prepared backend grants Advisory and Investor deal-scoped access instead of global visibility', () => {
  const sql = readFileSync(join(root, 'supabase/migrations/0001_pihub_platform.sql'), 'utf8');
  assert.match(sql, /create table public\.application_access_grants/);
  assert.match(sql, /create or replace function public\.can_read_application/);
  assert.match(sql, /create policy application_read.*public\.can_read_application\(id\)/);
  assert.doesNotMatch(sql, /application_read.*has_platform_role\(array\['advisory','investor'/);
});

test('v0.5 product-aware and capital-management routes are first-class Borrower destinations', () => {
  const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
  const shell = readFileSync(join(root, 'src/components/Shell.tsx'), 'utf8');
  for (const route of ['/portfolio','/qualification','/capital','/connections','/data-room','/disclosures','/scenario-lab','/negotiation','/calendar','/payments','/esg','/complaints','/copilot']) {
    assert.match(app, new RegExp(`path="${route.replace('/','\\/')}"`));
    assert.match(shell, new RegExp(`'${route.replace('/','\\/')}'`));
  }
});

test('advanced Borrower capabilities have canonical state and action contracts instead of page-local fake state', () => {
  const model = readFileSync(join(root, 'src/state/advancedModel.ts'), 'utf8');
  const advanced = readFileSync(join(root, 'src/state/advanced.ts'), 'utf8');
  for (const concept of ['DrawRequest','InspectionRequest','DataConnection','DocumentIntelligenceResult','DisclosureGrant','FinancingScenario','SignatureEnvelope','PaymentInstruction','CovenantForecast','ExternalProfessional','ComplaintCase']) assert.match(model, new RegExp(`interface ${concept}`));
  for (const action of ['create_draw','request_inspection','connect_source','analyze_document','create_disclosure','save_scenario','create_signature_envelope','create_payment_instruction','save_covenant_forecast','invite_professional','create_complaint','copilot_ask']) assert.match(model, new RegExp(`type: '${action}'`));
  assert.match(advanced, /construction\.draw\.submitted/);
  assert.match(advanced, /disclosure\.consent\.granted/);
});

test('prepared v0.5 backend remains API-authoritative and deal scoped', () => {
  const sql = readFileSync(join(root, 'supabase/migrations/0002_borrower_v05_advanced_features.sql'), 'utf8');
  assert.match(sql, /create table if not exists public\.draw_requests/);
  assert.match(sql, /create table if not exists public\.disclosure_grants/);
  assert.match(sql, /create table if not exists public\.external_professionals/);
  assert.match(sql, /public\.can_read_application\(application_id\)/);
  assert.match(sql, /ordinary browser roles receive no INSERT\/UPDATE\/DELETE policies/);
  assert.match(sql, /token_secret_ref/);
  assert.match(sql, /Never return provider refresh\/access tokens to the Borrower browser/);
});

test('open-source capability gaps are integrated through explicit provider boundaries', () => {
  const doc = readFileSync(join(root, 'docs/OPEN_SOURCE_COMPONENTS.md'), 'utf8');
  for (const provider of ['Docling','Apache Fineract','Temporal','Documenso','OpenSign','FullCalendar','TanStack Table','Recharts','Papa Parse']) assert.match(doc, new RegExp(provider));
  assert.match(doc, /AGPL/);
  assert.match(doc, /Integrate through an HTTP\/provider boundary/);
});

test('v0.5 keeps connected-account and signature secrets outside browser state', () => {
  const advancedModel = readFileSync(join(root, 'src/state/advancedModel.ts'), 'utf8');
  const store = readFileSync(join(root, 'src/state/store.tsx'), 'utf8');
  assert.doesNotMatch(advancedModel, /(accessToken|refreshToken|clientSecret|privateKey)\s*:/i);
  assert.doesNotMatch(store, /localStorage\.setItem\([^\n]*(iban|token|secret|signature)/i);
});


test('submission UI and store enforce product-aware readiness instead of core sections alone', () => {
  const checklist = readFileSync(join(root, 'src/components/ApplicationChecklist.tsx'), 'utf8');
  const store = readFileSync(join(root, 'src/state/store.tsx'), 'utf8');
  const financing = readFileSync(join(root, 'src/pages/FinancingPage.tsx'), 'utf8');
  assert.match(checklist, /workflowReadiness/);
  assert.match(store, /workflowReadiness\(state, applicationId\)\.ready/);
  assert.match(financing, /submissionReady = completion === 100 && workflow\.ready/);
});

test('production financial-data connections use server authorization intents and never provider tokens in browser state', () => {
  const api = readFileSync(join(root, 'src/services/platformApi.ts'), 'utf8');
  const connections = readFileSync(join(root, 'src/pages/ConnectionsPage.tsx'), 'utf8');
  assert.match(api, /data-connections\/authorization-intent/);
  assert.match(connections, /createDataConnectionAuthorizationIntent/);
  assert.match(connections, /window\.location\.assign\(intent\.authorizationUrl\)/);
  assert.doesNotMatch(connections, /(clientSecret|refreshToken|accessToken)/i);
});

test('bulk document operations and governed export packages are first-class Borrower controls', () => {
  const documents = readFileSync(join(root, 'src/pages/DocumentsPage.tsx'), 'utf8');
  const dataRoom = readFileSync(join(root, 'src/pages/DataRoomPage.tsx'), 'utf8');
  const privacy = readFileSync(join(root, 'src/pages/PrivacyPage.tsx'), 'utf8');
  assert.match(documents, /multiple=\{!replaceId\}/);
  assert.match(dataRoom, /Analyze selected/);
  assert.match(dataRoom, /Export manifest/);
  assert.match(privacy, /Download JSON export/);
  assert.match(privacy, /exportPackages/);
});

test('open-source document intelligence and e-sign adapters keep provider secrets server-side', () => {
  const docling = readFileSync(join(root, 'supabase/functions/document-intelligence/index.ts'), 'utf8');
  const esign = readFileSync(join(root, 'supabase/functions/esign-envelope/index.ts'), 'utf8');
  assert.match(docling, /\/v1\/convert\/source\/async/);
  assert.match(docling, /DOCLING_SERVE_API_KEY/);
  assert.match(esign, /DOCUMENSO_API_TOKEN/);
  assert.match(esign, /\/envelope\/create/);
  assert.match(esign, /x-pihub-internal-key/);
  assert.doesNotMatch(source, /DOCUMENSO_API_TOKEN|DOCLING_SERVE_API_KEY/);
});

test('production Copilot is server-grounded and open-source inference secrets never enter browser code', () => {
  const page = readFileSync(join(root, 'src/pages/CopilotPage.tsx'), 'utf8');
  const api = readFileSync(join(root, 'src/services/platformApi.ts'), 'utf8');
  const fn = readFileSync(join(root, 'supabase/functions/borrower-copilot/index.ts'), 'utf8');
  assert.match(page, /askBorrowerCopilot/);
  assert.match(api, /\/api\/v1\/borrower\/copilot\/query/);
  assert.match(fn, /OLLAMA_BASE_URL/);
  assert.match(fn, /\/api\/chat/);
  assert.match(fn, /PIHUB_INTERNAL_FUNCTION_KEY/);
  assert.doesNotMatch(page, /OLLAMA_BASE_URL|OLLAMA_BEARER_TOKEN|\/api\/chat/);
});
