import type { Word } from './core'
/** A cue for reading, never a replacement for the complete dictionary entry. */
export const isReadingGloss = (value: unknown): boolean => typeof value === 'string' && value.length <= 32 && /^[\p{Script=Latin}\p{M}]+(?:['’][\p{Script=Latin}\p{M}]+)*$/u.test(value)
const cues: Record<string, string> = {
  '在': 'at', '是': 'is', '有': 'have', '想': 'want', '不': 'not', '太': 'too', '叫': 'called', '一句话': 'sentence', '一层': 'storey', '一家': 'one', '一次': 'once', '万': 'myriad', '下车': 'alight', '不忙': 'free', '吃饭': 'eat', '有空': 'free', '在家': 'home', '地上': 'ground', '明天见': 'goodbye', '明月': 'moon', '看看': 'look', '起床': 'rise', '车站': 'station', '请问': 'excuse', '谢谢': 'thanks', '怎么了': 'what', '问候': 'greeting', '树叶': 'leaves', '豆浆': 'soymilk', '老人': 'elder', '一点儿': 'some', '刚才': 'just', '沿着': 'along', '注意': 'notice', '开口': 'speak', '找': 'find', '的': 'of', '地': 'adverb', '得': 'complement', '了': 'completed', '着': 'ongoing', '嗎': 'question', '吗': 'question', '呢': 'question', '吧': 'suggestion', '啊': 'ah', '哦': 'oh',
  '個': 'unit', '个': 'unit', '本': 'volume', '张': 'sheet', '張': 'sheet', '只': 'only', '位': 'person', '些': 'some',
  '你好': 'hello', '您好': 'hello', '再见': 'goodbye', '再見': 'goodbye', '对不起': 'sorry', '没关系': 'okay', '不客气': 'welcome',
  '咖啡馆': 'café', '咖啡館': 'café', '咖啡店': 'café', '中文': 'Chinese', '汉语': 'Mandarin', '普通话': 'Mandarin',
  '每天': 'daily', '一下': 'briefly', '一点': 'some', '一起': 'together', '一直': 'always', '一共': 'altogether', '一会儿': 'soon',
  '多少': 'quantity', '什么': 'what', '为什么': 'why', '怎么': 'how', '怎么样': 'how', '哪儿': 'where', '哪里': 'where',
  '没有': 'none', '不要': 'avoid', '不用': 'unnecessary', '可以': 'can', '能够': 'can', '认识': 'know', '觉得': 'feel', '喜欢': 'like',
  '看一看': 'look', '看见': 'see', '听见': 'hear', '停下来': 'stop', '越来越': 'increasingly', '慢慢': 'slowly',
  '大家': 'everyone', '我们': 'we', '他们': 'they', '她们': 'they', '你们': 'you', '自己': 'self', '别人': 'others',
  '爸爸': 'dad', '妈妈': 'mom', '哥哥': 'brother', '弟弟': 'brother', '姐姐': 'sister', '妹妹': 'sister',
  '早上': 'morning', '晚上': 'evening', '上午': 'morning', '中午': 'noon', '下午': 'afternoon', '昨天': 'yesterday', '今天': 'today', '明天': 'tomorrow',
}
// Prefer a real single-word synonym to truncating “coffee shop” to “coffee”.
const equivalents: [RegExp, string][] = [
  [/^(?:a |an |the )?coffee (?:shop|house)/i, 'café'], [/^(?:older|elder|younger) (brother|sister)/i, 'sibling'],
  [/^(?:to )?(?:be able to|can afford)/i, 'can'], [/^(?:to )?take a walk/i, 'walk'], [/^(?:to )?have to/i, 'must'],
  [/^(?:to )?be fond of/i, 'like'], [/^(?:to )?be called/i, 'called'], [/^(?:to )?come across/i, 'encounter'],
  [/^(?:to )?look at/i, 'look'], [/^(?:to )?get up/i, 'rise'], [/^(?:to )?go back/i, 'return'], [/^(?:to )?come back/i, 'return'],
  [/^(?:to )?go to bed/i, 'sleep'], [/^(?:to )?go to school/i, 'attend'], [/^(?:to )?go to work/i, 'work'],
  [/^(?:to )?eat (?:a )?(?:meal|food)/i, 'eat'], [/^(?:to )?be (?:located|situated) at/i, 'at'],
  [/^(?:measure word|classifier)/i, 'unit'], [/^(?:modal |sentence.final |aspect |structural )?particle/i, 'particle'],
  [/^how (?:many|much)/i, 'quantity'], [/^good morning/i, 'morning'], [/^thank you/i, 'thanks'],
  [/^not (?:have|exist)/i, 'none'], [/^a person of noble character/i, 'gentleman'],
]
const functionWords = new Set(['a', 'an', 'the', 'to', 'be', 'of', 'for', 'in', 'on', 'at', 'as', 'and', 'or', 'with', 'used', 'something', 'someone', 'one', 'is'])
export function readingGloss(word: Pick<Word, 'text' | 'meaning' | 'gloss'>, translation = ''): string {
  if (word.gloss && isReadingGloss(word.gloss)) return word.gloss
  const senses = word.meaning.split(/[;\/]/).map(s => s.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim()).filter(Boolean)
  // Context supplied by a model/catalog takes precedence over a generic cue.
  const exact = senses.find(isReadingGloss)
  const inSentence = new Set(translation.toLowerCase().match(/[a-z]+/g) || [])
  const contextual = senses.find(s => isReadingGloss(s) && inSentence.has(s.toLowerCase()))
  if (contextual) return contextual
  if (cues[word.text]) return cues[word.text]
  for (const sense of senses) {
    if (/^(?:surname|variant of|old variant|see |used in|abbr\.|Taiwan pr\.|CL:|lit\.|fig\.|Internet slang)/i.test(sense)) continue
    for (const [pattern, cue] of equivalents) if (pattern.test(sense)) return cue
    const trimmed = sense.replace(/^(?:to be |to |an? |the )/i, '').replace(/^(?:very|quite) /i, '')
    if (isReadingGloss(trimmed)) return trimmed
    // Use the lexical head of a verb phrase; keep full definitions on tap.
    const first = trimmed.match(/^[\p{Script=Latin}\p{M}]+(?:['’][\p{Script=Latin}\p{M}]+)*/u)?.[0]
    if (first && isReadingGloss(first) && !functionWords.has(first.toLowerCase())) return first
  }
  return exact || '—'
}
