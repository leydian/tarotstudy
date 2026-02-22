import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { cards } from '../apps/api/src/data/cards.js';
import { spreads } from '../apps/api/src/data/spreads.js';
import { buildSpreadReading } from '../apps/api/src/content.js';

const root = process.cwd();
const casesPath = path.join(root, 'scripts', 'summary-regression-cases.json');
const outDir = path.join(root, 'tmp');
const outMdPath = path.join(outDir, 'summary-regression-report.md');

process.env.START_API_SERVER = 'false';
const { summarizeSpreadForQa } = await import('../apps/api/src/index.js');

function readCases() {
  const payload = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
  return Array.isArray(payload?.cases) ? payload.cases : [];
}

function hashText(text = '') {
  let h = 2166136261;
  const str = String(text);
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function deterministicPick(deck, count, seed = 1) {
  const pool = [...deck];
  const picked = [];
  let cursor = seed % pool.length;
  while (picked.length < count && pool.length) {
    cursor = (cursor + 7919) % pool.length;
    picked.push(pool.splice(cursor, 1)[0]);
  }
  return picked;
}

function buildItems({ spreadId = '', level = 'beginner', context = '', caseId = '' }) {
  const spread = spreads.find((item) => item.id === spreadId);
  if (!spread) throw new Error(`spread not found: ${spreadId}`);
  const positions = spread.positions || [];
  const seed = hashText(`${caseId}:${spreadId}:${level}:${context}`);
  const drawn = deterministicPick(cards, positions.length, seed);

  return {
    spread,
    items: positions.map((position, index) => {
      const card = drawn[index];
      const orientation = ((seed + index) % 4 === 0 || (seed + index) % 7 === 0) ? 'reversed' : 'upright';
      const reading = buildSpreadReading({
        card,
        spreadId,
        position,
        orientation,
        level,
        context,
        experimentVariant: 'A'
      });
      return {
        position,
        orientation,
        card: {
          id: card.id,
          name: card.name,
          nameKo: card.nameKo,
          keywords: card.keywords,
          suit: card.suit
        },
        interpretation: reading.interpretation,
        coreMessage: reading.coreMessage,
        learningPoint: reading.learningPoint
      };
    })
  };
}

function assertIncludesAll(summary, phrases, errors, caseId) {
  for (const phrase of phrases || []) {
    if (!String(summary).includes(phrase)) {
      errors.push(`[${caseId}] missing phrase: ${phrase}`);
    }
  }
}

function assertIncludesAny(summary, phrases, errors, caseId) {
  if (!phrases?.length) return;
  const ok = phrases.some((phrase) => String(summary).includes(phrase));
  if (!ok) {
    errors.push(`[${caseId}] missing any-of phrases: ${phrases.join(' | ')}`);
  }
}

function assertForbidden(summary, phrases, errors, caseId) {
  for (const phrase of phrases || []) {
    if (String(summary).includes(phrase)) {
      errors.push(`[${caseId}] contains forbidden phrase: ${phrase}`);
    }
  }
}

function assertCommonSummaryPolicy(summary, errors, caseId) {
  const text = String(summary || '');
  if (!/판정:\s*(우세|조건부|박빙)/.test(text)) {
    errors.push(`[${caseId}] missing decision label block`);
  }
  const evidenceCount = (text.match(/근거 \d+:/g) || []).length;
  if (evidenceCount < 1) {
    errors.push(`[${caseId}] missing evidence line`);
  }
  if (/\s\?/.test(text)) {
    errors.push(`[${caseId}] found whitespace before question mark`);
  }
}

function assertSpreadSpecificRules(summary, spreadId, errors, caseId) {
  const text = String(summary || '');
  if (spreadId === 'yearly-fortune') {
    for (let month = 1; month <= 12; month += 1) {
      if (!text.includes(`${month}월(`)) {
        errors.push(`[${caseId}] missing monthly narrative for ${month}월`);
      }
    }
  }
  if (spreadId === 'weekly-fortune') {
    const legacyLabels = ['주간 테마', '월-화', '수-목', '주간 조언'];
    for (const label of legacyLabels) {
      if (text.includes(label)) {
        errors.push(`[${caseId}] includes legacy weekly label: ${label}`);
      }
    }
  }
  if (spreadId === 'relationship-recovery') {
    const sections = ['핵심 진단:', '관계 리스크:', '7일 행동 계획:'];
    for (const section of sections) {
      if (!text.includes(section)) {
        errors.push(`[${caseId}] missing relationship section: ${section}`);
      }
    }
  }
}

function buildMarkdownReport(report) {
  const lines = [];
  lines.push('# Summary Regression Report');
  lines.push('');
  lines.push(`- generatedAt: ${report.generatedAt}`);
  lines.push(`- totalCases: ${report.totalCases}`);
  lines.push(`- failedCases: ${report.failedCases}`);
  lines.push(`- pass: ${report.pass}`);
  lines.push('');
  lines.push('## Case Results');
  lines.push('| caseId | spreadId | pass | errorCount |');
  lines.push('|---|---|---:|---:|');
  for (const row of report.rows) {
    lines.push(`| ${row.caseId} | ${row.spreadId} | ${row.pass ? 'Y' : 'N'} | ${row.errors.length} |`);
  }
  lines.push('');
  lines.push('## Failures');
  if (!report.failures.length) {
    lines.push('- none');
  } else {
    for (const err of report.failures) lines.push(`- ${err}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

try {
  const cases = readCases();
  const failures = [];
  const rows = [];

  for (const item of cases) {
    const errors = [];
    const { spread, items } = buildItems({
      spreadId: item.spreadId,
      level: item.level || 'beginner',
      context: item.context || '',
      caseId: item.id
    });

    const summary = summarizeSpreadForQa({
      spreadId: spread.id,
      spreadName: spread.name,
      items,
      context: item.context || '',
      level: item.level || 'beginner'
    });

    assertCommonSummaryPolicy(summary, errors, item.id);
    assertSpreadSpecificRules(summary, spread.id, errors, item.id);
    assertIncludesAll(summary, item.expect?.requiredAll || [], errors, item.id);
    assertIncludesAny(summary, item.expect?.requiredAny || [], errors, item.id);
    assertForbidden(summary, item.expect?.forbidden || [], errors, item.id);

    rows.push({
      caseId: item.id,
      spreadId: spread.id,
      pass: errors.length === 0,
      errors
    });
    failures.push(...errors);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalCases: rows.length,
    failedCases: rows.filter((row) => !row.pass).length,
    pass: failures.length === 0,
    rows,
    failures
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outMdPath, buildMarkdownReport(report), 'utf-8');

  console.log('[summary-regression] summary');
  console.log(JSON.stringify({
    totalCases: report.totalCases,
    failedCases: report.failedCases,
    pass: report.pass,
    outMdPath
  }, null, 2));

  process.exit(report.pass ? 0 : 2);
} catch (err) {
  console.error('[summary-regression] failed', err);
  process.exit(1);
}
