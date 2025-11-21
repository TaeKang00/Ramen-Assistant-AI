// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));
const indexPath = path.join(__dirname, 'index.html');
app.get('/', (_, res) => res.sendFile(indexPath));

/* ─────────────────────────────────────────────────────────────
 * 브랜드/라면 카탈로그 (+ 맵기, 컵라면 여부)
 * ────────────────────────────────────────────────────────────*/
const RAMEN_CATALOG = {
  '농심': [
    { name: '신라면',       time: '4:30', spicy: 3, cup: false },
    { name: '신라면 블랙',  time: '4:30', spicy: 3, cup: false },
    { name: '얼큰 너구리',  time: '5:00', spicy: 4, cup: false },
    { name: '너구리',       time: '5:00', spicy: 3, cup: false },
    { name: '안성탕면',     time: '4:30', spicy: 2, cup: false },
    { name: '해물 안성탕면', time: '4:30', spicy: 3, cup: false },
    { name: '짜파게티',     time: '5:00', spicy: 1, cup: false },
    { name: '마라짜파게티', time: '5:00', spicy: 4, cup: false },
    { name: '배홍동비빔면', time: '3:00', spicy: 3, cup: false },
    { name: '배홍동칼빔면', time: '3:00', spicy: 4, cup: false },
    { name: '사리면',       time: '4:30', spicy: 0, cup: false },
    { name: '무파마',       time: '4:30', spicy: 3, cup: false },
    { name: '건면',         time: '4:30', spicy: 1, cup: false },
    { name: '오징어짬뽕',   time: '4:30', spicy: 4, cup: false },
    { name: '둥지냉면',     time: '2:30', spicy: 1, cup: false },
    { name: '냉면',         time: '2:30', spicy: 1, cup: false },
    { name: '짬뽕면',       time: '4:30', spicy: 3, cup: false },
    { name: '해물짬뽕',     time: '4:30', spicy: 4, cup: false },
    { name: '메밀소바',     time: '3:00', spicy: 0, cup: false },
    { name: '김치사발면',   time: '3:00', spicy: 2, cup: true  },
    { name: '육개장사발면', time: '3:00', spicy: 3, cup: true  },
    { name: '신라면 툼바',   time: '4:30', spicy: 3, cup: false },
  ],
  '삼양': [
    { name: '불닭볶음면',   time: '4:00', spicy: 5, cup: false },
    { name: '까르보불닭',   time: '4:00', spicy: 4, cup: false },
    { name: '치즈불닭',     time: '4:00', spicy: 4, cup: false },
    { name: '삼양라면',     time: '4:00', spicy: 2, cup: false },
    { name: '나가사키 짬뽕', time: '4:30', spicy: 3, cup: false },
    { name: '맛있게 매운면', time: '4:30', spicy: 3, cup: false },
    { name: '맵탱면',       time: '4:00', spicy: 4, cup: false },
  ],
  '오뚜기': [
    { name: '진라면(매운맛)', time: '4:30', spicy: 3, cup: false },
    { name: '진라면(순한맛)', time: '4:30', spicy: 1, cup: false },
    { name: '열라면',       time: '4:00', spicy: 4, cup: false },
    { name: '참깨라면',     time: '4:00', spicy: 2, cup: false },
    { name: '김치라면',     time: '4:00', spicy: 2, cup: false },
    { name: '진짬뽕',       time: '4:30', spicy: 4, cup: false },
    { name: '진짜장',       time: '4:30', spicy: 1, cup: false },
    { name: '쇠고기라면',   time: '4:00', spicy: 2, cup: false },
    { name: '북엇국라면',   time: '4:00', spicy: 1, cup: false },
    { name: '컵누들',       time: '3:00', spicy: 1, cup: true  },
    { name: '라면사리',     time: '4:00', spicy: 0, cup: false },
  ],
  '팔도': [
    { name: '비빔면',       time: '3:00', spicy: 3, cup: false },
    { name: '왕뚜껑',       time: '3:30', spicy: 2, cup: true  },
    { name: '꼬꼬면',       time: '4:00', spicy: 1, cup: false },
    { name: '틈새라면',     time: '4:00', spicy: 5, cup: false },
    { name: 'UP 컵왕뚜껑',  time: '3:30', spicy: 2, cup: true  },
    { name: '라볶이',       time: '4:00', spicy: 3, cup: false },
    { name: '남자라면',     time: '4:00', spicy: 4, cup: false },
  ],
};

// name -> time, spicy, cup
const FLAT_DB = {};
const SPICY_DB = {};
const CUP_DB   = {};

