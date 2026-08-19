import { useEffect, useState } from 'react';

/**
 * Client-only persistence. Deliberately the *only* persistence layer in
 * these apps: there is no backend, no API, and nothing here ever leaves
 * the user's browser. That is a safety property, not just a convenience
 * -- it means these tools cannot silently contact a third party, move
 * money, or submit anything on the user's behalf.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable (private browsing quota, etc.) -- fail silently
    }
  }, [key, value]);

  return [value, setValue] as const;
}
