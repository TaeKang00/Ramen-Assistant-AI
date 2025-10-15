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
 * 브랜드/라면 카탈로그
 * ────────────────────────────────────────────────────────────*/
const RAMEN_CATALOG = {
  '농심': [
    { name: '신라면',       time: '4:30' },
    { name: '신라면 블랙',  time: '4:30' },
    { name: '얼큰 너구리',  time: '5:00' },
    { name: '너구리',       time: '5:00' },
    { name: '안성탕면',     time: '4:30' },
    { name: '해물 안성탕면', time: '4:30' },
    { name: '짜파게티',     time: '5:00' },
    { name: '마라짜파게티', time: '5:00' },
    { name: '배홍동비빔면', time: '3:00' },
    { name: '배홍동칼빔면', time: '3:00' },
    { name: '사리면',       time: '4:30' },
    { name: '무파마',       time: '4:30' },
    { name: '건면',         time: '4:30' },
    { name: '오징어짬뽕',   time: '4:30' },
    { name: '둥지냉면',     time: '2:30' },
    { name: '냉면',         time: '2:30' },
    { name: '짬뽕면',       time: '4:30' },
    { name: '해물짬뽕',     time: '4:30' },
    { name: '메밀소바',     time: '3:00' },
    { name: '김치사발면',   time: '3:00' },
    { name: '육개장사발면', time: '3:00' },
    { name: '신라면 툼바',   time: '4:30' },
  ],
  '삼양': [
    { name: '불닭볶음면',   time: '4:00' },
    { name: '까르보불닭',   time: '4:00' },
    { name: '치즈불닭',     time: '4:00' },
    { name: '삼양라면',     time: '4:00' },
    { name: '나가사키 짬뽕', time: '4:30' },
    { name: '맛있게 매운면', time: '4:30' },
    { name: '맵탱면',       time: '4:00' },
  ],
  '오뚜기': [
    { name: '진라면(매운맛)', time: '4:30' },
    { name: '진라면(순한맛)', time: '4:30' },
    { name: '열라면',       time: '4:00' },
    { name: '참깨라면',     time: '4:00' },
    { name: '김치라면',     time: '4:00' },
    { name: '진짬뽕',       time: '4:30' },
    { name: '진짜장',       time: '4:30' },
    { name: '쇠고기라면',   time: '4:00' },
    { name: '북엇국라면',   time: '4:00' },
    { name: '컵누들',       time: '3:00' },
    { name: '라면사리',     time: '4:00' },
  ],
  '팔도': [
    { name: '비빔면',       time: '3:00' },
    { name: '왕뚜껑',       time: '3:30' },
    { name: '꼬꼬면',       time: '4:00' },
    { name: '틈새라면',     time: '4:00' },
    { name: 'UP 컵왕뚜껑',  time: '3:30' },
    { name: '라볶이',       time: '4:00' },
    { name: '남자라면',     time: '4:00' },
  ],
};

// name -> time
const FLAT_DB = Object.values(RAMEN_CATALOG)
  .flat()
  .reduce((acc, { name, time }) => ((acc[name] = time), acc), {});

app.get('/api/catalog', (_, res) => {
  res.json({ brands: Object.keys(RAMEN_CATALOG), catalog: RAMEN_CATALOG });
});

/* ─────────────────────────────────────────────────────────────
 * 끓이는 방법 가이드 엔진
 * ────────────────────────────────────────────────────────────*/
