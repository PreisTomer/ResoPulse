// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

/**
 * Reads a value from localStorage under `key`. Returns `fallback` when the key
 * is missing, or when `parse` throws (covers corrupt JSON and quota failures).
 */
export function loadFromStorage<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T,
): T {
  try {
    const saved = localStorage.getItem(key)
    if (saved !== null) return parse(saved)
  } catch { /* corrupt data or storage blocked */ }
  return fallback
}

/**
 * Writes `value` to localStorage under `key`. Swallows quota and access errors
 * so callers do not need their own try/catch around every write.
 */
export function saveToStorage(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* quota or storage blocked */ }
}
