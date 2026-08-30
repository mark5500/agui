import { useState } from 'react'

/**
 * Like `useState`, but the value is persisted to `localStorage` under `key` and
 * read back as the initial value on mount — so todos/expenses/feedback survive a
 * page reload. Falls back to `initialValue` if nothing is stored yet, the stored
 * JSON is malformed, or `localStorage` isn't available (private browsing, etc.).
 */
export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  function setPersistedState(value: T | ((prev: T) => T)) {
    setState((prev) => {
      const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Storage full or unavailable — keep the in-memory state working regardless.
      }
      return next
    })
  }

  return [state, setPersistedState] as const
}
