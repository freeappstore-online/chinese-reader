import { validateLesson, type Lesson } from './core'
export const BRIDGE = 'http://127.0.0.1:18791'
export async function runnerStatus() {
  const r = await fetch(`${BRIDGE}/health`, { mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(4000) })
  if (!r.ok) throw new Error('The local reader service is unavailable.')
  const value = await r.json()
  if (value.service !== 'chinese-reader' || value.version !== 1) throw new Error('This is not the Chinese Reader service.')
  return value as { service: string; version: number; model: string | null; available: boolean; tts: boolean }
}
export async function enrich(lesson: Lesson, signal: AbortSignal) {
  let r: Response
  try { r = await fetch(`${BRIDGE}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lesson), credentials: 'omit', signal }) }
  catch (e) { if (signal.aborted) throw e; throw new Error('Cannot reach your local model. Open Profile to check the local-model connection, or import a lesson processed on your runner.') }
  if (!r.ok) throw new Error((await r.json()).error || 'Local text processing failed.')
  const result = validateLesson(await r.json())
  if (result.text !== lesson.text || result.id !== lesson.id) throw new Error('The model returned a different reading.')
  return result
}
export async function localSpeech(text: string, signal: AbortSignal): Promise<Blob> {
  const r = await fetch(`${BRIDGE}/speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), credentials: 'omit', signal })
  if (!r.ok || !r.headers.get('content-type')?.startsWith('audio/')) throw new Error('Local voice unavailable; using your browser voice.')
  return r.blob()
}
