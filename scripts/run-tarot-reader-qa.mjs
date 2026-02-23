import { spawn } from 'node:child_process';
import { withApiRuntime } from './lib/api-runtime.mjs';

function runRawQa(apiBase) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/tarot-reader-quality-check.mjs'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        API_BASE_URL: apiBase
      }
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0 || code === 2) resolve(code);
      else reject(new Error(`[tarot-reader-qa] raw runner exited with code ${code}`));
    });
  });
}

try {
  const code = await withApiRuntime(
    {
      label: 'tarot-reader-qa'
    },
    async ({ apiBase }) => runRawQa(apiBase)
  );
  process.exitCode = Number(code || 0);
} catch (err) {
  console.error('[tarot-reader-qa] failed', err);
  process.exitCode = 1;
}
