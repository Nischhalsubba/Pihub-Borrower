import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');
const main = read('src/main.tsx');
const app = read('src/App.tsx');
const audit = read('packages/ui/src/pihub-audit.css');
const onboardingCss = read('packages/ui/src/pihub-onboarding.css');
const onboardingPage = read('src/pages/OnboardingPage.tsx');
const onboardingGate = read('src/components/OnboardingGate.tsx');
const onboardingState = read('src/onboarding.ts');
const overview = read('src/pages/OverviewPage.tsx');
const help = read('src/pages/HelpPage.tsx');
const scenario = read('src/pages/ScenarioLabPage.tsx');
const capital = read('src/pages/CapitalPage.tsx');
const portfolio = read('src/pages/PortfolioPage.tsx');
const servicing = read('src/pages/ServicingPage.tsx');

const count = (source, token) => source.split(token).length - 1;

test('whole-app audit layer loads after the canonical PiHub and onboarding layers', () => {
  const motion = main.indexOf('pihub-motion.css');
  const onboarding = main.indexOf('pihub-onboarding.css');
  const audited = main.indexOf('pihub-audit.css');
  assert.ok(motion >= 0 && onboarding > motion && audited > onboarding, 'pihub-audit.css must remain the final PiHub CSS layer');
  assert.match(audit, /\.workspace-context-shell,[\s\S]*\.sync-warning[\s\S]*max-width: var\(--pihub-content-max\)/);
  assert.match(audit, /\.route-stage \{[\s\S]*animation: none/);
  assert.match(audit, /\.modal \{[\s\S]*max-height: calc\(100dvh - 40px\)[\s\S]*overflow: auto/);
});

test('overview financing timeline uses a readable scoped typography hierarchy', () => {
  assert.match(overview, /className="overview-timeline-card"/);
  assert.match(onboardingCss, /\.overview-timeline-card \.card-head h2 \{[\s\S]*font-size: 16px/);
  assert.match(onboardingCss, /\.overview-timeline-card \.platform-timeline \.stage-row strong \{[\s\S]*font-size: 12\.5px/);
  assert.match(onboardingCss, /\.overview-timeline-card \.platform-timeline \.stage-row small \{[\s\S]*font-size: 11px/);
  assert.match(onboardingCss, /\.overview-timeline-card \.platform-note,[\s\S]*font-size: 11\.5px/);
});

test('first-login onboarding is a persistent cross-route spotlight overlay', () => {
  assert.match(app, /<OnboardingGate\/>/);
  assert.doesNotMatch(overview, /OnboardingPage/);
  assert.match(onboardingGate, /hasCompletedBorrowerOnboarding\(auth\.user\?\.id\)/);
  assert.match(onboardingGate, /markBorrowerOnboardingComplete\(auth\.user\?\.id\)/);
  assert.match(onboardingGate, /get\('tour'\) === '1'/);
  assert.match(onboardingState, /ONBOARDING_VERSION = 'v2'/);
  assert.match(onboardingState, /pihub\.borrower\.onboarding\.\$\{ONBOARDING_VERSION\}/);
  assert.match(onboardingState, /localStorage\.setItem/);
  assert.match(onboardingPage, /auth\.user\?\.name/);
  assert.match(onboardingPage, /Good morning/);
  assert.match(onboardingPage, /Good afternoon/);
  assert.match(onboardingPage, /Good evening/);
  assert.match(onboardingPage, /className="product-tour"/);
  assert.match(onboardingPage, /className="product-tour-spotlight"/);
  assert.match(onboardingCss, /\.product-tour \{[\s\S]*position: fixed/);
  assert.match(onboardingCss, /\.product-tour-mask \{[\s\S]*background: rgb\(8 16 30 \/ \.66\)/);
  for (const moduleName of ['Borrower', 'Advisory', 'Admin / Compliance', 'Investor']) assert.ok(onboardingPage.includes(moduleName), `Missing onboarding module ${moduleName}`);
  for (const section of ['Financing', 'Applications', 'Execution', 'PiHub modules', 'Servicing', 'Organization', 'Workspace tools']) assert.ok(onboardingPage.includes(section), `Missing onboarding section ${section}`);
  for (const route of ["'/products'", "'/application'", "'/scenario-lab'", "'/servicing'", "'/team'", "'/help'"]) assert.ok(onboardingPage.includes(route), `Missing cross-route onboarding target ${route}`);
  assert.match(help, /to="\/help\?tour=1"/);
});

test('scenario offer comparison uses one seven-column header and row contract', () => {
  assert.equal(count(scenario, '<span>Provider</span>'), 1);
  assert.match(scenario, /className="offer-impact-head"/);
  assert.match(scenario, /className="offer-impact-row"/);
  assert.match(audit, /\.offer-impact-head,[\s\S]*\.offer-impact-row \{[\s\S]*grid-template-columns:/);
  assert.match(audit, /minmax\(118px, \.65fr\)/);
});

test('draw and portfolio tables have explicit column contracts matching rendered cells', () => {
  assert.match(capital, /className="draw-head"/);
  assert.match(capital, /className="draw-row"/);
  assert.match(audit, /\.draw-head,[\s\S]*\.draw-row \{[\s\S]*grid-template-columns:/);
  assert.match(portfolio, /className="portfolio-head"/);
  assert.match(portfolio, /className="portfolio-row"/);
  assert.match(audit, /\.portfolio-head,[\s\S]*\.portfolio-row \{[\s\S]*grid-template-columns:/);
});

test('servicing renders covenant forecasting once', () => {
  assert.equal(count(servicing, 'title="Covenant forecasting"'), 1);
});

test('dense tables, sidebar status and intermediate topbar widths have overflow protection', () => {
  for (const selector of ['.portfolio-table', '.draw-table', '.offer-impact-table', '.simple-ledger', '.team-table']) {
    assert.ok(audit.includes(selector), `Missing audited overflow selector ${selector}`);
  }
  assert.match(audit, /\.pihub-system-line \{[\s\S]*display: flex[\s\S]*white-space: nowrap/);
  assert.match(audit, /@media \(max-width: 1040px\) and \(min-width: 901px\)/);
  assert.match(audit, /\.pihub-topbar \.global-search,[\s\S]*\.pihub-topbar \.language-switch[\s\S]*display: none/);
});
