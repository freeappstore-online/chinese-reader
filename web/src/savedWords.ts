import { validateLesson, type Lesson, type Sentence, type Word } from './core'

export const SAVED_WORDS_KEY = 'chinese-reader.saved-words.v1'
export type SavedWord = { key: string; sentence: Sentence; wordIndex: number; title: string; savedAt: number; source: Lesson['source'] }
export type SavedWordsFile = { type: 'chinese-reader.saved-words'; version: 1; words: SavedWord[] }
export const savedWordKey = (word: Pick<Word, 'text' | 'pinyin'>) => JSON.stringify([word.text, word.pinyin.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ')])
export const savedWordsFile = (words: SavedWord[]): SavedWordsFile => ({ type: 'chinese-reader.saved-words', version: 1, words })
export function contextLesson(saved: SavedWord): Lesson {
  return { version: 1, id: `saved-word:${saved.key}`, title: saved.title, text: saved.sentence.text, sentences: [saved.sentence], createdAt: saved.savedAt, position: saved.wordIndex, source: saved.source }
}
export function validateSavedWords(value: unknown): SavedWord[] {
  const file = value as SavedWordsFile | null
  if (!file || file.type !== 'chinese-reader.saved-words' || file.version !== 1 || !Array.isArray(file.words)) throw new Error('Choose a Chinese Reader saved-words backup.')
  const found = new Set<string>()
  return file.words.map(raw => {
    if (!raw || typeof raw.title !== 'string' || !Number.isFinite(raw.savedAt) || raw.savedAt < 0 || !Number.isInteger(raw.wordIndex) || raw.wordIndex < 0 || !raw.sentence || typeof raw.sentence.text !== 'string') throw new Error('Invalid saved-word context. Nothing was imported.')
    const { sentences, source } = validateLesson(contextLesson({ ...raw, key: '' }))
    const sentence = sentences[0], word = sentence?.words[raw.wordIndex]
    if (!word?.pinyin || !/\p{Script=Han}/u.test(word.text)) throw new Error('A saved word must point to a Chinese word in its original sentence.')
    return { key: savedWordKey(word), sentence, wordIndex: raw.wordIndex, title: raw.title, savedAt: raw.savedAt, source }
  }).filter(word => { if (found.has(word.key)) return false; found.add(word.key); return true })
}
export function captureWord(lesson: Lesson, sentenceIndex: number, wordIndex: number): SavedWord {
  const sentence = structuredClone(lesson.sentences[sentenceIndex]), word = sentence?.words[wordIndex]
  if (!word?.pinyin || !/\p{Script=Han}/u.test(word.text)) throw new Error('Select a Chinese word to save.')
  return { key: savedWordKey(word), sentence, wordIndex, title: lesson.title, savedAt: Date.now(), source: lesson.source }
}
export function loadSavedWords(): SavedWord[] {
  const raw = localStorage.getItem(SAVED_WORDS_KEY)
  if (!raw) return []
  try { return validateSavedWords(JSON.parse(raw)) }
  catch { throw new Error('Your saved words could not be read. The existing data has been kept; restore access before saving more words.') }
}
export function storeSavedWords(words: SavedWord[]) {
  try { localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(savedWordsFile(words))) }
  catch { throw new Error('Your device could not save this change. Saved words have not been changed. Free some browser storage and try again.') }
}
