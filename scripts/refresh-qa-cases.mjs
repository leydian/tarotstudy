import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { getTarotPredictedQuestionsByTopic } from '../apps/api/src/data/question-intents.js';
import { analyzeQuestionContextSync } from '../apps/api/src/question-understanding/index.js';
import { SHORT_QUESTION_TYPE_BANK } from '../apps/api/src/question-understanding/short-utterance-rules.js';

const root = process.cwd();
const learningPath = path.join(root, 'scripts', 'learning-leader-eval-set.json');
const yearlyPath = path.join(root, 'scripts', 'yearly-fortune-regression-cases.json');
const questionUnderstandingPath = path.join(root, 'scripts', 'question-understanding-eval-set.json');
const questionUnderstandingCandidatePath = path.join(root, 'tmp', 'question-understanding-candidate-set.json');
const summaryCasesPath = path.join(root, 'scripts', 'summary-regression-cases.json');
const registryPath = path.join(root, 'scripts', 'qa-cases-registry.json');

function pick(list = [], count = 1, offset = 0) {
  if (!Array.isArray(list) || list.length === 0 || count <= 0) return [];
  const result = [];
  for (let i = 0; i < count; i += 1) {
    result.push(list[(offset + i) % list.length]);
  }
  return result;
}

function collectTopics(topicsByKey, prefix) {
  const merged = [];
  for (const [key, values] of Object.entries(topicsByKey || {})) {
    if (key === prefix || key.startsWith(`${prefix}__`)) {
      merged.push(...(Array.isArray(values) ? values : []));
    }
  }
  return merged;
}

function buildLearningCases(topics, offset) {
  const daily = collectTopics(topics, 'daily');
  const relationship = collectTopics(topics, 'relationship');
  const relationshipRepair = collectTopics(topics, 'relationship-repair');
  const career = collectTopics(topics, 'career');
  const finance = collectTopics(topics, 'finance');
  const study = collectTopics(topics, 'study');
  const health = collectTopics(topics, 'health');
  const choiceAB = collectTopics(topics, 'choice-a-b');
  const generalLife = collectTopics(topics, 'general');
  const rows = [];
  const oneCardPrompts = [
    ...pick(daily, 2, offset),
    ...pick(relationship, 1, offset),
    ...pick(career, 1, offset),
    ...pick(finance, 1, offset)
  ];
  for (const context of oneCardPrompts) {
    rows.push({ spreadId: 'one-card', level: 'beginner', context });
  }

  const threeCardPrompts = [
    ...pick(study, 1, offset),
    ...pick(relationshipRepair, 1, offset),
    ...pick(career, 1, offset + 2)
  ];
  for (const context of threeCardPrompts) {
    rows.push({ spreadId: 'three-card', level: 'intermediate', context });
  }

  const choicePrompts = pick(choiceAB, 3, offset);
  for (const context of choicePrompts) {
    rows.push({ spreadId: 'choice-a-b', level: 'intermediate', context });
  }

  const dailyPrompts = [...pick(daily, 2, offset + 2), ...pick(health, 1, offset)];
  for (const context of dailyPrompts) {
    rows.push({ spreadId: 'daily-fortune', level: 'beginner', context });
  }

  const weeklyPrompts = [
    ...pick(career, 1, offset + 3),
    ...pick(relationship, 1, offset + 2),
    ...pick(health, 1, offset + 2)
  ];
  for (const context of weeklyPrompts) {
    rows.push({ spreadId: 'weekly-fortune', level: 'beginner', context });
  }

  const monthlyPrompts = [
    ...pick(career, 1, offset + 4),
    ...pick(finance, 1, offset + 2),
    ...pick(study, 1, offset + 2)
  ];
  for (const context of monthlyPrompts) {
    rows.push({ spreadId: 'monthly-fortune', level: 'intermediate', context });
  }

  const yearlyPrompts = [
    ...pick(career, 1, offset + 5),
    ...pick(finance, 1, offset + 3),
    ...pick(relationship, 1, offset + 3)
  ];
  for (const context of yearlyPrompts) {
    rows.push({ spreadId: 'yearly-fortune', level: 'intermediate', context });
  }

  const celticPrompts = [
    ...pick(career, 1, offset + 6),
    ...pick(relationshipRepair, 1, offset + 4),
    ...pick(generalLife, 1, offset + 2)
  ];
  for (const context of celticPrompts) {
    rows.push({ spreadId: 'celtic-cross', level: 'intermediate', context });
  }

  return rows.slice(0, 30);
}

