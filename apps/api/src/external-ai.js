import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const sectionKeys = ['coreMeaning', 'symbolism', 'upright', 'reversed', 'love', 'career', 'advice'];

export function makeExternalGenerator(env) {
  const mode = String(env.EXTERNAL_AI_MODE || 'api').toLowerCase().trim();
  const timeoutMs = Number(env.AI_TIMEOUT_MS || 12000);
  const model = env.EXTERNAL_AI_MODEL || 'default';
  const promptBuilder = (card, level, context) => buildPrompt({ card, level, context });

  if (mode === 'cli') {
    return makeCliGenerator({
      timeoutMs,
      model,
      promptBuilder,
      command: env.EXTERNAL_AI_CLI_COMMAND || 'codex',
      workingDir: env.EXTERNAL_AI_CLI_CWD || process.cwd()
    });
  }

  const endpoint = env.EXTERNAL_AI_URL;
  const apiKey = env.EXTERNAL_AI_KEY;
  if (!endpoint || !apiKey) {
    return null;
  }

  return makeApiGenerator({ endpoint, apiKey, timeoutMs, model, promptBuilder });
}

function makeApiGenerator({ endpoint, apiKey, timeoutMs, model, promptBuilder }) {
  return async function externalGenerator(card, level, context) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          prompt: promptBuilder(card, level, context),
          format: 'json'
        })
      });

      if (!response.ok) return null;
      const payload = await response.json();
      return pickSections(payload);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
}

function makeCliGenerator({ timeoutMs, model, promptBuilder, command, workingDir }) {
  return async function externalGenerator(card, level, context) {
    let tmpDir = '';
    let tmpPath = '';
    try {
      tmpDir = await mkdtemp(join(tmpdir(), 'tarot-codex-'));
      tmpPath = join(tmpDir, 'response.txt');
      const args = [
        'exec',
        '--skip-git-repo-check',
        '--ephemeral',
        '--output-last-message',
        tmpPath
      ];

      if (model && model !== 'default') {
        args.push('--model', model);
      }

      args.push(promptBuilder(card, level, context));

      await execFileAsync(command, args, {
        cwd: workingDir,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024
      });

      const raw = (await readFile(tmpPath, 'utf8')).trim();
      if (!raw) return null;
      const parsed = parseJsonLoose(raw);
      return pickSections(parsed);
    } catch {
      return null;
    } finally {
      if (tmpDir) {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  };
}

function buildPrompt({ card, level, context }) {
  const levelGuide = level === 'intermediate'
    ? '중급 관점: 카드 위치/상호작용, 조건 분기, 검증 가능한 행동 제안을 포함하세요.'
    : '입문 관점: 핵심 키워드 고정, 쉬운 언어, 바로 실행 가능한 단일 행동 제안을 포함하세요.';

  return [
    '다음 타로 카드 설명을 JSON으로 생성하세요.',
    `카드: ${card.nameKo} (${card.name})`,
    `난이도: ${level}`,
    levelGuide,
    context ? `질문 맥락: ${context}` : '질문 맥락: 일반 학습',
    `필수 키: ${sectionKeys.join(', ')}`,
    '각 값은 한국어 3줄 이상으로 작성하고, 줄바꿈(\\n)을 포함하세요.',
    '반드시 단일 JSON 객체만 출력하세요.',
    'JSON 외 텍스트를 출력하지 마세요.'
  ].join('\n');
}

function pickSections(payload) {
  if (payload?.sections && typeof payload.sections === 'object') {
    return payload.sections;
  }
  if (payload && sectionKeys.every((key) => typeof payload[key] === 'string')) {
    return payload;
  }
  if (typeof payload?.text === 'string') {
    const parsed = parseJsonLoose(payload.text);
    return parsed ? pickSections(parsed) : null;
  }
  return null;
}

function parseJsonLoose(raw = '') {
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!fenced?.[1]) return null;
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      return null;
    }
  }
}
