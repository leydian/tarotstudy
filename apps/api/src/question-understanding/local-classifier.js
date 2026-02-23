import { inferQuestionIntent } from '../data/question-intents.js';
import { parseChoiceOptions } from './choice-parser.js';

const INTENTS = ['relationship-repair', 'social', 'relationship', 'career', 'finance', 'study', 'health', 'daily', 'general'];

const WEIGHTS = {
  'relationship-repair': ['재회', '화해', '갈등', '다툼', '오해', '사과', 'distance', 'reconnect'],
  social: ['친구', '동료', '평판', '인상', '협업', 'network', 'social'],
  relationship: ['연애', '상대', '썸', '고백', '결혼', '애인', '연락'],
  career: ['이직', '취직', '면접', '지원', '오퍼', '직무', '출근', 'job', 'career', 'office'],
  finance: ['지출', '수입', '저축', '투자', '결제', '구매', '예산', 'finance', 'budget', 'buy'],
  study: ['시험', '공부', '학습', '자격증', '기출', '복습', 'study', 'exam'],
  health: ['건강', '수면', '운동', '피로', '회복', 'health', 'sleep', 'workout'],
  daily: ['오늘', '운세', '흐름', '하루', 'daily', 'today', 'luck', '이번 주', '이번달', '이번 달']
};

// 방안 3: 다차원 신호 가중치 — 감정/시점/관계주체 신호
const ANXIETY_SIGNAL_PATTERNS = /(불안|두려|무서|망할|망했|떨어질|압박|막막|초조|공황|무너|끝나|걱정돼|걱정되|너무 힘|무섭|겁나)/;
const TIMING_SIGNAL_PATTERNS = /(언제가 좋|시기|타이밍|좋은 때|적절한 때|언제 해야|언제부터|언제쯤|몇 월|몇 달 후|어느 시점)/;
const RELATIONSHIP_SUBJECT_PATTERNS = /(남자친구|여자친구|전남친|전여친|남친|여친|상사|남편|아내|배우자|파트너|연인|썸남|썸녀|짝사랑)/;

function includesWord(text = '', token = '') {
  return String(text).includes(String(token));
}

function normalize(text = '') {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function detectQuestionType(text = '', choice = null) {
  const normalized = normalize(text);
  if (choice?.hasChoice) return 'choice_ab';
  if (/(할까|될까|말까|괜찮을까|맞을까|좋을까|나을까|가능할까|될지|있을까|수\s*있을까|가능성(?:이|은)?\s*있을까|can\s*i|should\s*i|is\s*it\s*okay)/i.test(normalized)) return 'yes_no';
  if (/(운세|흐름|전망|리딩|해석|luck|fortune|horoscope|today\s*luck|weekly\s*luck|monthly\s*luck|yearly\s*luck)/i.test(normalized)) return 'forecast';
  return 'open';
}

export function classifyQuestionLocal(context = '') {
  const text = normalize(context);
  const choice = parseChoiceOptions(context);
  const legacyIntent = inferQuestionIntent(context, {
    includeDaily: true,
    includeStudy: true,
    includeHealth: true
  });

  const scores = Object.fromEntries(INTENTS.map((intent) => [intent, 0]));
  const inferenceSignals = [];

  for (const [intent, tokens] of Object.entries(WEIGHTS)) {
    for (const token of tokens) {
      if (includesWord(text, token)) scores[intent] += token.length > 2 ? 1.2 : 0.9;
    }
  }

  if (/(luck|fortune|horoscope)/.test(text) && /(today|weekly|monthly|yearly|this week|this month|this year)/.test(text)) {
    scores.daily += 1.4;
  }

  if (choice.isPurchaseChoice) scores.finance += 2.2;
  if (choice.isWorkChoice) scores.career += 2.0;
  if (choice.isLocationChoice && /(관계|재회|연애|연락)/.test(text)) scores.relationship += 1.5;
  if (choice.isLocationChoice && /(회사|근무|출근|통근|job|office)/.test(text)) scores.career += 1.5;

  if (legacyIntent !== 'general') scores[legacyIntent] += 1.8;

  // 방안 3: 다차원 신호 가중치 추가
  if (ANXIETY_SIGNAL_PATTERNS.test(text)) {
    scores['relationship'] = (scores['relationship'] || 0) + 0.5;
    inferenceSignals.push({ signal: 'anxiety', weight: 2.5, boostedIntent: 'persona:anxious' });
    // anxious 신호는 intent보다 페르소나 추론에 영향 (별도 필드로 노출)
  }
  if (TIMING_SIGNAL_PATTERNS.test(text)) {
    scores['career'] = (scores['career'] || 0) + 1.5;
    inferenceSignals.push({ signal: 'timing', weight: 1.5, boostedIntent: 'career' });
  }
  if (RELATIONSHIP_SUBJECT_PATTERNS.test(text)) {
    scores['relationship'] = (scores['relationship'] || 0) + 2.5;
    inferenceSignals.push({ signal: 'relationship_subject', weight: 2.5, boostedIntent: 'relationship' });
  }

  const hasAnxietySignal = inferenceSignals.some((s) => s.signal === 'anxiety');

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topIntent, topScore] = ranked[0];
  const secondScore = ranked[1]?.[1] ?? 0;
  const confidence = Number(Math.max(0.35, Math.min(0.99, (topScore - secondScore + 1.4) / 4.5)).toFixed(3));

  const questionType = detectQuestionType(context, choice);

  return {
    intent: topScore <= 0.1 ? legacyIntent : topIntent,
    confidence,
    questionType,
    choice,
    source: 'local_model',
    inferenceSignals,
    hasAnxietySignal
  };
}
