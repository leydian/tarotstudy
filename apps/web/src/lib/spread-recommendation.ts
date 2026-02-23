import type { Spread } from '../types';

export type QuestionAnalysisLite = {
  intent: string;
  questionType: string;
  timeHorizon: string;
};

export type SpreadRecommendation = {
  spreadId: string;
  reason: string;
};

type RankingInput = {
  question: string;
  spreads: Spread[];
  analysis: QuestionAnalysisLite | null;
};

const SPREAD_RULES: Record<string, {
  intents?: string[];
  questionTypes?: string[];
  horizons?: string[];
  keywords?: string[];
}> = {
  'one-card': { questionTypes: ['yes_no'], horizons: ['immediate'], keywords: ['될까', '가능', '맞을까', 'yes', 'no'] },
  'three-card': { intents: ['relationship', 'general'], keywords: ['흐름', '어떻게', '관계', '연애'] },
  'choice-a-b': { questionTypes: ['choice_ab'], keywords: ['둘 중', 'vs', '선택', 'a/b', '비교'] },
  'daily-fortune': { horizons: ['immediate'], keywords: ['오늘', '당장', '지금'] },
  'weekly-fortune': { horizons: ['week'], keywords: ['이번 주', '다음 주', '주간'] },
  'monthly-fortune': { horizons: ['month'], keywords: ['이번 달', '다음 달', '월간'] },
  'yearly-fortune': { horizons: ['year'], keywords: ['올해', '연간', '1년', '분기'] },
  'relationship-recovery': { intents: ['relationship-repair'], keywords: ['재회', '화해', '갈등', '관계 회복'] },
  'celtic-cross': { intents: ['general'], keywords: ['복합', '전체', '종합', '깊게'] },
  'exam-success-5': { keywords: ['시험', '합격', '점수', '공부', '모의고사'] },
  'interview-4': { intents: ['career'], keywords: ['면접', '자소서', '지원동기', '꼬리질문'] },
  'career-transition-6': { intents: ['career'], keywords: ['이직', '전환', '직무', '커리어'] },
  'project-planning-5': { keywords: ['프로젝트', '기획', '일정', '마감'] },
  'burnout-recovery-5': { intents: ['health'], keywords: ['번아웃', '소진', '회복', '피로'] },
  'finance-checkup-5': { intents: ['finance'], keywords: ['지출', '수입', '예산', '저축', '누수'] },
  'investment-balance-7': { intents: ['finance'], keywords: ['투자', '포트폴리오', '현금', '매수', '변동성'] },
  'home-move-5': { keywords: ['이사', '거주', '전세', '월세', '집'] },
  'communication-reset-4': { intents: ['relationship'], keywords: ['대화', '말투', '오해', '소통'] },
  'shadow-work-5': { keywords: ['내면', '감정', '패턴', '자기이해', '통합'] }
};

export async function recommendSpreadForQuestion({
  question,
  spreads,
  analyze
}: {
  question: string;
  spreads: Spread[];
  analyze: (text: string) => Promise<QuestionAnalysisLite | null>;
}): Promise<SpreadRecommendation> {
  const text = String(question || '').trim();
  const fallback = spreads.find((item) => item.id === 'one-card') ?? spreads[0];
  const analysis = await analyze(text).catch(() => null);
  const ranked = rankSpreadsForQuestion({ question: text, spreads, analysis });
  const best = ranked[0] ?? { spread: fallback, score: 0, reasons: ['기본 스프레드'] };
  return {
    spreadId: best.spread.id,
    reason: `${best.spread.name} · ${best.reasons.slice(0, 3).join(', ')}`
  };
}

export function rankSpreadsForQuestion({ question, spreads, analysis }: RankingInput) {
  const loweredQuestion = question.toLowerCase();
  const questionTokens = tokenizeKorean(loweredQuestion);

  return spreads
    .map((spread) => {
      const rule = SPREAD_RULES[spread.id] || {};
      let score = 0;
      const reasons: string[] = [];

      const lexicalPool = [
        spread.name,
        spread.purpose,
        ...(spread.whenToUse || []),
        ...(rule.keywords || [])
      ].join(' ').toLowerCase();
      const lexicalTokens = tokenizeKorean(lexicalPool);
      const overlap = questionTokens.filter((token) => lexicalTokens.includes(token)).length;
      score += Math.min(40, overlap * 4);
      if (overlap > 0) reasons.push(`키워드 ${overlap}개 일치`);

      for (const keyword of rule.keywords || []) {
        if (loweredQuestion.includes(keyword.toLowerCase())) {
          score += 9;
          reasons.push(`'${keyword}' 매칭`);
        }
      }

      if (analysis) {
        if (rule.intents?.includes(analysis.intent)) {
          score += 18;
          reasons.push(`intent=${analysis.intent}`);
        }
        if (rule.questionTypes?.includes(analysis.questionType)) {
          score += 20;
          reasons.push(`type=${analysis.questionType}`);
        }
        if (rule.horizons?.includes(analysis.timeHorizon)) {
          score += 16;
          reasons.push(`horizon=${analysis.timeHorizon}`);
        }
      }

      if (spread.id === 'one-card' && /\?$|될까|가능할까|맞을까|yes|no/.test(loweredQuestion)) score += 10;
      if (spread.id === 'celtic-cross' && /(종합|전체|복합|깊게|총체)/.test(loweredQuestion)) score += 12;

      return { spread, score, reasons: reasons.length ? reasons : ['기본 적합도'] };
    })
    .sort((a, b) => b.score - a.score);
}

function tokenizeKorean(text = '') {
  return String(text || '')
    .toLowerCase()
    .split(/[^0-9a-zA-Z가-힣]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}
