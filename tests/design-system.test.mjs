import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');
const system = read('packages/ui/src/pihub-system.css');
const shellCss = read('packages/ui/src/pihub-shell.css');
const authCss = read('packages/ui/src/pihub-auth.css');
const motion = read('packages/ui/src/pihub-motion.css');
const shell = read('src/components/Shell.tsx');
const login = read('src/pages/LoginPage.tsx');
const productMotion = read('src/components/ProductRouteMotion.tsx');
const app = read('src/App.tsx');
const main = read('src/main.tsx');
const pkg = read('package.json');

test('Borrower consumes the canonical PiHub design-system layers after legacy styles', () => {
  const legacy = main.indexOf("import './styles.css'");
  const canonical = main.indexOf("import '../packages/ui/src/pihub-system.css'");
  assert.ok(legacy >= 0 && canonical > legacy);
  for (const layer of ['pihub-system.css', 'pihub-shell.css', 'pihub-auth.css', 'pihub-motion.css']) assert.ok(main.includes(layer));
});

test('PiHub shell tokens remain anchored to the Investor product contract', () => {
  for (const rule of [
    '--pihub-topbar: 72px',
    '--pihub-sidebar-width: 232px',
    '--pihub-control: 44px',
    '--pihub-sidebar: #0b1220',
    '--pihub-sidebar-raised: #111a2b',
    '--pihub-nav-marker: #5b8cff',
    '--pihub-nav-icon-active: #7da2ff',
    '--pihub-motion-standard: 180ms'
  ]) assert.ok(system.includes(rule), `Missing canonical token: ${rule}`);
});

test('PiHub spacing uses one semantic scale for page, section, grid and card geometry', () => {
  for (const rule of [
    '--pihub-space-8: 64px',
    '--pihub-section-gap: var(--pihub-space-5)',
    '--pihub-grid-gap: var(--pihub-space-4)',
    '--pihub-card-padding: var(--pihub-space-5)',
    '--pihub-layout-inline: clamp(var(--pihub-space-5), 2.5vw, var(--pihub-space-7))'
  ]) assert.ok(system.includes(rule), `Missing spacing contract: ${rule}`);
  assert.match(shellCss, /padding:var\(--pihub-space-6\) var\(--pihub-layout-inline\) var\(--pihub-space-8\)/);
  assert.match(system, /\.route-stage\{[^}]*gap:var\(--pihub-section-gap\)/);
  assert.match(system, /\.card\{[^}]*padding:var\(--pihub-card-padding\)/);
});

test('sidebar uses one canonical active-state contract and route semantics', () => {
  assert.match(shell, /ap-nav-item/);
  assert.match(shell, /section\.routes\.some\(\s*\(?route\)?\s*=>\s*routeMatches\(location\.pathname,\s*route\)\s*\)/);
  assert.match(shell, /aria-current=\{isActive\s*\?\s*'page'\s*:\s*undefined\}/);
  assert.doesNotMatch(shell, /sidebar-context/);
  assert.match(shellCss, /translateX\(3px\)/);
  assert.ok(shellCss.includes('left:-12px;top:11px;width:3px;height:22px'));
  assert.match(shellCss, /var\(--pihub-sidebar-raised\)/);
  assert.match(shellCss, /\.pihub-sidebar-nav\{[^}]*align-content:start/);
  assert.match(shellCss, /\.pihub-sidebar-nav \.nav-section\{[^}]*grid-auto-rows:max-content/);
});

test('sidebar information architecture is consolidated into eight borrower goals with contextual workflow navigation', () => {
  for (const key of ['overview', 'financingWorkspace', 'applicationsWorkspace', 'executionWorkspace', 'servicingWorkspace', 'organizationWorkspace', 'copilot', 'help']) {
    assert.match(shell, new RegExp(`key\\s*:\\s*['"]${key}['"]`), `Missing primary borrower goal: ${key}`);
  }
  assert.match(shell, /const\s+primaryNav\s*:\s*readonly\s+PrimaryNavItem\[\]\s*=\s*\[/);
  assert.match(shell, /workspace-context-nav/);
  assert.match(shell, /sectionNavigationHint/);
  assert.match(shellCss, /\.workspace-context-shell/);
  assert.match(shellCss, /\.workspace-context-link\.active/);
  assert.match(shellCss, /overflow-x:auto/);
  for (const route of ['/products', '/qualification', '/applications', '/application', '/documents', '/requests', '/scenario-lab', '/negotiation', '/servicing', '/payments', '/team', '/privacy']) assert.ok(shell.includes(`'${route}'`), `Merged navigation lost route ${route}`);
});

test('Borrower login is module-scoped and exposes no Investor, Advisory or Admin selector', () => {
  for (const className of ['auth-world', 'auth-form-panel', 'auth-card', 'auth-visual', 'auth-proof']) assert.ok(login.includes(className));
  assert.match(login, /PiHub Borrower/);
  assert.match(login, /BORROWER ACCESS/);
  assert.doesNotMatch(login, /Investor|Advisory|Admin|pihub-access-tabs|accessApplications/);
  assert.doesNotMatch(authCss, /pihub-access-tabs/);
  assert.doesNotMatch(login, /\/login\/(investor|advisory|admin)/);
  assert.ok(authCss.includes('grid-template-columns:minmax(520px,46.5%)'));
});

test('GSAP provides bounded route and login motion with reduced-motion cleanup', () => {
  assert.match(pkg, /"gsap": "\^3\.13\.0"/);
  assert.match(productMotion, /from 'gsap'/);
  assert.match(login, /from 'gsap'/);
  assert.match(productMotion, /gsap\.matchMedia\(\)/);
  assert.match(productMotion, /gsap\.context\(/);
  assert.match(login, /gsap\.matchMedia\(\)/);
  assert.match(login, /gsap\.context\(/);
  assert.match(app, /<ProductRouteMotion routeKey=\{location\.pathname\}>/);
  assert.match(motion, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(productMotion, /opacity|autoAlpha/);
  assert.doesNotMatch(login, /autoAlpha/);
  assert.doesNotMatch(authCss, /pihub-auth-card-in|pihub-auth-copy-in|@keyframes/);
});

test('advanced visuals remain out of operational finance rendering', () => {
  assert.doesNotMatch(authCss, /canvas|WebGLRenderer|requestAnimationFrame/);
  assert.doesNotMatch(shellCss, /canvas|WebGLRenderer|requestAnimationFrame/);
});
