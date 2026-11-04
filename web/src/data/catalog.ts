import { makeLesson, type Dictionary, type Lesson } from '../core'
import { BEGINNER_TEXTS } from './beginner'
import { phraseOffsets } from '../practice'
import { suggestedPhrases } from './phrases'
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export type Level = typeof LEVELS[number]
export type CatalogEntry = { id: string; title: string; english: string; author: string; level: Level; tags: string[]; description: string; source?: string; note?: string; glosses?: Record<string, string>; lines: [string, string, string?, string?][] }
const ws = (title: string) => `https://zh.wikisource.org/zh-hans/${encodeURIComponent(title)}`
export const CATALOG: CatalogEntry[] = [
  ...BEGINNER_TEXTS,
  { id: 'introductions', title: '认识新朋友', english: 'Meeting a new friend', author: 'Chinese Reader · original practice', level: 'beginner', tags: ['textbook-style', 'daily life', 'introductions', 'modern chinese'], description: 'Short sentences about names, home, and learning Chinese.', lines: [
    ['你好，我叫小林。', 'Hello, my name is Xiaolin.'], ['我住在一个小城市。', 'I live in a small city.'], ['我每天学习中文。', 'I study Chinese every day.'], ['我的朋友也喜欢中文。', 'My friend also likes Chinese.'], ['我们一起读书，一起说中文。', 'We read and speak Chinese together.'], ['认识你，我很高兴。', 'I am happy to meet you.'],
  ] },
  { id: 'breakfast', title: '今天吃什么', english: 'What shall we eat today?', author: 'Chinese Reader · original practice', level: 'beginner', tags: ['textbook-style', 'daily life', 'food', 'modern chinese'], description: 'Practise food words, quantities, and polite requests.', lines: [
    ['早上好，我想买早餐。', 'Good morning, I would like to buy breakfast.'], ['我要两个包子和一杯豆浆。', 'I would like two steamed buns and a cup of soy milk.'], ['你喜欢喝茶还是喝咖啡？', 'Do you prefer tea or coffee?'], ['我喜欢喝茶，不加糖。', 'I like tea without sugar.'], ['这些一共多少钱？', 'How much do these cost altogether?'], ['谢谢，我们明天再来。', 'Thank you; we will come again tomorrow.'],
  ] },
  { id: 'weekend-trip', title: '周末去旅行', english: 'A weekend trip', author: 'Chinese Reader · original practice', level: 'intermediate', tags: ['textbook-style', 'travel', 'planning', 'modern chinese'], description: 'A short narrative using plans, comparisons, and reasons.', lines: [
    ['这个周末，我们打算坐火车去海边。', 'This weekend we plan to take the train to the seaside.'], ['虽然开车比较方便，但是坐火车可以看看窗外的风景。', 'Although driving is more convenient, taking the train lets us enjoy the scenery outside.'], ['我已经订好了车票，还没有决定住在哪里。', 'I have booked the tickets but have not decided where to stay.'], ['朋友建议我们找一家离车站不远的小旅馆。', 'A friend suggested finding a small guesthouse near the station.'], ['如果天气好，我们就沿着海边散步。', 'If the weather is good, we will walk along the coast.'], ['如果下雨，我们也可以去当地的博物馆。', 'If it rains, we can visit the local museum instead.'],
  ] },
  { id: 'lost-umbrella', title: '一把蓝色的伞', english: 'A blue umbrella', author: 'Chinese Reader · original practice', level: 'intermediate', tags: ['story', 'daily life', 'kindness', 'modern chinese'], description: 'Follow a small mystery on a rainy afternoon.', lines: [
    ['昨天下午下雨的时候，我把一把蓝色的伞忘在了咖啡馆。', 'Yesterday afternoon, when it was raining, I left a blue umbrella at a café.'], ['等我回去找，伞已经不在门口了。', 'When I went back to look, the umbrella was no longer by the door.'], ['服务员说，一位老人刚才拿走了一把很像的伞。', 'The server said an older person had just taken a very similar umbrella.'], ['正当我准备离开时，那位老人又回来了。', 'Just as I was about to leave, the older person returned.'], ['他发现自己拿错了伞，特地回来交换。', 'He had noticed he took the wrong umbrella and came back especially to exchange it.'], ['我们笑了笑，一起走进雨里。', 'We smiled and walked out into the rain together.'],
  ] },
  { id: 'city-time', title: '城市里的慢生活', english: 'Slowing down in the city', author: 'Chinese Reader · original practice', level: 'advanced', tags: ['essay', 'city life', 'reflection', 'modern chinese'], description: 'Longer sentences about attention, efficiency, and everyday choices.', lines: [
    ['生活在城市里，我们常常把效率当作衡量一天是否充实的标准。', 'Living in a city, we often treat efficiency as the measure of whether a day has been fulfilling.'], ['然而，行程排得越满，并不意味着真正记住的事情就越多。', 'Yet a fuller schedule does not necessarily mean we will truly remember more.'], ['有时，一次没有目的的散步，反而能让我们注意到平时忽略的细节。', 'Sometimes a walk without a destination helps us notice details we usually overlook.'], ['街角新开的书店、树叶落下的声音，以及邻居的一句问候，都可能改变我们的心情。', 'A new bookshop on the corner, the sound of falling leaves, or a greeting from a neighbour can all change our mood.'], ['所谓慢生活，并不是拒绝责任，而是在忙碌之中保留感受生活的能力。', 'A slower life is not a rejection of responsibility; it preserves our ability to experience life amid busyness.'],
  ] },
  { id: 'learning-mistakes', title: '从错误中学习', english: 'Learning from mistakes', author: 'Chinese Reader · original practice', level: 'advanced', tags: ['textbook-style', 'essay', 'learning', 'modern chinese'], description: 'An argument about feedback and language-learning habits.', lines: [
    ['学习一门语言时，许多人担心犯错，因此迟迟不愿开口。', 'When learning a language, many people worry about mistakes and hesitate to speak.'], ['这种谨慎虽然可以减少尴尬，却也可能让练习的机会不断流失。', 'Although this caution can reduce embarrassment, it can also let opportunities for practice slip away.'], ['与其追求每一句话都毫无瑕疵，不如先把意思表达清楚，再根据反馈逐步调整。', 'Rather than making every sentence flawless, first express your meaning clearly, then improve it through feedback.'], ['错误并不自动带来进步，认真分析错误并再次尝试才是关键。', 'Mistakes do not automatically produce progress; analysing them carefully and trying again is what matters.'], ['当我们能够把错误看作信息，而不是对能力的否定，学习就会变得更加主动。', 'When we see mistakes as information rather than a verdict on our ability, learning becomes more active.'],
  ] },
  { id: 'quiet-night', title: '静夜思', english: 'Quiet Night Thought', author: '李白 · Li Bai', level: 'intermediate', tags: ['poetry', 'tang poetry', 'classical chinese', 'home', 'night'], description: 'Moonlight and homesickness in four short lines.', source: ws('靜夜思'), note: 'Uses the 唐诗三百首 version shown at the source.', lines: [
    ['床前明月光，', 'Bright moonlight lies before my bed,', 'chuáng qián míng yuè guāng'], ['疑是地上霜。', 'as though frost covered the ground.', 'yí shì dì shàng shuāng'], ['举头望明月，', 'I lift my head to gaze at the bright moon,', 'jǔ tóu wàng míng yuè'], ['低头思故乡。', 'then lower it, thinking of home.', 'dī tóu sī gù xiāng'],
  ] },
  { id: 'spring-dawn', title: '春晓', english: 'Spring Dawn', author: '孟浩然 · Meng Haoran', level: 'intermediate', tags: ['poetry', 'tang poetry', 'classical chinese', 'nature', 'spring'], description: 'Waking to birds after a night of wind and rain.', source: ws('春曉_(孟浩然)'), lines: [
    ['春眠不觉晓，', 'Sleeping in spring, I do not notice dawn,', 'chūn mián bù jué xiǎo'], ['处处闻啼鸟。', 'and hear birds calling all around.', 'chù chù wén tí niǎo'], ['夜来风雨声，', 'Last night came the sound of wind and rain;', 'yè lái fēng yǔ shēng'], ['花落知多少。', 'who knows how many flowers have fallen?', 'huā luò zhī duō shǎo'],
  ] },
  { id: 'stork-tower', title: '登鹳雀楼', english: 'Climbing Stork Tower', author: '王之涣 · Wang Zhihuan (traditional attribution)', level: 'intermediate', tags: ['poetry', 'tang poetry', 'classical chinese', 'landscape', 'perspective'], description: 'A wide view from a tower, and the wish to see farther.', source: ws('登鸛雀樓_(王之渙)'), lines: [
    ['白日依山尽，', 'The sun sinks behind the mountains,', 'bái rì yī shān jìn'], ['黄河入海流。', 'and the Yellow River flows into the sea.', 'huáng hé rù hǎi liú'], ['欲穷千里目，', 'To see a thousand li farther,', 'yù qióng qiān lǐ mù'], ['更上一层楼。', 'climb one more storey.', 'gèng shàng yī céng lóu'],
  ] },
  { id: 'river-snow', title: '江雪', english: 'River Snow', author: '柳宗元 · Liu Zongyuan', level: 'intermediate', tags: ['poetry', 'tang poetry', 'classical chinese', 'nature', 'winter'], description: 'A lone fisherman in a silent, snowy landscape.', source: ws('江雪'), lines: [
    ['千山鸟飞绝，', 'Across a thousand mountains, no birds fly;', 'qiān shān niǎo fēi jué'], ['万径人踪灭。', 'along ten thousand paths, no footprints remain.', 'wàn jìng rén zōng miè'], ['孤舟蓑笠翁，', 'In a lone boat, an old man in a straw cape and hat', 'gū zhōu suō lì wēng'], ['独钓寒江雪。', 'fishes alone on the cold river in the snow.', 'dú diào hán jiāng xuě'],
  ] },
  { id: 'red-beans', title: '相思', english: 'Longing', author: '王维 · Wang Wei', level: 'intermediate', tags: ['poetry', 'tang poetry', 'classical chinese', 'friendship', 'nature'], description: 'Red seeds become a reminder of someone far away.', source: ws('相思'), lines: [
    ['红豆生南国，', 'Red beans grow in the southern lands;', 'hóng dòu shēng nán guó'], ['春来发几枝。', 'how many branches sprout when spring arrives?', 'chūn lái fā jǐ zhī'], ['愿君多采撷，', 'May you gather plenty of them,', 'yuàn jūn duō cǎi xié'], ['此物最相思。', 'for they speak most deeply of longing.', 'cǐ wù zuì xiāng sī'],
  ] },
  { id: 'goose', title: '咏鹅', english: 'Ode to the Goose', author: '骆宾王 · Luo Binwang', level: 'beginner', tags: ['poetry', 'tang poetry', 'classical chinese', 'animals', 'nature'], description: 'A short, guided first poem with colours and an animal.', source: ws('詠鵝'), lines: [
    ['鹅，鹅，鹅，', 'Goose, goose, goose,', 'é é é'], ['曲项向天歌。', 'bending your neck, you sing toward the sky.', 'qū xiàng xiàng tiān gē'], ['白毛浮绿水，', 'White feathers float on green water;', 'bái máo fú lǜ shuǐ'], ['红掌拨清波。', 'red feet paddle through clear ripples.', 'hóng zhǎng bō qīng bō'],
  ] },
  { id: 'farmers', title: '悯农·其二', english: 'Sympathy for Farmers · II', author: '李绅 · Li Shen', level: 'intermediate', tags: ['poetry', 'tang poetry', 'classical chinese', 'food', 'work'], description: 'The labour behind every grain of a meal.', source: ws('憫農二首'), note: 'The source uses 飧 (sūn, meal); some familiar editions use 餐 instead.', lines: [
    ['锄禾日当午，', 'Hoeing grain beneath the midday sun,', 'chú hé rì dāng wǔ'], ['汗滴禾下土。', 'sweat drips onto the soil below the plants.', 'hàn dī hé xià tǔ'], ['谁知盘中飧，', 'Who realises that the meal on the plate,', 'shéi zhī pán zhōng sūn'], ['粒粒皆辛苦。', 'every single grain, comes from hard work?', 'lì lì jiē xīn kǔ'],
  ] },
  { id: 'small-pond', title: '小池', english: 'A Small Pond', author: '杨万里 · Yang Wanli', level: 'intermediate', tags: ['poetry', 'song poetry', 'classical chinese', 'nature', 'summer'], description: 'A tiny lotus tip and a dragonfly in a quiet pond.', source: ws('小池'), lines: [
    ['泉眼无声惜细流，', 'The spring is silent, seeming to cherish its slender flow;', 'quán yǎn wú shēng xī xì liú'], ['树阴照水爱晴柔。', 'tree shade rests on the water in the gentle sunshine.', 'shù yīn zhào shuǐ ài qíng róu'], ['小荷才露尖尖角，', 'A young lotus has just shown its pointed tip,', 'xiǎo hé cái lù jiān jiān jiǎo'], ['早有蜻蜓立上头。', 'and already a dragonfly stands upon it.', 'zǎo yǒu qīng tíng lì shàng tóu'],
  ] },
  { id: 'humble-room', title: '陋室铭', english: 'Inscription on a Humble Room', author: '刘禹锡 · Liu Yuxi', level: 'advanced', tags: ['classical prose', 'classical chinese', 'reflection', 'home'], description: 'A modest home is enriched by the character of its occupant.', source: ws('陋室銘'), lines: [
    ['山不在高，有仙则名。', 'A mountain need not be high; an immortal makes it renowned.'], ['水不在深，有龙则灵。', 'Water need not be deep; a dragon makes it numinous.'], ['斯是陋室，惟吾德馨。', 'This is a humble room, but my virtue gives it fragrance.'], ['苔痕上阶绿，草色入帘青。', 'Green moss climbs the steps, and the green of the grass enters the curtain.'], ['谈笑有鸿儒，往来无白丁。', 'Learned scholars join my conversation; the unlettered do not come and go.'], ['可以调素琴，阅金经。', 'Here one can play a plain zither and read Buddhist scriptures.', 'kě yǐ tiáo sù qín yuè jīn jīng'], ['无丝竹之乱耳，无案牍之劳形。', 'No ensemble of strings and pipes disturbs the ear; no official paperwork wearies the body.'], ['南阳诸葛庐，西蜀子云亭。', 'There was Zhuge Liang’s hut in Nanyang and Yang Ziyun’s pavilion in western Shu.'], ['孔子云：何陋之有？', 'Confucius said: what is humble about it?'],
  ] },
  { id: 'lotus', title: '爱莲说·节选', english: 'On Loving the Lotus · excerpt', author: '周敦颐 · Zhou Dunyi', level: 'advanced', tags: ['classical prose', 'classical chinese', 'nature', 'reflection'], description: 'The opening paragraph compares flowers and moral character.', source: ws('愛蓮說'), note: 'Opening paragraph; not the complete essay.', lines: [
    ['水陆草木之花，可爱者甚蕃。', 'Among the flowers of land and water, many are worthy of love.', 'shuǐ lù cǎo mù zhī huā kě ài zhě shèn fán'], ['晋陶渊明独爱菊。', 'Tao Yuanming of the Jin particularly loved chrysanthemums.'], ['自李唐来，世人盛爱牡丹。', 'Since the Tang dynasty, people have greatly admired peonies.'], ['予独爱莲之出淤泥而不染，濯清涟而不妖，中通外直，不蔓不枝，香远益清，亭亭净植，可远观而不可亵玩焉。', 'I especially love the lotus: it rises from mud unstained, is washed by clear ripples without being gaudy, is hollow within and straight outside, grows without trailing vines or branches, spreads a purer fragrance afar, and stands clean and upright—admired from a distance, not handled disrespectfully.'],
  ] },
  { id: 'peach-blossom', title: '桃花源记·节选', english: 'The Peach Blossom Spring · excerpt', author: '陶渊明 · Tao Yuanming', level: 'advanced', tags: ['classical prose', 'classical chinese', 'story', 'travel'], description: 'A fisherman discovers an unexpected grove of peach trees.', source: ws('桃花源記'), note: 'Opening passage, ending before the fisherman enters the mountain.', lines: [
    ['晋太元中，武陵人捕鱼为业。', 'During the Taiyuan era of the Jin, a man from Wuling made his living by fishing.'], ['缘溪行，忘路之远近。', 'Travelling along a stream, he lost track of how far he had gone.'], ['忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。', 'Suddenly he came upon peach trees lining both banks for hundreds of paces, with no other trees among them; fragrant grass was fresh and beautiful, and fallen blossoms lay scattered everywhere.'], ['渔人甚异之。', 'The fisherman found this very remarkable.'], ['复前行，欲穷其林。', 'He continued onward, wishing to reach the end of the grove.'],
  ] },
  { id: 'analects-learning', title: '論語·學而·選句', english: 'Analects · Learning · selected sayings', author: '孔子及其弟子 · Confucius and his disciples', level: 'advanced', tags: ['classical prose', 'classical chinese', 'philosophy', 'learning', 'traditional script'], description: 'The three questions in Analects 1.1, in traditional characters.', source: ws('論語/學而第一'), glosses: { '說': 'pleased; delighted (here read yuè)', '樂': 'joy; delight', '慍': 'resentful; annoyed', '君子': 'a person of noble character' }, note: 'Analects 1.1; the introductory 子曰 and quotation marks are omitted for line-by-line practice.', lines: [
    ['學而時習之，不亦說乎？', 'To learn and practise at the proper time—is that not a pleasure?', 'xué ér shí xí zhī bù yì yuè hū'], ['有朋自遠方來，不亦樂乎？', 'To have friends come from afar—is that not a joy?', 'yǒu péng zì yuǎn fāng lái bù yì lè hū'], ['人不知而不慍，不亦君子乎？', 'To remain unresentful when others do not understand you—is that not the conduct of a noble person?', 'rén bù zhī ér bù yùn bù yì jūn zǐ hū'],
  ] },
]
export const catalogText = (entry: CatalogEntry) => entry.lines.map(([text]) => text).join('\n')
export function makeCatalogLesson(entry: CatalogEntry, dictionary: Dictionary): Lesson {
  const boundaries = entry.lines.map(([text, , , marked]) => phraseOffsets(marked || suggestedPhrases.get(text) || text).offsets)
  const lesson = makeLesson(catalogText(entry), entry.title, dictionary, boundaries)
  if (lesson.sentences.length !== entry.lines.length) throw new Error('Library text and translation lines do not match.')
  lesson.sentences.forEach((sentence, i) => {
    const [text, translation, pronunciation, marked] = entry.lines[i]
    if (sentence.text !== text) throw new Error('Library sentence does not match its source.')
    sentence.translation = translation
    if (marked || suggestedPhrases.has(text)) {
      const phrases = phraseOffsets(marked || suggestedPhrases.get(text)!)
      if (phrases.text !== text) throw new Error('Phrase marks must preserve the original text.')
      sentence.pauseAfter = phrases.offsets
    }
    sentence.words.forEach(word => { if (entry.glosses?.[word.text]) word.meaning = entry.glosses[word.text] })
    if (pronunciation) {
      const syllables = pronunciation.split(' ')
      if ([...text].filter(c => /\p{Script=Han}/u.test(c)).length !== syllables.length) throw new Error('Library pronunciation does not match its characters.')
      let offset = 0
      sentence.words.forEach(word => {
        const length = [...word.text].filter(c => /\p{Script=Han}/u.test(c)).length
        if (length) word.pinyin = syllables.slice(offset, offset + length).join(' ')
        offset += length
      })
    }
  })
  return { ...lesson, id: `catalog-${entry.id}`, catalogId: entry.id, level: entry.level, tags: [...entry.tags], source: 'library' }
}
export function catalogFor(lesson: Lesson) { return CATALOG.find(e => e.id === lesson.catalogId && catalogText(e) === lesson.text) }
