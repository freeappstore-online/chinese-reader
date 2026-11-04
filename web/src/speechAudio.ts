/** Play one locally generated recording. Every exit path releases the URL,
 * cancels playback and detaches listeners, including a stalled audio element. */
export async function playSpeechAudio(blob: Blob, rate: number, signal: AbortSignal): Promise<number> {
  signal.throwIfAborted()
  const url = URL.createObjectURL(blob), sound = new Audio(url)
  sound.playbackRate = rate
  try {
    return await new Promise<number>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>
      const cleanup = () => { clearTimeout(timer); sound.onended = null; sound.onerror = null; sound.onloadedmetadata = null; signal.removeEventListener('abort', cancel) }
      const fail = () => { cleanup(); reject(new Error('Local audio could not play.')) }
      const cancel = () => { cleanup(); reject(new DOMException('Playback cancelled', 'AbortError')) }
      const watchdog = () => {
        clearTimeout(timer)
        const duration = Number.isFinite(sound.duration) && sound.duration > 0 ? sound.duration / rate : 0
        timer = setTimeout(fail, Math.max(20000, (duration + 5) * 1000))
      }
      sound.onloadedmetadata = watchdog
      sound.onended = () => { cleanup(); resolve(sound.duration / rate) }
      sound.onerror = fail
      signal.addEventListener('abort', cancel, { once: true })
      watchdog(); sound.play().catch(fail)
    })
  } finally { sound.pause(); sound.removeAttribute('src'); sound.load(); URL.revokeObjectURL(url) }
}
