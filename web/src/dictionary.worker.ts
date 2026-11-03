import { makeLesson, parseDictionary, type Dictionary } from './core'
let dictionary: Promise<Dictionary> | undefined
function load() {
  return dictionary ||= (async () => {
    const response = await fetch('/dictionary/cedict.bin')
    if (!response.ok) throw new Error('The dictionary could not be loaded. Reconnect and try again.')
    const bytes = await response.arrayBuffer()
    const gz = new Uint8Array(bytes)[0] === 0x1f
    const text = gz ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text() : new TextDecoder().decode(bytes)
    return parseDictionary(text)
  })().catch(e => { dictionary = undefined; throw e })
}
self.onmessage = async ({ data }) => {
  try { self.postMessage({ id: data.id, lesson: makeLesson(data.text, data.title, await load()) }) }
  catch (e) { self.postMessage({ id: data.id, error: e instanceof Error ? e.message : 'Could not prepare text.' }) }
}
