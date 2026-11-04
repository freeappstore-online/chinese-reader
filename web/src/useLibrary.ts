import { useCallback, useEffect, useState } from 'react'
import { loadLibrary, saveLibrary, LIBRARY_KEY } from './storage'
import { refreshCatalogCues } from './data/catalog'
import type { Lesson } from './core'

export function useLibrary() {
  const read = () => loadLibrary().map(refreshCatalogCues)
  const [state, setState] = useState(() => {
    try { return { items: read(), error: '' } }
    catch (e) { return { items: [] as Lesson[], error: (e as Error).message } }
  })
  const reload = useCallback(() => {
    try { setState({ items: read(), error: '' }) }
    catch (e) { setState(s => ({ ...s, error: (e as Error).message })) }
  }, [])
  useEffect(() => {
    const changed = (event: StorageEvent) => { if (event.key === LIBRARY_KEY || event.key === null) reload() }
    addEventListener('storage', changed); return () => removeEventListener('storage', changed)
  }, [reload])
  const update = useCallback((change: (latest: Lesson[]) => Lesson[]) => {
    try {
      // Never write a stale tab's entire library or overwrite unreadable data.
      const latest = read(), next = change(latest)
      if (next !== latest) saveLibrary(next)
      setState({ items: next, error: '' }); return true
    } catch (e) { setState(s => ({ ...s, error: (e as Error).message })); return false }
  }, [])
  const rememberPosition = useCallback((lesson: Lesson, position: number) => update(latest => {
    const saved = latest.find(l => l.id === lesson.id && l.text === lesson.text)
    if (!saved || saved.position === position || position < 0 || position >= saved.sentences.reduce((n, s) => n + s.words.length, 0)) return latest
    return latest.map(l => l === saved ? { ...l, position } : l)
  }), [update])
  return { ...state, reload, update, rememberPosition }
}
