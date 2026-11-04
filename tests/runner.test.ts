import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer, request } from 'node:http'
import { once } from 'node:events'
import { analyze, localUrl } from '../runner/model.ts'
import { createReaderServer } from '../runner/server.ts'
import { makeLesson } from '../web/src/core.ts'

test('local model preserves source and rejects malformed or changed annotations', async () => {
  const previous = { url: process.env.CHINESE_OLLAMA_URL, model: process.env.CHINESE_MODEL }
  let corrupt = false, longGloss = false, invalidMeaning = false, malformed: unknown = undefined
  const model = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk
    const prompt = JSON.parse(body)
    assert.equal(prompt.stream, false)
    const material = JSON.parse(prompt.messages[1].content)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ done: true, message: { content: JSON.stringify(malformed === undefined ? { translation: 'Hello.', words: material.words.map((text: string) => ({ text: corrupt ? '替换' : text, pinyin: text === '。' ? '' : 'nǐ', meaning: invalidMeaning ? null : 'a greeting used when meeting someone', gloss: longGloss ? 'a greeting' : 'hello' })) } : malformed) } }))
  }).listen(0, '127.0.0.1')
  await once(model, 'listening')
  process.env.CHINESE_OLLAMA_URL = `http://127.0.0.1:${(model.address() as { port: number }).port}`
  process.env.CHINESE_MODEL = 'synthetic-test-model'
  try {
    const input = makeLesson('你好。', 'Test', new Map())
    const output = await analyze(input, new AbortController().signal)
    assert.equal(output.text, input.text); assert.equal(output.id, input.id)
    assert.equal(output.source, 'model'); assert.equal(output.sentences[0].translation, 'Hello.')
    assert.deepEqual(output.sentences[0].words.map(w => w.pinyin), input.sentences[0].words.map(w => w.pinyin))
    assert.equal(output.sentences[0].words[0].gloss, 'hello')
    assert.equal(output.sentences[0].words[0].meaning, 'a greeting used when meeting someone')
    invalidMeaning = true
    await assert.rejects(analyze(input, new AbortController().signal), /invalid full meaning/)
    invalidMeaning = false
    longGloss = true
    await assert.rejects(analyze(input, new AbortController().signal), /one English word/)
    longGloss = false
    for (const value of [null, { translation: 3, words: [] }, { translation: 'Hello', words: [null] }, { translation: 'Hello', words: [{ text: '你好', gloss: 'hello', meaning: null }] }]) {
      malformed = value
      await assert.rejects(analyze(input, new AbortController().signal), error => error instanceof Error && !(error instanceof TypeError))
    }
    malformed = undefined
    corrupt = true
    await assert.rejects(analyze(input, new AbortController().signal), /changed or omitted/)
    const controller = new AbortController(); controller.abort()
    await assert.rejects(analyze(input, controller.signal))
  } finally {
    model.closeAllConnections(); model.close()
    if (previous.url === undefined) delete process.env.CHINESE_OLLAMA_URL; else process.env.CHINESE_OLLAMA_URL = previous.url
    if (previous.model === undefined) delete process.env.CHINESE_MODEL; else process.env.CHINESE_MODEL = previous.model
  }
})
test('bridge rejects foreign origins, rebinding hosts and cloud endpoints', async () => {
  assert.throws(() => localUrl('https://api.example.com/v1/chat'), /loopback/)
  assert.throws(() => localUrl('http://127.0.0.1.evil.test/'), /loopback/)
  const server = createReaderServer().listen(0, '127.0.0.1'); await once(server, 'listening')
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  try {
    assert.equal((await fetch(`${base}/health`)).status, 403)
    assert.equal((await fetch(`${base}/health`, { headers: { Origin: 'https://evil.test' } })).status, 403)
    const reboundStatus = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(`${base}/health`, { headers: { Origin: 'https://chinese-reader.freeappstore.online', Host: 'evil.test' } }, res => { res.resume(); resolve(res.statusCode) })
      req.on('error', reject); req.end()
    })
    assert.equal(reboundStatus, 403)
    const preflight = await fetch(`${base}/analyze`, { method: 'OPTIONS', headers: { Origin: 'https://chinese-reader.freeappstore.online' } })
    assert.equal(preflight.status, 204)
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://chinese-reader.freeappstore.online')
    assert.equal((await fetch(`${base}/speech`, { method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: '{broken' })).status, 400)
  } finally { server.closeAllConnections(); server.close() }
})
