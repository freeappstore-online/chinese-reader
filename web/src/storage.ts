import { validateLesson, type Lesson } from './core'
export const LIBRARY_KEY = 'chinese-reader.library.v1'
export function loadLibrary(): Lesson[] {
  const raw = localStorage.getItem(LIBRARY_KEY)
  if (!raw) return []
  try { const data = JSON.parse(raw); if (!Array.isArray(data)) throw new Error(); return data.map(validateLesson) }
  catch { throw new Error('Your saved library could not be read. Export browser data before clearing storage.') }
}
export function saveLibrary(lessons: Lesson[]) {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(lessons)) }
  catch { throw new Error('Your device could not save this reading. Export it before closing this page.') }
}
