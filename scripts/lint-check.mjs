import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const targets = process.argv.length > 2
  ? process.argv.slice(2)
  : ['apps/api/src', 'apps/web/src', 'scripts'];

const allowedExt = new Set(['.js', '.mjs', '.ts', '.tsx', '.css']);
const ignoredDirNames = new Set(['node_modules', 'dist', '.git', 'tmp']);
const failures = [];

function walk(entryPath) {
  const stat = fs.statSync(entryPath);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(entryPath)) {
      if (ignoredDirNames.has(name)) continue;
      walk(path.join(entryPath, name));
    }
    return;
  }

  if (!allowedExt.has(path.extname(entryPath))) return;
  const rel = path.relative(root, entryPath);
  const content = fs.readFileSync(entryPath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    if (/\t/.test(line)) {
      failures.push(`${rel}:${lineNo} contains tab character`);
    }
    if (/\s+$/.test(line)) {
      failures.push(`${rel}:${lineNo} has trailing whitespace`);
    }
    if (rel !== 'scripts/lint-check.mjs' && /TODO|FIXME|XXX|HACK/.test(line)) {
      failures.push(`${rel}:${lineNo} contains temporary marker`);
    }
    if (/console\.log\(/.test(line) && !rel.startsWith('scripts/')) {
      failures.push(`${rel}:${lineNo} uses console.log outside scripts`);
    }
  });
}

for (const target of targets) {
  const abs = path.isAbsolute(target) ? target : path.join(root, target);
  if (!fs.existsSync(abs)) continue;
  walk(abs);
}

if (failures.length > 0) {
  console.error('[lint-check] failed');
  for (const fail of failures.slice(0, 200)) {
    console.error(`- ${fail}`);
  }
  process.exit(1);
}

console.log('[lint-check] ok');
