// The standalone, separately licensed eSpeak worker communicates through messages.
let engine: Promise<Worker> | undefined
let audioContext: AudioContext | undefined
let request = 0
export function unlockOfflineAudio() {
  if (!globalThis.AudioContext) return
  audioContext ||= new AudioContext()
  void audioContext.resume().catch(() => {})
}
function getEngine() {
  return engine ||= new Promise<Worker>((resolve, reject) => {
    const worker = new Worker('/voice/espeak-1-49-1/espeakng.worker.js')
    const fail = () => { clearTimeout(timer); worker.terminate(); engine = undefined; reject(new Error('Offline voice could not load. Open Profile and check Offline readiness.')) }
    const timer = setTimeout(fail, 20000)
    worker.onerror = fail
    worker.onmessage = ({ data }) => {
      if (data !== 'ready') return
      clearTimeout(timer); worker.onmessage = null
      worker.postMessage({ method: 'set_voice', args: ['zh'] })
      worker.postMessage({ method: 'set_rate', args: [165] })
      resolve(worker)
    }
  })
}
export async function synthesizeOffline(text: string, signal: AbortSignal, rate = 1): Promise<Float32Array> {
  signal.throwIfAborted()
  const worker = await getEngine()
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const callback = `speech-${++request}`, chunks: Float32Array[] = []
    const cleanup = () => { clearTimeout(timer); worker.removeEventListener('message', receive); worker.removeEventListener('error', failed); signal.removeEventListener('abort', cancelled) }
    const cancelled = () => { cleanup(); reject(new DOMException('Playback cancelled', 'AbortError')) }
    const failed = () => { cleanup(); worker.terminate(); engine = undefined; reject(new Error('Offline speech could not be generated. Try a shorter phrase.')) }
    const timer = setTimeout(failed, 20000)
    const receive = ({ data }: MessageEvent) => {
      if (data.callback !== callback) return
      if (data.result?.[0] instanceof ArrayBuffer) chunks.push(new Float32Array(data.result[0]))
      if (!data.done) return
      cleanup()
      // eSpeak's worker sends interleaved stereo at 22050 Hz; retain one channel.
      const length = chunks.reduce((n, c) => n + c.length / 2, 0)
      if (!length) { reject(new Error('The offline voice returned no audio.')); return }
      const mono = new Float32Array(length)
      let offset = 0
      for (const chunk of chunks) for (let i = 0; i < chunk.length; i += 2) mono[offset++] = chunk[i]
      resolve(mono)
    }
    worker.addEventListener('message', receive); worker.addEventListener('error', failed)
    signal.addEventListener('abort', cancelled, { once: true })
    worker.postMessage({ method: 'set_rate', args: [Math.round(165 * rate)] })
    worker.postMessage({ method: 'synthesize', args: [text], callback })
  })
}
export async function playOffline(text: string, rate: number, signal: AbortSignal) {
  const samples = await synthesizeOffline(text, signal, rate)
  signal.throwIfAborted()
  const context = audioContext
  if (!context || context.state !== 'running') throw new Error('Tap Listen again to enable offline audio on this device.')
  const buffer = context.createBuffer(1, samples.length, 22050)
  buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0)
  const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination)
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => { signal.removeEventListener('abort', cancel); source.disconnect() }
    const cancel = () => { source.onended = null; source.stop(); cleanup(); reject(new DOMException('Playback cancelled', 'AbortError')) }
    source.onended = () => { cleanup(); resolve() }
    signal.addEventListener('abort', cancel, { once: true }); source.start()
  })
  return buffer.duration
}
