import assert from 'node:assert/strict'
import { test } from 'node:test'
import { gunzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { makeLesson, parseDictionary, validateLesson, SAMPLE } from '../web/src/core.ts'
import { CATALOG, makeCatalogLesson, catalogFor, LEVELS } from '../web/src/data/catalog.ts'

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
test('beginner annotations prefer useful definitions and do not join words across a time expression', () => {
  const family = makeLesson('我家有四个人。', 'Family', dictionary)
  assert.match(family.sentences[0].words.find(w => w.text === '家')!.meaning, /^home/)
  assert.ok(!family.sentences[0].words.some(w => w.text === '个人'))
  const meeting = makeLesson('下午三点见面，好吗？', 'Meet', dictionary)
  assert.ok(!meeting.sentences[0].words.some(w => w.text === '点见'))
  assert.ok(meeting.sentences[0].words.some(w => w.text === '见面'))
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
test('all starter texts keep aligned translations, source offsets, labels and curated pronunciation on export/import', () => {
  assert.equal(CATALOG.length, 34)
  assert.equal(new Set(CATALOG.map(e => e.id)).size, CATALOG.length)
  assert.equal(CATALOG.filter(e => e.source).length, 16)
  assert.deepEqual(new Set(CATALOG.map(e => e.level)), new Set(LEVELS))
  for (const entry of CATALOG) {
    const lesson = validateLesson(JSON.parse(JSON.stringify(makeCatalogLesson(entry, dictionary))))
    assert.equal(lesson.source, 'library')
    assert.equal(catalogFor(lesson)?.id, entry.id)
    assert.deepEqual(lesson.tags, entry.tags)
    entry.lines.forEach(([text, translation, pronunciation], i) => {
      assert.equal(lesson.sentences[i].text, text)
      assert.equal(lesson.sentences[i].translation, translation)
      assert.equal(lesson.sentences[i].words.map(w => w.text).join(''), text)
      if (pronunciation) assert.equal(lesson.sentences[i].words.filter(w => w.pinyin).map(w => w.pinyin).join(' '), pronunciation)
    })
  }
  const analects = makeCatalogLesson(CATALOG.find(e => e.id === 'analects-learning')!, dictionary)
  assert.equal(analects.sentences[0].words.find(w => w.text === '說')?.pinyin, 'yuè')
  assert.match(analects.sentences[0].words.find(w => w.text === '說')?.meaning || '', /pleased/)
  assert.throws(() => validateLesson({ ...analects, tags: ['x'.repeat(33)] }), /labels/)
  assert.throws(() => validateLesson({ ...analects, tags: [42] }), /labels/)
  assert.equal(catalogFor({ ...analects, text: 'Different text' }), undefined)
})

test('empty and null-shaped lesson imports fail with useful validation errors', () => {
  const lesson = makeLesson('你好。', 'A', dictionary)
  for (const value of [{ ...lesson, text: '', sentences: [] }, { ...lesson, sentences: [null] }, { ...lesson, sentences: [{ ...lesson.sentences[0], words: [null] }] }]) {
    assert.throws(() => validateLesson(value), error => error instanceof Error && !(error instanceof TypeError) && /lesson|annotations/.test(error.message))
  }
})
