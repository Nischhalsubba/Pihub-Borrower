import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');
const tour = read('src/pages/OnboardingPage.tsx');
const overlay = read('packages/ui/src/pihub-tour-overlay.css');
const main = read('src/main.tsx');

test('guided onboarding renders as a screenshot-style in-context annotation overlay', () => {
  assert.match(tour, /className="product-tour"/);
  assert.match(tour, /className="product-tour-spotlight"/);
  assert.match(tour, /className="product-tour-connector"/);
  assert.match(tour, /product-tour-annotation/);
  assert.match(tour, /markerEnd="url\(#product-tour-arrowhead\)"/);
  assert.match(tour, /navigate\(step\.route, \{ replace: true \}\)/);
  assert.match(overlay, /\.product-tour-card\.product-tour-annotation/);
  assert.match(overlay, /\.product-tour-connector-line/);
  assert.match(main, /pihub-tour-overlay\.css/);
});
