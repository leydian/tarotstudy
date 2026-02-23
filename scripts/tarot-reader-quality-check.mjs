import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const datasetPath = path.join(root, 'scripts', 'tarot-reader-eval-set.json');
const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:8787';
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
const variants = ['A', 'B'];

const learningLeakPatterns = [/\[학습 리더\]/g, /학습 코칭/g, /복기 질문/g, /리딩 검증/g, /가설/g, /반례/g, /지표/g];
const absolutePatterns = [/반드시/g, /틀림없/g, /100%/g, /운명적/g];
const fearPatterns = [/재앙/g, /파국/g, /끝장/g];
const symbolPatterns = /(상징|문|빛|그림자|경계|전환|불꽃|물결|칼날|토대|왕관|등불|거울|사슬|안개)/g;
const fallbackClosing = '지금은 조건을 하나씩 확인하면서 움직이면 판단이 더 안정됩니다.';

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

function scoreTarotMessage({ coreMessage = '', interpretation = '', tarotPersonaMeta = null }) {
  const text = `${coreMessage} ${interpretation}`.trim();
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
    if (pattern.test(text)) {
      personaPurity = 1;
      issues.push(`학습 리더 누수: ${pattern}`);
    }
  }

  const evidenceHits = (text.match(/(정방향|역방향|카드|키워드|포지션|근거|질문)/g) || []).length;
  if (evidenceHits >= 4) evidencePresence = 5;
  else if (evidenceHits >= 2) evidencePresence = 4;
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
  const hasConditional = /(가능성|이 흐름이라면|조건이 맞으면|우선)/.test(text);
  const hasAction = /(해보세요|정해보세요|점검해보세요|실행해보세요|줄여보세요|시작해보세요|해보시는 편이|정리해보세요)/.test(text);
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

  const avg = Number(((personaPurity + evidencePresence + guardrailSafety + narrativeCoherence + repetition + symbolDepth + storyArc + closingRepetition) / 8).toFixed(2));
  return { personaPurity, evidencePresence, guardrailSafety, narrativeCoherence, repetition, symbolDepth, storyArc, closingRepetition, avg, issues };
}

async function draw(spreadId, level, context, variant) {
  const res = await fetch(`${apiBase}/api/spreads/${spreadId}/draw`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ level, context, experimentVariant: variant })
  });
  if (!res.ok) throw new Error(`draw failed ${spreadId} ${variant}: ${res.status}`);
  return res.json();
}

async function run() {
  const rows = [];
  const failures = [];

  for (const item of dataset) {
    for (const variant of variants) {
      const data = await draw(item.spreadId, item.level, item.context, variant);
      for (const drawItem of data.items) {
        const score = scoreTarotMessage(drawItem);
        rows.push({ spreadId: item.spreadId, level: item.level, variant, position: drawItem.position.name, score });
        if (score.avg < 4.2 || score.personaPurity < 5 || score.guardrailSafety < 4 || score.storyArc < 4 || score.symbolDepth < 3 || score.closingRepetition < 3) {
          failures.push({
            spreadId: item.spreadId,
            level: item.level,
            variant,
            position: drawItem.position.name,
            score,
            coreMessage: drawItem.coreMessage,
            interpretation: drawItem.interpretation
          });
        }
      }
    }
  }

  const summary = rows.reduce((acc, row) => {
    acc.personaPurity += row.score.personaPurity;
    acc.evidencePresence += row.score.evidencePresence;
    acc.guardrailSafety += row.score.guardrailSafety;
    acc.narrativeCoherence += row.score.narrativeCoherence;
    acc.repetition += row.score.repetition;
    acc.symbolDepth += row.score.symbolDepth;
    acc.storyArc += row.score.storyArc;
    acc.closingRepetition += row.score.closingRepetition;
    acc.avg += row.score.avg;
    return acc;
  }, { personaPurity: 0, evidencePresence: 0, guardrailSafety: 0, narrativeCoherence: 0, repetition: 0, symbolDepth: 0, storyArc: 0, closingRepetition: 0, avg: 0 });

  const total = rows.length || 1;
  const report = {
    apiBase,
    datasetCases: dataset.length,
    evaluatedItems: rows.length,
    average: {
      personaPurity: Number((summary.personaPurity / total).toFixed(2)),
      evidencePresence: Number((summary.evidencePresence / total).toFixed(2)),
      guardrailSafety: Number((summary.guardrailSafety / total).toFixed(2)),
      narrativeCoherence: Number((summary.narrativeCoherence / total).toFixed(2)),
      repetition: Number((summary.repetition / total).toFixed(2)),
      symbolDepth: Number((summary.symbolDepth / total).toFixed(2)),
      storyArc: Number((summary.storyArc / total).toFixed(2)),
      closingRepetition: Number((summary.closingRepetition / total).toFixed(2)),
      avg: Number((summary.avg / total).toFixed(2))
    },
    failures: failures.length
  };

  console.log('[tarot-reader-qc] summary');
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) {
    console.log('[tarot-reader-qc] top failures');
    for (const fail of failures.slice(0, 15)) {
      console.log(`- ${fail.spreadId}(${fail.variant}) ${fail.position} avg=${fail.score.avg} issues=${fail.score.issues.join('; ')}`);
    }
  }

  const failRate = failures.length / total;
  const shouldFail = report.average.avg < 4.2 || report.average.personaPurity < 5 || failRate > 0.12;
  if (shouldFail) process.exitCode = 2;
}

run().catch((err) => {
  console.error('[tarot-reader-qc] failed', err);
  process.exitCode = 1;
});
