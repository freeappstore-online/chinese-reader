import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { analyze, health, synthesize } from './model.ts'

export function createReaderServer() {
  let busy = false
  const origins = new Set(['https://chinese-reader.freeappstore.online', 'http://localhost:5173', 'http://127.0.0.1:5173'])
  return createServer(async (req, res) => {
    const port = (req.socket.address() as { port: number }).port
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host || '') || !origins.has(req.headers.origin || '')) { res.writeHead(403); res.end('Origin not allowed'); return }
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin!)
    res.setHeader('Vary', 'Origin'); res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      res.setHeader('Access-Control-Allow-Private-Network', 'true')
      res.writeHead(204); res.end(); return
    }
    const json = (code: number, value: unknown) => { if (!res.destroyed) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)) } }
    if (req.method === 'GET' && req.url === '/health') { try { json(200, await health()) } catch { json(500, { error: 'Invalid runner configuration.' }) } return }
    if (req.method !== 'POST' || !['/analyze', '/speech'].includes(req.url || '')) { json(404, { error: 'Not found' }); return }
    if (busy) { json(409, { error: 'The reader model is already processing a request. Try again after it finishes.' }); return }
    if (!req.headers['content-type']?.startsWith('application/json')) { json(415, { error: 'Expected JSON' }); return }
    busy = true
    const controller = new AbortController()
    res.on('close', () => { if (!res.writableEnded) controller.abort() })
    try {
      const chunks: Buffer[] = []; let size = 0
      for await (const chunk of req) { size += chunk.length; if (size > 2_000_000) throw new Error('Request exceeds 2 MB.'); chunks.push(chunk) }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (req.url === '/analyze') json(200, await analyze(body, controller.signal))
      else { const audio = await synthesize(body, controller.signal); if (!res.destroyed) { res.writeHead(200, { 'Content-Type': audio.type }); res.end(Buffer.from(audio.bytes)) } }
    } catch (e) { json(400, { error: e instanceof Error ? e.message : 'Local processing failed.' }) }
    finally { busy = false }
  })
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createReaderServer()
  server.listen(18791, '127.0.0.1', () => process.stdout.write('Chinese Reader companion listening on 127.0.0.1:18791. Press Ctrl+C to stop.\n'))
}
