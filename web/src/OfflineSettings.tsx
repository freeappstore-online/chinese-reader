import { useEffect, useRef, useState } from 'react'
import { Card } from '@freeappstore/sdk/ui'
type Manifest = { version: string; bytes: number; files: { url: string; bytes: number }[] }
export function OfflineSettings() {
  const [message, setMessage] = useState('Checking offline files…'), [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false), [size, setSize] = useState(''), [persistent, setPersistent] = useState(false)
  const working = useRef(false)
  async function check(keep = false) {
    if (import.meta.env.DEV) { setMessage('Offline installation is available in the published app.'); return }
    if (working.current) return
    working.current = true
    setBusy(true); setReady(false)
    try {
      if (!('serviceWorker' in navigator) || !('caches' in window)) throw new Error('This browser cannot save the app offline. Open it in Safari or Chrome.')
      if (keep && navigator.storage?.persist) setPersistent(await navigator.storage.persist())
      else if (navigator.storage?.persisted) setPersistent(await navigator.storage.persisted())
      const response = await fetch('/offline-manifest.json')
      if (!response.ok) throw new Error('Connect once to download the offline files.')
      const manifest: Manifest = await response.json()
      setSize(`${(manifest.bytes / 1e6).toFixed(1)} MB`)
      const registration = await navigator.serviceWorker.getRegistration()
      if (keep && registration) await registration.update().catch(() => {})
      const names = (await caches.keys()).filter(name => name.startsWith('workbox-precache'))
      const stored = new Set<string>()
      for (const name of names) for (const key of await (await caches.open(name)).keys()) stored.add(new URL(key.url).pathname)
      let missing = manifest.files.filter(file => !stored.has(encodeURI(file.url)))
      if (keep && navigator.onLine && navigator.serviceWorker.controller && missing.length) {
        setMessage(`Repairing offline download: ${missing.length} files remaining…`)
        // Requests through the active precache route restore missing cache entries.
        for (let i = 0; i < missing.length; i += 4) await Promise.all(missing.slice(i, i + 4).map(async file => {
          const result = await fetch(file.url)
          if (!result.ok) throw new Error('Some offline files could not download. Reconnect and try again.')
          await result.arrayBuffer()
        }))
        const remaining = []
        for (const file of missing) if (!await caches.match(file.url, { ignoreSearch: true })) remaining.push(file)
        missing = remaining
      }
      if (!missing.length && registration?.active) { setReady(true); setMessage('Ready offline · reading, built-in Mandarin speech, dictionary and 9,574 stroke diagrams are saved.') }
      else setMessage(`Downloading offline files: ${manifest.files.length - missing.length} of ${manifest.files.length} saved. Keep this page open while connected, then check again.${registration?.waiting ? ' An update is ready; close all reader tabs and reopen.' : ''}`)
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Offline download could not be checked. Reconnect and try again.') }
    finally { working.current = false; setBusy(false) }
  }
  useEffect(() => { void check(); const timer = setInterval(() => void check(), 5000); return () => clearInterval(timer) }, [])
  return <Card><div className="space-y-4"><h2 className="text-xl font-semibold">Offline readiness</h2><p role="status" className={ready ? 'text-success' : 'text-muted'}>{message}</p>{size && <p className="text-sm">One-time download: about {size}. No separate voice installation is needed.</p>}<button disabled={busy} onClick={() => void check(true)} className="min-h-11 rounded-xl border border-line-strong bg-panel px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Checking…' : 'Check download & keep offline'}</button><p className="text-sm text-muted">{persistent ? 'Persistent storage is enabled for this browser.' : 'The button also asks your browser to retain the download. Your browser controls storage retention.'} Clearing this site’s data removes its downloads and saved readings.</p><p className="text-sm text-muted">All included translations and saved lesson translations work offline. New full-sentence translations require your local model; pinyin and dictionary meanings work on this device. The built-in voice is synthetic.</p><a className="text-sm underline" href="/voice/espeak-1-49-1/NOTICE.txt">Offline voice credits & source</a></div></Card>
}