const GUIDE_OVERRIDES = {
  '신라면':           { type: 'soup', water_ml: 550, time_sec: 270, notes: ['물 550ml 권장', '대파/계란 추가 추천'] },
  '신라면 블랙':       { type: 'soup', water_ml: 550, time_sec: 270, notes: ['사골스프 분리 동봉, 표기순서 준수'] },
  '너구리':           { type: 'soup', water_ml: 550, time_sec: 300, notes: ['다시마는 취향대로 건져내기'] },
  '얼큰 너구리':       { type: 'soup', water_ml: 550, time_sec: 300, notes: ['면이 굵어 충분히 끓이기'] },
  '짜파게티':         { type: 'stir', water_ml: 600, time_sec: 300, notes: ['면수 5~7큰술 남김'] },
  '마라짜파게티':      { type: 'stir', water_ml: 600, time_sec: 300, notes: ['기본 조리 동일, 맵기 주의'] },
  '불닭볶음면':        { type: 'stir', water_ml: 600, time_sec: 240, notes: ['면수 2~3큰술 남겨 볶기', '맵기 주의'] },
  '까르보불닭':        { type: 'stir', water_ml: 600, time_sec: 240, notes: ['가루스프는 불 끄고 섞기'] },
  '비빔면':           { type: 'bibim', water_ml: 600, time_sec: 180, notes: ['찬물로 충분히 헹궈 전분기 제거', '얼음물 추천'] },
  '왕뚜껑':           { type: 'cup',  water_ml: 400, time_sec: 210, notes: ['용기 물선까지 끓는 물', '3~3:30 대기'] },
  'UP 컵왕뚜껑':       { type: 'cup',  water_ml: 400, time_sec: 210, notes: ['용기 물선까지 끓는 물', '3~3:30 대기'] },
  '진라면(매운맛)':     { type: 'soup', water_ml: 550, time_sec: 270, notes: [] },
  '진라면(순한맛)':     { type: 'soup', water_ml: 550, time_sec: 270, notes: [] },
  '진짜장':           { type: 'stir', water_ml: 600, time_sec: 270, notes: ['면수 조금 남겨 농도 맞추기'] },
  '진짬뽕':           { type: 'soup', water_ml: 550, time_sec: 270, notes: ['분말/유성스프 순서 준수'] },
  '컵누들':           { type: 'cup',  water_ml: 300, time_sec: 180, notes: ['저칼로리 컵, 뜨거운 물 주의'] },
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
  sections.forEach(sec => {
    sec.items.forEach(item => lines.push(item));
  });
  return lines.map((t, i) => `${i + 1}. ${t}`);
}

/** 타입별 섹션(물/면/스프/마무리 등) */
function buildSectionsByType({ type, water_ml, time_sec }) {
  const mm = Math.floor(time_sec / 60);
  const ss = String(time_sec % 60).padStart(2, '0');

  if (type === 'soup') {
    return [
      { title: '물',   items: [`냄비에 물 ${water_ml}ml를 붓고 끓입니다.`] },
      { title: '면',   items: [`물이 끓으면 면을 넣고 ${mm}:${ss} 동안 끓입니다.`] },
      { title: '스프', items: ['면이 풀리면 분말/건더기스프를 넣고 30초 더 끓이며 저어줍니다.'] },
      { title: '마무리', items: ['기호에 따라 대파/계란/치즈를 추가해 마무리합니다.'] },
    ];
  }
  if (type === 'stir') {
    return [
      { title: '물',   items: [`물 ${water_ml}ml를 끓입니다.`] },
      { title: '면',   items: [`면을 ${mm}:${ss} 삶은 뒤 물을 거의 버리고 면수 2~7큰술만 남깁니다.`] },
      { title: '소스', items: ['약불에서 액상/분말소스를 넣고 30~60초간 골고루 볶아 코팅합니다.'] },
      { title: '마무리', items: ['파/치즈/계란프라이를 곁들이면 좋아요.'] },
    ];
  }
  if (type === 'bibim') {
    return [
      { title: '물',   items: [`물 ${water_ml}ml를 끓입니다.`] },
      { title: '면',   items: [`면을 ${mm}:${ss} 삶은 뒤 물을 완전히 버리고 찬물에 충분히 헹궈 전분기를 제거합니다.`] },
      { title: '소스', items: ['물기를 꼭 짠 뒤 비빔소스를 넣고 골고루 비빕니다.'] },
      { title: '마무리', items: ['오이/계란/얼음을 곁들이면 더 시원합니다.'] },
    ];
  }
  if (type === 'cup') {
    return [
      { title: '준비', items: ['뚜껑을 표시선까지 열고 스프를 표기대로 넣습니다.'] },
      { title: '물',   items: ['끓는 물을 용기 물선까지 붓고 뚜껑을 닫습니다.'] },
      { title: '대기', items: [`${mm}:${ss} 기다린 뒤 젓가락으로 잘 저어 드세요.`] },
    ];
  }
  // fallback
  return [
    { title: '확인', items: ['봉지 표기 조리법을 우선 확인하세요.', '국물/볶음/비빔/컵 유형을 먼저 파악하세요.'] },
  ];
}

