import { useEffect, useState } from 'react'

/** Device preferences are optional; unavailable/corrupt storage uses the default. */
export function usePreference<T>(key: string, fallback: T, valid: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
      return valid(stored) ? stored : fallback
    } catch { return fallback }
  })
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Keep this session usable. */ }
  }, [key, value])
  return [value, setValue] as const
}
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
