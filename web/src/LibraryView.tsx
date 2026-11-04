import { useState } from 'react'
import { Badge, Card } from '@freeappstore/sdk/ui'
import { download, type Lesson } from './core'
import { CATALOG, LEVELS, catalogFor, catalogText, type CatalogEntry } from './data/catalog'

const field = 'mt-2 min-h-11 w-full rounded-xl border border-line-strong bg-paper px-3 py-2 text-sm'
const button = 'min-h-11 rounded-xl border border-line-strong bg-panel px-4 py-2 text-sm font-semibold'
type Props = { lessons: Lesson[]; onOpen: (lesson: Lesson) => void; onOpenCatalog: (entry: CatalogEntry) => void; onDelete: (lesson: Lesson) => void; onMetadata: (lesson: Lesson, level: Lesson['level'], tags: string[]) => void }
export function LibraryView({ lessons, onOpen, onOpenCatalog, onDelete, onMetadata }: Props) {
  const [search, setSearch] = useState(''), [level, setLevel] = useState('all'), [scope, setScope] = useState('all'), [tags, setTags] = useState<string[]>([])
  const personal = lessons.filter(l => !catalogFor(l)).map(lesson => ({ id: lesson.id, title: lesson.title, text: lesson.text, level: lesson.level, tags: lesson.tags || [], lesson, entry: undefined as CatalogEntry | undefined }))
  const starter = CATALOG.map(entry => {
    const lesson = lessons.find(l => catalogFor(l)?.id === entry.id)
    return { id: `catalog-${entry.id}`, title: entry.title, text: catalogText(entry), level: lesson ? lesson.level : entry.level, tags: lesson?.tags || entry.tags, lesson, entry }
  })
  const rows = [...personal, ...starter]
  const allTags = [...new Set(rows.flatMap(r => r.tags))].sort()
  const query = search.trim().toLocaleLowerCase()
  const shown = rows.filter(r => (scope === 'all' || (scope === 'saved' ? !!r.lesson : !!r.entry)) && (level === 'all' || (r.level || 'unrated') === level) && tags.every(t => r.tags.includes(t)) && (!query || [r.title, r.text, r.entry?.english, r.entry?.author, r.entry?.description, ...r.tags].filter(Boolean).join(' ').toLocaleLowerCase().includes(query)))
  const toggleTag = (tag: string) => setTags(old => old.includes(tag) ? old.filter(t => t !== tag) : [...old, tag])
  const clear = () => { setSearch(''); setLevel('all'); setScope('all'); setTags([]) }
  return <div className="mt-6 space-y-5">
    <Card><div className="space-y-4"><div className="grid gap-4 sm:grid-cols-3">
      <label className="text-sm font-semibold">Search library<input aria-label="Search library" className={field} type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Title, author, topic, or Chinese…" /></label>
      <label className="text-sm font-semibold">Reading level<select aria-label="Reading level" className={field} value={level} onChange={e => setLevel(e.target.value)}><option value="all">All levels</option>{LEVELS.map(l => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}<option value="unrated">Not labelled yet</option></select></label>
      <label className="text-sm font-semibold">Collection<select aria-label="Collection" className={field} value={scope} onChange={e => setScope(e.target.value)}><option value="all">All texts</option><option value="starter">Starter library</option><option value="saved">My saved readings</option></select></label>
    </div><fieldset><legend className="mb-2 text-sm font-semibold">Tags · match all selected</legend><div className="flex flex-wrap gap-2">{allTags.map(tag => <button key={tag} aria-pressed={tags.includes(tag)} onClick={() => toggleTag(tag)} className={`min-h-11 rounded-full border px-3 py-2 text-sm ${tags.includes(tag) ? 'border-accent bg-accent-soft text-accent-deep' : 'border-line bg-paper text-ink'}`}>{tag}</button>)}</div></fieldset><div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm text-muted">{shown.length} {shown.length === 1 ? 'text' : 'texts'} · {CATALOG.length} included in the starter library</p><button className={button} onClick={clear}>Clear filters</button></div><p className="text-xs leading-5 text-muted">Levels are suggested learning levels, not official HSK ratings. Classical texts use older grammar even when short. Original textbook-style practice and English learning translations were created for this app; ancient texts include source links.</p></div></Card>
    {!shown.length && <Card><p className="py-4 text-muted">No texts match these filters. Clear a tag or try another level.</p><button className={button} onClick={clear}>Show all texts</button></Card>}
    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">{shown.map(row => <article key={row.id} aria-label={row.title}><Card><div className="space-y-4">
      <div className="flex flex-wrap gap-2"><Badge>{row.level || 'Not labelled'}</Badge><Badge>{row.lesson ? 'Saved' : 'Included'}</Badge></div>
      <div><h2 className="text-xl font-semibold" lang="zh-CN">{row.title}</h2>{row.entry && <><p className="mt-1 font-medium">{row.entry.english}</p><p className="mt-1 text-xs text-muted">{row.entry.author}</p></>}</div>
      {row.entry && <p className="text-sm leading-6 text-muted">{row.entry.description}</p>}
      <p lang="zh-CN" className="line-clamp-3 text-lg leading-8">{row.text}</p>
      <p className="text-xs text-muted">{[...row.text].filter(c => /\p{Script=Han}/u.test(c)).length} characters{row.entry ? ' · English learning translation included' : ''}</p>
      <div className="flex flex-wrap gap-2">{row.tags.map(tag => <button key={tag} aria-label={`Filter by ${tag}`} onClick={() => toggleTag(tag)} className="min-h-9 rounded-lg bg-paper-deep px-2 text-xs text-muted">{tag}</button>)}</div>
      <div className="flex flex-wrap gap-2"><button className={`${button} border-accent bg-accent text-paper`} onClick={() => row.lesson ? onOpen(row.lesson) : onOpenCatalog(row.entry!)}>{row.lesson ? 'Continue' : 'Read text'}</button>{row.lesson && <><button className={button} onClick={() => download(`${row.title}.json`, row.lesson!)}>Export</button><button className={button} onClick={() => onDelete(row.lesson!)}>Remove saved copy</button></>}</div>
      {row.lesson && <MetadataEditor key={`${row.lesson.id}-${row.lesson.level}-${row.lesson.tags?.join(',')}`} lesson={row.lesson} onSave={onMetadata} />}
      {row.entry?.source && <a href={row.entry.source} target="_blank" rel="noreferrer" className="inline-block min-h-11 py-3 text-xs text-accent-deep underline">Public-domain original · source ↗</a>}
    </div></Card></article>)}</div>
  </div>
}
function MetadataEditor({ lesson, onSave }: { lesson: Lesson; onSave: Props['onMetadata'] }) {
  const [tags, setTags] = useState(lesson.tags?.join(', ') || ''), [level, setLevel] = useState(lesson.level || ''), [error, setError] = useState('')
  return <details className="border-t border-line pt-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold">Edit labels</summary><form className="space-y-3" onSubmit={e => {
    e.preventDefault()
    const values = [...new Set(tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))]
    if (values.length > 12 || values.some(t => t.length > 32)) { setError('Use up to 12 labels, each no longer than 32 characters.'); return }
    onSave(lesson, level ? level as Lesson['level'] : undefined, values); setError('')
  }}><label className="block text-sm">Level for {lesson.title}<select aria-label={`Level for ${lesson.title}`} className={field} value={level} onChange={e => setLevel(e.target.value)}><option value="">Not labelled</option>{LEVELS.map(l => <option key={l}>{l}</option>)}</select></label><label className="block text-sm">Tags for {lesson.title}<input aria-label={`Tags for ${lesson.title}`} className={field} value={tags} onChange={e => setTags(e.target.value)} maxLength={500} placeholder="travel, textbook-style, favourite" /></label><p className="text-xs text-muted">Separate labels with commas.</p>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<button className={button} type="submit">Save labels</button></form></details>
}
