import { spawn } from 'node:child_process';
import process from 'node:process';
import { withApiRuntime } from './lib/api-runtime.mjs';

const writeReview = process.argv.includes('--write-review');

function runRawQa(apiBase) {
  return new Promise((resolve, reject) => {
    const args = ['scripts/learning-leader-quality-check.mjs'];
    if (writeReview) args.push('--write-review');

    const child = spawn(process.execPath, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        API_BASE_URL: apiBase
      }
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0 || code === 2) {
        resolve(code);
      } else {
        reject(new Error(`[learning-leader-qa] raw runner exited with code ${code}`));
      }
    });
  });
}

try {
  const code = await withApiRuntime(
    {
      label: 'learning-leader-qa'
    },
    async ({ apiBase }) => runRawQa(apiBase)
  );

  process.exitCode = Number(code || 0);
} catch (err) {
  console.error('[learning-leader-qa] failed', err);
  process.exitCode = 1;
}
