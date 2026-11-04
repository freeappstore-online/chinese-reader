import type { CatalogEntry } from './catalog'
const simple = (id: string, title: string, english: string, tags: string[], rows: [string, string][]): CatalogEntry => ({
  id, title, english, author: 'Chinese Reader · original practice', level: 'beginner', tags: ['textbook-style', 'first steps', 'modern chinese', ...tags],
  glosses: { '家': 'home; family', '个': 'measure word', '人': 'person', '点': 'o’clock (here)', '块': 'yuan (here)', '喂': 'hello (on the phone)' },
  description: 'A short everyday reading with simple repeated language and suggested repeat-after-me breaks.',
  lines: rows.map(([marked, translation]) => [marked.replaceAll('/', ''), translation, undefined, marked]),
})
export const BEGINNER_TEXTS: CatalogEntry[] = [
  simple('my-family', '我的家人', 'My family', ['family', 'home'], [
    ['我家/有四个人。', 'There are four people in my family.'], ['这是我爸爸，/这是我妈妈。', 'This is my dad, and this is my mum.'], ['我有一个姐姐。', 'I have an older sister.'], ['姐姐/喜欢看书。', 'My sister likes reading.'], ['我们/一起吃饭。', 'We eat together.'],
  ]),
  simple('my-day', '我的一天', 'My day', ['daily life', 'time'], [
    ['我早上七点/起床。', 'I get up at seven in the morning.'], ['八点/去学校。', 'I go to school at eight.'], ['中午/和朋友吃饭。', 'At noon I eat with friends.'], ['下午/我回家。', 'I go home in the afternoon.'], ['晚上十点/睡觉。', 'I go to bed at ten in the evening.'],
  ]),
  simple('buy-fruit', '买水果', 'Buying fruit', ['shopping', 'food'], [
    ['你好，/苹果多少钱？', 'Hello, how much are the apples?'], ['一个苹果/三块钱。', 'One apple costs three yuan.'], ['我要/两个苹果。', 'I would like two apples.'], ['你要香蕉吗？', 'Would you like bananas?'], ['不要，/谢谢。', 'No, thank you.'],
  ]),
  simple('find-station', '车站在哪里', 'Where is the station?', ['directions', 'travel'], [
    ['请问，/车站在哪里？', 'Excuse me, where is the station?'], ['车站/在学校旁边。', 'The station is next to the school.'], ['从这里/往前走。', 'Walk straight ahead from here.'], ['然后/向右走。', 'Then turn right.'], ['谢谢你！', 'Thank you!'],
  ]),
  simple('weather-today', '今天的天气', 'Today’s weather', ['weather', 'daily life'], [
    ['今天天气/很好。', 'The weather is very nice today.'], ['不冷，/也不热。', 'It is neither cold nor hot.'], ['我想/去公园。', 'I want to go to the park.'], ['你和我/一起去吗？', 'Would you like to go with me?'], ['好，/我们走吧！', 'Yes, let’s go!'],
  ]),
  simple('in-class', '在教室里', 'In the classroom', ['school', 'learning'], [
    ['老师好！', 'Hello, teacher!'], ['请打开书。', 'Please open your books.'], ['先听，/再说。', 'Listen first, then speak.'], ['这个字/怎么读？', 'How do you pronounce this character?'], ['请再说一遍。', 'Please say it again.'], ['我明白了，/谢谢。', 'I understand now, thank you.'],
  ]),
  simple('my-room', '我的房间', 'My room', ['home', 'location'], [
    ['我的房间/不大。', 'My room is not big.'], ['这里/有一张桌子。', 'There is a desk here.'], ['书/在桌子上。', 'The book is on the desk.'], ['椅子/在桌子旁边。', 'The chair is beside the desk.'], ['我的小猫/在椅子下面。', 'My little cat is under the chair.'],
  ]),
  simple('order-lunch', '吃午饭', 'Ordering lunch', ['food', 'restaurant'], [
    ['我饿了，/我们吃饭吧。', 'I’m hungry; let’s eat.'], ['你想吃什么？', 'What would you like to eat?'], ['我想吃/米饭和鸡蛋。', 'I would like rice and eggs.'], ['请给我/一杯水。', 'Please give me a glass of water.'], ['这些菜/很好吃。', 'These dishes are delicious.'],
  ]),
  simple('meet-time', '几点见面', 'What time shall we meet?', ['time', 'friendship'], [
    ['你明天/有空吗？', 'Are you free tomorrow?'], ['有空，/怎么了？', 'Yes. What is it?'], ['我们/一起喝茶吧。', 'Let’s have tea together.'], ['下午三点/见面，好吗？', 'Shall we meet at three in the afternoon?'], ['好，/明天见！', 'Yes, see you tomorrow!'],
  ]),
  simple('my-hobbies', '我喜欢什么', 'What I enjoy', ['hobbies', 'daily life'], [
    ['我喜欢/听音乐。', 'I like listening to music.'], ['也喜欢/看电影。', 'I also like watching films.'], ['我的朋友/喜欢运动。', 'My friend likes sport.'], ['星期六，/我们一起游泳。', 'On Saturday we go swimming together.'], ['你喜欢/做什么？', 'What do you like doing?'],
  ]),
  simple('take-bus', '坐公共汽车', 'Taking the bus', ['travel', 'transport'], [
    ['我今天/坐公共汽车。', 'I am taking the bus today.'], ['车上/有很多人。', 'There are many people on the bus.'], ['我没有座位。', 'I do not have a seat.'], ['下一站/是学校。', 'The next stop is the school.'], ['我在这里/下车。', 'I get off here.'],
  ]),
  simple('phone-call', '打电话', 'A phone call', ['communication', 'friendship'], [
    ['喂，/你在哪里？', 'Hello, where are you?'], ['我在家。', 'I am at home.'], ['你现在/忙吗？', 'Are you busy now?'], ['不忙，/你说吧。', 'No, go ahead.'], ['我有一个问题，/想问你。', 'I have a question I would like to ask you.'],
  ]),
  { id: 'jiangnan', title: '江南', english: 'South of the River', author: '佚名 · anonymous Han folk song', level: 'beginner', tags: ['poetry', 'folk song', 'classical chinese', 'nature', 'directions'], description: 'Repeated lines introduce east, west, south and north. A gentle first classical reading, with older vocabulary explained.', source: 'https://zh.wikisource.org/zh-hans/江南_(漢樂府)', glosses: { '田田': 'lush and thick (of lotus leaves)', '戏': 'play; frolic' }, lines: [
    ['江南可采莲，', 'South of the river, lotus can be gathered;', 'jiāng nán kě cǎi lián', '江南/可采莲，'], ['莲叶何田田。', 'how lush the lotus leaves are.', 'lián yè hé tián tián', '莲叶/何田田。'], ['鱼戏莲叶间。', 'Fish play among the lotus leaves.', 'yú xì lián yè jiān', '鱼戏/莲叶间。'], ['鱼戏莲叶东，', 'Fish play east of the lotus leaves,', 'yú xì lián yè dōng', '鱼戏/莲叶东，'], ['鱼戏莲叶西，', 'fish play west of the lotus leaves,', 'yú xì lián yè xī', '鱼戏/莲叶西，'], ['鱼戏莲叶南，', 'fish play south of the lotus leaves,', 'yú xì lián yè nán', '鱼戏/莲叶南，'], ['鱼戏莲叶北。', 'fish play north of the lotus leaves.', 'yú xì lián yè běi', '鱼戏/莲叶北。'],
  ] },
  { id: 'pond-child', title: '池上·其二', english: 'On the Pond · II', author: '白居易 · Bai Juyi', level: 'intermediate', tags: ['poetry', 'tang poetry', 'classical chinese', 'childhood', 'nature'], description: 'A child’s little boat leaves a visible trail.', source: 'https://zh.wikisource.org/zh-hans/池上二絕', note: 'The second of the two poems in the linked source.', lines: [
    ['小娃撑小艇，', 'A little child poles a small boat,', 'xiǎo wá chēng xiǎo tǐng', '小娃/撑小艇，'], ['偷采白莲回。', 'returning with secretly picked white lotus.', 'tōu cǎi bái lián huí', '偷采/白莲回。'], ['不解藏踪迹，', 'Not knowing how to hide the trail,', 'bù jiě cáng zōng jì', '不解/藏踪迹，'], ['浮萍一道开。', 'the child leaves a path through the duckweed.', 'fú píng yī dào kāi', '浮萍/一道开。'],
  ] },
  { id: 'deer-enclosure', title: '鹿柴', english: 'Deer Enclosure', author: '王维 · Wang Wei', level: 'intermediate', tags: ['poetry', 'tang poetry', 'classical chinese', 'nature', 'landscape'], description: 'Voices and evening light in an apparently empty mountain landscape.', source: 'https://zh.wikisource.org/zh-hans/鹿柴_(王維)', lines: [
    ['空山不见人，', 'On the empty mountain no one is seen,', 'kōng shān bù jiàn rén', '空山/不见人，'], ['但闻人语响。', 'but the sound of voices is heard.', 'dàn wén rén yǔ xiǎng', '但闻/人语响。'], ['返景入深林，', 'Returning sunlight enters the deep woods,', 'fǎn jǐng rù shēn lín', '返景/入深林，'], ['复照青苔上。', 'shining again upon the green moss.', 'fù zhào qīng tái shàng', '复照/青苔上。'],
  ] },
  { id: 'visit-hermit', title: '寻隐者不遇', english: 'Seeking a Hermit, Without Meeting Him', author: '贾岛 · Jia Dao', level: 'intermediate', tags: ['poetry', 'tang poetry', 'classical chinese', 'nature', 'conversation'], description: 'A short question and answer beneath a pine tree.', source: 'https://zh.wikisource.org/zh-hans/尋隱者不遇', lines: [
    ['松下问童子，', 'Beneath a pine I ask the young attendant;', 'sōng xià wèn tóng zǐ', '松下/问童子，'], ['言师采药去。', 'he says his teacher has gone to gather herbs.', 'yán shī cǎi yào qù', '言师/采药去。'], ['只在此山中，', 'He is somewhere on this mountain,', 'zhǐ zài cǐ shān zhōng', '只在/此山中，'], ['云深不知处。', 'but the clouds are deep, and his whereabouts unknown.', 'yún shēn bù zhī chù', '云深/不知处。'],
  ] },
]
