import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeLesson, validateLesson } from '../web/src/core.ts'
import { captureWord, contextLesson, savedWordKey, savedWordsFile, validateSavedWords, loadSavedWords, storeSavedWords, SAVED_WORDS_KEY } from '../web/src/savedWords.ts'
const dict = new Map([['姐姐', [{ pinyin: 'jie3 jie5', meaning: 'older sister' }]], ['你好', [{ pinyin: 'ni3 hao3', meaning: 'hello; hi' }]]])
test('saved words keep an independent original sentence, meaning, position and translation', () => {
  const lesson = makeLesson('你好。姐姐看书。', 'My reading', dict)
  lesson.sentences[1].translation = 'My older sister reads.'
  lesson.sentences[1].words[0].gloss = 'sister'
  lesson.sentences[1].pauseAfter = [2]
  const saved = captureWord(lesson, 1, 0)
  lesson.sentences[1].translation = 'Changed later'
  lesson.sentences[1].words[0].meaning = 'Changed later'
  const restored = validateSavedWords(JSON.parse(JSON.stringify(savedWordsFile([saved]))))[0]
  assert.equal(restored.sentence.translation, 'My older sister reads.')
  assert.equal(restored.sentence.words[0].meaning, 'older sister')
  assert.equal(restored.sentence.words[0].gloss, 'sister')
  assert.deepEqual(restored.sentence.pauseAfter, [2])
  assert.equal(validateLesson(contextLesson(restored)).text, '姐姐看书。')
  assert.equal(contextLesson(restored).position, 0)
  assert.throws(() => captureWord(lesson, 0, 1), /Chinese word/)
})
test('backups deduplicate words by pronunciation, retaining distinct polyphones and the first context', () => {
  const first = captureWord(makeLesson('你好。', 'First', dict), 0, 0)
  const later = { ...first, title: 'Later' }
  const restored = validateSavedWords(savedWordsFile([first, later]))
  assert.equal(restored.length, 1); assert.equal(restored[0].title, 'First')
  assert.equal(savedWordKey({ text: '你好', pinyin: 'NǏ  HǍO' }), savedWordKey({ text: '你好', pinyin: 'nǐ hǎo' }))
  assert.notEqual(savedWordKey({ text: '行', pinyin: 'háng' }), savedWordKey({ text: '行', pinyin: 'xíng' }))
  for (const bad of [{ ...first, wordIndex: 99 }, { ...first, wordIndex: -1 }, { ...first, savedAt: null }, { ...first, sentence: { ...first.sentence, text: '再见。' } }]) {
    assert.throws(() => validateSavedWords(savedWordsFile([first, bad as typeof first])))
  }
})
test('unreadable saved-word data stays untouched; failed writes never report success', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } })
  try {
    const saved = captureWord(makeLesson('你好。', 'First', dict), 0, 0)
    storeSavedWords([saved]); assert.equal(loadSavedWords()[0].key, saved.key)
    values.set(SAVED_WORDS_KEY, '{broken')
    assert.throws(loadSavedWords, /existing data has been kept/)
    assert.equal(values.get(SAVED_WORDS_KEY), '{broken')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem: () => { throw new Error('Quota exceeded') } } })
    assert.throws(() => storeSavedWords([saved]), /could not save/)
  } finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else Reflect.deleteProperty(globalThis, 'localStorage') }
})
