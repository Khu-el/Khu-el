import { useCallback, useEffect, useState, type SetStateAction } from 'react';

function read<T>(key: string, initialValue: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : initialValue;
  } catch {
    return initialValue;
  }
}

/**
 * A value mirrored into localStorage under `key`.
 *
 * This is the offline cache behind useSyncedRecords, not the source of truth:
 * once a session is live, records come from the backend and this only keeps
 * the last copy so the app still renders when the server cannot be reached.
 *
 * The value is held together with the key it was read from. `useSyncedRecords`
 * scopes its key per account, and the plain `useState(() => read(key))` form
 * only read on mount -- so if the key ever changed without a remount, the
 * previous key's value would be kept in state and then written under the new
 * key, copying one account's records into another's cache. AuthGate unmounts
 * the app on sign-out today, so that path is not reachable, but the per-account
 * cache is a hard boundary and should not rest on a component tree's shape.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [state, setState] = useState(() => ({ key, value: read(key, initialValue) }));

  // Key changed: re-read from the new key before anything is written back.
  let current = state;
  if (state.key !== key) {
    current = { key, value: read(key, initialValue) };
    setState(current);
  }

  useEffect(() => {
    if (state.key !== key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state.value));
    } catch {
      // storage unavailable (private browsing quota, etc.) -- fail silently
    }
  }, [key, state]);

  const setValue = useCallback((next: SetStateAction<T>) => {
    setState((prev) => ({
      key: prev.key,
      value: typeof next === 'function' ? (next as (p: T) => T)(prev.value) : next,
    }));
  }, []);

  return [current.value, setValue] as const;
}
