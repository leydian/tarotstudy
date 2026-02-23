import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { withApiRuntime } from './lib/api-runtime.mjs';

const root = process.cwd();
const sampleCount = Number(process.env.RELATIONSHIP_QA_SAMPLES || 50);
const outDir = path.join(root, 'tmp');
const outJsonPath = path.join(outDir, 'relationship-recovery-variation-report.json');
const outMdPath = path.join(outDir, 'relationship-recovery-variation-report.md');

const thresholds = {
  maxExactPairRate: 0.26,
  maxHighSimilarityPairRate: 0.42,
  minDistinctRatio: 0.1,
  maxStructureFailures: 0,
  maxActionFailures: 0
};

const contexts = [
  '헤어진 사람과 재회 가능성',
  '재회 연락 타이밍',
  '다시 만나기 전에 준비할 것',
  '재회 시도 후 관계 안정화',
  '최근 다툰 상대와 갈등 완화',
  '말다툼 이후 관계 회복',
  '오해가 반복되는 관계 조정',
  '감정 충돌 후 대화 재개',
  '요즘 관계 흐름 점검',
  '관계 거리감 원인 파악',
  '상대 반응 읽기',
  '7일 행동 계획 세우기',
  '사과 타이밍이 고민돼',
  '경계 설정을 하고 싶어',
  '연락 빈도 조절이 필요해',
  '장거리 관계 소통이 불안해',
  '서운함 전달 방식이 고민돼',
  '관계 신뢰를 다시 쌓고 싶어',
  '대화 재개 첫 문장이 어렵다',
  '상대의 방어적 반응을 줄이고 싶어'
];

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/"[^"]*"/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text = '') {
  return normalizeText(text).split(' ').filter((token) => token.length > 1);
}

function jaccardSimilarity(a = '', b = '') {
  const aSet = new Set(tokenize(a));
  const bSet = new Set(tokenize(b));
  if (!aSet.size && !bSet.size) return 1;
  const intersection = [...aSet].filter((token) => bSet.has(token)).length;
  const denominator = Math.max(aSet.size, bSet.size, 1);
  return intersection / denominator;
}

function measurePairs(values = [], highSimilarityThreshold = 0.82) {
  let exactPairs = 0;
  let highSimilarityPairs = 0;
  let totalPairs = 0;
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      totalPairs += 1;
      const left = normalizeText(values[i]);
      const right = normalizeText(values[j]);
      if (left === right) exactPairs += 1;
      if (jaccardSimilarity(left, right) >= highSimilarityThreshold) highSimilarityPairs += 1;
    }
  }

  return {
    totalPairs,
    exactPairs,
    highSimilarityPairs,
    exactPairRate: totalPairs > 0 ? Number((exactPairs / totalPairs).toFixed(4)) : 0,
    highSimilarityPairRate: totalPairs > 0 ? Number((highSimilarityPairs / totalPairs).toFixed(4)) : 0
  };
}

function splitSummarySections(summary = '') {
  const raw = String(summary || '');
  const matchSection = (startLabel, nextLabels = []) => {
    const escapedStart = startLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedNext = nextLabels.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const tail = escapedNext.length ? `(?=${escapedNext.join('|')}|$)` : '$';
    const regex = new RegExp(`(${escapedStart}[\\s\\S]*?)${tail}`, 'm');
    const found = raw.match(regex);
    return found?.[1]?.trim() || '';
  };
  const parts = raw.split('\n\n').map((part) => part.trim()).filter(Boolean);
  return {
    diagnosis: parts.find((part) => part.startsWith('핵심 진단:'))
      || matchSection('핵심 진단:', ['관계 리스크:', '7일 행동 계획:', '마무리:']),
    risk: parts.find((part) => part.startsWith('관계 리스크:'))
      || matchSection('관계 리스크:', ['7일 행동 계획:', '마무리:']),
    plan: parts.find((part) => part.startsWith('7일 행동 계획:'))
      || matchSection('7일 행동 계획:', ['마무리:'])
  };
}

function hasActionVerb(text = '') {
  return /(정하세요|고정하세요|준비하고|남기세요|확인|실행|점검|대화|기록하세요)/.test(String(text));
}

async function drawRelationshipRecovery({ apiBase, level, context }) {
  const res = await fetch(`${apiBase}/api/spreads/relationship-recovery/draw`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      level,
      context,
      experimentVariant: 'A'
    })
  });
  if (!res.ok) {
    throw new Error(`draw failed: ${res.status}`);
  }
  return res.json();
}

