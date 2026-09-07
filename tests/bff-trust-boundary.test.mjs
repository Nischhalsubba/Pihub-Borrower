import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../supabase/functions/platform-api/index.ts', import.meta.url), 'utf8');

test('trusted Vercel BFF environment defaults to production only', () => {
  assert.match(source, /PIHUB_TRUSTED_VERCEL_ENVIRONMENTS/);
  assert.match(source, /\?\?'production'/);
  assert.doesNotMatch(source, /\['production','preview'\]\.includes/);
});

test('BFF verification still binds issuer, audience, team and project', () => {
  assert.match(source, /issuer:VERCEL_ISSUER,audience:VERCEL_AUDIENCE/);
  assert.match(source, /payload\.owner===TEAM_SLUG/);
  assert.match(source, /payload\.project===VERCEL_PROJECT/);
});
