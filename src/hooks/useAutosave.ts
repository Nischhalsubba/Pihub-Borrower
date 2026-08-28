import { useEffect, useRef } from 'react';

/**
 * Debounces browser-demo persistence without coupling forms to storage details.
 * The callback ref avoids rerunning just because the store provider returned a
 * new function identity after a state transition.
 */
export function useAutosave<T>(value: T, save: (value: T) => void, delay = 1200) {
  const first = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = window.setTimeout(() => saveRef.current(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
}
