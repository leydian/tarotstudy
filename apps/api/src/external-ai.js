import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const sectionKeys = ['coreMeaning', 'symbolism', 'upright', 'reversed', 'love', 'career', 'advice'];

// ─── 스프레드 리딩 AI 보강 (방안 A) ───────────────────────────────────────────

export function makeSpreadReadingEnhancer(env) {
  const mode = String(env.EXTERNAL_AI_MODE || 'api').toLowerCase().trim();
  const timeoutMs = Number(env.AI_READING_TIMEOUT_MS || env.AI_TIMEOUT_MS || 8000);
  const model = env.EXTERNAL_AI_MODEL || 'default';

  if (mode === 'cli') {
    return makeCliSpreadEnhancer({
      timeoutMs,
      model,
      command: env.EXTERNAL_AI_CLI_COMMAND || 'codex',
      workingDir: env.EXTERNAL_AI_CLI_CWD || process.cwd()
    });
  }

  const endpoint = env.EXTERNAL_AI_URL;
  const apiKey = env.EXTERNAL_AI_KEY;
  if (!endpoint || !apiKey) return null;

  return makeApiSpreadEnhancer({ endpoint, apiKey, timeoutMs, model });
}

function buildSpreadReadingPrompt({ context, cards, domain, verdictLabel }) {
  const cardList = cards.slice(0, 3).map(
    (item) => `- ${item.position}: ${item.cardName} (${item.orientation === 'reversed' ? '역방향' : '정방향'}, 키워드: ${item.keyword})`
  ).join('\n');
  const verdictHint = verdictLabel === '우세' ? '진행 가능' : verdictLabel === '박빙' ? '조건부 진행' : '보류 후 정비';

  return [
    '타로 스프레드 리딩의 도입 문장(bridge)과 결론 문장(verdictSentence)을 JSON으로 생성하세요.',
    `질문: "${context || '현재 상황 리딩'}"`,
    `도메인: ${domain}`,
    `카드 신호 요약 (판정: ${verdictHint}):`,
    cardList,
    '말투는 부드럽고 공감 능력 높은 타로 마스터 스타일로 작성하세요.',
    '단정 표현(반드시, 100%, 틀림없다) 대신 조건부 가능성 표현을 사용하세요.',
    '필수 키: bridge (도입 공감 1~2문장), verdictSentence (결론 1문장)',
    '반드시 단일 JSON 객체만 출력하세요.',
    'JSON 외 텍스트를 출력하지 마세요.'
  ].join('\n');
}

function pickSpreadFields(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const bridge = typeof payload.bridge === 'string' ? payload.bridge.trim() : null;
  const verdictSentence = typeof payload.verdictSentence === 'string' ? payload.verdictSentence.trim() : null;
  if (!bridge && !verdictSentence) return null;
  return { bridge, verdictSentence };
}

function makeApiSpreadEnhancer({ endpoint, apiKey, timeoutMs, model }) {
  return async function spreadEnhancer({ context, cards, domain, verdictLabel }) {
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
          prompt: buildSpreadReadingPrompt({ context, cards, domain, verdictLabel }),
          format: 'json'
        })
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return pickSpreadFields(payload);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
}

function makeCliSpreadEnhancer({ timeoutMs, model, command, workingDir }) {
  return async function spreadEnhancer({ context, cards, domain, verdictLabel }) {
    let tmpDir = '';
    let tmpPath = '';
    try {
      tmpDir = await mkdtemp(join(tmpdir(), 'tarot-spread-'));
      tmpPath = join(tmpDir, 'response.txt');
      const args = [
        'exec',
        '--skip-git-repo-check',
        '--ephemeral',
        '--output-last-message',
        tmpPath
      ];
      if (model && model !== 'default') args.push('--model', model);
      args.push(buildSpreadReadingPrompt({ context, cards, domain, verdictLabel }));
      await execFileAsync(command, args, { cwd: workingDir, timeout: timeoutMs, maxBuffer: 1024 * 1024 });
      const raw = (await readFile(tmpPath, 'utf8')).trim();
      if (!raw) return null;
      const parsed = parseJsonLoose(raw);
      return pickSpreadFields(parsed);
    } catch {
      return null;
    } finally {
      if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  };
}

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
    '말투는 자연스러운 일상 한국어(대화체)로 작성하세요.',
    '기계적인 항목 라벨(예: 리더 과제, 복기 포인트) 남발 대신 부드러운 상담 문장으로 작성하세요.',
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
