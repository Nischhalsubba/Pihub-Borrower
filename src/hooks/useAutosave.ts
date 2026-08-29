import { useEffect, useRef } from 'react';
import { runtimeMode } from '../services/runtime';

const API_AUTOSAVE_MIN_DELAY_MS = 3_000;

/**
 * Debounces form persistence without coupling forms to storage details.
 * Production API mode intentionally uses a longer floor than the local demo so
 * natural pauses while typing do not become a stream of finance API writes.
 * Explicit Save actions still call the store immediately.
 */
export function useAutosave<T>(value: T, save: (value: T) => void, delay = 1200) {
  const first = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;
  const effectiveDelay = runtimeMode() === 'api' ? Math.max(delay, API_AUTOSAVE_MIN_DELAY_MS) : delay;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = window.setTimeout(() => saveRef.current(value), effectiveDelay);
    return () => window.clearTimeout(timer);
  }, [value, effectiveDelay]);
}
