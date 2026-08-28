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
const main = read('src/main.tsx');

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

test('sidebar uses one canonical active-state contract and route semantics', () => {
  assert.match(shell, /ap-nav-item/);
  assert.ok(shell.includes("end={href==='/' || href==='/applications'}"));
  assert.doesNotMatch(shell, /sidebar-context/);
  assert.match(shellCss, /translateX\(3px\)/);
  assert.ok(shellCss.includes('left:-12px;top:11px;width:3px;height:22px'));
  assert.match(shellCss, /var\(--pihub-sidebar-raised\)/);
});

test('Borrower login uses the unified PiHub split access composition without cross-module browser routes', () => {
  for (const className of ['auth-world', 'auth-form-panel', 'auth-card', 'pihub-access-tabs', 'auth-visual', 'auth-proof']) assert.ok(login.includes(className));
  for (const moduleName of ['Investor', 'Borrower', 'Advisory', 'Admin']) assert.ok(login.includes(moduleName));
  assert.doesNotMatch(login, /\/login\/(investor|advisory|admin)/);
  assert.ok(authCss.includes('grid-template-columns:minmax(520px,46.5%)'));
});

test('PiHub motion policy is reduced-motion safe and keeps advanced visuals out of operational finance routes', () => {
  assert.match(motion, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(authCss, /canvas|WebGLRenderer|requestAnimationFrame/);
  assert.doesNotMatch(shellCss, /canvas|WebGLRenderer|requestAnimationFrame/);
});