Object.values(RAMEN_CATALOG).flat().forEach(({ name, time, spicy, cup }) => {
  FLAT_DB[name] = time;
  if (typeof spicy === 'number') SPICY_DB[name] = spicy;
  CUP_DB[name] = !!cup;
});

app.get('/api/catalog', (_, res) => {
  res.json({ brands: Object.keys(RAMEN_CATALOG), catalog: RAMEN_CATALOG });
});

/* ─ 영어 이름 → 한글 이름 매핑 ─ */
const RAMEN_ALIASES_EN = {
  'Shin Ramyun': '신라면',
  'Shin Ramyun Black': '신라면 블랙',
  'Spicy Neoguri': '얼큰 너구리',
  'Neoguri': '너구리',
  'Ansungtangmyun': '안성탕면',
  'Seafood Ansungtangmyun': '해물 안성탕면',
  'Chapagetti': '짜파게티',
  'Mara Chapagetti': '마라짜파게티',
  'Bae Hong Dong Bibim': '배홍동비빔면',
  'Bae Hong Dong Spicy Bibim': '배홍동칼빔면',
  'Sari Ramyun': '사리면',
  'Mupama': '무파마',
  'Non-fried Noodles': '건면',
  'Squid Jjamppong': '오징어짬뽕',
  'Nest Cold Noodles': '둥지냉면',
  'Cold Noodles': '냉면',
  'Jjamppong Noodles': '짬뽕면',
  'Seafood Jjamppong': '해물짬뽕',
  'Buckwheat Soba': '메밀소바',
  'Kimchi Bowl Noodles': '김치사발면',
  'Yukgaejang Bowl Noodles': '육개장사발면',
  'Shin Ramyun Tumba': '신라면 툼바',
  'Buldak Stir-fried': '불닭볶음면',
  'Carbonara Buldak': '까르보불닭',
  'Cheese Buldak': '치즈불닭',
  'Samyang Ramyun': '삼양라면',
  'Nagasaki Jjamppong': '나가사키 짬뽕',
  'Tasty Spicy Noodles': '맛있게 매운면',
  'MaepTaeng Noodles': '맵탱면',
  'Jin Ramen (Spicy)': '진라면(매운맛)',
  'Jin Ramen (Mild)': '진라면(순한맛)',
  'Yeol Ramen': '열라면',
  'Sesame Ramen': '참깨라면',
  'Kimchi Ramen': '김치라면',
  'Jin Jjamppong': '진짬뽕',
  'Jin Jjajang': '진짜장',
  'Beef Ramen': '쇠고기라면',
  'Dried Pollack Soup Ramen': '북엇국라면',
  'Cup Noodle (Low-cal)': '컵누들',
  'Ramen Noodles (Extra)': '라면사리',
  'Paldo Bibim Men': '비빔면',
  'King Lid Cup': '왕뚜껑',
  'Kkokko Men': '꼬꼬면',
  'Teumsae Ramen': '틈새라면',
  'UP King Lid Cup': 'UP 컵왕뚜껑',
  'Rabokki': '라볶이',
  'Namja Ramen': '남자라면',
};

/* ─────────────────────────────────────────────────────────────
 * 끓이는 방법 가이드 엔진 (KR / EN)
 * ────────────────────────────────────────────────────────────*/
