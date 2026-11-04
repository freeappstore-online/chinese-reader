import { useEffect, useRef, useState } from 'react'
import { MAX_TEXT, validateLesson, type Lesson } from './core'
import { refreshCatalogCues } from './data/catalog'
import { enrich } from './runner'

/** One owner for pending file, dictionary and model work. Switching readings
 * invalidates all earlier results, including requests whose abort arrives late. */
export function useReadingSession(localReader: boolean) {
  const [lesson, setLesson] = useState<Lesson | null>(null), [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState<number | null>(null), [editing, setEditing] = useState(true)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [modelWorking, setModelWorking] = useState(false), [modelNotice, setModelNotice] = useState('')
  const worker = useRef<Worker | null>(null), generation = useRef(0), modelAbort = useRef<AbortController | null>(null)
  function cancelWork() {
    ++generation.current; modelAbort.current?.abort(); modelAbort.current = null
    setBusy(false); setModelWorking(false)
  }
  function openLesson(next: Lesson) {
    cancelWork(); setLesson(next); setRevision(v => v + 1); setSelected(null); setEditing(false); setError(''); setModelNotice('')
  }
  useEffect(() => {
    const w = new Worker(new URL('./dictionary.worker.ts', import.meta.url), { type: 'module' }); worker.current = w
    w.onmessage = ({ data }) => {
      if (data.id !== generation.current) return
      setBusy(false)
      if (data.error) setError(data.error)
      else openLesson(data.lesson)
    }
    w.onerror = () => { cancelWork(); setError('The dictionary could not start. Reload and try again.') }
    return () => { ++generation.current; w.terminate(); worker.current = null; modelAbort.current?.abort() }
  }, [])
  function prepare(text: string, title: string, catalogId?: string) {
    cancelWork(); setError(''); setModelNotice('')
    if (!worker.current) { setError('The dictionary is still starting. Try again in a moment.'); return }
    if (!text.trim() || text.length > MAX_TEXT) { setError(`Enter between 1 and ${MAX_TEXT.toLocaleString()} characters.`); return }
    setBusy(true); worker.current.postMessage({ id: generation.current, text, title, catalogId })
  }
  async function importFile(file?: File) {
    if (!file) return
    cancelWork(); setError(''); setModelNotice(''); setBusy(true)
    const request = generation.current
    try {
      if (file.size > 2_000_000) throw new Error('Choose a text or lesson file smaller than 2 MB.')
      const content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
      if (request !== generation.current) return
      if (file.name.toLowerCase().endsWith('.json')) openLesson(refreshCatalogCues(validateLesson(JSON.parse(content))))
      else prepare(content, file.name.replace(/\.[^.]+$/, ''))
    } catch (e) { if (request === generation.current) { setBusy(false); setError(e instanceof Error ? e.message : 'Could not import this file.') } }
  }
  async function processModel() {
    if (!lesson) return
    if (!localReader) { setError('Use Export lesson, process it with the runner CLI, then import the result. Direct model processing requires the reader running locally; this hosted page cannot connect to localhost.'); return }
    cancelWork(); setModelWorking(true); setModelNotice(''); setError('')
    const request = generation.current, controller = new AbortController(); modelAbort.current = controller
    try {
      const next = await enrich(lesson, controller.signal)
      if (request === generation.current && !controller.signal.aborted) { setLesson(next); setModelNotice('Contextual meanings and sentence translations are ready. Model output can be imperfect.') }
    } catch (e) { if (request === generation.current && !controller.signal.aborted) setError(e instanceof Error ? e.message : 'The local model is unavailable.') }
    finally { if (request === generation.current) { modelAbort.current = null; setModelWorking(false) } }
  }
  function updateLesson(next: Lesson) { cancelWork(); setLesson(next) }
  function newReading() { cancelWork(); setModelNotice(''); setError(''); setSelected(null); setEditing(true) }
  return { lesson, revision, selected, setSelected, editing, busy, error, setError, modelWorking, modelNotice, setModelNotice, openLesson, prepare, importFile, processModel, cancelWork, updateLesson, newReading }
}
