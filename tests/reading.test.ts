import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { makeLesson, parseDictionary, validateLesson, type Sentence } from '../web/src/core.ts'
import { spokenPronunciation } from '../web/src/pronunciation.ts'
import { readingGloss, isReadingGloss } from '../web/src/gloss.ts'
import { CATALOG, makeCatalogLesson, refreshCatalogCues } from '../web/src/data/catalog.ts'
const dictionary = parseDictionary(gunzipSync(readFileSync('web/public/dictionary/cedict.bin')).toString())
function sentence(parts: [string, string][], breaks: number[] = []): Sentence {
  let offset = 0
  return { text: parts.map(p => p[0]).join(''), translation: '', pauseAfter: breaks, words: parts.map(([text, pinyin]) => { const start = offset; offset += text.length; return { text, pinyin, meaning: '', start, end: offset } }) }
}
const tones = (s: Sentence, mode: 'word' | 'phrase' = 'phrase') => spokenPronunciation(s, mode, 'text').map(w => w.pinyin)
test('spoken guides preserve dictionary pinyin and respect practice, punctuation and phrase boundaries', () => {
  const s = sentence([['你好', 'nǐ hǎo'], ['很', 'hěn'], ['好', 'hǎo']], [2])
  assert.deepEqual(tones(s), ['ní hǎo', 'hén', 'hǎo'])
  assert.deepEqual(tones(s, 'word'), ['ní hǎo', 'hěn', 'hǎo'])
  assert.deepEqual(s.words.map(w => w.pinyin), ['nǐ hǎo', 'hěn', 'hǎo'])
  assert.deepEqual(tones(sentence([['很', 'hěn'], ['好', 'hǎo']], [1])), ['hěn', 'hǎo'])
  assert.deepEqual(tones(sentence([['很', 'hěn'], ['，', ''], ['好', 'hǎo']])), ['hěn', '', 'hǎo'])
  const long = sentence([['我', 'wǒ'], ['很', 'hěn'], ['好', 'hǎo']])
  assert.deepEqual(tones(long), ['wǒ', 'hén', 'hǎo'])
  assert.match(spokenPronunciation(long, 'phrase', 'text')[0].notes[0], /vary/)
  assert.deepEqual(tones(sentence([['展览', 'zhǎn lǎn'], ['馆', 'guǎn']])), ['zhán lán', 'guǎn'])
  assert.deepEqual(tones(sentence([['花儿', 'huār']])), ['huār'])
})
test('一 and 不 apply common sandhi, neutral repetition, numeric and ordinal exceptions', () => {
  for (const [text, base, expected] of [
    ['不是', 'bù shì', 'bú shì'], ['不好', 'bù hǎo', 'bù hǎo'], ['一天', 'yī tiān', 'yì tiān'], ['一碗', 'yī wǎn', 'yì wǎn'],
    ['一件', 'yī jiàn', 'yí jiàn'], ['一个', 'yī ge', 'yí ge'], ['第一天', 'dì yī tiān', 'dì yī tiān'], ['一月', 'yī yuè', 'yī yuè'],
    ['一二三', 'yī èr sān', 'yī èr sān'], ['星期一去', 'xīng qī yī qù', 'xīng qī yī qù'], ['看一看', 'kàn yī kàn', 'kàn yi kàn'], ['好不好', 'hǎo bù hǎo', 'hǎo bu hǎo'],
  ]) assert.deepEqual(tones(sentence([[text, base]])), [expected], text)
})
test('compact cues are single words; full meanings and imported contextual cues survive', () => {
  for (const [text, meaning, cue] of [['咖啡馆', 'coffee shop; café', 'café'], ['吃饭', 'to have a meal; to eat', 'eat'], ['姐姐', 'older sister', 'sister'], ['个', 'measure word', 'unit'], ['明天见', 'see you tomorrow; internet slang for food', 'goodbye']]) {
    assert.equal(readingGloss({ text, meaning }), cue)
  }
  const lesson = makeLesson('你好。', 'test', dictionary)
  lesson.sentences[0].words[0].gloss = 'greeting'
  const restored = validateLesson(JSON.parse(JSON.stringify(lesson)))
  assert.equal(readingGloss(restored.sentences[0].words[0]), 'greeting')
  assert.equal(restored.sentences[0].words[0].meaning, 'hello; hi')
  restored.sentences[0].words[0].gloss = 'a greeting'
  assert.throws(() => validateLesson(restored), /one English word/)
  assert.equal(readingGloss({ text: '𰻞', meaning: '' }), '—')
})
test('all library words have compact cues, with contextual corrections and compatible saved readings', () => {
  for (const entry of CATALOG) {
    const lesson = validateLesson(makeCatalogLesson(entry, dictionary))
    for (const sentence of lesson.sentences) for (const word of sentence.words.filter(w => w.pinyin)) {
      assert.ok(isReadingGloss(readingGloss(word, sentence.translation)), `${entry.id}: ${word.text}: ${readingGloss(word, sentence.translation)}`)
    }
  }
  const apple = makeLesson('苹果。', 'Fruit', dictionary).sentences[0].words[0]
  assert.equal(apple.meaning.split(';')[0], 'apple')
  const entry = CATALOG.find(e => e.id === 'visit-hermit')!
  const old = makeCatalogLesson(entry, dictionary); old.sentences[0].words[0].meaning = 'Matsushita (name)'; delete old.sentences[0].words[0].gloss
  assert.equal(refreshCatalogCues(old).sentences[0].words[0].gloss, 'beneath')
})