const GUIDE_OVERRIDES = {
  '신라면': {
    type: 'soup',
    water_ml: 550,
    time_sec: 270,
    notes_ko: ['물 550ml 권장', '대파/계란 추가 추천'],
    notes_en: ['Recommended 550 ml of water', 'Tastes great with green onion or egg'],
  },
  '신라면 블랙': {
    type: 'soup',
    water_ml: 550,
    time_sec: 270,
    notes_ko: ['사골스프 분리 동봉, 표기순서 준수'],
    notes_en: ['Use the bone broth soup packet as written on the package'],
  },
  '너구리': {
    type: 'soup',
    water_ml: 550,
    time_sec: 300,
    notes_ko: ['다시마는 취향대로 건져내기'],
    notes_en: ['You can remove the kelp piece if you like'],
  },
  '얼큰 너구리': {
    type: 'soup',
    water_ml: 550,
    time_sec: 300,
    notes_ko: ['면이 굵어 충분히 끓이기'],
    notes_en: ['Noodles are thick, so cook them fully'],
  },
  '짜파게티': {
    type: 'stir',
    water_ml: 600,
    time_sec: 300,
    notes_ko: ['면수 5~7큰술 남김'],
    notes_en: ['Keep 5–7 spoons of noodle water for sauce'],
  },
  '마라짜파게티': {
    type: 'stir',
    water_ml: 600,
    time_sec: 300,
    notes_ko: ['기본 조리 동일, 맵기 주의'],
    notes_en: ['Same as Chapagetti, but spicier'],
  },
  '불닭볶음면': {
    type: 'stir',
    water_ml: 600,
    time_sec: 240,
    notes_ko: ['면수 2~3큰술 남겨 볶기', '맵기 주의'],
    notes_en: ['Leave 2–3 spoons of noodle water', 'Very spicy – be careful'],
  },
  '까르보불닭': {
    type: 'stir',
    water_ml: 600,
    time_sec: 240,
    notes_ko: ['가루스프는 불 끄고 섞기'],
    notes_en: ['Add powder sauce after turning off the heat'],
  },
  '비빔면': {
    type: 'bibim',
    water_ml: 600,
    time_sec: 180,
    notes_ko: ['찬물로 충분히 헹궈 전분기 제거', '얼음물 추천'],
    notes_en: ['Rinse well in cold water to remove starch', 'Ice water makes it extra refreshing'],
  },
  '왕뚜껑': {
    type: 'cup',
    water_ml: 400,
    time_sec: 210,
    notes_ko: ['용기 물선까지 끓는 물', '3~3:30 대기'],
    notes_en: ['Fill with boiling water to the inner line', 'Wait about 3–3:30 minutes'],
  },
  'UP 컵왕뚜껑': {
    type: 'cup',
    water_ml: 400,
    time_sec: 210,
    notes_ko: ['용기 물선까지 끓는 물', '3~3:30 대기'],
    notes_en: ['Fill with boiling water to the inner line', 'Wait about 3–3:30 minutes'],
  },
  '진라면(매운맛)': {
    type: 'soup',
    water_ml: 550,
    time_sec: 270,
    notes_ko: [],
    notes_en: [],
  },
  '진라면(순한맛)': {
    type: 'soup',
    water_ml: 550,
    time_sec: 270,
    notes_ko: [],
    notes_en: [],
  },
  '진짜장': {
    type: 'stir',
    water_ml: 600,
    time_sec: 270,
    notes_ko: ['면수 조금 남겨 농도 맞추기'],
    notes_en: ['Keep a little noodle water to adjust thickness'],
  },
  '진짬뽕': {
    type: 'soup',
    water_ml: 550,
    time_sec: 270,
    notes_ko: ['분말/유성스프 순서 준수'],
    notes_en: ['Follow the order of powder and oil soup packets'],
  },
  '컵누들': {
    type: 'cup',
    water_ml: 300,
    time_sec: 180,
    notes_ko: ['저칼로리 컵, 뜨거운 물 주의'],
    notes_en: ['Low-calorie cup noodle, be careful with hot water'],
  },
};

function inferTypeByName(n) {
  const s = String(n || '');
  if (/(짜파게티|자장|짜장|볶음|불닭|까르보|볶이)/.test(s)) return 'stir';
  if (/(비빔|냉면|소바)/.test(s)) return 'bibim';
  if (/(컵|사발|뚜껑)/.test(s)) return 'cup';
  return 'soup';
}

/** 섹션을 번호 steps로 평탄화 */
function flattenSections(sections) {
  const lines = [];
  sections.forEach((sec) => {
    sec.items.forEach((item) => lines.push(item));
  });
  return lines.map((t, i) => `${i + 1}. ${t}`);
}

