import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react'
import { initApp } from '@freeappstore/sdk'
import { Badge, Card, PageHeader, Shell, type NavItem } from '@freeappstore/sdk/ui'
import { download, flatten, MAX_TEXT, SAMPLE, validateLesson, type Lesson } from './core'
import { loadLibrary, saveLibrary } from './storage'
import { usePlayer } from './usePlayer'
import { useReadingSettings } from './useReadingSettings'
import { ProfileSettings, ProfileIcon } from './ProfileSettings'
import { ToneGuide } from './ToneGuide'
import { StrokePanel } from './StrokePanel'
import { enrich, runnerStatus } from './runner'

const localReader = ['localhost', '127.0.0.1'].includes(location.hostname)
const fas = initApp({ appId: 'chinese-reader' })
fas.log.destroy() // Reading content stays local; disable background diagnostic uploads.
const NAV: NavItem[] = [{ label: 'Read', href: '/', title: 'Chinese Reader' }, { label: 'Library', href: '/library', title: 'Library · Chinese Reader' }, { label: 'Profile', href: '/profile', title: 'Profile · Chinese Reader' }]
function Button({ primary, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return <button {...props} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold disabled:cursor-wait disabled:opacity-50 ${primary ? 'border-accent bg-accent text-paper hover:bg-accent-hover' : 'border-line-strong bg-panel text-ink hover:bg-paper-deep'} ${className}`} />
}
const field = 'w-full min-h-11 rounded-xl border border-line-strong bg-paper px-3 py-2 text-ink'

export default function App() {
  const [path, setPath] = useState(location.pathname)
  const [lesson, setLesson] = useState<Lesson | null>(null), [library, setLibrary] = useState<Lesson[]>([])
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [editing, setEditing] = useState(true)
  const [text, setText] = useState(''), [title, setTitle] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const reading = useReadingSettings()
  const { showPinyin, showMeanings, follow, showTones } = reading
  const [modelWorking, setModelWorking] = useState(false), [modelNotice, setModelNotice] = useState('')
  const [status, setStatus] = useState<Awaited<ReturnType<typeof runnerStatus>> | null>(null)
  const worker = useRef<Worker | null>(null), requestId = useRef(0), active = useRef<HTMLElement | null>(null)
  const modelAbort = useRef<AbortController | null>(null)
  const player = usePlayer(lesson)
  const words = lesson ? flatten(lesson) : [], currentIndex = selected ?? player.index, current = words[currentIndex]
  let runningOffset = 0
  const sentenceStarts = lesson?.sentences.map(s => { const start = runningOffset; runningOffset += s.words.length; return start }) || []
  const libraryRef = useRef(library); libraryRef.current = library

  useEffect(() => {
    try { setLibrary(loadLibrary()) } catch (e) { setError((e as Error).message) }
    const w = new Worker(new URL('./dictionary.worker.ts', import.meta.url), { type: 'module' }); worker.current = w
    w.onmessage = ({ data }) => {
      if (data.id !== requestId.current) return
      setBusy(false)
      if (data.error) setError(data.error)
      else { setLesson(data.lesson); setEditing(false); setSelected(null) }
    }
    w.onerror = () => { setBusy(false); setError('The dictionary could not start. Reload and try again.') }
    const pop = () => { player.pause(); setPath(location.pathname) }
    addEventListener('popstate', pop)
    return () => { w.terminate(); modelAbort.current?.abort(); removeEventListener('popstate', pop) }
  }, [])
  useEffect(() => {
    if (player.playing && follow) active.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [player.index, player.playing, follow])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLElement && (e.target.closest('button, input, textarea, select, a') || e.target.isContentEditable)) && path === '/' && !editing) { e.preventDefault(); player.toggle() }
    }
    addEventListener('keydown', key); return () => removeEventListener('keydown', key)
  }, [player.toggle, path, editing])
  useEffect(() => {
    if (!lesson || player.playing) return
    const saved = libraryRef.current.find(l => l.id === lesson.id)
    if (saved && saved.position !== player.index) {
      const next = libraryRef.current.map(l => l.id === lesson.id ? { ...l, position: player.index } : l)
      try { saveLibrary(next); setLibrary(next) } catch (e) { setError((e as Error).message) }
    }
  }, [player.playing, player.index, lesson?.id])
  function navigate(href: string) { player.pause(); history.pushState(null, '', href); setPath(href); window.scrollTo(0, 0) }
  function prepare(source = text, name = title) {
    player.pause(); setError(''); setBusy(true); modelAbort.current?.abort(); setModelNotice('')
    worker.current?.postMessage({ id: ++requestId.current, text: source, title: name })
  }
  function save() {
    if (!lesson) return
    const saved = { ...lesson, position: player.index }, next = [saved, ...library.filter(l => l.id !== saved.id)]
    try { saveLibrary(next); setLibrary(next); setError('') } catch (e) { setError((e as Error).message) }
  }
  async function importFile(file?: File) {
    if (!file) return
    setError('')
    try {
      if (file.size > 2_000_000) throw new Error('Choose a text or lesson file smaller than 2 MB.')
      const content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
      if (file.name.toLowerCase().endsWith('.json')) {
        const next = validateLesson(JSON.parse(content)); player.pause(); modelAbort.current?.abort(); ++requestId.current; setBusy(false); setLesson(next); setEditing(false); setSelected(null)
      } else { setText(content); setTitle(file.name.replace(/\.[^.]+$/, '')); prepare(content, file.name.replace(/\.[^.]+$/, '')) }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not import this file.') }
  }
  async function processModel() {
    if (!lesson) return
    if (!localReader) { setError('Use Export lesson, process it with the runner CLI, then import the result. Direct model processing requires the reader running locally; this hosted page cannot connect to localhost.'); return }
    player.pause(); setModelWorking(true); setModelNotice(''); setError('')
    const controller = new AbortController(); modelAbort.current = controller
    try { const next = await enrich(lesson, controller.signal); if (!controller.signal.aborted) { setLesson(next); setModelNotice('Contextual meanings and sentence translations are ready. Model output can be imperfect.') } }
    catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'The local model is unavailable.') }
    finally { if (modelAbort.current === controller) setModelWorking(false) }
  }
  async function checkRunner() {
    setModelNotice('Checking this computer…'); setStatus(null)
    try { const s = await runnerStatus(); setStatus(s); setModelNotice(s.available ? `Ready · ${s.model}` : 'Reader service found. Configure a downloaded local model before processing.') }
    catch { setModelNotice('Local service not reachable on this device. Start the companion on your runner, or import its processed lesson file.') }
  }
  const loaded = !editing && lesson
  return <Shell app={fas} appName="Chinese Reader" nav={NAV} onNavigate={navigate} headerActions={<button type="button" aria-label="Open profile" title="Profile & settings" onClick={() => navigate('/profile')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-accent-soft text-accent-deep"><ProfileIcon /></button>}>
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
      {error && <div role="alert" className="mb-5 rounded-xl border border-danger bg-danger-soft p-4 text-sm">{error}<button className="ml-4 min-h-11 underline" onClick={() => setError('')}>Dismiss</button></div>}
      {path === '/profile' || path === '/connection' ? <>
        <PageHeader title="Your profile" description="Your reading preferences, saved on this device." actions={<Button onClick={() => navigate('/')}>Back to reading</Button>} />
        <ProfileSettings player={player} reading={reading} localReader={localReader} />
        <h2 className="mt-8 text-2xl font-semibold">Local model & your data</h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card><div className="space-y-4"><Badge>Local processing</Badge><h2 className="text-xl font-semibold">Connect on this computer</h2><p className="text-sm leading-6 text-muted">The companion runs alongside your PAGS runner. It sends text only to an Ollama model on that computer. It does not use a paid AI API.</p><Button primary disabled={!localReader} onClick={checkRunner}>Check local connection</Button>{modelNotice && <p role="status" className="text-sm">{modelNotice}</p>}{status && <p className="text-sm text-muted">Local voice: {status.tts ? 'configured' : 'not configured — browser speech is available'}</p>}<p className="text-sm text-muted">Direct connection requires running both the reader and companion locally on the same computer. On this hosted site, export a lesson, process it with the runner CLI, then import the result. See setup instructions below.</p></div></Card>
          <Card><div className="space-y-4"><h2 className="text-xl font-semibold">Use a remote runner</h2><p className="text-sm leading-6 text-muted">Export a reading, process it with the included command-line tool on your PAGS machine, then import the resulting lesson JSON. The browser can play it without the model.</p><p className="text-sm leading-6 text-muted">Automatic remote PAGS dispatch is not connected in this first version. No existing PAGS agents or permissions are changed.</p><a className="inline-block min-h-11 py-3 text-sm text-accent-deep underline" href="https://github.com/freeappstore-online/chinese-reader/blob/main/runner/README.md" target="_blank" rel="noreferrer">Runner setup and commands ↗</a></div></Card>
          <Card><div className="space-y-3"><h2 className="text-xl font-semibold">About your readings</h2><p className="text-sm leading-6 text-muted">Readings, settings, and progress are saved in this browser only. Export a backup before clearing browser data. Browser voices marked “network” may send text to your device’s speech provider.</p><p className="text-sm leading-6 text-muted">Pinyin and dictionary segmentation can be wrong for names and ambiguous readings. Local-model annotations are machine-generated.</p></div></Card>
          <Card><div className="space-y-3"><h2 className="text-xl font-semibold">Your learning tools</h2><p className="text-sm leading-6"><a className="underline" href="https://hanzi-practice.freeappstore.online">Hanzi Practice</a> for writing · <a className="underline" href="https://hanzi-associations.freeappstore.online">Yi</a> for associations · <a className="underline" href="https://mandarin-english.freeappstore.online">Mandarin English</a> for meetups.</p><p className="text-sm text-muted">Dictionary: <a className="underline" href="/dictionary/NOTICE.txt">CC-CEDICT / MDBG, CC BY-SA 4.0</a>. Strokes: <a className="underline" href="/licenses/ARPHICPL.txt">Make Me a Hanzi / Arphic Public License</a>. Hanzi Writer and pinyin-pro: MIT.</p></div></Card>
        </div>
      </> : path === '/library' ? <>
        <PageHeader title="Your reading shelf" description="Saved on this device. Pick up a passage where you left off." actions={<Button primary onClick={() => { setEditing(true); navigate('/') }}>New reading</Button>} />
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{!library.length && <Card><p className="py-5 text-muted">Your saved readings will appear here. Open a passage and choose Save reading.</p></Card>}{library.map(l => <Card key={l.id}><div className="space-y-4"><div><p className="text-xs uppercase tracking-widest text-muted">{l.sentences.length} sentences</p><h2 className="mt-2 text-xl font-semibold">{l.title}</h2></div><p lang="zh-CN" className="line-clamp-3 text-lg leading-8">{l.text}</p><div className="flex flex-wrap gap-2"><Button primary onClick={() => { setLesson(l); setEditing(false); setSelected(null); navigate('/') }}>Continue</Button><Button onClick={() => download(`${l.title}.json`, l)}>Export</Button><Button onClick={() => { if (!confirm(`Delete “${l.title}” from this device?`)) return; const next = library.filter(x => x.id !== l.id); try { saveLibrary(next); setLibrary(next) } catch (e) { setError((e as Error).message) } }}>Delete</Button></div></div></Card>)}</div>
      </> : <>
        <PageHeader title={loaded ? lesson.title : 'Make Chinese part of your day.'} description={loaded ? 'Listen, follow the words, and pause wherever you’re curious.' : 'Bring a passage you want to understand. Read it with pronunciation, meaning, and strokes together.'} actions={loaded ? <div className="flex gap-2"><Button onClick={save}>{library.some(l => l.id === lesson.id) ? 'Save changes' : 'Save reading'}</Button><Button onClick={() => { player.pause(); setEditing(true) }}>New text</Button></div> : undefined} />
        {!loaded ? <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card><div className="space-y-4"><label className="block text-sm font-semibold">Reading title<input className={`${field} mt-2`} value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="A story, a message, a little discovery…" /></label><label className="block text-sm font-semibold">Your Chinese text<textarea lang="zh-CN" className={`${field} mt-2 min-h-64 resize-y text-xl leading-9`} value={text} onChange={e => setText(e.target.value)} maxLength={MAX_TEXT} placeholder="把你想读的中文放在这里……" /></label><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted">{text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()} characters</span><Button primary disabled={busy || !text.trim()} onClick={() => prepare()}>{busy ? 'Preparing reading…' : 'Open my reading →'}</Button></div><label className="block rounded-xl border border-dashed border-line-strong p-4 text-sm"><span className="mb-2 block font-semibold">Or import a file</span><input className="w-full text-sm" type="file" accept=".txt,.json,text/plain,application/json" disabled={busy} onChange={e => { void importFile(e.target.files?.[0]); e.target.value = '' }} /><span className="mt-2 block text-xs text-muted">UTF-8 text or a Chinese Reader lesson JSON · up to 2 MB</span></label></div></Card>
          <div className="space-y-5"><Card><div className="space-y-5"><Badge>A small beginning</Badge><p lang="zh-CN" className="font-serif text-4xl leading-relaxed">每天练习一点，<br />中文就会越来越好。</p><p className="text-sm leading-6 text-muted">A little practice every day. Start with a short café story and explore the reader.</p><Button disabled={busy} onClick={() => { setTitle('An afternoon at the café'); setText(SAMPLE); prepare(SAMPLE, 'An afternoon at the café') }}>Try the sample reading</Button></div></Card><p className="px-2 text-sm leading-6 text-muted">Pinyin and dictionary meanings work on your device. Import a lesson processed by your local model for contextual explanations and full sentence translations.</p></div>
        </div> : <>
          <div className="sticky top-0 z-20 mt-5 rounded-2xl border border-line-strong bg-paper p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center gap-3"><Button primary onClick={() => { setSelected(null); player.toggle() }} aria-label={player.playing ? 'Pause reading' : 'Play reading'}>{player.playing ? 'Ⅱ Pause' : '▶ Listen'}</Button><Button aria-label="Restart reading" onClick={() => { player.seek(0); setSelected(null) }}>↺ Restart</Button></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted"><span>{player.precision}</span><span>Tap a word to pause and explore · Space to play/pause</span></div>{player.notice && <p role="status" className="mt-2 text-sm text-danger">{player.notice}</p>}
          </div>
          <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section aria-label="Chinese passage" className="min-w-0 rounded-2xl border border-line bg-panel px-4 py-5 sm:p-7">

              <div className="space-y-8">{lesson.sentences.map((s, si) => <article key={si} className={`rounded-xl border-l-2 pl-3 sm:pl-5 ${current?.sentence === si ? 'border-accent' : 'border-transparent'}`}><div className="mb-3 flex items-center gap-3"><span className="text-xs tabular-nums text-muted">{String(si + 1).padStart(2, '0')}</span><button className="min-h-11 text-xs font-semibold text-accent-deep" onClick={() => { setSelected(null); void player.play(sentenceStarts[si]) }}>Play sentence</button></div><div className="flex flex-wrap items-end gap-x-1 gap-y-4" lang="zh-CN">{s.words.map((w, wi) => {
                const ix = sentenceStarts[si] + wi, isActive = ix === currentIndex
                if (!w.pinyin) return <span key={wi} className="mb-7 whitespace-pre-wrap text-2xl">{w.text}</span>
                return <button key={wi} ref={el => { if (isActive) active.current = el }} aria-label={`${w.text}, ${w.pinyin}, ${w.meaning || 'meaning unavailable'}`} aria-pressed={isActive} onClick={() => { player.seek(ix); setSelected(ix) }} className={`flex min-h-20 min-w-11 max-w-full flex-col items-center rounded-xl border px-2 py-2 ${isActive ? 'border-accent bg-accent-soft text-accent-deep' : 'border-transparent hover:border-line hover:bg-paper-deep'}`}>
                  {(showPinyin || showTones) && <span className="mb-1 flex w-full min-w-0 flex-col items-center">{showTones && <ToneGuide pinyin={w.pinyin} />}{showPinyin && <span className={reading.classFor('pinyin')}>{w.pinyin}</span>}</span>}<span className={reading.classFor('zi')}>{w.text}</span>{showMeanings && <span lang="en" className={`mt-1 ${reading.classFor('translation')}`}>{w.meaning.split(';')[0] || '—'}</span>}
                </button>
              })}</div>{s.translation && <p lang="en" className={`mt-4 ${reading.classFor('translation')}`}>{s.translation}</p>}</article>)}</div>
              <div className="mt-8 border-t border-line pt-5"><div className="flex flex-wrap gap-3"><Button disabled={modelWorking} onClick={() => void processModel()}>{modelWorking ? 'Processing locally…' : 'Add local-model translations'}</Button>{modelWorking && <Button onClick={() => { modelAbort.current?.abort(); setModelWorking(false); setModelNotice('Cancelled. Your original reading is unchanged.') }}>Cancel</Button>}<Button onClick={() => download(`${lesson.title}.json`, { ...lesson, position: player.index })}>Export lesson</Button></div><p className="mt-3 text-xs leading-5 text-muted">{lesson.source === 'dictionary' ? 'Dictionary meanings shown. Full sentence translation needs your local model or an imported processed lesson.' : lesson.source === 'sample' ? 'Sample sentence translations are included. Pinyin and meanings come from local tools.' : 'Contextual annotations generated by your local model.'} Pausing resumes from the selected word.</p>{modelNotice && <p role="status" className="mt-2 text-sm">{modelNotice}</p>}</div>
            </section>
            <aside aria-label="Selected word" className={`space-y-4 xl:sticky xl:top-40 ${selected !== null ? "fixed inset-x-3 bottom-3 z-30 max-h-[48dvh] overflow-y-auto rounded-2xl border border-line-strong bg-paper shadow-lg xl:inset-x-auto xl:bottom-auto xl:z-auto xl:max-h-none xl:overflow-visible xl:border-0 xl:shadow-none" : ""}`}><Card><div className="space-y-4">{selected !== null && <button className="float-right min-h-11 rounded-lg border border-line px-3 text-xs xl:hidden" onClick={() => { setSelected(null); active.current?.scrollIntoView({ block: "center" }) }}>Back to passage</button>}<p className="text-xs font-semibold uppercase tracking-widest text-muted">A word, closer</p>{current && <><div><p lang="zh-CN" className={reading.classFor('zi')}>{current.text}</p><div className="mt-2 flex w-full min-w-0 flex-col">{showTones && <ToneGuide pinyin={current.pinyin} />}<p className={reading.classFor('pinyin')}>{current.pinyin}</p></div><p className={`mt-3 ${reading.classFor('translation')}`}>{current.meaning || 'No dictionary entry for this selection.'}</p></div><StrokePanel text={current.text} />{lesson.sentences[current.sentence].translation && <p className={`border-t border-line pt-3 ${reading.classFor('translation')}`}>{lesson.sentences[current.sentence].translation}</p>}<Button primary onClick={() => { setSelected(null); void player.play(currentIndex) }}>Continue from here →</Button></>}</div></Card></aside>
          </div>
        </>}
      </>}
    </div>
  </Shell>
}
