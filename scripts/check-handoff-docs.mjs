import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const files = {
  readme: path.join(root, 'README.md'),
  session: path.join(root, 'SESSION_HANDOFF.md'),
  index: path.join(root, 'docs', 'handoff', 'INDEX.md'),
  backend: path.join(root, 'docs', 'handoff', 'details', 'backend-reading-quality-2026-02-22.md'),
  frontend: path.join(root, 'docs', 'handoff', 'details', 'frontend-layout-theme-2026-02-22.md'),
  quality: path.join(root, 'docs', 'handoff', 'details', 'quality-gates-telemetry-2026-02-22.md'),
  docsOps: path.join(root, 'docs', 'handoff', 'details', 'docs-ops-structure-2026-02-22.md')
};

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing file: ${path.relative(root, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function assertIncludes(text, needle, label, errors) {
  if (!text.includes(needle)) {
    errors.push(`${label} missing: ${needle}`);
  }
}

function run() {
  const errors = [];
  const readme = read(files.readme);
  const session = read(files.session);
  const index = read(files.index);
  read(files.backend);
  read(files.frontend);
  read(files.quality);
  read(files.docsOps);

  assertIncludes(readme, 'SESSION_HANDOFF.md', 'README', errors);
  assertIncludes(readme, 'docs/handoff/INDEX.md', 'README', errors);
  assertIncludes(session, 'docs/handoff/INDEX.md', 'SESSION_HANDOFF.md', errors);
  assertIncludes(session, '최종 갱신:', 'SESSION_HANDOFF.md', errors);
  assertIncludes(index, '최종 갱신:', 'docs/handoff/INDEX.md', errors);
  assertIncludes(index, 'docs/handoff/details/backend-reading-quality-2026-02-22.md', 'docs/handoff/INDEX.md', errors);
  assertIncludes(index, 'docs/handoff/details/frontend-layout-theme-2026-02-22.md', 'docs/handoff/INDEX.md', errors);
  assertIncludes(index, 'docs/handoff/details/quality-gates-telemetry-2026-02-22.md', 'docs/handoff/INDEX.md', errors);
  assertIncludes(index, 'docs/handoff/details/docs-ops-structure-2026-02-22.md', 'docs/handoff/INDEX.md', errors);

  if (errors.length) {
    console.error('[handoff-docs] failed');
    for (const err of errors) console.error('-', err);
    process.exit(2);
  }

  console.log('[handoff-docs] ok');
}

run();
