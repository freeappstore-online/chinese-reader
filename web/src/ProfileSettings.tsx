import { Card, useTextSize } from '@freeappstore/sdk/ui'
import { useTheme } from '@freeappstore/sdk/hooks'
import { FONT_OPTIONS, SIZE_CLASSES, type Part, type ReadingSettings } from './useReadingSettings'
import { ToneGuide } from './ToneGuide'
import type { usePlayer } from './usePlayer'

const field = 'mt-2 w-full min-w-0 min-h-11 rounded-xl border border-line-strong bg-paper px-3 py-2 text-ink'
export function ProfileIcon() {
  return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>
}
export function ProfileSettings({ player, reading, localReader }: { player: ReturnType<typeof usePlayer>; reading: ReadingSettings; localReader: boolean }) {
  const { preference, setPreference } = useTheme()
  const { size: textSize, setSize: setTextSize } = useTextSize()
  const labels = { zi: 'Chinese characters (字)', pinyin: 'Pinyin', translation: 'Translation' }
  return <div className="mt-6 grid min-w-0 items-start gap-5 lg:grid-cols-2">
    <Card><div className="space-y-4"><h2 className="text-xl font-semibold">Playback</h2>
      <label className="block text-sm font-semibold">Reading style<select aria-label="Reading style" className={field} value={player.mode} onChange={e => player.changeMode(e.target.value as 'word' | 'flow')}><option value="word">Word practice</option><option value="flow">Fluent reading</option></select></label>
      <label className="block text-sm font-semibold">Speed<select aria-label="Speed" className={field} value={player.rate} onChange={e => player.changeRate(Number(e.target.value))}>{[0.5, 0.7, 0.85, 1, 1.2, 1.5].map(r => <option key={r} value={r}>{r}×</option>)}</select></label>
      <label className="block text-sm font-semibold">Pause after each word<select aria-label="Pause after each word" className={`${field} disabled:opacity-50`} disabled={player.mode !== 'word'} value={player.wordDelay} onChange={e => player.changeWordDelay(Number(e.target.value))}>{[0, 0.5, 1, 1.5, 2, 3, 4, 5, 7, 10].map(s => <option key={s} value={s}>{s === 0 ? 'No pause' : `${s} seconds`}</option>)}</select></label>
      <p className="text-sm text-muted">Word practice leaves time to repeat each word. Fluent reading follows the sentence without added word pauses.</p>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={player.repeat} onChange={e => { player.pause(); player.setRepeat(e.target.checked) }} />Repeat sentence</label>
      <label className="block text-sm font-semibold">Mandarin voice<select aria-label="Mandarin voice" className={field} value={player.voice} onChange={e => { player.pause(); player.setVoice(e.target.value) }}><option value="">Device default</option>{player.voice && !player.voices.some(v => v.voiceURI === player.voice) && <option value={player.voice}>Saved voice unavailable · using default</option>}{player.voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.localService ? 'device' : 'network'})</option>)}</select></label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" disabled={!localReader} checked={player.preferLocal} onChange={e => { player.pause(); player.setPreferLocal(e.target.checked) }} />Prefer local runner voice</label>
      <p className="text-sm text-muted">Local voice requires the locally run reader. Browser speech is the fallback. Fluent local audio highlights sentences unless word timings are available.</p>
    </div></Card>
    <Card><div className="space-y-4"><h2 className="text-xl font-semibold">Appearance & reading</h2>
      <label className="block text-sm font-semibold">Theme<select aria-label="Theme" className={field} value={preference} onChange={e => setPreference(e.target.value as typeof preference)}><option value="system">Use device setting</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <label className="block text-sm font-semibold">Interface text size<select aria-label="Interface text size" className={field} value={textSize} onChange={e => setTextSize(e.target.value as typeof textSize)}><option value="sm">Small</option><option value="default">Default</option><option value="lg">Large</option></select></label>
      <label className="block text-sm font-semibold">Reading text size<select aria-label="Reading text size" className={field} value={reading.size} onChange={e => reading.setSize(e.target.value as typeof reading.size)}>{Object.keys(SIZE_CLASSES).map(s => <option key={s} value={s}>{s === 'standard' ? 'Default · 30 mobile / 36 desktop' : `${s} px at default interface size`}</option>)}</select></label>
      {([{ label: 'Show pinyin', value: reading.showPinyin, set: reading.setShowPinyin }, { label: 'Show word meanings', value: reading.showMeanings, set: reading.setShowMeanings }, { label: 'Follow reading', value: reading.follow, set: reading.setFollow }, { label: 'Show tone guides above pinyin', value: reading.showTones, set: reading.setShowTones }]).map(item => <label key={item.label} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={item.value} onChange={e => item.set(e.target.checked)} />{item.label}</label>)}
      <p className="text-sm leading-6 text-muted">Tone guides use the same contours as Hanzi Practice: level, rising, dipping, falling, and a neutral dot. Each syllable gets its own stroke across the word. They show the written pinyin; spoken tones can change in context.</p>
    </div></Card>
    <Card><div className="space-y-5"><h2 className="text-xl font-semibold">Fonts & sizes</h2><p className="text-sm text-muted">All three parts match the reading size by default. Choose a separate font or size for each part.</p>
      {(Object.keys(FONT_OPTIONS) as Part[]).map(part => <fieldset key={part} className="min-w-0 space-y-3 border-t border-line pt-4"><legend className="pr-2 font-semibold">{labels[part]}</legend><label className="block text-sm">{labels[part]} font<select aria-label={`${labels[part]} font`} className={field} value={reading.parts[part].font} onChange={e => reading.parts[part].setFont(e.target.value)}>{FONT_OPTIONS[part].map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label><label className="block text-sm">{labels[part]} size<select aria-label={`${labels[part]} size`} className={field} value={reading.parts[part].size} onChange={e => reading.parts[part].setSize(e.target.value as typeof reading.parts[typeof part]['size'])}><option value="match">Match reading size</option>{Object.keys(SIZE_CLASSES).filter(s => s !== 'standard').map(s => <option key={s} value={s}>{s} px at default interface size</option>)}</select></label></fieldset>)}
      <p className="text-sm text-muted">Chinese typefaces use fonts available on your device; a missing typeface uses its system fallback.</p>
    </div></Card>
    <Card><div className="space-y-4"><h2 className="text-xl font-semibold">Reading preview</h2><div className="flex min-w-0 max-w-full flex-col items-center rounded-xl border border-line bg-paper p-4" aria-label="Reading preview">
      {(reading.showPinyin || reading.showTones) && <div className="flex w-full min-w-0 flex-col items-center">{reading.showTones && <ToneGuide pinyin="nǐ hǎo" />}{reading.showPinyin && <span className={reading.classFor('pinyin')}>nǐ hǎo</span>}</div>}
      <span lang="zh-CN" className={reading.classFor('zi')}>你好</span>{reading.showMeanings && <span lang="en" className={reading.classFor('translation')}>hello</span>}
    </div><p className="text-sm text-muted">Settings save automatically in this browser. No sign-in is required.</p></div></Card>
  </div>
}
