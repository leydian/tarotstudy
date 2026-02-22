import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const casesPath = path.join(root, 'scripts', 'yearly-fortune-regression-cases.json');
const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:8787';
const healthUrl = `${apiBase}/api/health`;

function readCases() {
  return JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function isApiReady() {
  try {
    const res = await fetch(healthUrl);
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return data?.ok === true;
  } catch {
    return false;
  }
}

async function waitForApi(maxWaitMs = 12000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    if (await isApiReady()) return true;
    await sleep(250);
  }
  return false;
}

async function drawYearly({ level, context }) {
  const res = await fetch(`${apiBase}/api/spreads/yearly-fortune/draw`, {
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

function assertCommonStructure(summary, errors, caseId) {
  const required = ['총평:', '분기별 운세:', '월별 운세:', '1분기(1~3월)', '2분기(4~6월)', '3분기(7~9월)', '4분기(10~12월)'];
  for (const phrase of required) {
    if (!summary.includes(phrase)) {
      errors.push(`[${caseId}] missing phrase: ${phrase}`);
    }
  }
  for (let month = 1; month <= 12; month += 1) {
    if (!summary.includes(`${month}월(`)) {
      errors.push(`[${caseId}] missing monthly narrative for ${month}월`);
    }
  }
  if (!summary.includes('연말')) {
    errors.push(`[${caseId}] missing end-of-year wording ("연말")`);
  }
}

function countMatches(text, regex) {
  const matches = String(text).match(regex);
  return matches ? matches.length : 0;
}

function hasTimingExpression(text) {
  return /([1-9]|1[0-2])월|[1-4]분기|연말|상반기|하반기|이번 달|다음 달/.test(text);
}

function hasWhenWhatCloseLine(summary) {
  const tail = String(summary).trim().split('\n\n').at(-1) || '';
  return /언제.*무엇/.test(tail) || /무엇.*언제/.test(tail);
}

function assertIntentRules(summary, item, errors) {
  const { id: caseId, intent, requiresTiming = false } = item;
  if (intent === 'career' && !summary.includes('취직 시기 관점으로 정리하면')) {
    errors.push(`[${caseId}] career case is missing job-timing close line`);
  }
  if (intent !== 'career' && summary.includes('취직 시기 관점으로 정리하면')) {
    errors.push(`[${caseId}] non-career case unexpectedly contains job-timing close line`);
  }
  if (requiresTiming && !hasTimingExpression(summary)) {
    errors.push(`[${caseId}] timing question is missing explicit time expression`);
  }
  if (requiresTiming && !hasWhenWhatCloseLine(summary)) {
    errors.push(`[${caseId}] final close line must follow "언제 + 무엇" style`);
  }

  if (intent === 'career') {
    const domainWordCount = countMatches(summary, /(지원서|지원|면접|이력서|포트폴리오|오퍼|협상|직무)/g);
    if (domainWordCount < 2) {
      errors.push(`[${caseId}] career case is missing job-domain words (>=2 required)`);
    }
  }
}

let apiChild = null;

try {
  let spawned = false;
  if (!(await isApiReady())) {
    apiChild = spawn(process.execPath, ['apps/api/src/index.js'], {
      stdio: 'inherit',
      env: process.env
    });
    spawned = true;
    const ready = await waitForApi();
    if (!ready) {
      console.error('[yearly-regression] API did not become ready in time.');
      process.exit(1);
    }
  }

  const cases = readCases();
  const errors = [];
  for (const item of cases) {
    const data = await drawYearly(item);
    const summary = String(data?.summary || '');
    assertCommonStructure(summary, errors, item.id);
    assertIntentRules(summary, item, errors);
  }

  console.log('[yearly-regression] evaluated cases:', cases.length);
  if (errors.length) {
    console.error('[yearly-regression] failures:');
    for (const err of errors) console.error('-', err);
  }

  if (spawned && apiChild) {
    apiChild.kill('SIGTERM');
  }
  process.exit(errors.length ? 2 : 0);
} catch (err) {
  console.error('[yearly-regression] failed', err);
  if (apiChild) apiChild.kill('SIGTERM');
  process.exit(1);
}
