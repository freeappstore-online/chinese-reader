import { useCallback, useEffect, useRef, useState } from 'react'
import { flatten, type Lesson } from './core'
import { localSpeech } from './runner'
import { usePreference, isBoolean } from './usePreference'
import { playOffline, unlockOfflineAudio } from './offlineSpeech'
import { isSpoken, practiceUnit, type PracticeMode, type PhraseGrouping } from './practice'

const validDelay = (v: unknown): v is number => typeof v === 'number' && [-1, 0, .5, 1, 1.5, 2, 3, 4, 5, 7, 10, 15, 20, 30].includes(v)
export function mandarinVoices() {
  return (window.speechSynthesis?.getVoices() || []).filter(v => /^(zh|cmn)(-|_|$)/i.test(v.lang) && !/[-_](HK|MO|yue|wuu|nan|hak)(-|_|$)/i.test(v.lang)).sort((a, b) => Number(b.localService) - Number(a.localService))
}
export function usePlayer(lesson: Lesson | null) {
  const [playing, setPlaying] = useState(false), [index, setIndex] = useState(0)
  const [group, setGroup] = useState({ start: 0, end: 1 })
  const [rate, setRate] = usePreference('chinese-reader.rate', 0.85, (v): v is number => typeof v === 'number' && [0.5, 0.7, 0.85, 1, 1.2, 1.5].includes(v))
  const [mode, setMode] = usePreference<PracticeMode>('chinese-reader.mode', 'word', (v): v is PracticeMode => ['word', 'phrase', 'sentence', 'flow'].includes(v as string))
  const [grouping, setGrouping] = usePreference<PhraseGrouping>('chinese-reader.grouping', 'text', (v): v is PhraseGrouping => ['text', '2', '3'].includes(v as string))
  const [phraseDelay, setPhraseDelay] = usePreference('chinese-reader.phrase-delay', -1, validDelay)
  const [sentenceDelay, setSentenceDelay] = usePreference('chinese-reader.sentence-delay', -1, validDelay)
  const [wordDelay, setWordDelay] = useState(() => {
    try { const saved = localStorage.getItem('chinese-reader-word-delay'); const value = saved === null ? 1.5 : Number(saved); return Number.isFinite(value) && value >= 0 && value <= 10 ? value : 1.5 } catch { return 1.5 }
  })
  const [repeat, setRepeat] = usePreference('chinese-reader.repeat', false, isBoolean)
  const [preferLocal, setPreferLocal] = usePreference('chinese-reader.local-voice', false, isBoolean)
  const [voice, setVoice] = usePreference('chinese-reader.voice', '', (v): v is string => typeof v === 'string' && v.length < 1000)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const modeLabel = { word: 'Word practice', phrase: 'Phrase practice', sentence: 'Sentence practice', flow: 'Fluent reading' }
  const [notice, setNotice] = useState(''), [precision, setPrecision] = useState(modeLabel[mode])
  const generation = useRef(0), position = useRef(0), running = useRef(false)
  const stopCurrent = useRef<(() => void) | null>(null), abort = useRef<AbortController | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null), utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const currentLesson = useRef(lesson); currentLesson.current = lesson
  const move = useCallback((i: number) => { position.current = i; setIndex(i) }, [])
  const pause = useCallback(() => {
    ++generation.current; running.current = false; setPlaying(false)
    abort.current?.abort(); audio.current?.pause(); stopCurrent.current?.(); stopCurrent.current = null
    window.speechSynthesis?.cancel(); utterance.current = null
  }, [])
  useEffect(() => { pause(); move(lesson?.position || 0); setNotice(''); return pause }, [lesson?.id, pause, move])
  useEffect(() => {
    if (!window.speechSynthesis) return
    const refresh = () => setVoices(mandarinVoices())
    refresh(); window.speechSynthesis.addEventListener('voiceschanged', refresh)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
  }, [])
  const play = useCallback(async (from = position.current) => {
    pause(); unlockOfflineAudio()
    const reading = currentLesson.current
    if (!reading) return
    const words = flatten(reading)
    if (!words.length) return
    const run = generation.current, repeatSentence = words[from]?.sentence ?? 0
    running.current = true; setPlaying(true); setNotice('')
    let localFailed = false, browserFailed = false
    try {
      let cursor = from
      while (cursor < words.length && run === generation.current) {
        if (!isSpoken(words[cursor].text)) { cursor++; continue }
        const unit = practiceUnit(reading, cursor, mode, grouping), word = words[cursor]
        move(cursor); setGroup({ start: cursor, end: unit.end })
        const controller = new AbortController(); abort.current = controller
        let spoken = false, duration = 0
        const label = mode === 'word' ? 'Word starts' : mode === 'phrase' ? 'Phrase' : 'Sentence'
        if (preferLocal && voice !== 'offline' && !localFailed && ['localhost', '127.0.0.1'].includes(location.hostname)) {
          const timer = setTimeout(() => controller.abort(), 20000)
          try {
            const blob = await localSpeech(unit.text, controller.signal)
            if (run !== generation.current) break
            const url = URL.createObjectURL(blob), sound = new Audio(url); audio.current = sound; sound.playbackRate = rate
            setPrecision(`${label} · local voice`)
            try { await new Promise<void>((resolve, reject) => {
              stopCurrent.current = resolve; sound.onended = () => resolve(); sound.onerror = () => reject(new Error('Local audio could not play.'))
              sound.play().catch(reject)
            }); spoken = true; duration = sound.duration / rate } finally { sound.pause(); URL.revokeObjectURL(url); audio.current = null }
          } catch { if (run !== generation.current) break; localFailed = true; setNotice('Local voice unavailable. Trying a device or built-in offline voice.') }
          finally { clearTimeout(timer) }
        }
        if (!spoken && run === generation.current && voice !== 'offline' && !browserFailed) {
          const available = mandarinVoices().filter(v => navigator.onLine || v.localService)
          const selected = available.find(v => v.voiceURI === voice) || available[0]
          if (selected) {
            setPrecision(`${label} · browser voice`)
            try {
              duration = await new Promise<number>((resolve, reject) => {
                const u = new SpeechSynthesisUtterance(unit.text); utterance.current = u
                u.lang = selected.lang; u.voice = selected; u.rate = rate
                let started = performance.now(), timer: ReturnType<typeof setTimeout>
                const cleanup = () => { clearTimeout(timer); u.onstart = null; u.onend = null; u.onerror = null; u.onboundary = null }
                const fail = () => { cleanup(); window.speechSynthesis.cancel(); reject(new Error('Device speech unavailable')) }
                timer = setTimeout(fail, 5000)
                stopCurrent.current = () => { cleanup(); resolve(0) }
                u.onstart = () => { started = performance.now(); clearTimeout(timer); timer = setTimeout(fail, Math.max(20000, unit.text.length * 2000 / rate)) }
                u.onboundary = event => {
                  if (run !== generation.current || mode !== 'flow') return
                  const offset = word.start + event.charIndex
                  const found = words.findIndex(w => w.sentence === word.sentence && w.start <= offset && w.end > offset)
                  if (found >= 0) { move(found); setPrecision('Word boundaries · browser voice') }
                }
                u.onend = () => { cleanup(); resolve((performance.now() - started) / 1000) }
                u.onerror = fail
                window.speechSynthesis.speak(u)
              }); spoken = true
            } catch { browserFailed = true; setNotice('Device speech unavailable. Using the built-in offline voice.') }
          }
        }
        if (!spoken && run === generation.current) {
          const offlineController = new AbortController(); abort.current = offlineController
          setPrecision(`${label} · built-in offline voice`)
          duration = await playOffline(unit.text, rate, offlineController.signal)
        }
        if (run !== generation.current) break
        const delay = mode === 'word' ? wordDelay : mode === 'phrase' ? phraseDelay : mode === 'sentence' ? sentenceDelay : 0
        const seconds = delay < 0 ? Math.max(1, (Number.isFinite(duration) ? duration : 1) + 1) : delay
        if (seconds > 0) {
          setPrecision(`Your turn · repeat the highlighted ${mode === 'word' ? 'word' : mode === 'phrase' ? 'phrase' : 'sentence'}`)
          await new Promise<void>(resolve => { const timer = setTimeout(resolve, seconds * 1000); stopCurrent.current = () => { clearTimeout(timer); resolve() } })
          if (run !== generation.current) break
        }
        cursor = unit.end
        if (repeat && (cursor >= words.length || words[cursor].sentence > repeatSentence)) cursor = words.findIndex(w => w.sentence === repeatSentence)
      }
      if (run === generation.current) { running.current = false; setPlaying(false); move(0) }
    } catch (e) {
      if (run === generation.current) { setNotice(e instanceof Error ? e.message : 'Playback failed.'); running.current = false; setPlaying(false) }
    }
  }, [pause, move, rate, mode, grouping, phraseDelay, sentenceDelay, repeat, voice, preferLocal, wordDelay])
  function seek(i: number) { pause(); move(i) }
  function toggle() { if (running.current) pause(); else void play() }
  function changeRate(v: number) { pause(); setRate(v) }
  function changeMode(v: PracticeMode) { pause(); setMode(v); setPrecision(modeLabel[v]) }
  function changeWordDelay(v: number) {
    if (!Number.isFinite(v) || v < 0 || v > 10) return
    pause(); setWordDelay(v)
    try { localStorage.setItem('chinese-reader-word-delay', String(v)) } catch { /* In-memory playback remains available. */ }
  }
  return { playing, index, group, rate, mode, grouping, setGrouping, phraseDelay, setPhraseDelay, sentenceDelay, setSentenceDelay, wordDelay, repeat, voice, voices, notice, precision, preferLocal, setPreferLocal, setVoice, setRepeat, pause, play, seek, toggle, changeRate, changeMode, changeWordDelay }
}
