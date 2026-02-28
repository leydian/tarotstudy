import {
  sanitizeText,
  normalizeCompareText,
  joinSentencesKorean
} from './text-utils.js';
import { containsContamination } from './contamination-policy.js';
import { toTrendLabel } from './verdict-policy.js';
import { periodLabelKo } from './domain-policy.js';

const FORTUNE_SECTION_KEYS = ['energy', 'workFinance', 'love', 'healthMind'];

const normalizeFortunePeriod = (value) => {
  if (value === 'today' || value === 'week' || value === 'month' || value === 'year') return value;
  return 'week';
};

const normalizeTrendLabel = (value, verdictLabel = 'MAYBE') => {
  if (value === 'UP' || value === 'BALANCED' || value === 'CAUTION') return value;
  return toTrendLabel(verdictLabel);
};

const buildFortuneDefaults = (period) => ({
  energy: `${periodLabelKo(period)}의 전체 에너지는 핵심 우선순위를 정리할수록 안정됩니다.`,
  workFinance: `${periodLabelKo(period)} 일·재물운은 급한 결정보다 점검과 누적 실행이 유리합니다.`,
  love: `${periodLabelKo(period)} 애정운은 솔직한 대화와 기대치 조율이 흐름을 부드럽게 만듭니다.`,
  healthMind: `${periodLabelKo(period)} 건강·마음은 수면과 휴식 리듬을 지킬수록 회복 탄력이 커집니다.`,
  message: '지금의 흐름을 믿되, 속도보다 리듬을 지켜 보세요.'
});

const normalizeFortune = (fortune, fallbackFortune, verdictLabel = 'MAYBE') => {
  if (!fortune && !fallbackFortune) return null;
  const source = fortune || {};
  const fallback = fallbackFortune || {};
  const period = normalizeFortunePeriod(source.period || fallback.period);
  const defaults = buildFortuneDefaults(period);
  return {
    period,
    trendLabel: normalizeTrendLabel(source.trendLabel || fallback.trendLabel, verdictLabel),
    energy: sanitizeText(source.energy || fallback.energy || defaults.energy),
    workFinance: sanitizeText(source.workFinance || fallback.workFinance || defaults.workFinance),
    love: sanitizeText(source.love || fallback.love || defaults.love),
    healthMind: sanitizeText(source.healthMind || fallback.healthMind || defaults.healthMind),
    message: sanitizeText(source.message || fallback.message || defaults.message)
  };
};

const hasFortuneContamination = (fortune) => {
  if (!fortune) return false;
  return FORTUNE_SECTION_KEYS.some((key) => containsContamination(fortune[key])) || containsContamination(fortune.message);
};

const isFortuneStructurallyInvalid = (fortune) => {
  if (!fortune || typeof fortune !== 'object') return true;
  if (!['today', 'week', 'month', 'year'].includes(fortune.period)) return true;
  if (!['UP', 'BALANCED', 'CAUTION'].includes(fortune.trendLabel)) return true;
  if (!sanitizeText(fortune.message)) return true;
  return FORTUNE_SECTION_KEYS.some((key) => !sanitizeText(fortune[key]));
};

const stripFortunePrefix = (text, key) => {
  const value = sanitizeText(text);
  if (!value) return value;
  if (key === 'energy') return value.replace(/^전체\s*에너지\s*흐름을\s*보면,\s*/i, '');
  if (key === 'workFinance') return value.replace(/^일·재물운은\s*/i, '');
  if (key === 'love') return value.replace(/^애정운은\s*/i, '');
  if (key === 'healthMind') return value.replace(/^건강·마음\s*영역은\s*/i, '');
  return value;
};

const enforceFortuneSectionDiversity = (report) => {
  if (!report?.fortune) return report;
  const fortune = { ...report.fortune };
  const period = normalizeFortunePeriod(fortune.period);
  const defaults = buildFortuneDefaults(period);

  const stripped = {};
  for (const key of FORTUNE_SECTION_KEYS) {
    stripped[key] = stripFortunePrefix(fortune[key] || '', key);
  }

  const uniqueCount = new Set(
    FORTUNE_SECTION_KEYS
      .map((key) => normalizeCompareText(stripped[key]))
      .filter(Boolean)
  ).size;

  if (uniqueCount <= 1) {
    const seen = new Set();
    for (const key of FORTUNE_SECTION_KEYS) {
      const normalized = normalizeCompareText(stripped[key]);
      if (!normalized || seen.has(normalized)) {
        stripped[key] = defaults[key];
      }
      seen.add(normalizeCompareText(stripped[key]));
    }
  }

  for (const key of FORTUNE_SECTION_KEYS) {
    fortune[key] = sanitizeText(stripped[key] || defaults[key]);
  }
  fortune.period = period;
  fortune.message = sanitizeText(fortune.message || defaults.message);
  return { ...report, fortune };
};

const ensureFortuneDensity = (text, key, period = 'week') => {
  const safe = sanitizeText(text);
  const sentenceCount = safe.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean).length;
  if (safe.length >= 34 && sentenceCount >= 2) return safe;
  const suffixByKey = {
    energy: period === 'year'
      ? '분기마다 방향을 재정렬하면 상승 리듬을 안정적으로 유지할 수 있습니다.'
      : '리듬을 유지하며 주기적으로 상태를 점검하면 안정성이 높아집니다.',
    workFinance: '실행 단위를 작게 나눠 점검하면 변동 대응력이 좋아집니다.',
    love: '대화의 빈도와 타이밍을 조율하면 관계 흐름이 더 부드러워집니다.',
    healthMind: '수면·휴식 루틴을 고정하면 회복 탄력이 꾸준히 유지됩니다.',
    message: '우선순위를 재정렬하고 호흡을 유지하면 흐름의 안정성이 높아집니다.'
  };
  return joinSentencesKorean(safe, suffixByKey[key] || suffixByKey.message);
};

export {
  FORTUNE_SECTION_KEYS,
  normalizeFortunePeriod,
  normalizeTrendLabel,
  buildFortuneDefaults,
  normalizeFortune,
  hasFortuneContamination,
  isFortuneStructurallyInvalid,
  stripFortunePrefix,
  enforceFortuneSectionDiversity,
  ensureFortuneDensity
};
