import { makeLesson, parseDictionary, type Dictionary } from './core'
import { CATALOG, makeCatalogLesson } from './data/catalog'
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
  try {
    const entry = data.catalogId ? CATALOG.find(e => e.id === data.catalogId) : undefined
    if (data.catalogId && !entry) throw new Error('That library text is unavailable.')
    const dictionary = await load()
    self.postMessage({ id: data.id, lesson: entry ? makeCatalogLesson(entry, dictionary) : makeLesson(data.text, data.title, dictionary) })
  }
  catch (e) { self.postMessage({ id: data.id, error: e instanceof Error ? e.message : 'Could not prepare text.' }) }
}
