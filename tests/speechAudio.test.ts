import assert from 'node:assert/strict'
import { test } from 'node:test'
import { playSpeechAudio } from '../web/src/speechAudio.ts'

test('local recordings settle on completion, cancellation, errors and a stalled player, releasing resources', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Audio')
  const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL
  let sound: FakeAudio, revoked = 0
  class FakeAudio {
    duration = 3; playbackRate = 1; paused = false; cleared = false
    onended: (() => void) | null = null; onerror: (() => void) | null = null; onloadedmetadata: (() => void) | null = null
    constructor() { sound = this }
    async play() {}
    pause() { this.paused = true }
    removeAttribute() { this.cleared = true }
    load() {}
  }
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: FakeAudio })
  URL.createObjectURL = () => 'blob:test'; URL.revokeObjectURL = () => { revoked++ }
  t.mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const completed = playSpeechAudio(new Blob(), .5, new AbortController().signal)
    sound!.onended!(); assert.equal(await completed, 6)
    assert.equal(sound!.paused, true); assert.equal(sound!.cleared, true)
    const controller = new AbortController(), cancelled = playSpeechAudio(new Blob(), 1, controller.signal)
    controller.abort(); await assert.rejects(cancelled, { name: 'AbortError' })
    assert.equal(sound!.onended, null); assert.equal(sound!.paused, true)
    const failed = playSpeechAudio(new Blob(), 1, new AbortController().signal)
    sound!.onerror!(); await assert.rejects(failed, /could not play/)
    const stalled = playSpeechAudio(new Blob(), 1, new AbortController().signal)
    const rejected = assert.rejects(stalled, /could not play/)
    t.mock.timers.tick(20000); await rejected
    assert.equal(revoked, 4)
  } finally {
    t.mock.timers.reset(); URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke
    if (original) Object.defineProperty(globalThis, 'Audio', original); else Reflect.deleteProperty(globalThis, 'Audio')
  }
})
