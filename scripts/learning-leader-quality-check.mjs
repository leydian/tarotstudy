import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const datasetPath = path.join(root, 'scripts', 'learning-leader-eval-set.json');
const outDir = path.join(root, 'tmp');
const outReviewPath = path.join(outDir, 'learning-leader-review.md');
const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:8787';
const writeReview = process.argv.includes('--write-review');

const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
const variants = ['A', 'B'];
const bannedPatterns = [
  /수렴/g,
  /기준점/g,
  /변수를/g,
  /변수가/g,
  /축을/g,
  /축이/g,
  /학습 포인트: 학습 포인트:/g
];

function sentenceCount(text = '') {
  return (String(text).match(/[^.!?]+[.!?]?/g) ?? []).map((s) => s.trim()).filter(Boolean).length;
}

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function repetitionScore(text = '') {
  const tokens = tokenize(text);
  if (tokens.length < 8) return 5;
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  const repeated = [...counts.values()].filter((v) => v >= 3).length;
  if (repeated === 0) return 5;
  if (repeated === 1) return 4;
  if (repeated === 2) return 3;
  if (repeated === 3) return 2;
  return 1;
}

function scoreLearningPoint(text = '') {
  const line = String(text || '');
  let naturalness = 5;
  let actionability = 1;
  let persona = 1;
  let repetition = repetitionScore(line);
  const issues = [];

  for (const pattern of bannedPatterns) {
    if (pattern.test(line)) {
      naturalness -= 1;
      issues.push(`금지 패턴 포함: ${pattern}`);
    }
  }

  if (line.includes('[학습 리더]')) {
    persona = 5;
  } else if (line.includes('학습 리더')) {
    persona = 3;
    issues.push('학습 리더 태그 형식 불일치');
  } else {
    issues.push('학습 리더 페르소나 태그 없음');
  }

  const hasAction = /(하세요|해보세요|기록하세요|정하세요|분리해|줄이세요|수행하세요|실행하세요)/.test(line);
  const hasQuestion = /(복기 질문|체크 질문|검증 질문|질문:)/.test(line);
  if (hasAction && hasQuestion) actionability = 5;
  else if (hasAction || hasQuestion) actionability = 3;
  else {
    actionability = 1;
    issues.push('행동 지시 또는 복기 질문 누락');
  }

  const sCount = sentenceCount(line);
  if (sCount < 2) {
    naturalness -= 1;
    issues.push('문장 수 부족(2문장 미만)');
  }
  if (sCount > 5) {
    naturalness -= 1;
    issues.push('문장 길이 과다(5문장 초과)');
  }

  naturalness = Math.max(1, Math.min(5, naturalness));
  const avg = Number(((naturalness + actionability + repetition + persona) / 4).toFixed(2));
  return { naturalness, actionability, repetition, persona, avg, issues };
}

async function draw(spreadId, level, context, variant) {
  const res = await fetch(`${apiBase}/api/spreads/${spreadId}/draw`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      level,
      context,
      experimentVariant: variant
    })
  });
  if (!res.ok) {
    throw new Error(`draw failed ${spreadId} ${variant}: ${res.status}`);
  }
  return res.json();
}

async function run() {
  const rows = [];
  const failures = [];
  for (const item of dataset) {
    for (const variant of variants) {
      const data = await draw(item.spreadId, item.level, item.context, variant);
      for (const drawItem of data.items) {
        const score = scoreLearningPoint(drawItem.learningPoint);
        rows.push({
          spreadId: item.spreadId,
          level: item.level,
          variant,
          context: item.context,
          position: drawItem.position.name,
          score
        });
        if (score.avg < 4 || score.naturalness < 3 || score.actionability < 3) {
          failures.push({
            spreadId: item.spreadId,
            variant,
            level: item.level,
            context: item.context,
            position: drawItem.position.name,
            score,
            sample: drawItem.learningPoint
          });
        }
      }
    }
  }

  const summary = rows.reduce((acc, row) => {
    acc.naturalness += row.score.naturalness;
    acc.actionability += row.score.actionability;
    acc.repetition += row.score.repetition;
    acc.persona += row.score.persona;
    acc.avg += row.score.avg;
    return acc;
  }, { naturalness: 0, actionability: 0, repetition: 0, persona: 0, avg: 0 });
  const total = rows.length || 1;
  const report = {
    apiBase,
    datasetCases: dataset.length,
    evaluatedItems: rows.length,
    average: {
      naturalness: Number((summary.naturalness / total).toFixed(2)),
      actionability: Number((summary.actionability / total).toFixed(2)),
      repetition: Number((summary.repetition / total).toFixed(2)),
      persona: Number((summary.persona / total).toFixed(2)),
      avg: Number((summary.avg / total).toFixed(2))
    },
    failures: failures.length
  };

  console.log('[learning-leader-qc] summary');
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) {
    console.log('[learning-leader-qc] top failures');
    for (const fail of failures.slice(0, 15)) {
      console.log(`- ${fail.spreadId}(${fail.variant}) ${fail.position} avg=${fail.score.avg} issues=${fail.score.issues.join('; ')}`);
    }
  }

  if (writeReview) {
    fs.mkdirSync(outDir, { recursive: true });
    const lines = [];
    lines.push('# 학습 리더 수동 리뷰 시트');
    lines.push('');
    lines.push(`생성 시각: ${new Date().toISOString()}`);
    lines.push(`평가 대상: ${dataset.length} 케이스 x A/B`);
    lines.push('');
    for (const fail of failures.slice(0, 30)) {
      lines.push(`## ${fail.spreadId} / ${fail.variant} / ${fail.position}`);
      lines.push(`- context: ${fail.context}`);
      lines.push(`- sample: ${fail.sample}`);
      lines.push(`- issues: ${fail.score.issues.join(', ') || 'none'}`);
      lines.push('- 어색한 원인:');
      lines.push('- 수정 문장:');
      lines.push('- 규칙 반영 여부:');
      lines.push('');
    }
    fs.writeFileSync(outReviewPath, `${lines.join('\n')}\n`, 'utf-8');
    console.log(`[learning-leader-qc] wrote review template: ${outReviewPath}`);
  }

  const shouldFail = report.average.avg < 4 || (failures.length / total) > 0.1;
  if (shouldFail) {
    process.exitCode = 2;
  }
}

run().catch((err) => {
  console.error('[learning-leader-qc] failed', err);
  process.exitCode = 1;
});
