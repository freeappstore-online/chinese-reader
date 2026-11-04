import { usePreference, isBoolean } from './usePreference'

export const FONT_OPTIONS = {
  zi: [['sans', 'Modern sans', 'font-hanzi-sans'], ['serif', 'Song / serif', 'font-hanzi-serif'], ['kai', 'Kai / handwriting', 'font-hanzi-kai']],
  pinyin: [['sans', 'Sans serif', 'font-sans'], ['serif', 'Serif', 'font-serif'], ['mono', 'Monospace', 'font-mono']],
  translation: [['sans', 'Sans serif', 'font-sans'], ['serif', 'Serif', 'font-serif'], ['mono', 'Monospace', 'font-mono']],
} as const
export const SIZE_CLASSES = { standard: 'text-3xl sm:text-4xl', '24': 'text-2xl', '30': 'text-3xl', '36': 'text-4xl', '48': 'text-5xl', '60': 'text-6xl' }
export type Part = keyof typeof FONT_OPTIONS
type ReadingSize = keyof typeof SIZE_CLASSES
const validSize = (v: unknown): v is ReadingSize => typeof v === 'string' && Object.hasOwn(SIZE_CLASSES, v)
const validPartSize = (v: unknown): v is ReadingSize | 'match' => v === 'match' || validSize(v)
function usePart(part: Part) {
  const [font, setFont] = usePreference<string>(`chinese-reader.font.${part}`, 'sans', (v): v is string => typeof v === 'string' && FONT_OPTIONS[part].some(([id]) => id === v))
  const [size, setSize] = usePreference<ReadingSize | 'match'>(`chinese-reader.size.${part}`, 'match', validPartSize)
  return { font, setFont, size, setSize }
}
export function useReadingSettings() {
  const [showPinyin, setShowPinyin] = usePreference('chinese-reader.show-pinyin', true, isBoolean)
  const [showMeanings, setShowMeanings] = usePreference('chinese-reader.show-meanings', true, isBoolean)
  const [follow, setFollow] = usePreference('chinese-reader.follow', true, isBoolean)
  const [spokenTones, setSpokenTones] = usePreference('chinese-reader.spoken-tones', true, isBoolean)
  const [showTones, setShowTones] = usePreference('chinese-reader.show-tones', false, isBoolean)
  const [showPauses, setShowPauses] = usePreference('chinese-reader.show-pauses', true, isBoolean)
  const [translationPosition, setTranslationPosition] = usePreference<'above' | 'below'>('chinese-reader.translation-position', 'above', (v): v is 'above' | 'below' => v === 'above' || v === 'below')
  const [size, setSize] = usePreference<ReadingSize>('chinese-reader.reading-size', 'standard', validSize)
  const zi = usePart('zi'), pinyin = usePart('pinyin'), translation = usePart('translation')
  const parts = { zi, pinyin, translation }
  function classFor(part: Part) {
    const setting = parts[part]
    const font = FONT_OPTIONS[part].find(([id]) => id === setting.font)![2]
    const color = part === 'zi' ? 'text-ink' : part === 'pinyin' ? 'text-sky-deep' : 'text-reading-translation'
    return `max-w-full break-words leading-relaxed ${font} ${SIZE_CLASSES[setting.size === 'match' ? size : setting.size]} ${color}`
  }
  return { spokenTones, setSpokenTones, showPinyin, setShowPinyin, showMeanings, setShowMeanings, follow, setFollow, showTones, setShowTones, showPauses, setShowPauses, translationPosition, setTranslationPosition, size, setSize, parts, classFor }
}
export type ReadingSettings = ReturnType<typeof useReadingSettings>
