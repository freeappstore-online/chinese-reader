import { useMemo, useEffect, useRef, useState } from 'react'
import { initApp } from '@freeappstore/sdk'
import { Badge, Card, PageHeader, Shell, type NavItem } from '@freeappstore/sdk/ui'
import { download, flatten, MAX_TEXT, SAMPLE, type Lesson } from './core'
import { useLibrary } from './useLibrary'
import { useReadingSession } from './useReadingSession'
import { Button } from './Button'
import { usePlayer } from './usePlayer'
import { useReadingSettings } from './useReadingSettings'
import { ProfileSettings, ProfileIcon } from './ProfileSettings'
import { HanziText } from './ToneGuide'
import { LibraryView } from './LibraryView'
import { catalogFor, catalogText, type CatalogEntry } from './data/catalog'
import { StrokePanel } from './StrokePanel'
import { runnerStatus } from './runner'
import { PhraseEditor } from './PhraseEditor'
import { readingGloss } from './gloss'
import { spokenPronunciation } from './pronunciation'
import { SavedWordsView } from './SavedWordsView'
import { useSavedWords } from './useSavedWords'
import { captureWord, contextLesson, savedWordKey, type SavedWord } from './savedWords'
import { groupBreaks } from './practice'

const localReader = ['localhost', '127.0.0.1'].includes(location.hostname)
const fas = initApp({ appId: 'chinese-reader' })
fas.log.destroy() // Reading content stays local; disable background diagnostic uploads.
const NAV: NavItem[] = [{ label: 'Read', href: '/', title: 'Chinese Reader' }, { label: 'Library', href: '/library', title: 'Library · Chinese Reader' }, { label: 'Saved words', href: '/words', title: 'Saved words · Chinese Reader' }, { label: 'Profile', href: '/profile', title: 'Profile · Chinese Reader' }]
const field = 'w-full min-h-11 rounded-xl border border-line-strong bg-paper px-3 py-2 text-ink'

