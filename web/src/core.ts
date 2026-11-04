import { pinyin } from 'pinyin-pro'
import { isReadingGloss } from './gloss'

export type Word = { text: string; pinyin: string; meaning: string; gloss?: string; start: number; end: number }
export type Sentence = { text: string; translation: string; words: Word[]; pauseAfter?: number[] }
export type Lesson = { version: 1; id: string; title: string; text: string; sentences: Sentence[]; createdAt: number; position: number; source: 'dictionary' | 'model' | 'sample' | 'library'; catalogId?: string; tags?: string[]; level?: 'beginner' | 'intermediate' | 'advanced' }
export type Entry = { pinyin: string; meaning: string }
export type Dictionary = Map<string, Entry[]>
export const MAX_TEXT = 12000
export function toneMarks(input: string) {
  return input.replace(/([a-zü:]+)([0-5])/gi, (_, raw: string, digit: string) => {
    const syllable = raw.toLowerCase().replace(/u:|v/g, 'ü'), tone = Number(digit)
    if (tone === 0 || tone === 5) return syllable
    let at = syllable.indexOf('a')
    if (at < 0) at = syllable.indexOf('e')
    if (at < 0 && syllable.includes('ou')) at = syllable.indexOf('o')
    if (at < 0) at = Math.max(...['i', 'o', 'u', 'ü'].map(v => syllable.lastIndexOf(v)))
    const tones: Record<string, string> = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ' }
    if (at < 0) return syllable.replace(/[mn]/, c => (c + ['', '\u0304', '\u0301', '\u030c', '\u0300'][tone]).normalize('NFC'))
    return syllable.slice(0, at) + tones[syllable[at]][tone - 1] + syllable.slice(at + 1)
  })
}
export const SAMPLE = '今天下午，我想去附近的咖啡馆。\n我带了一本中文书，坐在窗边慢慢地读。\n遇到不认识的词，我就停下来，看一看它的意思。\n每天练习一点，中文就会越来越好。'
const SAMPLE_TRANSLATIONS = ['This afternoon, I want to go to a nearby café.', 'I brought a Chinese book and sat by the window, reading slowly.', 'When I come across an unfamiliar word, I stop and look at its meaning.', 'With a little practice every day, my Chinese will get better and better.']
export function parseDictionary(text: string): Dictionary {
  const dict: Dictionary = new Map()
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^(\S+) (\S+) \[([^\]]+)\] \/(.+)\/$/)
    if (!m) continue
    const entry = { pinyin: m[3], meaning: m[4].split('/').filter(s => !/^(variant of|old variant|CL:)/.test(s)).join('; ') || m[4] }
    for (const key of new Set([m[1], m[2]])) dict.set(key, [...(dict.get(key) || []), entry])
  }
  return dict
}
export function splitText(text: string): string[] {
  return text.match(/[^。！？!?\n]+[。！？!?]*|[。！？!?]+/gu)?.map(s => s.trim()).filter(Boolean) || []
}
const entryPenalty = (entry: Entry) => Number(/[A-Z]/.test(entry.pinyin)) * 2 + Number(/^(surname |Taiwan pr\.|old variant|variant of|abbr\.|used in |see )/i.test(entry.meaning)) * 3
export function makeLesson(text: string, title: string, dict: Dictionary, phraseBoundaries: number[][] = []): Lesson {
  text = text.trim()
  if (!text || text.length > MAX_TEXT) throw new Error(`Enter between 1 and ${MAX_TEXT.toLocaleString()} characters.`)
  if (!/\p{Script=Han}/u.test(text)) throw new Error('Add some Chinese text to read.')
  const sentences = splitText(text).map((sentence, si) => {
    const contextual = pinyin(sentence, { type: 'all' })
    const boundaries = [...new Intl.Segmenter('zh', { granularity: 'word' }).segment(sentence)].map(part => part.index + part.segment.length)
    const words: Word[] = []
    // Avoid a dictionary match that crosses into only part of the next natural word.
    let start = 0
    while (start < sentence.length) {
      // An authored phrase boundary also prevents accidental dictionary matches across it.
      const boundary = phraseBoundaries[si]?.find(end => end > start) ?? sentence.length
      const naturalEnd = boundaries.find(end => end > start) ?? sentence.length
      const tail = sentence.slice(start, boundary)
      const nonHan = tail.match(/^[^\p{Script=Han}]+/u)
      let chunk = nonHan?.[0] || String.fromCodePoint(sentence.codePointAt(start)!)
      const countedPerson = tail.startsWith('个人') && /[\d一二三四五六七八九十百千万两几]$/u.test(sentence.slice(0, start))
      if (!nonHan && !countedPerson) for (let len = Math.min(12, tail.length); len > chunk.length; len--) {
        if ((start + len <= naturalEnd || boundaries.includes(start + len)) && dict.has(tail.slice(0, len))) { chunk = tail.slice(0, len); break }
      }
      const entries = dict.get(chunk)
      const charStart = [...sentence.slice(0, start)].length
      let pronunciation = /\p{Script=Han}/u.test(chunk) ? contextual.slice(charStart, charStart + [...chunk].length).map(c => c.pinyin).join(' ') : ''
      const ranked = entries?.slice().sort((a, b) => entryPenalty(a) - entryPenalty(b))
      const matching = ranked?.find(e => toneMarks(e.pinyin).toLowerCase() === pronunciation.toLowerCase())
      const useful = matching || ranked?.[0]
      // Traditional phrases can be absent from the pinyin library; the exact dictionary entry is authoritative.
      if (useful && !matching) pronunciation = toneMarks(useful.pinyin)
      words.push({ text: chunk, pinyin: pronunciation, meaning: useful?.meaning || '', start, end: start + chunk.length })
      start += chunk.length
    }
    return { text: sentence, translation: '', words }
  })
  const sample = text === SAMPLE
  if (sample) sentences.forEach((s, i) => { s.translation = SAMPLE_TRANSLATIONS[i] || '' })
  return { version: 1, id: crypto.randomUUID(), title: title.trim().slice(0, 100) || 'Untitled reading', text, sentences, createdAt: Date.now(), position: 0, source: sample ? 'sample' : 'dictionary' }
}
export function validateLesson(value: unknown): Lesson {
  if (!value || typeof value !== 'object') throw new Error('Invalid lesson file.')
  const v = value as Lesson
  if (v.version !== 1 || typeof v.title !== 'string' || v.title.length > 100 || typeof v.text !== 'string' || v.text.length > MAX_TEXT || !Array.isArray(v.sentences) || v.sentences.length > MAX_TEXT) throw new Error('This is not a supported Chinese Reader lesson.')
  const texts = splitText(v.text)
  if (texts.length !== v.sentences.length) throw new Error('Lesson sentences do not match the original text.')
  for (const [i, s] of v.sentences.entries()) {
    if (s.text !== texts[i] || typeof s.translation !== 'string' || s.translation.length > 8000 || !Array.isArray(s.words) || s.words.map(w => w.text).join('') !== s.text) throw new Error('Lesson annotations do not match the original text.')
    let offset = 0
    for (const w of s.words) {
      if (typeof w.text !== 'string' || !w.text || w.start !== offset || w.end !== offset + w.text.length || typeof w.pinyin !== 'string' || w.pinyin.length > 500 || typeof w.meaning !== 'string' || w.meaning.length > 4000) throw new Error('Invalid word annotation.')
      if (w.gloss !== undefined && !isReadingGloss(w.gloss)) throw new Error('A reading gloss must be one English word (up to 32 letters).')
      if (/\p{Script=Han}/u.test(w.pinyin)) throw new Error('Pinyin must contain pronunciation, not Chinese characters.')
      offset = w.end
    }
    if (s.pauseAfter !== undefined && (!Array.isArray(s.pauseAfter) || s.pauseAfter.length > s.words.length || s.pauseAfter.some((end, j) => !Number.isInteger(end) || end <= 0 || end >= s.text.length || !s.words.some(w => w.end === end) || (j > 0 && end <= s.pauseAfter![j - 1])))) throw new Error('Phrase breaks must be ordered word boundaries inside the sentence.')
  }
  const count = v.sentences.flatMap(s => s.words).length
  if (v.tags !== undefined && (!Array.isArray(v.tags) || v.tags.length > 12 || v.tags.some(t => typeof t !== 'string' || !t.trim() || t.length > 32))) throw new Error('Use up to 12 labels of 32 characters each.')
  return { ...v, tags: v.tags ? [...new Set(v.tags.map(t => t.trim().toLowerCase()))] : undefined, level: ['beginner', 'intermediate', 'advanced'].includes(v.level || '') ? v.level : undefined, catalogId: typeof v.catalogId === 'string' && /^[a-z0-9-]{1,60}$/.test(v.catalogId) ? v.catalogId : undefined, id: typeof v.id === 'string' ? v.id : crypto.randomUUID(), source: ['dictionary', 'sample', 'model', 'library'].includes(v.source) ? v.source : 'dictionary', createdAt: Number.isFinite(v.createdAt) ? v.createdAt : Date.now(), position: Number.isInteger(v.position) && v.position >= 0 && v.position < count ? v.position : 0 }
}
export function flatten(lesson: Lesson) {
  return lesson.sentences.flatMap((s, sentence) => s.words.map((word, local) => ({ ...word, sentence, local })))
}
export function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
