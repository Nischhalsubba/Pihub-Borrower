import { beforeEach, describe, expect, it } from 'vitest';
import { readLocal, writeLocal, resetLocal } from './local-state';
describe('borrower local demo state', () => { beforeEach(() => localStorage.clear()); it('persists and clears isolated state', () => { writeLocal('sample', { ok: true }); expect(readLocal('sample', null)).toEqual({ ok: true }); resetLocal('sample'); expect(readLocal('sample', 'fallback')).toBe('fallback'); }); });
