import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const datasetPath = path.join(root, 'scripts', 'tarot-reader-eval-set.json');
const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:8787';
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
const variants = ['A', 'B'];

const learningLeakPatterns = [/\[학습 리더\]/g, /학습 코칭/g, /복기 질문/g, /리딩 검증/g];
const absolutePatterns = [/반드시/g, /틀림없/g, /100%/g, /운명적/g];
const fearPatterns = [/재앙/g, /파국/g, /끝장/g];
const symbolPatterns = /(상징|문|빛|그림자|경계|전환|불꽃|물결|칼날|토대|왕관|등불|거울|사슬|안개)/g;
const fallbackClosing = '지금은 조건을 하나씩 확인하면서 움직이면 판단이 더 안정됩니다.';
const actionPatterns = /(실행|점검|기록|고정|비교|완충|정리|시작|줄여|확인)/g;
const evidencePatterns = /(근거|카드|정방향|역방향|포지션|질문|기준|조건|가능성)/g;

const PERSONA_HINTS = {
  'user:beginner': /(쉽게|한 줄|오늘 실행 1개|작게 시작)/,
  'user:anxious': /(불안|차분히|완충|단정)/,
  'user:decisive': /(결정|비교|기준 3개|A\/B)/,
  'user:relationship': /(대화|사실 1개|감정 1개|요청 1개|관계)/,
  'user:career_shift': /(이직|전환|준비도|리스크|타이밍)/,
  'user:study_opt': /(25분|5분|루틴|복기|학습)/,
  'planner:pm': /(가설|실험|선행|후행|지표)/,
  'planner:service_planner': /(정책|ux|일관성|예외)/i,
  'developer:backend': /(신뢰성|오류율|slo|복구|운영)/i,
  'developer:frontend': /(가독성|일관성|접근성|컴포넌트|표현)/,
  'domain-expert:counselor': /(안전|내담자|자율성|비진단|단정)/,
  'domain-expert:learning_coach': /(목표|실행|피드백|보정|루프)/,
  'domain-expert:data_analyst': /(지표|신뢰|편향|조건부|불확실성)/
};

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function repetitionScore(text = '') {
  const tokens = tokenize(text);
  if (tokens.length < 14) return 5;
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  const repeated = [...counts.values()].filter((v) => v >= 3).length;
  const uniqueRatio = counts.size / tokens.length;
  if (uniqueRatio >= 0.72 && repeated <= 2) return 5;
  if (uniqueRatio >= 0.62 && repeated <= 4) return 4;
  if (uniqueRatio >= 0.5 && repeated <= 6) return 3;
  if (uniqueRatio >= 0.42) return 2;
  return 1;
}

