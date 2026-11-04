import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { makeLesson, parseDictionary, validateLesson, flatten } from '../web/src/core.ts'
import { CATALOG, makeCatalogLesson } from '../web/src/data/catalog.ts'
import { phraseBreaks, phraseOffsets, practiceUnit } from '../web/src/practice.ts'
import { suggestedPhrases } from '../web/src/data/phrases.ts'
const dictionary = parseDictionary(gunzipSync(readFileSync('web/public/dictionary/cedict.bin')).toString())
test('authored phrase boundaries preserve every source character and never split annotated words', () => {
  for (const entry of CATALOG) {
    const lesson = validateLesson(makeCatalogLesson(entry, dictionary))
    entry.lines.forEach(([text, , , marks], i) => {
      const marked = marks || suggestedPhrases.get(text)
      if (marked) assert.deepEqual(phraseBreaks(lesson.sentences[i]), phraseOffsets(marked).offsets, text)
    })
    const words = flatten(lesson)
    for (const grouping of ['text', '2', '3'] as const) {
      let start = 0, result = ''
      while (start < words.length) {
        const unit = practiceUnit(lesson, start, 'phrase', grouping)
        assert.ok(unit.end > start)
        assert.equal(words[start].sentence, words[unit.end - 1].sentence)
        result += unit.text; start = unit.end
      }
      assert.equal(result, lesson.sentences.map(s => s.text).join(''))
    }
  }
})
test('word, phrase, fixed groups and sentence modes have distinct boundaries; custom breaks round-trip', () => {
  const lesson = makeLesson('今天下午，我想喝茶。明天我去学校。', 'Practice', dictionary)
  assert.equal(practiceUnit(lesson, 0, 'word', 'text').text, '今天')
  assert.equal(practiceUnit(lesson, 0, 'phrase', 'text').text, '今天下午，')
  assert.equal(practiceUnit(lesson, 0, 'sentence', 'text').text, '今天下午，我想喝茶。')
  const phrase = practiceUnit(lesson, 0, 'phrase', '2')
  assert.equal(phrase.text, '今天下午，')
  lesson.sentences[0].pauseAfter = [2]
  assert.equal(practiceUnit(validateLesson(JSON.parse(JSON.stringify(lesson))), 0, 'phrase', 'text').text, '今天')
  lesson.sentences[0].pauseAfter = [1]
  assert.throws(() => validateLesson(lesson), /word boundaries/)
})
test('all stroke shards decode and cover common and less-common characters without external requests', () => {
  let count = 0
  for (let i = 0; i < 32; i++) {
    const data = JSON.parse(gunzipSync(readFileSync(`web/public/strokes/v2/${i.toString(16).padStart(2, '0')}.bin`)).toString())
    count += Object.keys(data).length
    for (const [char, value] of Object.entries(data) as [string, { strokes: string[]; medians: unknown[] }][]) {
      assert.equal(char.codePointAt(0)! % 32, i)
      assert.equal(value.strokes.length, value.medians.length)
    }
  }
  assert.equal(count, 9574)
})
