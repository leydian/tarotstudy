import { spawn } from 'node:child_process';
import process from 'node:process';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseApiBase(apiBase) {
  const url = new URL(apiBase);
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
  return {
    url,
    host: url.hostname,
    port,
    protocol: url.protocol
  };
}

async function isApiReady(apiBase) {
  try {
    const res = await fetch(`${apiBase}/api/health`);
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return data?.ok === true;
  } catch {
    return false;
  }
}

async function waitForApi(apiBase, maxWaitMs = 12000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    if (await isApiReady(apiBase)) return true;
    await delay(250);
  }
  return false;
}

function buildSpawnApiBase(apiBase) {
  const parsed = parseApiBase(apiBase);
  if (parsed.port === 0 || Number.isNaN(parsed.port)) {
    return `${parsed.protocol}//${parsed.host}:8787`;
  }
  return apiBase;
}

export async function withApiRuntime(options, runFn) {
  const {
    apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:8787',
    mode = process.env.QA_API_MODE || 'auto',
    waitMs = Number(process.env.QA_API_WAIT_MS || 12000),
    label = 'qa-runner'
  } = options || {};

  const normalizedApiBase = buildSpawnApiBase(apiBase);
  const alreadyUp = await isApiReady(normalizedApiBase);
  if (alreadyUp || mode === 'external') {
    if (!alreadyUp && mode === 'external') {
      throw new Error(`[${label}] API_BASE_URL is not reachable in external mode: ${normalizedApiBase}`);
    }
    return runFn({ apiBase: normalizedApiBase, spawned: false });
  }

  if (mode === 'off') {
    throw new Error(`[${label}] API is not reachable and QA_API_MODE=off`);
  }

  const { host, port } = parseApiBase(normalizedApiBase);
  const spawnEnv = {
    ...process.env,
    HOST: host,
    PORT: String(port)
  };
  const apiChild = spawn(process.execPath, ['apps/api/src/index.js'], {
    stdio: 'inherit',
    env: spawnEnv
  });

  try {
    const ready = await waitForApi(normalizedApiBase, waitMs);
    if (!ready) {
      throw new Error(`[${label}] API did not become ready in time (${waitMs}ms) at ${normalizedApiBase}`);
    }
    return await runFn({ apiBase: normalizedApiBase, spawned: true });
  } finally {
    if (!apiChild.killed) apiChild.kill('SIGTERM');
  }
}
