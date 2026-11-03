import assert from 'node:assert/strict'
import { test } from 'node:test'
import { gunzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { makeLesson, parseDictionary, validateLesson, SAMPLE } from '../web/src/core.ts'

const dictionary = parseDictionary(gunzipSync(readFileSync(new URL('../web/public/dictionary/cedict.bin', import.meta.url))).toString())
test('actual dictionary annotates simplified, traditional and polyphonic words with exact source offsets', () => {
  const lesson = makeLesson('我去银行。\n重慶的銀行很好！😀你好，AI 2026。', 'Test', dictionary)
  assert.equal(lesson.sentences.length, 3)
  assert.match(lesson.sentences[0].words.find(w => w.text === '银行')!.pinyin, /háng/)
  assert.match(lesson.sentences[1].words.find(w => w.text === '重慶')!.pinyin, /chóng/)
  for (const sentence of lesson.sentences) {
    assert.equal(sentence.words.map(w => w.text).join(''), sentence.text)
    for (const word of sentence.words) assert.equal(sentence.text.slice(word.start, word.end), word.text)
  }
  assert.equal(validateLesson(lesson).text, lesson.text)
})
test('unprocessed text never fabricates a sentence translation', () => {
  const lesson = makeLesson('我今天去了公园。', 'Reading', dictionary)
  assert.equal(lesson.source, 'dictionary')
  assert.equal(lesson.sentences[0].translation, '')
  assert.ok(lesson.sentences[0].words.some(w => w.meaning))
  assert.ok(makeLesson(SAMPLE, 'Sample', dictionary).sentences.every(s => s.translation))
})
test('invalid imports, overwritten source, excess text and missing content are rejected', () => {
  const lesson = makeLesson('你好。', 'A', dictionary)
  const bad = structuredClone(lesson); bad.sentences[0].words[0].text = '再见'
  assert.throws(() => validateLesson(bad), /match|annotation/)
  assert.throws(() => validateLesson({ ...lesson, sentences: [] }), /match/)
  const wrongPinyin = structuredClone(lesson); wrongPinyin.sentences[0].words[0].pinyin = '你好'
  assert.throws(() => validateLesson(wrongPinyin), /Pinyin/)
  assert.throws(() => makeLesson('中'.repeat(12001), 'A', dictionary), /12,000/)
  assert.throws(() => makeLesson('', 'A', dictionary))
  assert.throws(() => makeLesson('only English', 'A', dictionary), /Chinese/)
})
