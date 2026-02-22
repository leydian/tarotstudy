import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { analyzeQuestionContextSync } from '../apps/api/src/question-understanding/index.js';

const root = process.cwd();
const setPath = path.join(root, 'scripts', 'question-understanding-eval-set.json');
const outPath = path.join(root, 'tmp', 'question-understanding-eval-report.md');

function readSet() {
  return JSON.parse(fs.readFileSync(setPath, 'utf-8'));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function pct(n, d) {
  return d === 0 ? 0 : Number(((n / d) * 100).toFixed(2));
}

function buildReport(rows, summary) {
  const lines = [];
  lines.push('# Question Understanding Eval Report');
  lines.push('');
  lines.push(`- total: ${summary.total}`);
  lines.push(`- intentAccuracy: ${summary.intentAccuracy}%`);
  lines.push(`- typeAccuracy: ${summary.typeAccuracy}%`);
  lines.push(`- choiceModeAccuracy: ${summary.choiceModeAccuracy}%`);
  lines.push(`- pass: ${summary.pass}`);
  lines.push('');
  lines.push('| id | intent(expected/pred) | type(expected/pred) | choiceMode(expected/pred) | pass |');
  lines.push('|---|---|---|---|---:|');
  for (const row of rows) {
    lines.push(`| ${row.id} | ${row.intentExpected}/${row.intentPred} | ${row.typeExpected}/${row.typePred} | ${row.choiceExpected}/${row.choicePred} | ${row.pass ? 'Y' : 'N'} |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

try {
  const set = readSet();
  const rows = [];
  let intentOk = 0;
  let typeOk = 0;
  let choiceOk = 0;

  for (const item of set) {
    const result = analyzeQuestionContextSync(item.text, { mode: 'hybrid', flag: true });
    const intentPass = result.intent === item.intent;
    const typePass = result.questionType === item.questionType;
    const choicePass = String(result.choice?.mode || 'single') === String(item.choiceMode || 'single');
    if (intentPass) intentOk += 1;
    if (typePass) typeOk += 1;
    if (choicePass) choiceOk += 1;
    rows.push({
      id: item.id,
      intentExpected: item.intent,
      intentPred: result.intent,
      typeExpected: item.questionType,
      typePred: result.questionType,
      choiceExpected: item.choiceMode || 'single',
      choicePred: result.choice?.mode || 'single',
      pass: intentPass && typePass && choicePass
    });
  }

  const summary = {
    total: set.length,
    intentAccuracy: pct(intentOk, set.length),
    typeAccuracy: pct(typeOk, set.length),
    choiceModeAccuracy: pct(choiceOk, set.length)
  };
  summary.pass = summary.intentAccuracy >= 95
    && summary.typeAccuracy >= 95
    && summary.choiceModeAccuracy >= 93;

  ensureDir(outPath);
  fs.writeFileSync(outPath, buildReport(rows, summary), 'utf-8');

  console.log('[question-understanding-eval] summary');
  console.log(JSON.stringify({ ...summary, outPath }, null, 2));
  process.exit(summary.pass ? 0 : 2);
} catch (err) {
  console.error('[question-understanding-eval] failed', err);
  process.exit(1);
}