/** 타입별 섹션 – lang에 따라 KR/EN */
function buildSectionsByType({ type, water_ml, time_sec, lang }) {
  const mm = Math.floor(time_sec / 60);
  const ss = String(time_sec % 60).padStart(2, '0');
  const isEn = lang === 'en';

  if (type === 'soup') {
    return isEn
      ? [
          { title: 'Water', items: [`Boil ${water_ml} ml of water in a pot.`] },
          { title: 'Noodles', items: [`When it boils, add the noodles and cook for ${mm}:${ss}.`] },
          {
            title: 'Soup base',
            items: ['When the noodles loosen, add powder/veggie soup and boil 30 seconds more while stirring.'],
          },
          { title: 'Finish', items: ['Top with green onion, egg, or cheese if you like.'] },
        ]
      : [
          { title: '물', items: [`냄비에 물 ${water_ml}ml를 붓고 끓입니다.`] },
          { title: '면', items: [`물이 끓으면 면을 넣고 ${mm}:${ss} 동안 끓입니다.`] },
          { title: '스프', items: ['면이 풀리면 분말/건더기스프를 넣고 30초 더 끓이며 저어줍니다.'] },
          { title: '마무리', items: ['기호에 따라 대파/계란/치즈를 추가해 마무리합니다.'] },
        ];
  }
  if (type === 'stir') {
    return isEn
      ? [
          { title: 'Water', items: [`Boil ${water_ml} ml of water.`] },
          {
            title: 'Noodles',
            items: [`Cook the noodles for ${mm}:${ss}, then drain, leaving 2–7 spoons of noodle water.`],
          },
          {
            title: 'Sauce',
            items: ['On low heat, add liquid/powder sauce and stir-fry for 30–60 seconds until coated.'],
          },
          { title: 'Finish', items: ['Top with green onion, cheese, or fried egg.'] },
        ]
      : [
          { title: '물', items: [`물 ${water_ml}ml를 끓입니다.`] },
          {
            title: '면',
            items: [`면을 ${mm}:${ss} 삶은 뒤 물을 거의 버리고 면수 2~7큰술만 남깁니다.`],
          },
          {
            title: '소스',
            items: ['약불에서 액상/분말소스를 넣고 30~60초간 골고루 볶아 코팅합니다.'],
          },
          { title: '마무리', items: ['파/치즈/계란프라이를 곁들이면 좋아요.'] },
        ];
  }
  if (type === 'bibim') {
    return isEn
      ? [
          { title: 'Water', items: [`Boil ${water_ml} ml of water.`] },
          {
            title: 'Noodles',
            items: [`Cook for ${mm}:${ss}, drain completely, then rinse well in cold water to remove starch.`],
          },
          { title: 'Sauce', items: ['Squeeze out the water, then mix evenly with the bibim sauce.'] },
          { title: 'Finish', items: ['Add cucumber, egg, or ice for extra refreshment.'] },
        ]
      : [
          { title: '물', items: [`물 ${water_ml}ml를 끓입니다.`] },
          {
            title: '면',
            items: [`면을 ${mm}:${ss} 삶은 뒤 물을 완전히 버리고 찬물에 충분히 헹궈 전분기를 제거합니다.`],
          },
          { title: '소스', items: ['물기를 꼭 짠 뒤 비빔소스를 넣고 골고루 비빕니다.'] },
          { title: '마무리', items: ['오이/계란/얼음을 곁들이면 더 시원합니다.'] },
        ];
  }
  if (type === 'cup') {
    return isEn
      ? [
          { title: 'Prepare', items: ['Open the lid to the line and add the soup base as written.'] },
          { title: 'Water', items: ['Pour boiling water up to the inner line and close the lid.'] },
          { title: 'Wait', items: [`Wait ${mm}:${ss}, then stir well and enjoy.`] },
        ]
      : [
          { title: '준비', items: ['뚜껑을 표시선까지 열고 스프를 표기대로 넣습니다.'] },
          { title: '물', items: ['끓는 물을 용기 물선까지 붓고 뚜껑을 닫습니다.'] },
          { title: '대기', items: [`${mm}:${ss} 기다린 뒤 젓가락으로 잘 저어 드세요.`] },
        ];
  }

  return isEn
    ? [
        {
          title: 'Check',
          items: ['First, follow the instructions on the package.', 'Identify if it is soup, stir-fried, bibim, or cup type.'],
        },
      ]
    : [
        {
          title: '확인',
          items: ['봉지 표기 조리법을 우선 확인하세요.', '국물/볶음/비빔/컵 유형을 먼저 파악하세요.'],
        },
      ];
}

