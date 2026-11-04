import { flatten, type Lesson, type Sentence } from './core'
import { suggestedPhrases } from './data/phrases'
export type PracticeMode = 'word' | 'phrase' | 'sentence' | 'flow'
export type PhraseGrouping = 'text' | '2' | '3'
export const isSpoken = (text: string) => /[\p{L}\p{N}]/u.test(text)
/** Source offsets, never character counts: a saved break cannot split a word. */
export function phraseBreaks(sentence: Sentence): number[] {
  if (sentence.pauseAfter) return sentence.pauseAfter
  const marked = suggestedPhrases.get(sentence.text)
  if (marked) return phraseOffsets(marked).offsets.filter(end => sentence.words.some(w => w.end === end))
  return sentence.words.filter(w => /[，,；;：:、—]/u.test(w.text) && w.end < sentence.text.length).map(w => w.end)
}
export function phraseOffsets(marked: string): { text: string; offsets: number[] } {
  const parts = marked.split('/')
  let offset = 0
  return { text: parts.join(''), offsets: parts.slice(0, -1).map(part => offset += part.length) }
}
export function groupBreaks(sentence: Sentence, grouping: PhraseGrouping) {
  if (grouping === 'text') return phraseBreaks(sentence)
  const breaks: number[] = []
  let count = 0
  sentence.words.forEach((word, i) => {
    if (isSpoken(word.text)) count++
    if (i < sentence.words.length - 1 && (/[，,；;：:、]/u.test(word.text) || (count >= Number(grouping) && isSpoken(sentence.words[i + 1].text)))) { breaks.push(word.end); count = 0 }
  })
  return breaks
}
export function practiceUnit(lesson: Lesson, from: number, mode: PracticeMode, grouping: PhraseGrouping, words = flatten(lesson)) {
  const first = words[from], sentence = lesson.sentences[first.sentence]
  let end = from + 1
  const breaks = mode === 'phrase' ? new Set(groupBreaks(sentence, grouping)) : null
  if (mode !== 'word') {
    while (end < words.length && words[end].sentence === first.sentence) {
      const previous = words[end - 1]
      if (breaks?.has(previous.end)) break
      end++
    }
  }
  return { start: from, end, text: sentence.text.slice(first.start, words[end - 1].end), offset: first.start, sentence: first.sentence }
}
