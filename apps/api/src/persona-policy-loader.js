import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POLICY_PATH = path.resolve(__dirname, '../../../docs/persona-onepager.md');

const REQUIRED_SECTIONS = [
  '## 1) 역할 정의',
  '## 2) 말투 설정',
  '## 3) 리딩 구조 정의',
  '## 4) 제한 조건(가드레일)',
  '## 5) 페르소나 적용 규칙',
  '## 8) 최종 페르소나 형태 (복붙용)'
];

const REQUIRED_SUBSECTIONS = [
  '### 8.1 타로 리더 페르소나',
  '### 8.2 학습 리더 페르소나',
  '### 8.3 공통 페르소나 규칙'
];

let cachedPolicy = null;

function assertHasAll(text, needles, label) {
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`${label} missing required heading: ${needle}`);
    }
  }
}

function extractTextBlockUnderHeading(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fence = '```text';
  const endFence = '```';
  const pattern = `(?:^|\\n)${escaped}\\n${escapeRegexForPattern(fence)}\\n([\\s\\S]*?)\\n${escapeRegexForPattern(endFence)}`;
  const rx = new RegExp(pattern, 'm');
  const match = markdown.match(rx);
  if (!match) {
    throw new Error(`missing text code block under heading: ${heading}`);
  }
  return match[1].trim();
}

function escapeRegexForPattern(text = '') {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractBulletValue(markdown, keyPrefix) {
  const lines = markdown.split('\n');
  const line = lines.find((item) => item.trim().startsWith(`- ${keyPrefix}`));
  if (!line) return '';
  const value = line.split(':').slice(1).join(':').trim();
  return value.replace(/^`|`$/g, '').trim();
}

function extractToneMode(markdown) {
  const match = markdown.match(/`READING_TONE_MODE=([^`]+)`/);
  if (!match) {
    throw new Error('missing READING_TONE_MODE declaration in persona-onepager');
  }
  return String(match[1] || '').trim();
}

function extractSupportedPersonas(markdown) {
  const out = [];
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^- (user|planner|developer|domain-expert):\s*(.+)$/);
    if (!match) continue;
    const group = match[1];
    const ids = match[2]
      .split(',')
      .map((id) => id.replace(/`/g, '').trim())
      .filter(Boolean);
    for (const id of ids) out.push({ group, id });
  }
  if (!out.length) {
    throw new Error('supported personas not found under section 5');
  }
  return out;
}

function parseRenderPriority(raw) {
  const normalized = String(raw || '').replace(/\s+/g, ' ').trim();
  const tokens = normalized.split('->').map((item) => item.trim()).filter(Boolean);
  if (tokens.length !== 4) {
    throw new Error(`invalid render priority format: ${raw}`);
  }
  return tokens;
}

function buildPolicy(markdown) {
  assertHasAll(markdown, REQUIRED_SECTIONS, 'persona-onepager');
  assertHasAll(markdown, REQUIRED_SUBSECTIONS, 'persona-onepager');

  const tarotLeaderPrompt = extractTextBlockUnderHeading(markdown, '### 8.1 타로 리더 페르소나');
  const learningLeaderPrompt = extractTextBlockUnderHeading(markdown, '### 8.2 학습 리더 페르소나');
  const commonRulesPrompt = extractTextBlockUnderHeading(markdown, '### 8.3 공통 페르소나 규칙');

  const renderPriorityRaw = extractBulletValue(markdown, '소비 우선순위');
  const renderPriority = parseRenderPriority(renderPriorityRaw);
  const toneMode = extractToneMode(markdown);

  const defaultPersonaLine = markdown
    .split('\n')
    .find((line) => line.includes('미매칭 기본값:'));
  if (!defaultPersonaLine) {
    throw new Error('missing default persona declaration in section 5');
  }
  const defaultPersonaMatch = defaultPersonaLine.match(/`([^`]+)`/);
  if (!defaultPersonaMatch) {
    throw new Error('invalid default persona declaration format');
  }
  const [defaultGroup, defaultId] = defaultPersonaMatch[1].split(':');
  if (!defaultGroup || !defaultId) {
    throw new Error('invalid default persona value');
  }

  const supportedPersonas = extractSupportedPersonas(markdown);

  return {
    sourcePath: 'docs/persona-onepager.md',
    policyVersion: createHash('sha256').update(markdown).digest('hex').slice(0, 8),
    renderPriority,
    toneMode,
    roles: {
      tarotLeaderPrompt,
      learningLeaderPrompt,
      commonRulesPrompt
    },
    personaResolution: {
      defaultPersona: { group: defaultGroup, id: defaultId },
      supportedPersonas
    }
  };
}

export function loadPersonaPolicy() {
  const raw = fs.readFileSync(POLICY_PATH, 'utf-8');
  const policy = buildPolicy(raw);
  cachedPolicy = policy;
  return policy;
}

export function getPersonaPolicy() {
  if (cachedPolicy) return cachedPolicy;
  return loadPersonaPolicy();
}

export function getPersonaPolicyPathForTest() {
  return POLICY_PATH;
}
