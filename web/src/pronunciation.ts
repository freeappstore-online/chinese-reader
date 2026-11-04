import { toneMarks, type Sentence } from './core'
import { groupBreaks, type PhraseGrouping, type PracticeMode } from './practice'
export type Tone = 1 | 2 | 3 | 4 | 5
export function toneNumber(syllable: string): Tone {
  const marks: Record<string, Tone> = { '\u0304': 1, '\u0301': 2, '\u030c': 3, '\u0300': 4 }
  const mark = [...syllable.normalize('NFD')].find(c => marks[c])
  return mark ? marks[mark] : /[1-4]$/.test(syllable) ? Number(syllable.at(-1)) as Tone : 5
}
function retone(syllable: string, tone: Tone) {
  const base = syllable.normalize('NFD').replace(/[\u0304\u0301\u030c\u0300]/g, '').normalize('NFC').replace(/[0-5]$/, '')
  return toneMarks(`${base}${tone}`)
}
export type Pronunciation = { pinyin: string; notes: string[] }
/** Teaching guidance, not a phonetic transcript of the selected voice.
 * Dictionary pinyin is immutable. Prosodic grouping of longer 3-tone runs is
 * ambiguous: retain a leading singleton before a pair, otherwise use word groups.
 * Rules: https://www.polyu.edu.hk/bepth/introduction-to-phonetics/tones/tone-sandhi/
 */
export function spokenPronunciation(sentence: Sentence, mode: PracticeMode, grouping: PhraseGrouping): Pronunciation[] {
  const result = sentence.words.map(w => ({ pinyin: w.pinyin, notes: [] as string[] }))
  const breaks = new Set(groupBreaks(sentence, grouping))
  type Syllable = { char: string; word: number; syllable: string; tone: Tone; surface: Tone; notes: string[]; offset: number }
  let group: Syllable[] = []
  function finish() {
    for (let i = 0; i < group.length; i++) {
      const s = group[i], next = group[i + 1], prev = group[i - 1]
      if (!next) continue
      const reduplicated = prev?.char === next.char
      if ((s.char === '一' || s.char === '不') && reduplicated) {
        s.surface = 5; s.notes.push(`${s.char} is usually light in this repeated pattern.`)
      } else if (s.char === '不' && s.tone === 4 && next.tone === 4) {
        s.surface = 2; s.notes.push('不 before a fourth tone: 4 → 2.')
      } else if (s.char === '一' && s.tone === 1) {
        // Ordinals, dates/weekdays and digit sequences keep citation yī.
        const before = sentence.text.slice(0, s.offset)
        const numeric = /[第零〇一二三四五六七八九十百千万亿兩两0-9]$/.test(before) || /[零〇一二三四五六七八九十百千万亿0-9年月日号號]/.test(next.char) || /(?:星期|周|週|礼拜|禮拜)$/.test(before)
        const following = next.char === '个' || next.char === '個' ? 4 : next.tone
        if (!numeric && following !== 5) { s.surface = following === 4 ? 2 : 4; s.notes.push(`一 before underlying tone ${following}: 1 → ${s.surface}.`) }
      }
    }
    for (let start = 0; start < group.length;) {
      if (group[start].tone !== 3) { start++; continue }
      let end = start + 1
      while (end < group.length && group[end].tone === 3) end++
      if (end - start === 2) {
        group[start].surface = 2; group[start].notes.push('Two third tones together: 3–3 → 2–3.')
      } else if (end - start > 2) {
        // Work in pairs within word groups first; a singleton before a pair
        // stays third (e.g. 我 / 很好). A two-syllable word before a third
        // tone has both syllables rising (e.g. 展览 / 馆).
        for (let i = start; i < end - 1; i++) {
          const sameWord = group[i].word === group[i + 1].word
          const lastPair = i === end - 2
          const endsPair = i > start && group[i - 1].word === group[i].word
          if (sameWord || lastPair || endsPair) group[i].surface = 2
        }
        for (let i = start; i < end; i++) group[i].notes.push('Longer third-tone sequence: suggested word grouping; pronunciation can vary with emphasis. Edit phrase breaks to practise smaller groups.')
      }
      start = end
    }
    for (const word of new Set(group.map(s => s.word))) {
      const syllables = group.filter(s => s.word === word)
      result[word] = { pinyin: syllables.map(s => s.surface === s.tone ? s.syllable : retone(s.syllable, s.surface)).join(' '), notes: [...new Set(syllables.flatMap(s => s.notes))] }
    }
    group = []
  }
  sentence.words.forEach((w, word) => {
    const chars = [...w.text], syllables = w.pinyin.trim().split(/[\s'’]+/).filter(Boolean)
    // Never guess a character-to-syllable alignment for unusual imports/erhua.
    if (!w.pinyin || syllables.length !== chars.length || !/^\p{Script=Han}+$/u.test(w.text)) { finish(); return }
    let offset = w.start
    chars.forEach((char, i) => { const tone = toneNumber(syllables[i]); group.push({ char, word, syllable: syllables[i], tone, surface: tone, notes: [], offset }); offset += char.length })
    if (mode === 'word' || breaks.has(w.end)) finish()
  })
  finish()
  return result
}