/** name으로 가이드 */
function buildGuideByName(name, lang = 'ko') {
  const ov = GUIDE_OVERRIDES[name];
  const type = ov?.type || inferTypeByName(name);
  const timeText = FLAT_DB[name];
  const timeSecFromCatalog = timeText
    ? (() => {
        const [m, s = '0'] = timeText.split(':').map(Number);
        return (m || 0) * 60 + (s || 0);
      })()
    : undefined;

  const time_sec = ov?.time_sec ?? timeSecFromCatalog ?? 240;
  const water_ml = ov?.water_ml ?? (type === 'cup' ? 350 : 550);

  const sections = buildSectionsByType({ type, water_ml, time_sec, lang });
  const steps = flattenSections(sections);

  const isEn = lang === 'en';
  const quick = isEn
    ? [
        type === 'cup' ? 'Pour boiling water to the inner line' : `Boil ${water_ml} ml of water`,
        type === 'cup'
          ? `Close the lid and wait ${Math.floor(time_sec / 60)}:${String(time_sec % 60).padStart(2, '0')}`
          : `Cook noodles for ${Math.floor(time_sec / 60)}:${String(time_sec % 60).padStart(2, '0')}`,
        type === 'soup'
          ? 'Add soup base and boil 30 sec more'
          : type === 'stir'
          ? 'Leave a little noodle water and stir-fry with sauce'
          : type === 'bibim'
          ? 'Rinse in cold water and mix with sauce'
          : 'Stir well before eating',
      ]
    : [
        type === 'cup' ? `용기 물선까지 끓는 물` : `물 ${water_ml}ml 끓이기`,
        type === 'cup'
          ? `뚜껑 닫고 ${Math.floor(time_sec / 60)}:${String(time_sec % 60).padStart(2, '0')} 대기`
          : `면 ${Math.floor(time_sec / 60)}:${String(time_sec % 60).padStart(2, '0')} 끓이기`,
        type === 'soup'
          ? '스프 넣고 30초 더'
          : type === 'stir'
          ? '면수 조금 남기고 소스 볶기'
          : type === 'bibim'
          ? '찬물 헹구고 소스에 비비기'
          : '젓가락으로 골고루 저어먹기',
      ];

  const title = isEn ? `${name} – how to cook` : `${name} 끓이는 방법`;

  const notes =
    lang === 'en'
      ? ov?.notes_en || ov?.notes || []
      : ov?.notes_ko || ov?.notes || [];

  return {
    title,
    sections,
    steps,
    quick,
    notes,
    meta: { type, water_ml, time_sec },
  };
}

const GUIDE_NAMES = Array.from(
  new Set([
    ...Object.keys(GUIDE_OVERRIDES),
    ...Object.values(RAMEN_CATALOG).flat().map((x) => x.name),
  ]),
);

/* ─ API: 끓이는 방법 ─ */
app.get('/api/guide', (req, res) => {
  const name = String(req.query.name || '').trim();
  const lang = req.query.lang === 'en' ? 'en' : 'ko';
  if (!name) return res.status(400).json({ error: 'name query required' });

  const target =
    GUIDE_NAMES.find((n) => n === name) ||
    GUIDE_NAMES.find((n) => n.includes(name)) ||
    name;

  return res.json(buildGuideByName(target, lang));
});

/* 필요시 쓸 수 있는 간단 버전 */
app.get('/api/guide/quick', (req, res) => {
  const name = String(req.query.name || '').trim();
  const lang = req.query.lang === 'en' ? 'en' : 'ko';
  if (!name) return res.status(400).json({ error: 'name query required' });

  const target =
    GUIDE_NAMES.find((n) => n === name) ||
    GUIDE_NAMES.find((n) => n.includes(name)) ||
    name;

  const g = buildGuideByName(target, lang);
  res.json({ title: g.title, quick: g.quick, meta: g.meta });
});

/* ─────────────────────────────────────────────────────────────
 * 헬스/인덱스
 * ────────────────────────────────────────────────────────────*/
app.get('/health', (_, res) =>
  res.json({ ok: true, time: new Date().toISOString() }),
);
app.get('/api', (_, res) =>
  res.json({
    ok: true,
    hint:
      'GET /api/catalog, GET /api/guide?name=신라면, GET /api/parse',
  }),
);

/* ─────────────────────────────────────────────────────────────
 * Gemini 파서
 * ────────────────────────────────────────────────────────────*/
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
});

function stripJsonFence(raw) {
  const s = String(raw ?? '').trim();
  const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (m ? m[1] : s).trim();
}

let lastContext = { lastName: '', lastTimeText: '' };

/** 텍스트 속 라면 이름 찾기 (한글 + 영어 별칭) */
function findClosestNameInText(t = '') {
  const s = String(t);

  // 한글 이름 먼저
  for (const brand of Object.keys(RAMEN_CATALOG)) {
    for (const item of RAMEN_CATALOG[brand]) {
      if (s.includes(item.name)) return item.name;
    }
  }

  // 영어 별칭
  const lower = s.toLowerCase();
  for (const [en, ko] of Object.entries(RAMEN_ALIASES_EN)) {
    if (lower.includes(en.toLowerCase())) return ko;
  }

  return null;
}

/* ─ LLM 실패했을 때도 항상 안전한 JSON 리턴 ─ */
function buildLLMFallback(lang = 'ko') {
  const isEn = lang === 'en';
  if (isEn) {
    return {
      name: 'ramen',
      seconds: 240,
      raw_time_text: '',
      reply:
        'The AI server had a small hiccup, but you can still type something like “Shin Ramyun 4:30” and I’ll help you set a timer 😊',
      suggestions: ['Shin Ramyun 4:30', 'Recommend a ramen'],
      should_start: false,
      control: null,
    };
  }
  return {
    name: '라면',
    seconds: 240,
    raw_time_text: '',
    reply:
      '지금 AI 서버가 잠깐 불안정해서 정확히 이해하진 못했어요.\n\n그래도 아래에 “신라면 4:30” 처럼 간단히 적어주면 타이머는 계속 도와줄게요 😊',
    suggestions: ['신라면 4:30', '라면 추천해줘'],
    should_start: false,
    control: null,
  };
}

