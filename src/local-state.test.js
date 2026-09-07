import { beforeEach, describe, expect, it } from 'vitest';
import { readLocal, resetLocal, resetLocalWorkspace, writeLocal } from './local-state';

describe('borrower ephemeral demo state', () => {
  beforeEach(() => resetLocalWorkspace());

  it('keeps state in memory and clears isolated values', () => {
    writeLocal('sample', { ok: true });
    expect(readLocal('sample', null)).toEqual({ ok: true });
    resetLocal('sample');
    expect(readLocal('sample', 'fallback')).toBe('fallback');
  });

  it('clears the whole ephemeral workspace', () => {
    writeLocal('one', 1);
    writeLocal('two', 2);
    resetLocalWorkspace();
    expect(readLocal('one', null)).toBeNull();
    expect(readLocal('two', null)).toBeNull();
  });
});
