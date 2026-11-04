import { useEffect, useState } from 'react'
import { loadSavedWords, storeSavedWords, validateSavedWords, SAVED_WORDS_KEY, type SavedWord } from './savedWords'

export function useSavedWords() {
  const [state, setState] = useState(() => {
    try { return { words: loadSavedWords(), error: '' } }
    catch (e) { return { words: [] as SavedWord[], error: (e as Error).message } }
  })
  const [removed, setRemoved] = useState<SavedWord | null>(null)
  function reportError(error: string) { setState(s => ({ ...s, error })) }
  function reload() {
    try { setState({ words: loadSavedWords(), error: '' }) }
    catch (e) { reportError((e as Error).message) }
  }
  useEffect(() => {
    const changed = (event: StorageEvent) => { if (event.key === SAVED_WORDS_KEY || event.key === null) reload() }
    addEventListener('storage', changed)
    return () => removeEventListener('storage', changed)
  }, [])
  function update(change: (words: SavedWord[]) => SavedWord[]) {
    try {
      // Read the latest copy so another tab's additions are not overwritten.
      const words = change(loadSavedWords())
      storeSavedWords(words); setState({ words, error: '' }); return true
    } catch (e) { reportError((e as Error).message); return false }
  }
  function add(word: SavedWord) { return update(words => words.some(w => w.key === word.key) ? words : [word, ...words]) }
  function remove(key: string) {
    let previous: SavedWord | undefined
    if (update(words => { previous = words.find(w => w.key === key); return words.filter(w => w.key !== key) }) && previous) setRemoved(previous)
  }
  function undo() { if (removed && add(removed)) setRemoved(null) }
  function importBackup(value: unknown) {
    try {
      const imported = validateSavedWords(value)
      return update(words => { const existing = new Set(words.map(w => w.key)); return [...words, ...imported.filter(w => !existing.has(w.key))] })
    } catch (e) { reportError((e as Error).message); return false }
  }
  return { ...state, removed, add, remove, undo, importBackup, reportError, reload }
}
