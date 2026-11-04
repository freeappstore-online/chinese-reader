import { useState } from 'react'
import { Card, EmptyState, SearchInput } from '@freeappstore/sdk/ui'
import { download } from './core'
import { readingGloss } from './gloss'
import { HanziText } from './ToneGuide'
import { spokenPronunciation } from './pronunciation'
import { savedWordsFile, type SavedWord } from './savedWords'
import type { ReadingSettings } from './useReadingSettings'
import type { useSavedWords } from './useSavedWords'
import type { PracticeMode, PhraseGrouping } from './practice'
const button = 'min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold'
const secondary = `${button} border-line-strong bg-panel`
const searchable = (text: string) => text.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
type Props = { saved: ReturnType<typeof useSavedWords>; reading: ReadingSettings; mode: PracticeMode; grouping: PhraseGrouping; onReview: (word: SavedWord) => void }
export function SavedWordsView({ saved, reading, mode, grouping, onReview }: Props) {
  const [search, setSearch] = useState(''), [notice, setNotice] = useState('')
  const shown = saved.words.filter(item => {
    const word = item.sentence.words[item.wordIndex]
    return searchable([word.text, word.pinyin, word.meaning, word.gloss, item.sentence.text, item.title].join(' ')).includes(searchable(search.trim()))
  }).sort((a, b) => b.savedAt - a.savedAt)
  async function importFile(file?: File) {
    if (!file) return
    setNotice('')
    try {
      if (file.size > 5_000_000) throw new Error('Choose a saved-words backup smaller than 5 MB.')
      const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()))
      if (saved.importBackup(value)) setNotice('Backup merged. Words already saved were kept without duplicates.')
    } catch (e) { saved.reportError(e instanceof Error ? e.message : 'Could not import this backup.') }
  }
  return <div className="mt-6 space-y-5">
    <Card><div className="space-y-4">
      <label className="block text-sm font-semibold">Search saved words<SearchInput value={search} onChange={setSearch} placeholder="Chinese, pinyin, meaning, or reading title…" className="mt-2 [&_input]:min-h-11" /></label>
      <div className="flex flex-wrap items-center gap-3"><p role="status" className="text-sm text-muted">{shown.length} of {saved.words.length} saved {saved.words.length === 1 ? 'word' : 'words'}</p><button className={secondary} disabled={!saved.words.length} onClick={() => download('chinese-reader-saved-words.json', savedWordsFile(saved.words))}>Export saved words</button></div>
      <details><summary className="min-h-11 cursor-pointer text-sm font-semibold">Restore a saved-words backup</summary><label className="block text-sm">Saved-words backup<input aria-label="Saved-words backup" type="file" accept=".json,application/json" className="mt-2 block w-full min-w-0 text-sm" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = '' }} /></label><p className="mt-2 text-xs text-muted">Merges with your saved words. Existing words keep their original sentence.</p></details>
      {notice && <p role="status" className="text-sm text-muted">{notice}</p>}
      <p className="text-sm text-muted">Saved on this device, available offline. Each word keeps the sentence where you first starred it. Export a backup to move your words to another device.</p>
    </div></Card>
    {!shown.length && <Card><EmptyState title={saved.words.length ? 'No matching words' : 'Keep the words you want to practise'} message={saved.words.length ? 'Try another Chinese word, pinyin, or English meaning.' : 'Tap a word while reading, then choose “Save word”. Its original sentence stays here even if you do not save the reading.'} /></Card>}
    <div className="grid items-start gap-5 lg:grid-cols-2">{shown.map(item => {
      const word = item.sentence.words[item.wordIndex]
      const spoken = spokenPronunciation(item.sentence, mode, grouping)[item.wordIndex]
      const translation = item.sentence.translation && <p lang="en" className={reading.classFor('translation')}>{item.sentence.translation}</p>
      return <article key={item.key} aria-label={`Saved word ${word.text}`} className="min-w-0"><Card><div className="min-w-0 space-y-4">
        <div className="flex min-w-0 flex-col items-start">
          {reading.showPinyin && <p className={reading.classFor('pinyin')}>{word.pinyin}</p>}
          <h2><HanziText text={word.text} pinyin={reading.spokenTones ? spoken.pinyin : word.pinyin} tones={reading.showTones} className={reading.classFor('zi')} /></h2>
          {reading.showMeanings && <p lang="en" className={reading.classFor('translation')}>{readingGloss(word, item.sentence.translation)}</p>}
        </div>
        <p className="break-words text-sm text-muted">From {item.title}</p>
        {reading.translationPosition === 'above' && translation}
        <p lang="zh-CN" className={reading.classFor('zi')}>{item.sentence.text.slice(0, word.start).replace(/\//g, '　')}<mark className="rounded bg-accent-soft text-accent-deep">{word.text}</mark>{item.sentence.text.slice(word.end).replace(/\//g, '　')}</p>
        {reading.translationPosition === 'below' && translation}
        <details><summary className="min-h-11 cursor-pointer text-sm font-semibold">Full meaning</summary><p className={`mt-2 ${reading.classFor('translation')}`}>{word.meaning || 'No dictionary entry for this word.'}</p></details>
        <div className="flex flex-wrap gap-3"><button className={`${button} border-accent bg-accent text-paper`} onClick={() => onReview(item)}>Review sentence</button><button className={secondary} aria-label={`Remove ${word.text} from saved words`} onClick={() => saved.remove(item.key)}>Remove star</button></div>
      </div></Card></article>
    })}</div>
  </div>
}
