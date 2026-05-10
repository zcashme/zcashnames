"use client";

import { useCallback, useEffect, useState } from "react";

// SSR-safe localStorage access. The standalone read/write/remove helpers are
// for non-reactive call sites (e.g. utility functions, server actions); the
// `useLocalStorage` hook provides reactive state with the same key contract.

const SSR = typeof window === "undefined";

// Read a key from localStorage, returning defaultValue on SSR or parse failure.
export function readLocalStorage<T>(key: string, defaultValue: T): T {
  if (SSR) return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

// Serializes and writes a value to localStorage. Silently no-ops on SSR or quota errors.
export function writeLocalStorage<T>(key: string, value: T): void {
  if (SSR) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // blocked or full
  }
}

// Removes a key from localStorage. No-ops on SSR or blocked access.
export function removeLocalStorage(key: string): void {
  if (SSR) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // blocked
  }
}

// Reactive localStorage hook. Supports dynamic keys (syncs on key change) and
// functional updates. Returns [value, set, remove].
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() =>
    readLocalStorage(key, defaultValue),
  );

  // Keep state in sync if key changes (dynamic keys).
  useEffect(() => {
    setValue(readLocalStorage(key, defaultValue));
  }, [key, defaultValue]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next;
        writeLocalStorage(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  const remove = useCallback(() => {
    removeLocalStorage(key);
    setValue(defaultValue);
  }, [key, defaultValue]);

  return [value, set, remove];
}