/** name으로 가이드(오버라이드 > 카탈로그 시간 > 기본값) */
function buildGuideByName(name) {
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

  const sections = buildSectionsByType({ type, water_ml, time_sec });
  const steps = flattenSections(sections);
  const quick = [
    (type === 'cup' ? `용기 물선까지 끓는 물` : `물 ${water_ml}ml 끓이기`),
    (type === 'cup'
      ? `뚜껑 닫고 ${Math.floor(time_sec/60)}:${String(time_sec%60).padStart(2,'0')} 대기`
      : `면 ${Math.floor(time_sec/60)}:${String(time_sec%60).padStart(2,'0')} 끓이기`),
    (type === 'soup' ? '스프 넣고 30초 더' :
     type === 'stir' ? '면수 조금 남기고 소스 볶기' :
     type === 'bibim' ? '찬물 헹구고 소스에 비비기' : '젓가락으로 골고루 저어먹기')
  ];

  return {
    title: `${name} 끓이는 방법`,
    sections,        // [{ title, items[] }]
    steps,           // ["1. ...", "2. ..."]
    quick,           // ["물 550ml 끓이기", "면 4:30 끓이기", ...]
    notes: ov?.notes || [],
    meta: { type, water_ml, time_sec }
  };
}

const GUIDE_NAMES = Array.from(
  new Set([
    ...Object.keys(GUIDE_OVERRIDES),
    ...Object.values(RAMEN_CATALOG).flat().map(x => x.name),
  ])
);