function buildMarkdownReport(report) {
  const lines = [];
  lines.push('# 관계회복 변주 정량 QA 리포트');
  lines.push('');
  lines.push(`- 생성 시각: ${report.generatedAt}`);
  lines.push(`- 샘플 수: ${report.sampleCount}`);
  lines.push(`- API: ${report.apiBase}`);
  lines.push('');
  lines.push('## 실패 요약');
  lines.push(`- 구조 실패: ${report.structureFailures}`);
  lines.push(`- 행동문 실패: ${report.actionFailures}`);
  lines.push('');
  lines.push('## 섹션 지표');
  lines.push('| section | distinctRatio | exactPairRate | highSimilarityPairRate |');
  lines.push('|---|---:|---:|---:|');
  for (const [name, metric] of Object.entries(report.sectionMetrics)) {
    lines.push(`| ${name} | ${metric.distinctRatio} | ${metric.exactPairRate} | ${metric.highSimilarityPairRate} |`);
  }
  lines.push('');
  lines.push('## 판정');
  lines.push(`- pass: ${report.pass ? 'true' : 'false'}`);
  lines.push(`- reasons: ${report.failReasons.length ? report.failReasons.join('; ') : 'none'}`);
  lines.push('');
  lines.push('## 임계값');
  lines.push(`- maxExactPairRate: ${thresholds.maxExactPairRate}`);
  lines.push(`- maxHighSimilarityPairRate: ${thresholds.maxHighSimilarityPairRate}`);
  lines.push(`- minDistinctRatio: ${thresholds.minDistinctRatio}`);
  lines.push(`- maxStructureFailures: ${thresholds.maxStructureFailures}`);
  lines.push(`- maxActionFailures: ${thresholds.maxActionFailures}`);
  return `${lines.join('\n')}\n`;
}

try {
  const report = await withApiRuntime({ label: 'relationship-recovery-qa' }, async ({ apiBase }) => {
    const sectionValues = {
      diagnosis: [],
      risk: [],
      plan: []
    };
    let structureFailures = 0;
    let actionFailures = 0;
    const sampledRows = [];

    for (let i = 0; i < sampleCount; i += 1) {
      const context = contexts[i % contexts.length];
      const data = await drawRelationshipRecovery({
        apiBase,
        level: 'beginner',
        context
      });
      const sections = splitSummarySections(data.summary || '');
      const hasStructure = Boolean(sections.diagnosis && sections.risk && sections.plan);
      const hasAction = hasActionVerb(sections.plan);

      if (!hasStructure) structureFailures += 1;
      if (!hasAction) actionFailures += 1;

      sectionValues.diagnosis.push(sections.diagnosis);
      sectionValues.risk.push(sections.risk);
      sectionValues.plan.push(sections.plan);

      sampledRows.push({
        index: i + 1,
        context,
        hasStructure,
        hasAction
      });
    }

    const sectionMetrics = {};
    for (const [key, values] of Object.entries(sectionValues)) {
      const distinctCount = new Set(values.map((v) => normalizeText(v))).size;
      const pairMetric = measurePairs(values);
      sectionMetrics[key] = {
        count: values.length,
        distinctCount,
        distinctRatio: Number((distinctCount / Math.max(values.length, 1)).toFixed(4)),
        ...pairMetric
      };
    }

    const failReasons = [];
    if (structureFailures > thresholds.maxStructureFailures) {
      failReasons.push(`structureFailures>${thresholds.maxStructureFailures}`);
    }
    if (actionFailures > thresholds.maxActionFailures) {
      failReasons.push(`actionFailures>${thresholds.maxActionFailures}`);
    }
    for (const [name, metric] of Object.entries(sectionMetrics)) {
      if (metric.exactPairRate > thresholds.maxExactPairRate) {
        failReasons.push(`${name}.exactPairRate>${thresholds.maxExactPairRate}`);
      }
      if (metric.highSimilarityPairRate > thresholds.maxHighSimilarityPairRate) {
        failReasons.push(`${name}.highSimilarityPairRate>${thresholds.maxHighSimilarityPairRate}`);
      }
      if (metric.distinctRatio < thresholds.minDistinctRatio) {
        failReasons.push(`${name}.distinctRatio<${thresholds.minDistinctRatio}`);
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      apiBase,
      sampleCount,
      thresholds,
      structureFailures,
      actionFailures,
      sectionMetrics,
      failReasons,
      pass: failReasons.length === 0,
      sampledRows
    };
  });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outJsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(outMdPath, buildMarkdownReport(report), 'utf-8');

  console.log('[relationship-recovery-qa] summary');
  console.log(JSON.stringify({
    sampleCount: report.sampleCount,
    structureFailures: report.structureFailures,
    actionFailures: report.actionFailures,
    sectionMetrics: report.sectionMetrics,
    pass: report.pass,
    outJsonPath,
    outMdPath
  }, null, 2));

  process.exit(report.pass ? 0 : 2);
} catch (err) {
  console.error('[relationship-recovery-qa] failed', err);
  process.exit(1);
}