function scoreTarotMessage({ coreMessage = '', interpretation = '', tarotPersonaMeta = null }, personaKey = '') {
  const text = `${coreMessage} ${interpretation}`.trim();
  const textForLeak = text.replace(/질문\("[^"]*"\)/g, '');
  const issues = [];

  let personaPurity = 5;
  let evidencePresence = 1;
  let guardrailSafety = 5;
  let narrativeCoherence = 1;
  let symbolDepth = 1;
  let storyArc = 1;
  let closingRepetition = 5;
  const repetition = tarotPersonaMeta?.repetitionRisk === 'low'
    ? 5
    : tarotPersonaMeta?.repetitionRisk === 'mid'
      ? 4
      : repetitionScore(text);

  for (const pattern of learningLeakPatterns) {
    if (pattern.test(textForLeak)) {
      personaPurity = 1;
      issues.push(`학습 리더 누수: ${pattern}`);
    }
  }

  const evidenceHits = (text.match(evidencePatterns) || []).length;
  if (evidenceHits >= 5) evidencePresence = 5;
  else if (evidenceHits >= 3) evidencePresence = 4;
  else if (evidenceHits >= 1) evidencePresence = 3;
  else issues.push('근거 문장 부족');

  for (const pattern of absolutePatterns) {
    if (pattern.test(text)) {
      guardrailSafety -= 2;
      issues.push(`단정 표현: ${pattern}`);
    }
  }
  for (const pattern of fearPatterns) {
    if (pattern.test(text)) {
      guardrailSafety -= 1;
      issues.push(`공포 표현: ${pattern}`);
    }
  }
  guardrailSafety = Math.max(1, Math.min(5, guardrailSafety));

  const hasScene = /(장면|흐름|지금은|서사|국면)/.test(text);
  const hasConditional = /(가능성|이 흐름이라면|조건이 맞으면|우선|조건부)/.test(text);
  const hasAction = /(해보세요|정해보세요|점검해보세요|실행해보세요|줄여보세요|시작해보세요|해보시는 편이|정리해보세요|고정해|비교해)/.test(text);
  const symbolHits = (text.match(symbolPatterns) || []).length;
  const hasSymbol = symbolHits >= 1 || (tarotPersonaMeta?.symbolHits || 0) >= 1;
  const fallbackHits = (text.match(new RegExp(fallbackClosing, 'g')) || []).length;

  if (tarotPersonaMeta?.narrativePreset && hasConditional) narrativeCoherence = 5;
  else if (hasScene && hasConditional && hasAction) narrativeCoherence = 5;
  else if ((hasScene && hasConditional) || (hasConditional && hasAction) || tarotPersonaMeta?.narrativePreset) narrativeCoherence = 4;
  else if (hasScene || hasConditional || hasAction) narrativeCoherence = 3;
  else issues.push('서사 구조 부족');

  if (symbolHits >= 3) symbolDepth = 5;
  else if (symbolHits >= 2) symbolDepth = 4;
  else if (symbolHits >= 1) symbolDepth = 3;
  else issues.push('상징 표현 부족');

  const arcMeta = tarotPersonaMeta?.arcProgression === 'scene-symbol-flow-action';
  if (arcMeta || (hasScene && hasSymbol && hasConditional && hasAction)) storyArc = 5;
  else if ((hasScene && hasSymbol && hasConditional) || (hasSymbol && hasConditional && hasAction)) storyArc = 4;
  else if (hasScene && hasConditional && hasAction) storyArc = 3;
  else issues.push('4단 서사 아크 부족');

  if (fallbackHits >= 2) {
    closingRepetition = 2;
    issues.push('클로징 문구 반복');
  } else if (fallbackHits === 1) {
    closingRepetition = 5;
  } else {
    closingRepetition = 4;
  }

  const personaFit = scorePersonaFit(text, tarotPersonaMeta, personaKey);
  const evidenceStructure = scoreEvidenceStructure(text, tarotPersonaMeta);
  const actionClarity = scoreActionClarity(text, tarotPersonaMeta);
  const naturalness = scoreNaturalness(text);

  if (personaFit <= 3) issues.push('페르소나 적합도 낮음');
  if (evidenceStructure <= 3) issues.push('근거 구조 약함');
  if (actionClarity <= 3) issues.push('실행 기준 모호');

  const avg = Number(((
    personaPurity + evidencePresence + guardrailSafety + narrativeCoherence + repetition + symbolDepth + storyArc + closingRepetition + personaFit + evidenceStructure + actionClarity + naturalness
  ) / 12).toFixed(2));

  return {
    personaPurity,
    evidencePresence,
    guardrailSafety,
    narrativeCoherence,
    repetition,
    symbolDepth,
    storyArc,
    closingRepetition,
    personaFit,
    evidenceStructure,
    actionClarity,
    naturalness,
    avg,
    issues
  };
}

function scorePersonaFit(text = '', tarotPersonaMeta = null, personaKey = '') {
  if (typeof tarotPersonaMeta?.personaFitScore === 'number') {
    return Math.max(1, Math.min(5, Math.round(tarotPersonaMeta.personaFitScore)));
  }
  const regex = PERSONA_HINTS[personaKey];
  if (!regex) return 4;
  return regex.test(text) ? 5 : 3;
}

function scoreEvidenceStructure(text = '', tarotPersonaMeta = null) {
  if (typeof tarotPersonaMeta?.evidenceStructureScore === 'number') {
    return Math.max(1, Math.min(5, Math.round(tarotPersonaMeta.evidenceStructureScore)));
  }
  const hits = (String(text).match(evidencePatterns) || []).length;
  if (hits >= 6) return 5;
  if (hits >= 4) return 4;
  if (hits >= 2) return 3;
  return 2;
}

function scoreActionClarity(text = '', tarotPersonaMeta = null) {
  if (typeof tarotPersonaMeta?.actionClarityScore === 'number') {
    return Math.max(1, Math.min(5, Math.round(tarotPersonaMeta.actionClarityScore)));
  }
  const hits = (String(text).match(actionPatterns) || []).length;
  if (hits >= 5) return 5;
  if (hits >= 3) return 4;
  if (hits >= 1) return 3;
  return 2;
}

function scoreNaturalness(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return 1;
  let score = 5;
  if (raw.length > 800) score -= 1;
  if ((raw.match(/:/g) || []).length >= 6) score -= 1;
  if (/\b(그리고 그리고|또한 또한)\b/.test(raw)) score -= 1;
  return Math.max(1, Math.min(5, score));
}

function summarize(rows) {
  const summary = {
    personaPurity: 0,
    evidencePresence: 0,
    guardrailSafety: 0,
    narrativeCoherence: 0,
    repetition: 0,
    symbolDepth: 0,
    storyArc: 0,
    closingRepetition: 0,
    personaFit: 0,
    evidenceStructure: 0,
    actionClarity: 0,
    naturalness: 0,
    avg: 0
  };
  for (const row of rows) {
    summary.personaPurity += row.score.personaPurity;
    summary.evidencePresence += row.score.evidencePresence;
    summary.guardrailSafety += row.score.guardrailSafety;
    summary.narrativeCoherence += row.score.narrativeCoherence;
    summary.repetition += row.score.repetition;
    summary.symbolDepth += row.score.symbolDepth;
    summary.storyArc += row.score.storyArc;
    summary.closingRepetition += row.score.closingRepetition;
    summary.personaFit += row.score.personaFit;
    summary.evidenceStructure += row.score.evidenceStructure;
    summary.actionClarity += row.score.actionClarity;
    summary.naturalness += row.score.naturalness;
    summary.avg += row.score.avg;
  }
  const total = rows.length || 1;
  return Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, Number((v / total).toFixed(2))]));
}

