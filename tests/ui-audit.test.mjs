import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');
const main = read('src/main.tsx');
const audit = read('packages/ui/src/pihub-audit.css');
const scenario = read('src/pages/ScenarioLabPage.tsx');
const capital = read('src/pages/CapitalPage.tsx');
const portfolio = read('src/pages/PortfolioPage.tsx');
const servicing = read('src/pages/ServicingPage.tsx');

const count = (source, token) => source.split(token).length - 1;

test('whole-app audit layer loads after the canonical PiHub layers', () => {
  const motion = main.indexOf("pihub-motion.css");
  const audited = main.indexOf("pihub-audit.css");
  assert.ok(motion >= 0 && audited > motion, 'pihub-audit.css must load last');
  assert.match(audit, /\.workspace-context-shell,[\s\S]*\.sync-warning[\s\S]*max-width: var\(--pihub-content-max\)/);
  assert.match(audit, /\.modal \{[\s\S]*max-height: calc\(100dvh - 40px\)[\s\S]*overflow: auto/);
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

test('dense tables and intermediate topbar widths have overflow protection', () => {
  for (const selector of ['.portfolio-table', '.draw-table', '.offer-impact-table', '.simple-ledger', '.team-table']) {
    assert.ok(audit.includes(selector), `Missing audited overflow selector ${selector}`);
  }
  assert.match(audit, /@media \(max-width: 1040px\) and \(min-width: 901px\)/);
  assert.match(audit, /\.pihub-topbar \.global-search,[\s\S]*\.pihub-topbar \.language-switch[\s\S]*display: none/);
});
