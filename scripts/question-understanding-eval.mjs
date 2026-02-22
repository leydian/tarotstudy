import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { analyzeQuestionContextSync } from '../apps/api/src/question-understanding/index.js';

const root = process.cwd();
const setPath = path.join(root, 'scripts', 'question-understanding-eval-set.json');
const outPath = path.join(root, 'tmp', 'question-understanding-eval-report.md');
const minCases = Number(process.env.QA_QUESTION_UNDERSTANDING_MIN_CASES || 1000);
const passThreshold = Number(process.env.QA_QUESTION_UNDERSTANDING_PASS_THRESHOLD || 98);

function readSet() {
  return JSON.parse(fs.readFileSync(setPath, 'utf-8'));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function pct(n, d) {
  return d === 0 ? 0 : Number(((n / d) * 100).toFixed(2));
}

function byAccuracyStats(rows, keyName) {
  const bucket = new Map();
  for (const row of rows) {
    const key = String(row?.[keyName] || 'unknown');
    const current = bucket.get(key) || { total: 0, ok: 0 };
    current.total += 1;
    if (row.pass) current.ok += 1;
    bucket.set(key, current);
  }
  const result = [...bucket.entries()].map(([key, value]) => ({
    key,
    total: value.total,
    accuracy: pct(value.ok, value.total)
  }));
  return result.sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
}

function topFailurePatterns(rows, limit = 20) {
  const counter = new Map();
  for (const row of rows) {
    if (row.pass) continue;
    const key = `intent:${row.intentExpected}->${row.intentPred} | type:${row.typeExpected}->${row.typePred} | choice:${row.choiceExpected}->${row.choicePred}`;
    counter.set(key, (counter.get(key) || 0) + 1);
  }
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pattern, count]) => ({ pattern, count }));
}

function buildReport(rows, summary, extras = {}) {
  const lines = [];
  lines.push('# Question Understanding Eval Report');
  lines.push('');
  lines.push(`- minCasesRequired: ${summary.minCasesRequired}`);
  lines.push(`- total: ${summary.total}`);
  lines.push(`- intentAccuracy: ${summary.intentAccuracy}%`);
  lines.push(`- typeAccuracy: ${summary.typeAccuracy}%`);
  lines.push(`- choiceModeAccuracy: ${summary.choiceModeAccuracy}%`);
  lines.push(`- domainFloorAccuracy: ${summary.domainFloorAccuracy}%`);
  lines.push(`- threshold: ${summary.threshold}%`);
  lines.push(`- pass: ${summary.pass}`);
  lines.push('');
  if (summary.total < summary.minCasesRequired) {
    lines.push(`- note: total cases are below minimum required count (${summary.minCasesRequired}).`);
    lines.push('');
  }
  lines.push('## Bucket Accuracy');
  lines.push('');
  for (const section of [
    { title: 'Intent', rows: extras.intentBuckets || [] },
    { title: 'Style Tag', rows: extras.styleBuckets || [] },
    { title: 'Length Bucket', rows: extras.lengthBuckets || [] },
    { title: 'Risk Tag', rows: extras.riskBuckets || [] }
  ]) {
    lines.push(`### ${section.title}`);
    lines.push('');
    lines.push('| bucket | total | accuracy |');
    lines.push('|---|---:|---:|');
    for (const row of section.rows) {
      lines.push(`| ${row.key} | ${row.total} | ${row.accuracy}% |`);
    }
    lines.push('');
  }
  lines.push('## Top Failure Patterns');
  lines.push('');
  lines.push('| pattern | count |');
  lines.push('|---|---:|');
  for (const row of (extras.failurePatterns || [])) {
    lines.push(`| ${row.pattern} | ${row.count} |`);
  }
  lines.push('');
  lines.push('## Detailed Rows');
  lines.push('');
  lines.push('| id | intent(expected/pred) | type(expected/pred) | choiceMode(expected/pred) | pass |');
  lines.push('|---|---|---|---|---:|');
  for (const row of rows.slice(0, 500)) {
    lines.push(`| ${row.id} | ${row.intentExpected}/${row.intentPred} | ${row.typeExpected}/${row.typePred} | ${row.choiceExpected}/${row.choicePred} | ${row.pass ? 'Y' : 'N'} |`);
  }
  if (rows.length > 500) {
    lines.push('');
    lines.push(`- note: detailed rows are truncated to first 500 of ${rows.length}.`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

try {
  const set = readSet();
  if (!Array.isArray(set)) {
    throw new Error('question-understanding eval set must be an array');
  }

  const rows = [];
  let intentOk = 0;
  let typeOk = 0;
  let choiceOk = 0;
  const domainStats = new Map();

  for (const item of set) {
    const result = analyzeQuestionContextSync(item.text, { mode: 'hybrid', flag: true });
    const intentPass = result.intent === item.intent;
    const typePass = result.questionType === item.questionType;
    const choicePass = String(result.choice?.mode || 'single') === String(item.choiceMode || 'single');
    if (intentPass) intentOk += 1;
    if (typePass) typeOk += 1;
    if (choicePass) choiceOk += 1;
    const domain = String(item.intent || 'general');
    const row = domainStats.get(domain) || { total: 0, ok: 0 };
    row.total += 1;
    if (intentPass && typePass && choicePass) row.ok += 1;
    domainStats.set(domain, row);
    rows.push({
      id: item.id,
      intentExpected: item.intent,
      intentPred: result.intent,
      typeExpected: item.questionType,
      typePred: result.questionType,
      choiceExpected: item.choiceMode || 'single',
      choicePred: result.choice?.mode || 'single',
      styleTag: item.styleTag || 'unknown',
      lengthBucket: item.lengthBucket || 'unknown',
      riskTag: item.riskTag || 'unknown',
      pass: intentPass && typePass && choicePass
    });
  }

  const summary = {
    total: set.length,
    minCasesRequired: minCases,
    threshold: passThreshold,
    intentAccuracy: pct(intentOk, set.length),
    typeAccuracy: pct(typeOk, set.length),
    choiceModeAccuracy: pct(choiceOk, set.length)
  };
  const domainAccuracies = [...domainStats.values()].map((row) => pct(row.ok, row.total));
  summary.domainFloorAccuracy = domainAccuracies.length ? Math.min(...domainAccuracies) : 100;
  summary.pass = summary.total >= summary.minCasesRequired
    && summary.intentAccuracy >= passThreshold
    && summary.typeAccuracy >= passThreshold
    && summary.choiceModeAccuracy >= passThreshold
    && summary.domainFloorAccuracy >= passThreshold;

  const extras = {
    intentBuckets: byAccuracyStats(rows, 'intentExpected'),
    styleBuckets: byAccuracyStats(rows, 'styleTag'),
    lengthBuckets: byAccuracyStats(rows, 'lengthBucket'),
    riskBuckets: byAccuracyStats(rows, 'riskTag'),
    failurePatterns: topFailurePatterns(rows)
  };

  ensureDir(outPath);
  fs.writeFileSync(outPath, buildReport(rows, summary, extras), 'utf-8');

  console.log('[question-understanding-eval] summary');
  console.log(JSON.stringify({ ...summary, outPath, failurePatterns: extras.failurePatterns.slice(0, 5) }, null, 2));
  process.exit(summary.pass ? 0 : 2);
} catch (err) {
  console.error('[question-understanding-eval] failed', err);
  process.exit(1);
}
