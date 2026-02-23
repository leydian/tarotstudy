type QuestionBucket =
  | 'general'
  | 'daily'
  | 'relationship'
  | 'career'
  | 'finance'
  | 'study'
  | 'choice'
  | 'project'
  | 'wellbeing';

type QuestionRecommendationOptions = {
  count?: number;
  poolSize?: number;
  seedKey?: string;
  spreadName?: string;
  context?: string;
};

const MIN_POOL_SIZE = 1000;
const MAX_POOL_SIZE = 10000;
const DEFAULT_POOL_SIZE = 3000;

const SUBJECTS = [
  '대화 타이밍',
  '관계 온도',
  '업무 우선순위',
  '학습 집중도',
  '재정 흐름',
  '체력 리듬',
  '면접 준비',
  '프로젝트 마감',
  '이직 타이밍',
  '시험 전략',
  '일정 운영',
  '감정 소모',
  '소통 방식',
  '결정 기준',
  '리스크 관리'
];

const TIME_WINDOWS = [
  '오늘',
  '이번 주',
  '다음 7일',
  '이번 달',
  '다음 30일',
  '이번 분기',
  '연말까지'
];

const GOALS = [
  '실행 성공률을 높이려면',
  '실수 확률을 줄이려면',
  '속도를 안정적으로 올리려면',
  '스트레스 누적을 줄이려면',
  '결과 편차를 줄이려면',
  '현실적인 결론을 내리려면'
];

const TEMPLATES_BY_BUCKET: Record<QuestionBucket, string[]> = {
  general: [
    '{time} {subject}에서 가장 먼저 확인할 신호는 뭐야?',
    '{goal} 지금 내가 버려야 할 습관 1개는 뭐야?',
    '{time} 기준으로 리딩을 행동으로 바꾸면 첫 단계는 뭐야?',
    '{subject}에서 우세/조건부/보류를 가르는 근거 2개만 알려줘'
  ],
  daily: [
    '{time} 루틴이 흔들리지 않게 오늘 핵심 행동 1개만 정해줘',
    '{time} 일정에서 과부하가 생길 지점을 먼저 짚어줘',
    '오늘 {subject}에서 피해야 할 실수 2개만 말해줘',
    '{goal} 오늘 밤 복기 질문 1개를 만들어줘'
  ],
  relationship: [
    '{time} 관계 대화에서 오해를 줄일 표현 방식은 뭐야?',
    '{subject} 기준으로 연락 속도를 어떻게 조절하면 좋아?',
    '{goal} 상대 반응을 확인할 체크포인트 2개를 줘',
    '{time} 재회/회복 질문에서 무리수 피하는 기준은 뭐야?'
  ],
  career: [
    '{time} 업무 우선순위를 재정렬하면 첫 번째 할 일은 뭐야?',
    '{subject} 기준으로 성과를 올리려면 무엇부터 정리해야 해?',
    '{goal} 면접/지원 질문에서 근거를 강화하는 문장은 뭐야?',
    '{time} 커리어 전환에서 보수적으로 봐야 할 리스크는 뭐야?'
  ],
  finance: [
    '{time} 지출 누수를 막는 행동 1개만 정해줘',
    '{subject} 기준으로 지금 보류해야 할 소비는 뭐야?',
    '{goal} 다음 30일 재정 루틴을 2단계로 나눠줘',
    '{time} 투자/저축 판단에서 체크할 경고 신호는 뭐야?'
  ],
  study: [
    '{time} 학습 집중도를 올리는 실전 루틴을 제안해줘',
    '{subject} 기준으로 시험 준비에서 가장 먼저 보완할 건 뭐야?',
    '{goal} 오늘 복기할 질문 2개만 뽑아줘',
    '{time} 공부 계획이 무너지는 원인을 어떻게 점검할까?'
  ],
  choice: [
    '{time} A/B 선택에서 우선순위를 정하는 기준 3개를 줘',
    '{subject} 중심으로 A와 B의 단기 리스크를 비교해줘',
    '{goal} 박빙일 때 결정을 미루는 조건은 뭐야?',
    '{time} 선택 후 체크해야 할 지표 2개를 알려줘'
  ],
  project: [
    '{time} 프로젝트 일정이 밀리지 않게 병목 1개를 찾아줘',
    '{subject}에서 바로 실행 가능한 레버를 1개 정해줘',
    '{goal} 팀 커뮤니케이션에서 정리할 규칙은 뭐야?',
    '{time} 마감 안정성을 높이는 점검 질문 2개만 줘'
  ],
  wellbeing: [
    '{time} 소진 신호를 줄이기 위한 완충 행동 1개를 정해줘',
    '{subject}에서 감정 소모가 커지는 패턴을 어떻게 끊을까?',
    '{goal} 회복 루틴을 오늘 일정에 넣는 방법은 뭐야?',
    '{time} 컨디션 저하를 조기 감지할 기준 2개를 알려줘'
  ]
};

