import { useEffect, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'

export function StrokePanel({ text }: { text: string }) {
  const characters = [...text].filter(c => /\p{Script=Han}/u.test(c))
  const [selected, setSelected] = useState(0), [error, setError] = useState('')
  const target = useRef<HTMLDivElement>(null), writer = useRef<HanziWriter | null>(null)
  const char = characters[Math.min(selected, characters.length - 1)]
  useEffect(() => { setSelected(0) }, [text])
  useEffect(() => {
    if (!target.current || !char) return
    let alive = true
    const controller = new AbortController()
    target.current.replaceChildren(); setError('')
    const colors = getComputedStyle(document.documentElement)
    const color = (name: string) => {
      const value = colors.getPropertyValue(name).trim()
      // Vite minifies rgba tokens to 8-digit hex; Hanzi Writer's parser needs rgba.
      if (/^#[\da-f]{8}$/i.test(value)) return `rgba(${parseInt(value.slice(1, 3), 16)},${parseInt(value.slice(3, 5), 16)},${parseInt(value.slice(5, 7), 16)},${parseInt(value.slice(7, 9), 16) / 255})`
      return value
    }
    const w = HanziWriter.create(target.current, char, {
      width: 160, height: 160, padding: 12, showOutline: true, strokeAnimationSpeed: 1,
      strokeColor: color('--ink'), radicalColor: color('--accent'), outlineColor: color('--line-strong'),
      charDataLoader: (c, success, failure) => {
        // Bundled common characters first; other characters use the pinned public dataset.
        fetch(`/characters/${encodeURIComponent(c)}.json`, { signal: controller.signal }).then(async r => {
          if (!r.ok || !r.headers.get('content-type')?.includes('json')) r = await fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodeURIComponent(c)}.json`, { signal: controller.signal, credentials: 'omit' })
          if (!r.ok) throw new Error('Unavailable')
          const data = await r.json()
          if (!Array.isArray(data.strokes)) throw new Error('Unavailable')
          if (alive) success(data)
        }).catch(() => { if (alive) { setError('Stroke data unavailable for this character. Reconnect to load it.'); failure() } })
      },
    })
    writer.current = w
    return () => { alive = false; controller.abort(); w.pauseAnimation(); w.cancelQuiz(); target.current?.replaceChildren() }
  }, [char])
  if (!char) return <p className="text-sm text-muted">Select a Chinese word to explore its characters.</p>
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">{characters.map((c, i) => <button key={i} onClick={() => setSelected(i)} aria-pressed={i === selected} className={`min-h-11 min-w-11 rounded-lg border text-2xl ${i === selected ? 'border-accent bg-accent-soft text-accent-deep' : 'border-line bg-panel'}`}>{c}</button>)}</div>
    <div className="flex flex-wrap items-center gap-3">
      <div ref={target} aria-label={`Stroke order for ${char}`} className="h-40 w-40 shrink-0 rounded-xl border border-dashed border-line-strong bg-paper" />
      <div className="flex flex-col gap-2"><button className="min-h-11 rounded-lg border border-line bg-panel px-3 text-sm" disabled={!!error} onClick={() => { writer.current?.cancelQuiz(); void writer.current?.animateCharacter() }}>Animate strokes</button><button className="min-h-11 rounded-lg border border-line bg-panel px-3 text-sm" disabled={!!error} onClick={() => writer.current?.quiz()}>Trace character</button></div>
    </div>
    {error && <p className="text-sm text-muted">{error}</p>}
  </div>
}
