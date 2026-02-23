import { spawn } from 'node:child_process';
import net from 'node:net';
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

async function canBindPort(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function resolveApiBaseWithFallback(baseApi) {
  const parsed = parseApiBase(baseApi);
  const host = parsed.host;
  const protocol = parsed.protocol;
  const primaryPort = parsed.port;
  const candidates = [primaryPort, primaryPort + 1, primaryPort + 2, 8888, 3001]
    .filter((port, idx, arr) => Number.isFinite(port) && port > 0 && arr.indexOf(port) === idx);

  for (const port of candidates) {
    if (await canBindPort(host, port)) {
      return `${protocol}//${host}:${port}`;
    }
  }
  return null;
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

  const runtimeApiBase = await resolveApiBaseWithFallback(normalizedApiBase);
  if (!runtimeApiBase) {
    throw new Error(
      `[${label}] no bindable local port found for QA runtime. ` +
      `If API is already running, set QA_API_MODE=external and API_BASE_URL explicitly.`
    );
  }
  const { host, port } = parseApiBase(runtimeApiBase);
  if (runtimeApiBase !== normalizedApiBase) {
    console.log(`[${label}] fallback API port selected: ${runtimeApiBase}`);
  }
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
    const ready = await waitForApi(runtimeApiBase, waitMs);
    if (!ready) {
      throw new Error(`[${label}] API did not become ready in time (${waitMs}ms) at ${runtimeApiBase}`);
    }
    return await runFn({ apiBase: runtimeApiBase, spawned: true });
  } finally {
    if (!apiChild.killed) apiChild.kill('SIGTERM');
  }
}