function clampPoolSize(size?: number) {
  if (!Number.isFinite(size || 0)) return DEFAULT_POOL_SIZE;
  return Math.max(MIN_POOL_SIZE, Math.min(MAX_POOL_SIZE, Number(size)));
}

function hashSeed(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function inferBucket(text: string): QuestionBucket {
  const source = String(text || '');
  if (/관계|연애|재회|대화|갈등|상대/.test(source)) return 'relationship';
  if (/이직|면접|커리어|업무|직장|프로젝트|성과/.test(source)) return 'career';
  if (/돈|재정|지출|저축|투자|소비|예산/.test(source)) return 'finance';
  if (/시험|공부|학습|수업|과제/.test(source)) return 'study';
  if (/A|B|선택|비교|둘 중/.test(source)) return 'choice';
  if (/번아웃|피로|수면|회복|스트레스|건강/.test(source)) return 'wellbeing';
  if (/오늘|이번 주|일상|하루/.test(source)) return 'daily';
  return 'general';
}

function renderQuestion(
  templates: string[],
  spaceIndex: number,
  random: () => number
) {
  const tLen = templates.length;
  const sLen = SUBJECTS.length;
  const wLen = TIME_WINDOWS.length;
  const gLen = GOALS.length;

  const template = templates[(spaceIndex + Math.floor(random() * 97)) % tLen];
  const subject = SUBJECTS[(spaceIndex * 7 + Math.floor(random() * 41)) % sLen];
  const time = TIME_WINDOWS[(spaceIndex * 11 + Math.floor(random() * 29)) % wLen];
  const goal = GOALS[(spaceIndex * 13 + Math.floor(random() * 31)) % gLen];

  return template
    .replace('{subject}', subject)
    .replace('{time}', time)
    .replace('{goal}', goal)
    .replace(/\s+/g, ' ')
    .trim();
}

export function recommendRandomQuestions(options: QuestionRecommendationOptions = {}) {
  const {
    count = 6,
    poolSize = DEFAULT_POOL_SIZE,
    seedKey = '',
    spreadName = '',
    context = ''
  } = options;

  const safePoolSize = clampPoolSize(poolSize);
  const bucket = inferBucket(`${spreadName} ${context}`);
  const seed = hashSeed(`${seedKey}|${spreadName}|${context}|${new Date().toISOString().slice(0, 10)}`);
  const rand = mulberry32(seed);
  const templates = [...TEMPLATES_BY_BUCKET[bucket], ...TEMPLATES_BY_BUCKET.general];

  const targetCount = Math.max(1, Math.min(12, Math.floor(count)));
  const picked = new Set<string>();
  const maxAttempts = Math.max(targetCount * 18, 72);

  for (let i = 0; i < maxAttempts && picked.size < targetCount; i += 1) {
    const spaceIndex = Math.floor(rand() * safePoolSize) + i;
    picked.add(renderQuestion(templates, spaceIndex, rand));
  }

  if (picked.size < targetCount) {
    for (let i = 0; i < templates.length && picked.size < targetCount; i += 1) {
      picked.add(renderQuestion(templates, i, rand));
    }
  }
  return [...picked];
}