/* ─ API: 끓이는 방법 ───────────────────────────────────────── */
app.get('/api/guide', (req, res) => {
  const name = String(req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name query required' });

  let target = GUIDE_NAMES.find(n => n === name)
    || GUIDE_NAMES.find(n => n.includes(name))
    || name;

  return res.json(buildGuideByName(target));
});

/* 클릭 즉시용 초간단 가이드(빠른 렌더) */
app.get('/api/guide/quick', (req, res) => {
  const name = String(req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name query required' });
  let target = GUIDE_NAMES.find(n => n === name)
    || GUIDE_NAMES.find(n => n.includes(name))
    || name;
  const g = buildGuideByName(target);
  res.json({ title: g.title, quick: g.quick, meta: g.meta });
});

app.get('/api/guide/list', (_, res) => {
  res.json({ items: GUIDE_NAMES });
});

/* ─────────────────────────────────────────────────────────────
 * 헬스/인덱스
 * ────────────────────────────────────────────────────────────*/
app.get('/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api', (_, res) => res.json({
  ok: true,
  hint: 'GET /api/catalog, GET /api/guide?name=신라면, GET /api/guide/quick?name=신라면, POST /api/parse'
}));

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

/** 문장 속에 카탈로그 라면명이 들어있는지 찾기 */
function findClosestNameInText(t='') {
  const s = String(t);
  for (const brand of Object.keys(RAMEN_CATALOG)) {
    for (const item of RAMEN_CATALOG[brand]) {
      if (s.includes(item.name)) return item.name;
    }
  }
  return null;
}

app.post('/api/parse', async (req, res) => {
  try {
    const { text } = req.body ?? {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text required' });
    }

    // 0) "끓이는 방법/레시피/조리법" 인텐트면 서버가 즉시 가이드 응답
    const recipeIntent = /(끓이는 방법|레시피|조리법)/.test(text);
    if (recipeIntent) {
      const name = findClosestNameInText(text) || lastContext.lastName || '라면';
      const guide = buildGuideByName(name);
      const stepsHtml = guide.steps.join('<br>');
      const notesHtml = guide.notes.length ? `<br><span style="opacity:.8">Tip) ${guide.notes.join(' · ')}</span>` : '';
      const reply = `<b>${guide.title}</b><br>${stepsHtml}${notesHtml}`;
      return res.json({
        name,
        seconds: guide.meta.time_sec,
        raw_time_text: '',
        reply,
        suggestions: ['이 시간으로 타이머 시작', '자세히 보기', '다른 라면 추천'],
        should_start: false
      });
    }

    // 1) 일반 휴리스틱
    const hasTime = /(\d+\s*분)|(\d+\s*초)|\d+:\d{1,2}/.test(text);
    const matchedName = Object.keys(FLAT_DB).find(n => text.includes(n));
    const looksLikeGreeting = /(안녕|안뇽|하이|hello|hi|ㅎㅇ|뭐해|테스트)/i.test(text);
    let shouldStartHeuristic = !!(hasTime || matchedName) && !looksLikeGreeting;

    const system = `
너는 따뜻하고 간결한 "🍜 라면 AI 비서".
- 시간 계산은 초 단위, 사용자에겐 자연스러운 한국어.
- "3분인데 2분50초만"은 최종값으로.
- 시간이 없으면 DB 값, DB에도 없으면 240초.
- seconds <=0 또는 NaN이면 240.
- 과장 금지, 이모지 0~2개.
- 입력이 인사/모호하면 타이머를 시작하지 말고, 어떤 라면/시간인지 물어봐.
`;

    const prompt = `
[사용자 입력]
${text}

[라면 DB]
${JSON.stringify(FLAT_DB, null, 2)}

[직전 맥락] name=${lastContext.lastName || '없음'}, timeText=${lastContext.lastTimeText || '없음'}

[출력(JSON만)]
{
  "name": string,
  "seconds": number,
  "raw_time_text": string,
  "reply": string,
  "suggestions": string[],
  "should_start": boolean
}

[판단 규칙: should_start]
- 시간 표현이 있거나 라면명이 명확하면 true.
- “안녕/하이/뭐해/테스트” 등 인사·모호한 입력은 false.
- 명확하지 않으면 false.
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
          required: ['name','seconds','raw_time_text','reply','suggestions','should_start'],
          properties: {
            name: { type: 'string' },
            seconds: { type: 'number' },
            raw_time_text: { type: 'string' },
            reply: { type: 'string' },
            suggestions: { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 5 },
            should_start: { type: 'boolean' }
          }
        }
      }
    });

    const raw = typeof response.text === 'function' ? response.text() : response.text;
    const cleaned = stripJsonFence(raw);

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      console.error('[PARSE ERROR] raw:', raw);
      console.error('[PARSE ERROR] cleaned:', cleaned);
      return res.status(422).json({ error: 'parse_failed', raw, cleaned });
    }

    // 2) 보정
    data.name = (data.name || '라면').trim();
    data.seconds = Math.max(1, Math.floor(Number(data.seconds) || 240));
    data.raw_time_text = data.raw_time_text || '';
    if (!Array.isArray(data.suggestions)) data.suggestions = [];
    if (typeof data.should_start !== 'boolean') data.should_start = shouldStartHeuristic;

    // 3) 메모리
    lastContext = { lastName: data.name, lastTimeText: data.raw_time_text };

    return res.json(data);
  } catch (err) {
    console.error('[API ERROR]', err);
    return res.status(500).json({ error: 'server_error', details: err.message });
  }
});

// 404
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`✅ 서버 실행: http://localhost:${PORT}`);
  console.log(`📄 index: ${indexPath}`);
  console.log(`🔑 API 키: ${process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? '설정됨' : '없음'}`);
  console.log('=================================');
});
