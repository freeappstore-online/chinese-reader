// Pitch contours adapted from our MIT-licensed Hanzi Practice app (tones.ts).
const TONES = {
  1: { path: 'M6 11 H34', label: 'high and level' },
  2: { path: 'M6 32 C16 29 24 16 34 6', label: 'rising' },
  3: { path: 'M5 12 C11 35 19 40 24 27 S30 10 35 5', label: 'dip then rise' },
  4: { path: 'M6 6 C15 13 25 26 34 34', label: 'falling' },
  5: { path: '', label: 'neutral' },
} as const
export function toneNumber(syllable: string): keyof typeof TONES {
  const marks: Record<string, keyof typeof TONES> = { '\u0304': 1, '\u0301': 2, '\u030c': 3, '\u0300': 4 }
  const mark = [...syllable.normalize('NFD')].find(c => marks[c])
  return mark ? marks[mark] : 5
}
export function ToneGuide({ pinyin }: { pinyin: string }) {
  const tones = pinyin.trim().split(/[\s'’]+/).filter(Boolean).map(toneNumber)
  if (!tones.length) return null
  return <svg role="img" aria-label={`Tone guide: ${tones.map(t => `${t} ${TONES[t].label}`).join(', ')}`} viewBox={`0 0 ${tones.length * 40} 44`} preserveAspectRatio="none" className="mb-1 h-12 w-full min-w-0 text-sky-deep" fill="none">
    {tones.map((tone, i) => <g key={i} transform={`translate(${i * 40} 2)`}>
      <path d="M5 8H35 M5 20H35 M5 32H35" stroke="currentColor" opacity="0.12" vectorEffect="non-scaling-stroke" />
      {TONES[tone].path ? <path d={TONES[tone].path} stroke="currentColor" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" /> : <path d="M20 20h0.01" stroke="currentColor" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
    </g>)}
  </svg>
}