function buildYearlyCases(topics, offset) {
  const career = collectTopics(topics, 'career');
  const relationship = collectTopics(topics, 'relationship');
  const finance = collectTopics(topics, 'finance');
  const generalLife = collectTopics(topics, 'general');

  const careerTiming = pick(career, 6, offset).map((context, idx) => ({
    id: `career-timing-${idx + 1}`,
    level: 'intermediate',
    context,
    intent: 'career',
    requiresTiming: true
  }));

  const relationshipCases = pick(relationship, 4, offset + 2).map((context, idx) => ({
    id: `relationship-${idx + 1}`,
    level: 'intermediate',
    context,
    intent: 'relationship'
  }));

  const financeCases = pick(finance, 4, offset + 3).map((context, idx) => ({
    id: `finance-${idx + 1}`,
    level: 'intermediate',
    context,
    intent: 'finance'
  }));

  const generalCases = pick(generalLife, 4, offset + 1).map((context, idx) => ({
    id: `general-${idx + 1}`,
    level: 'intermediate',
    context,
    intent: 'general'
  }));

  return [...careerTiming, ...relationshipCases, ...financeCases, ...generalCases];
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function readSummaryCaseCount(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (Array.isArray(parsed)) return parsed.length;
    if (Array.isArray(parsed?.cases)) return parsed.cases.length;
    return 0;
  } catch {
    return 0;
  }
}

function normalizeQuestionText(text = '') {
  return String(text || '')
    .trim()
    .replace(/\s+([?？!.,])/g, '$1')
    .replace(/\s{2,}/g, ' ');
}

function inferLocale(text = '') {
  const raw = String(text || '');
  const hasKo = /[가-힣]/.test(raw);
  const hasEn = /[a-z]/i.test(raw);
  if (hasKo && hasEn) return 'ko-en-mixed';
  if (hasKo) return 'ko';
  if (hasEn) return 'en';
  return 'other';
}

function inferStyleTag(text = '') {
  const normalized = normalizeQuestionText(text);
  const tokenCount = normalized.split(/\s+/).filter(Boolean).length;
  const hasTypoLike = /([?？!])\1{1,}|[ㄱ-ㅎㅏ-ㅣ]{2,}|[a-z]{2,}\d+[a-z]*/i.test(normalized);
  if (hasTypoLike) return 'typo-like';
  if (tokenCount <= 2 || normalized.length <= 12) return 'short-utterance';
  if (/[a-z]/i.test(normalized) && /[가-힣]/.test(normalized)) return 'mixed-language';
  if (/(할까|될까|맞을까|좋을까|괜찮을까|should i|can i)/i.test(normalized)) return 'decision';
  if (/(운세|흐름|fortune|luck|전망)/i.test(normalized)) return 'forecast';
  if (/(a\s*안|b\s*안|vs|versus|or|또는|혹은|중 무엇|중 뭐|중 어떤)/i.test(normalized)) return 'choice';
  return 'narrative';
}

function inferLengthBucket(text = '') {
  const len = normalizeQuestionText(text).length;
  if (len <= 12) return 'xs';
  if (len <= 24) return 's';
  if (len <= 48) return 'm';
  if (len <= 90) return 'l';
  return 'xl';
}

function inferRiskTag(text = '') {
  const raw = String(text || '').toLowerCase();
  if (/(병원|약|진단|치료|의료|의사|medical|loan|all\s*in|빚|대출|투자)/i.test(raw)) return 'high';
  if (/(결제|구매|지출|재회|갈등|수면|운동|health|finance|relationship)/i.test(raw)) return 'medium';
  return 'low';
}