/* ─────────────────────────────────────────────────────────────
 * /api/parse – 인텐트 + 조리법 + Gemini 파싱
 *  + 에러 나도 항상 200 OK + fallback JSON
 * ────────────────────────────────────────────────────────────*/
app.post('/api/parse', async (req, res) => {
  const { text, lang: rawLang } = req.body ?? {};
  const lang = rawLang === 'en' ? 'en' : 'ko';

  try {
    if (!text || typeof text !== 'string') {
      // text 없을 때도 그냥 fallback
      return res.json(buildLLMFallback(lang));
    }

    /* ─────────────────────────────
       1) 자연어 타이머 제어 인텐트 감지
       (원하면 프론트에서만 써도 되지만, 여기 로직은 놔둬도 서버 안 터짐)
    ──────────────────────────────*/
    const cancelIntent = /(타이머 ?(취소|꺼)|취소해줘|타이머 꺼줘|cancel (the )?timer|stop (the )?timer)/i.test(
      text,
    );
    const pauseIntent  = /(타이머 ?(정지|일시정지)|멈춰줘|잠깐 멈춰|pause (the )?timer)/i.test(
      text,
    );
    const resumeIntent = /(다시 시작|재시작|계속해|resume (the )?timer|continue (the )?timer)/i.test(
      text,
    );

    /* 시간/라면 이름 존재 여부 (뒤에서도 씀) */
    const hasTime =
      /(\d+\s*분)|(\d+\s*초)|\d+:\d{1,2}/.test(text) ||
      /(\d+ ?min)|(\d+ ?sec)/i.test(text);

    const matchedNameKorean = Object.keys(FLAT_DB).find((n) => text.includes(n));
    const matchedName = matchedNameKorean || findClosestNameInText(text);

    /* 👉 타이머 제어만 있는 짧은 입력일 때는
          Gemini 호출 안 하고 여기서 바로 응답 리턴 */
    if ((cancelIntent || pauseIntent || resumeIntent) && !hasTime && !matchedName) {
      const isEn = lang === 'en';
      const control = cancelIntent ? 'cancel' : pauseIntent ? 'pause' : 'resume';

      let reply;
      let suggestions;

      if (isEn) {
        if (control === 'cancel') {
          reply = 'Okay, I canceled the ramen timer. Tell me which ramen you want to cook next 🍜';
        } else if (control === 'pause') {
          reply = 'Paused the ramen timer. Say “resume the timer” when you want to continue.';
        } else {
          reply = 'Resumed the ramen timer. I’ll keep counting for you ⏱️';
        }
        suggestions = ['Start a new ramen timer', 'Recommend a ramen'];
      } else {
        if (control === 'cancel') {
          reply = '네, 타이머를 취소했어요. 다음에 어떤 라면을 끓일지 알려주시면 다시 도와드릴게요 🍜';
        } else if (control === 'pause') {
          reply = '타이머를 일시 정지했어요. 다시 시작하고 싶으면 “타이머 계속”이라고 말씀해 주세요.';
        } else {
          reply = '타이머를 다시 시작했어요. 계속 시간을 재 줄게요 ⏱️';
        }
        suggestions = ['다른 라면 타이머 시작할까?', '라면 추천해줘'];
      }

      return res.json({
        name: lastContext.lastName || '라면',
        seconds: 240,          // 어차피 should_start = false 라서 의미 없음
        raw_time_text: '',
        reply,
        suggestions,
        should_start: false,
        control,
      });
    }

    /* ─────────────────────────────
       2) "끓이는 방법/레시피" 인텐트면 가이드만 리턴
    ──────────────────────────────*/
    const recipeIntent = /(끓이는 방법|레시피|조리법|how to cook|recipe|instructions?)/i.test(text);
    if (recipeIntent) {
      const wantDetail = /(자세히|상세|detail|full)/i.test(text);
      const name =
        findClosestNameInText(text) || lastContext.lastName || '라면';
      const guide = buildGuideByName(name, lang);

      const stepsArray = wantDetail
        ? guide.steps
        : guide.quick.map((x, i) => `${i + 1}. ${x}`);
      const stepsHtml = stepsArray.join('<br>');
      const notesHtml = guide.notes.length
        ? `<br><span style="opacity:.8">Tip) ${guide.notes.join(' · ')}</span>`
        : '';

      let reply, suggestions;
      if (lang === 'en') {
        reply = `<b>${guide.title}</b><br>${stepsHtml}${notesHtml}${
          wantDetail
            ? ''
            : '<br><br><span style="opacity:.7">* This is an easy 3-step guide. You can see full steps with “Show details”.</span>'
        }`;
        suggestions = wantDetail
          ? ['Start timer with this time', 'Recommend another ramen']
          : ['Show details', 'Start timer with this time', 'Recommend another ramen'];
      } else {
        reply = `<b>${guide.title}</b><br>${stepsHtml}${notesHtml}${
          wantDetail
            ? ''
            : '<br><br><span style="opacity:.7">* 초보용 3단계 요약입니다. “자세히 보기”를 누르면 전체 조리법을 보여줄게요.</span>'
        }`;
        suggestions = wantDetail
          ? ['이 시간으로 타이머 시작', '다른 라면 추천']
          : ['자세히 보기', '이 시간으로 타이머 시작', '다른 라면 추천'];
      }

      lastContext = { lastName: name, lastTimeText: '' };

      return res.json({
        name,
        seconds: guide.meta.time_sec,
        raw_time_text: '',
        reply,
        suggestions,
        should_start: false,
        control: null,
      });
    }

    /* ─────────────────────────────
       3) 여기부터는 Gemini 로직 (추천/타이머 시작)
    ──────────────────────────────*/
    const looksLikeGreeting =
      /(안녕|안뇽|하이|hello|hi|hey|good (morning|evening)|what'?s up|테스트)/i.test(
        text,
      );
    let shouldStartHeuristic = !!(hasTime || matchedName) && !looksLikeGreeting;

    const systemKo = `
너는 따뜻하고 간결한 "🍜 라면 AI 비서"야.
- 답변은 항상 자연스러운 한국어로만 해.
- 시간 계산은 초 단위, 사용자에겐 자연스러운 한국어(mm:ss).
- "3분인데 2분50초만"은 최종값 2:50으로.
- 시간이 없으면 DB 값, DB에도 없으면 240초.
- seconds <=0 또는 NaN이면 240.
- 과장 금지, 이모지 0~2개.
- 입력이 인사/모호하면 타이머를 시작하지 말고, 어떤 라면/시간인지 물어봐.
- 사용자가 "매운거 말고", "처음", "초보", "children" 등을 말하면 SPICY_DB를 참고해서 spicy 1~2 수준의 라면을 추천해.
- "엄청 매운거", "불닭 느낌" 등은 spicy 4~5 위주로 추천해.
- "호텔", "숙소", "컵라면", "전기포트" 등을 언급하면 CUP_DB에서 cup=true인 제품을 우선 추천해.
`;

    const systemEn = `
You are a warm and concise "🍜 Ramen AI Assistant".
- Always answer in natural English (simple and friendly, for foreigners in Korea/Japan).
- Internally you compute time in seconds, but talk in mm:ss.
- "3 minutes but only 2:50" means final time is 2:50.
- If no time is given, use DB value, or 240 seconds by default.
- If seconds <= 0 or NaN, use 240.
- No exaggeration, use at most 0–2 emojis.
- If the input is just a greeting or ambiguous, do NOT start the timer; politely ask what ramen and how long.
- If the user says things like "not spicy", "beginner", "for kids", recommend mild noodles with spicy level 1–2 using SPICY_DB.
- If they want "very spicy", "extreme", choose from spicy level 4–5.
- If they mention "hotel", "cup noodle", "kettle", prefer items where CUP_DB[name] is true (cup noodles).
`;

    const system = lang === 'en' ? systemEn : systemKo;

    const prompt =
      lang === 'en'
        ? `
[User input]
${text}

[Ramen DB: time map]
${JSON.stringify(FLAT_DB, null, 2)}

[Spicy level (1=mild, 5=very spicy)]
${JSON.stringify(SPICY_DB, null, 2)}

[Cup noodles (hotel-friendly)]
${JSON.stringify(CUP_DB, null, 2)}

[Last context] name=${lastContext.lastName || 'none'}, timeText=${lastContext.lastTimeText || 'none'}

[Output format – JSON only]
{
  "name": string,          // ramen name in Korean (matching DB keys)
  "seconds": number,       // final timer value in seconds
  "raw_time_text": string, // raw time phrase extracted from the text, e.g. "3 minutes", "2:50"
  "reply": string,         // friendly assistant reply in English
  "suggestions": string[], // 0–5 quick reply suggestions in English
  "should_start": boolean, // whether to start timer automatically
  "control": string | null // "cancel" | "pause" | "resume" | null
}

Rules:
- If user only asks for a recommendation (no time), pick a ramen using SPICY_DB/CUP_DB rules and set seconds using FLAT_DB time or 240 fallback.
- should_start:
  - true if there is a clear time expression or a clear ramen name to start with.
  - false for greetings or vague inputs.
  - When in doubt, set to false.
- control:
  - Normally null. Use it only if you are *sure* the user explicitly wants to cancel/pause/resume the current timer.
`
        : `
[사용자 입력]
${text}

[라면 DB: 시간]
${JSON.stringify(FLAT_DB, null, 2)}

[맵기 정보 (1=순한맛, 5=아주 매움)]
${JSON.stringify(SPICY_DB, null, 2)}

[컵라면 여부 (호텔용)]
${JSON.stringify(CUP_DB, null, 2)}

[직전 맥락] name=${lastContext.lastName || '없음'}, timeText=${lastContext.lastTimeText || '없음'}

[출력(JSON만)]
{
  "name": string,          // 라면 이름(반드시 위 DB에 있는 한글 이름)
  "seconds": number,
  "raw_time_text": string,
  "reply": string,
  "suggestions": string[],
  "should_start": boolean,
  "control": string | null // "cancel" | "pause" | "resume" | null
}

규칙:
- 사용자가 "추천해줘"만 말하면 SPICY_DB / CUP_DB를 참고해서 라면 하나를 골라줘. 시간은 FLAT_DB에 있는 값을 쓰고, 없으면 240초.
- should_start:
  - 시간 표현 또는 명확한 라면명이 있으면 true.
  - 인사/모호한 입력이면 false.
  - 애매하면 false.
- control:
  - 평소엔 null.
  - 사용자가 분명히 "타이머 취소/정지/재시작"을 말할 때만 "cancel" / "pause" / "resume"으로 설정해.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: system }] },
        { role: 'user', parts: [{ text: prompt }] },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          additionalProperties: false,
          required: [
            'name',
            'seconds',
            'raw_time_text',
            'reply',
            'suggestions',
            'should_start',
          ],
          properties: {
            name: { type: 'string' },
            seconds: { type: 'number' },
            raw_time_text: { type: 'string' },
            reply: { type: 'string' },
            suggestions: {
              type: 'array',
              items: { type: 'string' },
              minItems: 0,
              maxItems: 5,
            },
            should_start: { type: 'boolean' },
            control: { type: 'string' },
          },
        },
      },
    });

    const raw =
      typeof response.text === 'function'
        ? response.text()
        : response.text;
    const cleaned = stripJsonFence(raw);

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      console.error('[PARSE ERROR] raw:', raw);
      console.error('[PARSE ERROR] cleaned:', cleaned);
      // JSON 깨져도 서버는 안 터지고 fallback
      return res.json(buildLLMFallback(lang));
    }

    // 보정
    data.name = (data.name || '라면').trim();
    data.seconds = Math.max(1, Math.floor(Number(data.seconds) || 240));
    data.raw_time_text = data.raw_time_text || '';
    if (!Array.isArray(data.suggestions)) data.suggestions = [];
    if (typeof data.should_start !== 'boolean')
      data.should_start = shouldStartHeuristic;
    if (typeof data.control !== 'string') data.control = null;

    // 자연어 인텐트가 함께 섞여 있는 긴 문장일 수도 있으니, 여기서도 한 번 더 정리
    let control = data.control;
    if (cancelIntent) control = 'cancel';
    else if (pauseIntent) control = 'pause';
    else if (resumeIntent) control = 'resume';

    // control 명령이 있으면 새 타이머 자동 시작은 막기
    if (control && data.should_start) {
      data.should_start = false;
    }

    lastContext = { lastName: data.name, lastTimeText: data.raw_time_text };

    return res.json({ ...data, control });
  } catch (err) {
    console.error('[API ERROR]', err);
    // 여기서도 무조건 200 + fallback
    return res.json(buildLLMFallback(lang));
  }
});

// 404
app.use((req, res) =>
  res.status(404).json({ error: 'not_found', path: req.path }),
);

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`✅ 서버 실행: http://localhost:${PORT}`);
  console.log(`📄 index: ${indexPath}`);
  console.log(
    `🔑 API 키: ${
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? '설정됨' : '없음'
    }`,
  );
  console.log('=================================');
});