async function draw(item, variant) {
  const res = await fetch(`${apiBase}/api/spreads/${item.spreadId}/draw`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      level: item.level,
      context: item.context,
      experimentVariant: variant,
      personaGroup: item.personaGroup,
      personaId: item.personaId
    })
  });
  if (!res.ok) throw new Error(`draw failed ${item.spreadId} ${variant}: ${res.status}`);
  return res.json();
}

async function run() {
  const rows = [];
  const failures = [];

  for (const item of dataset) {
    const personaKey = `${item.personaGroup}:${item.personaId}`;
    for (const variant of variants) {
      const data = await draw(item, variant);
      for (const drawItem of data.items) {
        const score = scoreTarotMessage(drawItem, personaKey);
        const row = {
          spreadId: item.spreadId,
          level: item.level,
          variant,
          position: drawItem.position.name,
          personaGroup: item.personaGroup,
          personaId: item.personaId,
          personaLabel: item.personaLabel,
          checkFocus: item.checkFocus,
          score
        };
        rows.push(row);

        const hardFail =
          score.avg < 4.2 ||
          score.personaPurity < 5 ||
          score.guardrailSafety < 4 ||
          score.storyArc < 4 ||
          score.symbolDepth < 3 ||
          score.closingRepetition < 3;
        row.hardFail = hardFail;

        if (hardFail) {
          failures.push({
            ...row,
            coreMessage: drawItem.coreMessage,
            interpretation: drawItem.interpretation
          });
        }
      }
    }
  }

  const overall = summarize(rows);

  const byPersonaGroup = {};
  const byPersonaId = {};

  for (const row of rows) {
    const g = row.personaGroup;
    const pid = `${row.personaGroup}:${row.personaId}`;
    if (!byPersonaGroup[g]) byPersonaGroup[g] = [];
    if (!byPersonaId[pid]) byPersonaId[pid] = [];
    byPersonaGroup[g].push(row);
    byPersonaId[pid].push(row);
  }

  const groupSummary = Object.fromEntries(
    Object.entries(byPersonaGroup).map(([g, list]) => [g, summarize(list)])
  );
  const personaSummary = Object.fromEntries(
    Object.entries(byPersonaId).map(([pid, list]) => {
      const failCount = list.filter((row) => row.hardFail).length;
      return [pid, {
        ...summarize(list),
        sampleSize: list.length,
        failRate: Number((failCount / (list.length || 1)).toFixed(3))
      }];
    })
  );

  const aGradeFailures = Object.entries(personaSummary)
    .filter(([, s]) => s.avg < 4.6 || s.guardrailSafety < 4.5 || s.personaFit < 4.5 || s.evidenceStructure < 4.5 || s.actionClarity < 4.5 || s.failRate > 0.08)
    .map(([id, s]) => ({ id, ...s }));

  const report = {
    apiBase,
    datasetCases: dataset.length,
    evaluatedItems: rows.length,
    average: overall,
    byPersonaGroup: groupSummary,
    byPersonaId: personaSummary,
    failures: failures.length,
    aGradePersonaFailures: aGradeFailures.length
  };

  console.log('[tarot-reader-qc] summary');
  console.log(JSON.stringify(report, null, 2));

  if (failures.length) {
    console.log('[tarot-reader-qc] top failures');
    for (const fail of failures.slice(0, 15)) {
      console.log(`- ${fail.personaGroup}:${fail.personaId} ${fail.spreadId}(${fail.variant}) ${fail.position} avg=${fail.score.avg} issues=${fail.score.issues.join('; ')}`);
    }
  }

  if (aGradeFailures.length) {
    console.log('[tarot-reader-qc] persona A-grade misses');
    for (const miss of aGradeFailures.slice(0, 20)) {
      console.log(`- ${miss.id} avg=${miss.avg} guardrail=${miss.guardrailSafety} fit=${miss.personaFit} evidence=${miss.evidenceStructure} action=${miss.actionClarity} failRate=${miss.failRate}`);
    }
  }

  const failRate = failures.length / (rows.length || 1);
  const shouldFail =
    overall.avg < 4.2 ||
    overall.personaPurity < 5 ||
    failRate > 0.12 ||
    aGradeFailures.length > 0;

  if (shouldFail) process.exitCode = 2;
}

run().catch((err) => {
  console.error('[tarot-reader-qc] failed', err);
  process.exitCode = 1;
});