function inferReferenceIntent(topicKey = '', text = '') {
  const base = String(topicKey || '').split('__')[0];
  if (base === 'choice-a-b') return 'general';
  if (base === 'relationship-repair') return 'relationship-repair';
  if (base === 'social') return 'social';
  if (base === 'relationship') return 'relationship';
  if (base === 'career') return 'career';
  if (base === 'finance') return 'finance';
  if (base === 'study') return 'study';
  if (base === 'health') return 'health';
  if (base === 'daily') return 'daily';

  const lowered = String(text || '').toLowerCase();
  if (/(재회|화해|갈등|사과|오해|reconnect)/i.test(lowered)) return 'relationship-repair';
  if (/(연애|고백|썸|연락|결혼|관계)/i.test(lowered)) return 'relationship';
  if (/(친구|동료|평판|협업|social|network)/i.test(lowered)) return 'social';
  if (/(이직|취직|면접|오퍼|직무|career|job)/i.test(lowered)) return 'career';
  if (/(지출|수입|저축|투자|결제|구매|finance|budget)/i.test(lowered)) return 'finance';
  if (/(공부|시험|학습|자격증|복습|study|exam)/i.test(lowered)) return 'study';
  if (/(건강|수면|운동|회복|피로|health|sleep)/i.test(lowered)) return 'health';
  if (/(오늘|운세|흐름|daily|today|luck)/i.test(lowered)) return 'daily';
  return 'general';
}

