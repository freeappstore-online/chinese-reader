import { useCallback, useEffect, useRef, useState } from 'react'
import { flatten, type Lesson } from './core'
import { localSpeech } from './runner'

export function usePlayer(lesson: Lesson | null) {
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(0)
  const [rate, setRate] = useState(0.85)
  const [mode, setMode] = useState<'word' | 'flow'>('word')
  const [wordDelay, setWordDelay] = useState(() => {
    try {
      const saved = localStorage.getItem('chinese-reader-word-delay')
      const value = saved === null ? 1.5 : Number(saved)
      return Number.isFinite(value) && value >= 0 && value <= 10 ? value : 1.5
    } catch { return 1.5 }
  })
  const [repeat, setRepeat] = useState(false)
  const [preferLocal, setPreferLocal] = useState(false)
  const [voice, setVoice] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [notice, setNotice] = useState('')
  const [precision, setPrecision] = useState('Word practice')
  const generation = useRef(0), position = useRef(0), running = useRef(false)
  const stopCurrent = useRef<(() => void) | null>(null)
  const abort = useRef<AbortController | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const words = useRef(lesson ? flatten(lesson) : [])
  const currentLesson = useRef(lesson)
  words.current = lesson ? flatten(lesson) : []
  currentLesson.current = lesson
  const move = useCallback((i: number) => { position.current = i; setIndex(i) }, [])
  const pause = useCallback(() => {
    ++generation.current; running.current = false; setPlaying(false)
    abort.current?.abort(); audio.current?.pause(); stopCurrent.current?.(); stopCurrent.current = null
    window.speechSynthesis?.cancel(); utterance.current = null
  }, [])
  useEffect(() => {
    pause(); move(lesson?.position || 0); setNotice('')
    return pause
  }, [lesson?.id, pause, move])
  useEffect(() => {
    if (!window.speechSynthesis) return
    const refresh = () => setVoices(window.speechSynthesis.getVoices().filter(v => /^zh|^cmn/i.test(v.lang)))
    refresh(); window.speechSynthesis.addEventListener('voiceschanged', refresh)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
  }, [])

  const play = useCallback(async (from = position.current) => {
    pause()
    if (!currentLesson.current || !words.current.length) return
    const run = generation.current
    running.current = true; setPlaying(true); setNotice('')
    const repeatSentence = words.current[from]?.sentence ?? 0
    let localFailed = false
    try {
      let cursor = from
      while (cursor < words.current.length && run === generation.current) {
        const word = words.current[cursor]
        if (!/[\p{L}\p{N}]/u.test(word.text)) { cursor++; continue }
        move(cursor)
        const sentence = currentLesson.current.sentences[word.sentence]
        const text = mode === 'word' ? word.text : sentence.text.slice(word.start)
        let spoken = false
        if (preferLocal && !localFailed) {
          const controller = new AbortController(); abort.current = controller
          const timer = setTimeout(() => controller.abort(), 20000)
          try {
            const blob = await localSpeech(text, controller.signal)
            if (run !== generation.current) break
            const url = URL.createObjectURL(blob)
            const sound = new Audio(url); audio.current = sound; sound.playbackRate = rate
            setPrecision(mode === 'word' ? 'Word starts · local voice' : 'Sentence · local voice')
            try { await new Promise<void>((resolve, reject) => {
              stopCurrent.current = resolve; sound.onended = () => resolve(); sound.onerror = () => reject(new Error('Local audio could not play.'))
              sound.play().catch(reject)
            }); spoken = true } finally { sound.pause(); URL.revokeObjectURL(url); audio.current = null }
          } catch {
            if (run !== generation.current) break
            localFailed = true; setNotice('Local voice unavailable. Using browser speech for this playback.')
          } finally { clearTimeout(timer) }
        }
        if (!spoken && run === generation.current) {
          if (!window.speechSynthesis) throw new Error('This browser has no speech playback. Try Safari, Chrome, or connect a local voice.')
          const available = window.speechSynthesis.getVoices().filter(v => /^zh|^cmn/i.test(v.lang))
          const selected = available.find(v => v.voiceURI === voice) || available[0]
          if (!selected) throw new Error('No Mandarin voice is installed. Add a Chinese voice in your device’s speech settings, then reload.')
          setPrecision(mode === 'word' ? 'Word starts · browser voice' : 'Sentence · waiting for voice boundaries')
          await new Promise<void>((resolve, reject) => {
            const u = new SpeechSynthesisUtterance(text); utterance.current = u
            u.lang = selected.lang; u.voice = selected; u.rate = rate
            stopCurrent.current = resolve
            u.onboundary = event => {
              if (run !== generation.current || mode === 'word') return
              const offset = word.start + event.charIndex
              const found = words.current.findIndex(w => w.sentence === word.sentence && w.start <= offset && w.end > offset)
              if (found >= 0) { move(found); setPrecision('Word boundaries · browser voice') }
            }
            u.onend = () => resolve()
            u.onerror = e => e.error === 'canceled' || e.error === 'interrupted' ? resolve() : reject(new Error(`Speech stopped (${e.error}). Try another Mandarin voice.`))
            window.speechSynthesis.speak(u)
          })
        }
        if (run !== generation.current) break
        if (mode === 'word' && wordDelay > 0) {
          setPrecision('Your turn · repeat the highlighted word')
          await new Promise<void>(resolve => {
            const timer = setTimeout(resolve, wordDelay * 1000)
            stopCurrent.current = () => { clearTimeout(timer); resolve() }
          })
          if (run !== generation.current) break
        }
        cursor = mode === 'word' ? cursor + 1 : words.current.findIndex((w, i) => i > cursor && w.sentence > word.sentence)
        if (cursor < 0) cursor = words.current.length
        if (repeat && (cursor >= words.current.length || words.current[cursor].sentence > repeatSentence)) cursor = words.current.findIndex(w => w.sentence === repeatSentence)
      }
      if (run === generation.current) { running.current = false; setPlaying(false); move(0) }
    } catch (e) {
      if (run === generation.current) { setNotice(e instanceof Error ? e.message : 'Playback failed.'); running.current = false; setPlaying(false) }
    }
  }, [pause, move, rate, mode, repeat, voice, preferLocal, wordDelay])
  function seek(i: number) { pause(); move(i) }
  function toggle() { if (running.current) pause(); else void play() }
  function changeRate(v: number) { pause(); setRate(v) }
  function changeMode(v: 'word' | 'flow') { pause(); setMode(v) }
  function changeWordDelay(v: number) {
    if (!Number.isFinite(v) || v < 0 || v > 10) return
    pause(); setWordDelay(v)
    try { localStorage.setItem('chinese-reader-word-delay', String(v)) } catch { /* Playback still works without saved preferences. */ }
  }
  return { playing, index, rate, mode, wordDelay, repeat, voice, voices, notice, precision, preferLocal, setPreferLocal, setVoice, setRepeat, pause, play, seek, toggle, changeRate, changeMode, changeWordDelay }
}
