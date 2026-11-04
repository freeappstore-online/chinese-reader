import { Fragment } from 'react'
import type { Lesson } from './core'
import { phraseBreaks } from './practice'
export function PhraseEditor({ lesson, onChange }: { lesson: Lesson; onChange: (lesson: Lesson) => void }) {
  return <details className="mt-5 rounded-xl border border-line bg-panel p-4"><summary className="min-h-11 cursor-pointer font-semibold">Edit this text’s phrase breaks</summary><p className="mb-4 text-sm text-muted">A slash / means “pause here” in Phrase practice with “This text’s pause marks” selected. Tap a gap to add or remove a break; words stay intact. Library marks are learning suggestions, and imported texts start with punctuation breaks. Save the reading to keep your changes.</p><div className="space-y-4">{lesson.sentences.map((sentence, si) => {
    const breaks = phraseBreaks(sentence)
    return <div key={si} className="rounded-lg border border-line p-3"><p className="mb-2 text-sm text-muted">Sentence {si + 1}</p><div className="flex flex-wrap items-center gap-y-2 text-xl" lang="zh-CN">{sentence.words.map((word, wi) => <Fragment key={wi}><span>{word.text}</span>{wi < sentence.words.length - 1 && <button className={`min-h-11 min-w-9 rounded-lg text-base ${breaks.includes(word.end) ? 'bg-accent-soft font-bold text-accent-deep' : 'text-muted hover:bg-paper-deep'}`} aria-label={`Pause after ${word.text} in sentence ${si + 1}, position ${wi + 1}`} aria-pressed={breaks.includes(word.end)} onClick={() => onChange({ ...lesson, sentences: lesson.sentences.map((s, i) => i !== si ? s : { ...s, pauseAfter: breaks.includes(word.end) ? breaks.filter(end => end !== word.end) : [...breaks, word.end].sort((a, b) => a - b) }) })}>{breaks.includes(word.end) ? '/' : '·'}</button>}</Fragment>)}</div></div>
  })}</div></details>
}