function buildQuestionUnderstandingCases(topics, offset = 0, targetSize = 3000, candidateSize = 12000) {
  const rows = [];
  const seen = new Set();
  const topicEntries = Object.entries(topics || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const baseTime = new Date().toISOString();

  for (const [topicKey, prompts] of topicEntries) {
    const values = Array.isArray(prompts) ? prompts : [];
    for (const prompt of values) {
      const text = normalizeQuestionText(prompt);
      if (!text) continue;
      const signature = text.toLowerCase();
      if (seen.has(signature)) continue;
      seen.add(signature);

      const analyzed = analyzeQuestionContextSync(text, { mode: 'hybrid', flag: true });
      rows.push({
        id: `q-${String(rows.length + 1).padStart(5, '0')}`,
        text,
        intent: analyzed.intent,
        questionType: analyzed.questionType,
        choiceMode: String(analyzed.choice?.mode || 'single'),
        locale: inferLocale(text),
        styleTag: inferStyleTag(text),
        lengthBucket: inferLengthBucket(text),
        riskTag: inferRiskTag(text),
        sourceTag: topicKey,
        referenceIntent: inferReferenceIntent(topicKey, text),
        labelingStatus: 'seeded_for_manual_review',
        labeledAt: baseTime
      });
    }
  }

  for (const utterance of SHORT_QUESTION_TYPE_BANK) {
    const text = normalizeQuestionText(utterance.phrase);
    if (!text) continue;
    const signature = text.toLowerCase();
    if (seen.has(signature)) continue;
    seen.add(signature);

    const analyzed = analyzeQuestionContextSync(text, { mode: 'hybrid', flag: true });
    rows.push({
      id: `q-${String(rows.length + 1).padStart(5, '0')}`,
      text,
      intent: analyzed.intent,
      questionType: analyzed.questionType,
      choiceMode: String(analyzed.choice?.mode || 'single'),
      locale: inferLocale(text),
      styleTag: inferStyleTag(text),
      lengthBucket: inferLengthBucket(text),
      riskTag: inferRiskTag(text),
      sourceTag: 'short-utterance-bank',
      referenceIntent: utterance.intent,
      labelingStatus: 'seeded_for_manual_review',
      labeledAt: baseTime
    });
  }

  const limited = buildBalancedIntentSelection(rows, targetSize, offset);

  return {
    selected: limited.map((item, idx) => ({ ...item, id: `q-${String(idx + 1).padStart(5, '0')}` })),
    candidate: rows.slice(0, candidateSize).map((item, idx) => ({ ...item, id: `c-${String(idx + 1).padStart(6, '0')}` })),
    coverage: {
      sourcePool: rows.length,
      targetSize,
      candidateSize: Math.min(rows.length, candidateSize),
      locale: countBy(limited, 'locale'),
      styleTag: countBy(limited, 'styleTag'),
      lengthBucket: countBy(limited, 'lengthBucket'),
      intent: countBy(limited, 'intent')
    }
  };
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = String(row?.[key] || 'unknown');
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function rotatePick(list = [], count = 0, offset = 0) {
  if (!Array.isArray(list) || !list.length || count <= 0) return [];
  const rotated = [];
  for (let i = 0; i < list.length; i += 1) {
    rotated.push(list[(offset + i) % list.length]);
  }
  return rotated.slice(0, count);
}

function buildBalancedIntentSelection(rows = [], targetSize = 3000, offset = 0) {
  const intents = ['relationship-repair', 'social', 'relationship', 'career', 'finance', 'study', 'health', 'daily', 'general'];
  const byIntent = new Map(intents.map((intent) => [intent, []]));
  for (const row of rows) {
    const key = intents.includes(row.intent) ? row.intent : 'general';
    byIntent.get(key).push(row);
  }

  const base = Math.floor(targetSize / intents.length);
  let remainder = targetSize % intents.length;
  const selected = [];
  const seen = new Set();

  for (const intent of intents) {
    const pool = byIntent.get(intent) || [];
    const target = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    const localOffset = (offset * 31 + intent.length * 17) % Math.max(pool.length, 1);
    for (const row of rotatePick(pool, Math.min(target, pool.length), localOffset)) {
      const signature = `${row.text.toLowerCase()}::${row.intent}`;
      if (seen.has(signature)) continue;
      seen.add(signature);
      selected.push(row);
    }
  }

  if (selected.length < targetSize) {
    for (const row of rotatePick(rows, rows.length, offset)) {
      const signature = `${row.text.toLowerCase()}::${row.intent}`;
      if (seen.has(signature)) continue;
      seen.add(signature);
      selected.push(row);
      if (selected.length >= targetSize) break;
    }
  }
  return selected.slice(0, targetSize);
}

const now = new Date();
const isoDate = now.toISOString().slice(0, 10);
const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
const offset = Number(process.env.QA_CASE_OFFSET || dayOfYear % 7);
const requestedQuestionSetSize = Number(process.env.QA_QUESTION_UNDERSTANDING_SET_SIZE || 3000);
const questionSetSize = Math.max(1000, Math.min(10000, Number.isFinite(requestedQuestionSetSize) ? Math.floor(requestedQuestionSetSize) : 3000));
const requestedCandidateSetSize = Number(process.env.QA_QUESTION_UNDERSTANDING_CANDIDATE_SET_SIZE || 12000);
const candidateSetSize = Math.max(questionSetSize, Math.min(30000, Number.isFinite(requestedCandidateSetSize) ? Math.floor(requestedCandidateSetSize) : 12000));
const topics = getTarotPredictedQuestionsByTopic();

const learningCases = buildLearningCases(topics, offset);
const yearlyCases = buildYearlyCases(topics, offset);
const questionUnderstanding = buildQuestionUnderstandingCases(topics, offset, questionSetSize, candidateSetSize);

writeJson(learningPath, learningCases);
writeJson(yearlyPath, yearlyCases);
writeJson(questionUnderstandingPath, questionUnderstanding.selected);
writeJson(questionUnderstandingCandidatePath, questionUnderstanding.candidate);
const summaryCases = readSummaryCaseCount(summaryCasesPath);
writeJson(registryPath, {
  generatedAt: now.toISOString(),
  generatedDate: isoDate,
  offset,
  learningCases: learningCases.length,
  yearlyCases: yearlyCases.length,
  questionUnderstandingCases: questionUnderstanding.selected.length,
  questionUnderstandingCoverage: questionUnderstanding.coverage,
  summaryCases,
  labelingVersion: 'question-understanding-v3.0',
  source: 'apps/api/src/data/question-intents.js'
});

console.log('[qa-cases] refreshed');
console.log(JSON.stringify({
  learningCases: learningCases.length,
  yearlyCases: yearlyCases.length,
  questionUnderstandingCases: questionUnderstanding.selected.length,
  questionUnderstandingPool: questionUnderstanding.coverage.sourcePool,
  questionUnderstandingCandidates: questionUnderstanding.coverage.candidateSize,
  generatedDate: isoDate,
  offset
}, null, 2));