export default function App() {
  const [path, setPath] = useState(location.pathname)
  const session = useReadingSession(localReader)
  const { lesson, selected, setSelected, editing, busy, error, setError, modelWorking, modelNotice, setModelNotice } = session
  const savedLibrary = useLibrary(), library = savedLibrary.items
  const [text, setText] = useState(''), [title, setTitle] = useState('')
  const savedWords = useSavedWords()
  const starred = useMemo(() => new Set(savedWords.words.map(w => w.key)), [savedWords.words])
  const reading = useReadingSettings()
  const { showPinyin, showMeanings, follow, showTones } = reading
  const [status, setStatus] = useState<Awaited<ReturnType<typeof runnerStatus>> | null>(null)
  const active = useRef<HTMLElement | null>(null)
  const player = usePlayer(lesson, session.revision)
  const words = useMemo(() => lesson ? flatten(lesson) : [], [lesson]), currentIndex = selected ?? player.index, current = words[currentIndex]
  const guideMode = player.playing ? player.playbackMode : player.mode
  const pronunciation = useMemo(() => lesson?.sentences.map(s => spokenPronunciation(s, guideMode, player.grouping)) || [], [lesson, guideMode, player.grouping])
  const glosses = useMemo(() => lesson?.sentences.map(s => s.words.map(w => readingGloss(w, s.translation))) || [], [lesson])
  const phraseSpaces = useMemo(() => lesson?.sentences.map(s => new Set(groupBreaks(s, player.grouping))) || [], [lesson, player.grouping])
  const currentPronunciation = current && pronunciation[current.sentence]?.[current.local]
  let runningOffset = 0
  const sentenceStarts = lesson?.sentences.map(s => { const start = runningOffset; runningOffset += s.words.length; return start }) || []
  useEffect(() => {
    const pop = () => { player.pause(); setPath(location.pathname) }
    addEventListener('popstate', pop)
    return () => removeEventListener('popstate', pop)
  }, [player.pause])
  useEffect(() => {
    if (player.playing && follow) active.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [player.index, player.playing, follow])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !e.isComposing) {
        // The SDK owns Escape in its menu/modal; only dismiss the top surface.
        if (document.querySelector('[aria-modal="true"], nav[aria-label="Main"] button[aria-expanded="true"]')) return
        if (e.target instanceof HTMLSelectElement) return
        const details = e.target instanceof HTMLElement ? e.target.closest('details[open]') : null
        if (details instanceof HTMLDetailsElement) { e.preventDefault(); details.open = false; details.querySelector('summary')?.focus(); return }
        if (selected !== null && path === '/' && !editing) { e.preventDefault(); setSelected(null); active.current?.focus(); return }
      }
      if (e.code === 'Space' && !(e.target instanceof HTMLElement && (e.target.closest('button, input, textarea, select, a, summary') || e.target.isContentEditable)) && path === '/' && !editing) { e.preventDefault(); player.toggle() }
    }
    // Read the open-menu state before the SDK closes it, so one Escape closes one layer.
    addEventListener('keydown', key, true); return () => removeEventListener('keydown', key, true)
  }, [player.toggle, path, editing, selected])
  useEffect(() => {
    if (lesson && !player.playing && player.loadedRevision === session.revision) savedLibrary.rememberPosition(lesson, player.index)
  }, [player.playing, player.index, player.loadedRevision, session.revision, lesson?.id, savedLibrary.rememberPosition])
  function pauseReading() {
    player.pause()
    if (lesson && player.loadedRevision === session.revision) savedLibrary.rememberPosition(lesson, player.index)
  }
  function navigate(href: string) { pauseReading(); history.pushState(null, '', href); setPath(href); window.scrollTo(0, 0) }
  function prepare(source = text, name = title, catalogId?: string) { pauseReading(); session.prepare(source, name, catalogId) }
  function openReading(next: Lesson) { navigate('/'); session.openLesson(next) }
  function newReading() { navigate('/'); session.newReading(); setText(''); setTitle('') }
  function reviewWord(saved: SavedWord) { openReading(contextLesson(saved)) }
  function toggleSavedWord() {
    if (!lesson || !current?.pinyin) return
    const key = savedWordKey(current)
    if (starred.has(key)) savedWords.remove(key)
    else { player.pause(); savedWords.add(captureWord(lesson, current.sentence, current.local)) }
  }
  function openCatalog(entry: CatalogEntry) {
    session.newReading(); setText(catalogText(entry)); setTitle(entry.title)
    prepare(catalogText(entry), entry.title, entry.id); navigate('/')
  }
  function updateLabels(saved: Lesson, level: Lesson['level'], tags: string[]) {
    if (savedLibrary.update(latest => latest.map(l => l.id === saved.id ? { ...l, level, tags } : l)) && lesson?.id === saved.id) session.updateLesson({ ...lesson, level, tags })
  }
  function removeSaved(saved: Lesson) {
    if (!confirm(`Remove the saved copy of “${saved.title}” from this device? Included starter texts remain available.`)) return
    savedLibrary.update(latest => latest.filter(l => l.id !== saved.id))
  }
  function save() {
    if (!lesson) return
    const saved = { ...lesson, position: player.index }
    if (savedLibrary.update(latest => [saved, ...latest.filter(l => l.id !== saved.id)])) setError('')
  }
  async function importFile(file?: File) { if (file) { pauseReading(); await session.importFile(file) } }
  async function processModel() { pauseReading(); await session.processModel() }
  async function checkRunner() {
    setModelNotice('Checking this computer…'); setStatus(null)
    try { const s = await runnerStatus(); setStatus(s); setModelNotice(s.available ? `Ready · ${s.model}` : 'Reader service found. Configure a downloaded local model before processing.') }
    catch { setModelNotice('Local service not reachable on this device. Start the companion on your runner, or import its processed lesson file.') }
  }
  const loaded = !editing && lesson
  const catalogEntry = lesson ? catalogFor(lesson) : undefined
  return <Shell offlineMessage="Offline · readings and settings save on this device. Download status is in Profile." app={fas} appName="Chinese Reader" nav={NAV} onNavigate={navigate} headerActions={<button type="button" aria-label="Open profile" title="Profile & settings" onClick={() => navigate('/profile')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-accent-soft text-accent-deep"><ProfileIcon /></button>}>
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
      {error && <div role="alert" className="mb-5 rounded-xl border border-danger bg-danger-soft p-4 text-sm">{error}<button className="ml-4 min-h-11 underline" onClick={() => setError('')}>Dismiss</button></div>}
      {savedLibrary.error && <div role="alert" className="mb-5 rounded-xl border border-danger bg-danger-soft p-4 text-sm">{savedLibrary.error}<Button onClick={savedLibrary.reload}>Retry library</Button></div>}
      {savedWords.error && <div role="alert" className="mb-5 rounded-xl border border-danger bg-danger-soft p-4 text-sm">{savedWords.error}<button className="ml-4 min-h-11 underline" onClick={savedWords.reload}>Retry saved words</button></div>}
      {savedWords.removed && !starred.has(savedWords.removed.key) && <div role="status" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel p-3 text-sm">Removed {savedWords.removed.sentence.words[savedWords.removed.wordIndex].text} from saved words.<Button onClick={savedWords.undo}>Undo</Button></div>}
      {path === '/words' ? <>
        <PageHeader title="Saved words" description="Return to difficult words in the sentences where you found them." />
        <SavedWordsView saved={savedWords} reading={reading} mode={player.mode} grouping={player.grouping} onReview={reviewWord} />
      </> : path === '/profile' || path === '/connection' ? <>
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
        <PageHeader title="Your reading library" description="Explore included texts, filter by level and topic, or continue your own readings." actions={<Button primary onClick={newReading}>New reading</Button>} />
        <LibraryView lessons={library} onOpen={openReading} onOpenCatalog={openCatalog} onDelete={removeSaved} onMetadata={updateLabels} />
      </> : <>
        <PageHeader title={loaded ? lesson.title : 'Make Chinese part of your day.'} description={loaded ? 'Listen, follow the words, and pause wherever you’re curious.' : 'Bring a passage you want to understand. Read it with pronunciation, meaning, and strokes together.'} actions={loaded ? <div className="flex gap-2"><Button onClick={save}>{library.some(l => l.id === lesson.id) ? 'Save changes' : 'Save reading'}</Button><Button onClick={newReading}>New text</Button></div> : undefined} />
        {loaded && catalogEntry && <div className="mt-5 space-y-2 rounded-xl border border-line bg-panel p-4 text-sm"><p className="font-semibold">{catalogEntry.english} · {catalogEntry.author}</p><p className="text-muted">{catalogEntry.description} {catalogEntry.note}</p><p className="text-xs leading-5 text-muted">{catalogEntry.source ? 'Ancient text in the public domain. English learning translation created for this app.' : 'Original textbook-style practice and English learning translation created for this app.'} {catalogEntry.source && <a className="text-accent-deep underline" href={catalogEntry.source} target="_blank" rel="noreferrer">Read the source ↗</a>}</p></div>}
        {!loaded ? <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card><div className="space-y-4"><label className="block text-sm font-semibold">Reading title<input className={`${field} mt-2`} value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="A story, a message, a little discovery…" /></label><label className="block text-sm font-semibold">Your Chinese text<textarea aria-label="Your Chinese text" lang="zh-CN" className={`${field} mt-2 min-h-64 resize-y text-xl leading-9`} value={text} onChange={e => setText(e.target.value)} maxLength={MAX_TEXT} placeholder="把你想读的中文放在这里……" /></label><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted">{text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()} characters</span><Button primary disabled={busy || !text.trim()} onClick={() => prepare()}>{busy ? 'Preparing reading…' : 'Open my reading →'}</Button></div><label className="block rounded-xl border border-dashed border-line-strong p-4 text-sm"><span className="mb-2 block font-semibold">Or import a file</span><input className="w-full text-sm" type="file" accept=".txt,.json,text/plain,application/json" disabled={busy} onChange={e => { void importFile(e.target.files?.[0]); e.target.value = '' }} /><span className="mt-2 block text-xs text-muted">UTF-8 text or a Chinese Reader lesson JSON · up to 2 MB</span></label></div></Card>
          <div className="space-y-5"><Card><div className="space-y-5"><Badge>A small beginning</Badge><p lang="zh-CN" className="font-serif text-4xl leading-relaxed">每天练习一点，<br />中文就会越来越好。</p><p className="text-sm leading-6 text-muted">A little practice every day. Start with a short café story and explore the reader.</p><Button disabled={busy} onClick={() => { setTitle('An afternoon at the café'); setText(SAMPLE); prepare(SAMPLE, 'An afternoon at the café') }}>Try the sample reading</Button><Button onClick={() => navigate('/library')}>Browse the text library</Button></div></Card><p className="px-2 text-sm leading-6 text-muted">Pinyin and dictionary meanings work on your device. Import a lesson processed by your local model for contextual explanations and full sentence translations.</p></div>
        </div> : <>
          <div className="sticky top-0 z-20 mt-5 rounded-2xl border border-line-strong bg-paper p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center gap-3"><Button primary onClick={() => { setSelected(null); player.toggle() }} aria-label={player.playing ? 'Pause reading' : 'Play reading'}>{player.playing ? 'Ⅱ Pause' : '▶ Listen'}</Button><Button aria-label="Restart reading" onClick={() => { player.seek(0); setSelected(null) }}>↺ Restart</Button></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted"><span>{player.precision}</span><span>Tap a word to pause and explore · Space to play/pause</span></div>{player.notice && <p role="status" className="mt-2 text-sm text-danger">{player.notice}</p>}
          </div>
          <PhraseEditor lesson={lesson} onChange={next => { player.pause(); session.updateLesson(next) }} />
          {reading.showPauses && <p className="mt-3 text-sm text-muted">Wider spaces mark repetition pauses in Phrase practice. Change reading style and pause duration in Profile.</p>}
          <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section aria-label="Chinese passage" className="min-w-0 rounded-2xl border border-line bg-panel px-4 py-5 sm:p-7">

              <div className="space-y-8">{lesson.sentences.map((s, si) => <article key={si} className={`rounded-xl border-l-2 pl-3 sm:pl-5 ${current?.sentence === si ? 'border-accent' : 'border-transparent'}`}><div className="mb-3 flex items-center gap-3"><span className="text-xs tabular-nums text-muted">{String(si + 1).padStart(2, '0')}</span><button className="min-h-11 text-xs font-semibold text-accent-deep" onClick={() => { setSelected(null); void player.playSentence(sentenceStarts[si]) }}>Play sentence</button></div>{reading.translationPosition === 'above' && s.translation && <p lang="en" className={`mb-4 ${reading.classFor('translation')}`}>{s.translation}</p>}<div className="flex flex-wrap items-end gap-x-1 gap-y-4" lang="zh-CN">{s.words.map((w, wi) => {
                const ix = sentenceStarts[si] + wi, isActive = ix === currentIndex
                const grouped = player.playing && player.playbackMode !== 'word' && ix >= player.group.start && ix < player.group.end
                const spaced = reading.showPauses && phraseSpaces[si].has(w.end)
                const spoken = pronunciation[si][wi]
                const tones = reading.spokenTones ? spoken.pinyin : w.pinyin
                if (!w.pinyin) return <span key={wi} className={`mb-7 whitespace-pre-wrap text-2xl ${spaced ? 'mr-8' : ''}`}>{w.text.replace(/\//g, '　')}</span>
                return <button key={wi} data-phrase-break={spaced || undefined} data-practice-group={grouped || undefined} ref={el => { if (isActive) active.current = el }} aria-label={`${w.text}, ${w.pinyin}, ${glosses[si][wi]}${starred.has(savedWordKey(w)) ? ', saved word' : ''}`} aria-pressed={isActive} onClick={() => { player.seek(ix); setSelected(ix) }} className={`relative flex min-h-20 min-w-11 flex-col items-center rounded-xl border px-2 py-2 ${spaced ? 'mr-8 max-w-[calc(100%_-_2rem)]' : 'max-w-full'} ${isActive || grouped ? 'border-accent bg-accent-soft text-accent-deep' : 'border-transparent hover:border-line hover:bg-paper-deep'}`}>
                  {starred.has(savedWordKey(w)) && <span aria-hidden="true" className="absolute right-1 top-0 text-xs text-accent-deep">★</span>}
                  {showPinyin && <span className={reading.classFor('pinyin')}>{w.pinyin}</span>}<HanziText text={w.text} pinyin={tones} tones={showTones} className={reading.classFor('zi')} />{showMeanings && <span lang="en" className={`mt-1 ${reading.classFor('translation')}`}>{glosses[si][wi]}</span>}
                </button>
              })}</div>{reading.translationPosition === 'below' && s.translation && <p lang="en" className={`mt-4 ${reading.classFor('translation')}`}>{s.translation}</p>}</article>)}</div>
              <div className="mt-8 border-t border-line pt-5"><div className="flex flex-wrap gap-3"><Button disabled={modelWorking} onClick={() => void processModel()}>{modelWorking ? 'Processing locally…' : 'Add local-model translations'}</Button>{modelWorking && <Button onClick={() => { session.cancelWork(); setModelNotice('Cancelled. Your original reading is unchanged.') }}>Cancel</Button>}<Button onClick={() => download(`${lesson.title}.json`, { ...lesson, position: player.index })}>Export lesson</Button></div><p className="mt-3 text-xs leading-5 text-muted">{lesson.source === 'dictionary' ? 'Dictionary meanings shown. Full sentence translation needs your local model or an imported processed lesson.' : lesson.source === 'sample' ? 'Sample sentence translations are included. Pinyin and meanings come from local tools.' : lesson.source === 'library' ? 'English learning translations are included. Word meanings are dictionary suggestions; classical usage can differ.' : 'Contextual annotations generated by your local model.'} Pausing resumes from the selected word.</p>{modelNotice && <p role="status" className="mt-2 text-sm">{modelNotice}</p>}</div>
            </section>
            <aside role={selected !== null ? 'dialog' : undefined} aria-label="Selected word" className={`space-y-4 xl:sticky xl:top-40 ${selected !== null ? "fixed inset-x-3 bottom-3 z-30 max-h-[48dvh] overflow-y-auto rounded-2xl border border-line-strong bg-paper shadow-lg xl:inset-x-auto xl:bottom-auto xl:z-auto xl:max-h-none xl:overflow-visible xl:border-0 xl:shadow-none" : ""}`}><Card><div className="space-y-4">{selected !== null && <button className="float-right min-h-11 rounded-lg border border-line px-3 text-xs xl:hidden" onClick={() => { setSelected(null); active.current?.scrollIntoView({ block: "center" }) }}>Back to passage</button>}<p className="text-xs font-semibold uppercase tracking-widest text-muted">A word, closer</p>{current && <>{current.pinyin && /\p{Script=Han}/u.test(current.text) && <Button aria-label={starred.has(savedWordKey(current)) ? `Remove ${current.text} from saved words` : `Save ${current.text} to saved words`} aria-pressed={starred.has(savedWordKey(current))} onClick={toggleSavedWord}><span aria-hidden="true">{starred.has(savedWordKey(current)) ? '★' : '☆'}</span> {starred.has(savedWordKey(current)) ? 'Saved word' : 'Save word'}</Button>}<div><p className={reading.classFor('pinyin')}>{current.pinyin}</p><p lang="zh-CN"><HanziText text={current.text} pinyin={reading.spokenTones ? currentPronunciation?.pinyin || current.pinyin : current.pinyin} tones={showTones} className={reading.classFor('zi')} /></p>{reading.spokenTones && !!currentPronunciation?.notes.length && <div className="mt-3 text-sm leading-6 text-muted"><p>Spoken guide: <span lang="zh-Latn">{currentPronunciation.pinyin}</span> · dictionary: {current.pinyin}</p>{currentPronunciation.notes.map(note => <p key={note}>{note}</p>)}</div>}<p className={`mt-3 ${reading.classFor('translation')}`}>{current.meaning || 'No dictionary entry for this selection.'}</p></div><StrokePanel text={current.text} />{lesson.sentences[current.sentence].translation && <p className={`border-t border-line pt-3 ${reading.classFor('translation')}`}>{lesson.sentences[current.sentence].translation}</p>}<Button primary onClick={() => { setSelected(null); void player.play(currentIndex) }}>Continue from here →</Button></>}</div></Card></aside>
          </div>
        </>}
      </>}
    </div>
  </Shell>
}
