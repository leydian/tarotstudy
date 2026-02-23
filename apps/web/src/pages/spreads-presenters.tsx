import type { ReactNode } from 'react';
import {
  parseMonthlySummary,
  parseWeeklySummary,
  parseYearlySummary,
  toParagraphBlocks
} from './spreads-helpers';

type HighlightTone = 'signal' | 'action' | 'caution' | 'evidence';
type HighlightTier = 'high' | 'mid' | 'low';

type HighlightPattern = {
  regex: RegExp;
  tone: HighlightTone;
  tier: HighlightTier;
  priority: number;
};

type HighlightOptions = {
  maxHighlights?: number;
  tierLimits?: Partial<Record<HighlightTier, number>>;
};

export function renderHighlightedText(text: string, keywords: string[], keyBase: string, options: HighlightOptions = {}): ReactNode[] {
  const input = normalizeDisplayText(String(text || ''));
  if (!input) return [input];
  const patterns = buildHighlightPatterns(input, keywords);
  if (!patterns.length) return [input];

  const nodes: ReactNode[] = [];
  let cursor = 0;
  let tokenIndex = 0;
  let highlighted = 0;
  const defaultTierLimits: Record<HighlightTier, number> = input.length > 150
    ? { high: 1, mid: 2, low: 1 }
    : { high: 1, mid: 1, low: 1 };
  const tierLimits: Record<HighlightTier, number> = {
    ...defaultTierLimits,
    ...(options.tierLimits || {})
  };
  const tierUsage: Record<HighlightTier, number> = { high: 0, mid: 0, low: 0 };
  const tierTotal = tierLimits.high + tierLimits.mid + tierLimits.low;
  const maxHighlights = Math.max(1, options.maxHighlights ?? tierTotal);

  while (cursor < input.length) {
    if (highlighted >= maxHighlights) {
      nodes.push(input.slice(cursor));
      break;
    }

    let earliestMatch: RegExpExecArray | null = null;
    let earliestTone: HighlightTone | null = null;
    let earliestTier: HighlightTier | null = null;
    let earliestPriority = -1;

    for (const pattern of patterns) {
      if (tierUsage[pattern.tier] >= tierLimits[pattern.tier]) continue;
      pattern.regex.lastIndex = cursor;
      const match = pattern.regex.exec(input);
      if (!match || match.index < cursor) continue;
      if (!earliestMatch || match.index < earliestMatch.index) {
        earliestMatch = match;
        earliestTone = pattern.tone;
        earliestTier = pattern.tier;
        earliestPriority = pattern.priority;
        continue;
      }
      if (earliestMatch && match.index === earliestMatch.index && pattern.priority > earliestPriority) {
        earliestMatch = match;
        earliestTone = pattern.tone;
        earliestTier = pattern.tier;
        earliestPriority = pattern.priority;
        continue;
      }
      if (
        earliestMatch
        && match.index === earliestMatch.index
        && pattern.priority === earliestPriority
        && match[0].length > earliestMatch[0].length
      ) {
        earliestMatch = match;
        earliestTone = pattern.tone;
        earliestTier = pattern.tier;
      }
    }

    if (!earliestMatch || !earliestTone || !earliestTier) {
      nodes.push(input.slice(cursor));
      break;
    }

    if (earliestMatch.index > cursor) {
      nodes.push(input.slice(cursor, earliestMatch.index));
    }

    const matchedText = earliestMatch[0];
    nodes.push(
      <span key={`${keyBase}-${tokenIndex++}`} className={`keyword-mark keyword-${earliestTone} keyword-tier-${earliestTier}`}>
        {matchedText}
      </span>
    );
    highlighted += 1;
    tierUsage[earliestTier] += 1;
    cursor = earliestMatch.index + matchedText.length;
  }

  return nodes;
}

function buildHighlightPatterns(input: string, keywords: string[]): HighlightPattern[] {
  const STOPWORDS = new Set(['흐름', '신호', '키워드', '기준', '실행', '행동', '질문', '근거']);
  const signalKeywords = Array.from(
    new Set(
      (keywords || [])
        .map((word) => String(word || '').trim())
        .filter((word) => word.length >= 2 && !STOPWORDS.has(word))
    )
  );

  const patterns: HighlightPattern[] = signalKeywords.map((word) => ({
    regex: new RegExp(`(?:["'])?${escapeRegex(word)}(?:["'])?`, 'g'),
    tone: 'signal',
    tier: 'high',
    priority: 90
  }));

  patterns.push({
    regex: /(총평|주차 흐름|월-주 연결|실행 가이드|한 줄 테마|핵심 진단|관계 리스크|7일 행동 계획|오늘 할 일 1개|바로 적기|복기 메모|다음 리딩 질문)/g,
    tone: 'evidence',
    tier: 'mid',
    priority: 70
  });
  patterns.push({
    regex: /(행동 1개|질문 1개|기록하세요|정리하세요|확인해보세요|속도 조절|우선순위)/g,
    tone: 'action',
    tier: 'mid',
    priority: 60
  });
  patterns.push({
    regex: /(소모|지연|리스크|불안|흔들릴 수 있어|주의)/g,
    tone: 'caution',
    tier: 'high',
    priority: 95
  });
  patterns.push({
    regex: /"[^"]{2,12}"/g,
    tone: 'signal',
    tier: 'low',
    priority: 50
  });

  if (!/(총평|주차 흐름|월-주 연결|실행 가이드|한 줄 테마|오늘 할 일 1개|복기 메모)/.test(input)) {
    patterns.push({
      regex: /(핵심|요약|포인트|기준)/g,
      tone: 'evidence',
      tier: 'low',
      priority: 40
    });
  }
  return patterns;
}

export function normalizeDisplayText(text: string) {
  return String(text || '')
    .replace(/병목/g, '막히는 지점')
    .replace(/각성\"로/g, '각성\"으로');
}

function escapeRegex(text: string) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function YearlySummaryView({ summary }: { summary: string }) {
  const parsed = parseYearlySummary(summary);
  if (!parsed) {
    return (
      <div className="reading-prose-wrap">
        {toParagraphBlocks(summary).map((block, idx) => (
          <p key={`summary-fallback-${idx}`} className="reading-prose">{block}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="yearly-summary">
      <section className="yearly-section">
        <h5>총평</h5>
        <p className="reading-prose">{parsed.overall}</p>
      </section>
      <section className="yearly-section">
        <h5>분기별 운세</h5>
        <p className="reading-prose">{parsed.quarterly}</p>
      </section>
      <section className="yearly-section">
        <h5>월별 운세</h5>
        <div className="yearly-month-grid">
          {parsed.monthly.map((line, idx) => (
            <article key={`monthly-item-${idx}`} className="yearly-month-item">
              <p className="reading-prose">{line}</p>
            </article>
          ))}
        </div>
      </section>
      {parsed.closing && (
        <section className="yearly-section">
          <h5>마무리</h5>
          <p className="reading-prose">{parsed.closing}</p>
        </section>
      )}
    </div>
  );
}

function WeeklySummaryView({ summary }: { summary: string }) {
  const parsed = parseWeeklySummary(summary);
  if (!parsed) {
    return (
      <div className="reading-prose-wrap">
        {toParagraphBlocks(summary).map((block, idx) => (
          <p key={`weekly-summary-fallback-${idx}`} className="reading-prose">{block}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="yearly-summary">
      <section className="yearly-section">
        <h5>총평</h5>
        <p className="reading-prose">{parsed.overall}</p>
      </section>
      <section className="yearly-section">
        <h5>일별 흐름</h5>
        <div className="weekly-day-grid">
          {parsed.daily.map((line, idx) => (
            <article key={`weekly-item-${idx}`} className="yearly-month-item">
              <p className="reading-prose">{line}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="yearly-section">
        <h5>실행 가이드</h5>
        <p className="reading-prose">{parsed.actionGuide}</p>
      </section>
      {parsed.theme && (
        <section className="yearly-section">
          <h5>한 줄 테마</h5>
          <p className="reading-prose">{parsed.theme}</p>
        </section>
      )}
    </div>
  );
}

function MonthlySummaryView({ summary, keywords }: { summary: string; keywords: string[] }) {
  const parsed = parseMonthlySummary(summary);
  if (!parsed) {
    return (
      <div className="reading-prose-wrap">
        {toParagraphBlocks(summary).map((block, idx) => (
          <p key={`monthly-summary-fallback-${idx}`} className="reading-prose">
            {renderHighlightedText(block, keywords, `monthly-fallback-${idx}`, { tierLimits: { high: 1, mid: 1, low: 0 } })}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="monthly-summary">
      <section className="yearly-section monthly-overview">
        <p className="reading-prose monthly-intro">이번 달을 한눈에 보면 이런 흐름입니다.</p>
        {toParagraphBlocks(parsed.overall).map((line, idx) => (
          <p key={`monthly-overall-${idx}`} className="reading-prose">
            {renderHighlightedText(line, keywords, `monthly-overall-${idx}`, { tierLimits: { high: 1, mid: 1, low: 0 } })}
          </p>
        ))}
      </section>

      <section className="yearly-section">
        <p className="reading-prose monthly-intro">주차별 분위기를 나눠 보면 더 또렷하게 보입니다.</p>
        <div className="monthly-week-grid">
          {parsed.weekly.map((line, idx) => (
            <article key={`monthly-week-${idx}`} className="yearly-month-item monthly-week-card">
              {toParagraphBlocks(line).map((piece, pieceIdx) => (
                <p key={`monthly-week-${idx}-${pieceIdx}`} className="reading-prose">
                  {renderHighlightedText(piece, keywords, `monthly-week-${idx}-${pieceIdx}`, { tierLimits: { high: 1, mid: 1, low: 0 } })}
                </p>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className="yearly-section">
        <p className="reading-prose monthly-intro">이 흐름을 일상에 옮길 때는 이렇게 가져가면 좋습니다.</p>
        {toParagraphBlocks(parsed.bridge).map((line, idx) => (
          <p key={`monthly-bridge-${idx}`} className="reading-prose">
            {renderHighlightedText(line, keywords, `monthly-bridge-${idx}`, { tierLimits: { high: 1, mid: 1, low: 0 } })}
          </p>
        ))}
        {toParagraphBlocks(parsed.actionGuide).map((line, idx) => (
          <p key={`monthly-action-${idx}`} className="reading-prose">
            {renderHighlightedText(line, keywords, `monthly-action-${idx}`, { tierLimits: { high: 1, mid: 1, low: 0 } })}
          </p>
        ))}
      </section>

      {parsed.theme && (
        <section className="yearly-section monthly-theme">
          <p className="reading-prose">
            {renderHighlightedText(parsed.theme, keywords, 'monthly-theme', { tierLimits: { high: 1, mid: 1, low: 0 } })}
          </p>
        </section>
      )}
    </div>
  );
}

export function UnifiedSummaryView({
  spreadId,
  summary,
  keywords
}: {
  spreadId: string;
  summary: string;
  keywords: string[];
}) {
  const blocks = buildSummaryNaturalBlocks({ spreadId, summary });
  return <NaturalFlowView blocks={blocks} keywords={keywords} keyBase={`summary-${spreadId}`} />;
}

function buildSummaryNaturalBlocks({ spreadId, summary }: { spreadId: string; summary: string }) {
  if (spreadId === 'yearly-fortune') {
    const parsed = parseYearlySummary(summary);
    if (parsed) {
      return [
        parsed.overall,
        parsed.quarterly,
        ...parsed.monthly,
        parsed.closing
      ].filter(Boolean);
    }
  }
  if (spreadId === 'weekly-fortune') {
    const parsed = parseWeeklySummary(summary);
    if (parsed) {
      return [
        parsed.overall,
        ...parsed.daily,
        parsed.actionGuide,
        parsed.theme
      ].filter(Boolean);
    }
  }
  if (spreadId === 'monthly-fortune') {
    const parsed = parseMonthlySummary(summary);
    if (parsed) {
      return [
        parsed.overall,
        ...parsed.weekly,
        parsed.bridge,
        parsed.actionGuide,
        parsed.theme
      ].filter(Boolean);
    }
  }
  return splitNarrativeSummaryIntoBlocks({ spreadId, summary });
}

function splitNarrativeSummaryIntoBlocks({ spreadId, summary }: { spreadId: string; summary: string }) {
  const compact = String(summary || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!compact) return [];

  const seededByParagraph = String(summary || '')
    .split(/\n\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[가-힣A-Za-z0-9·\-\s()]{1,18}:\s*/g, ''));

  if (seededByParagraph.length >= 2) return seededByParagraph;

  const seededByHeading = compact
    .split(/(?=(핵심 진단|관계 리스크|7일 행동 계획|비교 결론|실행 가이드|한 줄 테마|오늘의 테마|마지막으로|전반적으로))/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[가-힣A-Za-z0-9·\-\s()]{1,18}:\s*/g, ''))
    .filter(Boolean);
  if (seededByHeading.length >= 2) return dedupeBlocks(seededByHeading);

  const sentences = compact
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (sentences.length <= 2) {
    const phraseBlocks = compact
      .split(/,\s+| 그리고 | 하지만 | 다만 | 또한 | 이어서 | 마지막으로 /g)
      .map((line) => line.trim())
      .filter((line) => line.length >= 12);
    if (phraseBlocks.length >= 2) return dedupeBlocks(phraseBlocks).slice(0, 5);
    return toParagraphBlocks(summary);
  }

  const chunkSize = spreadId === 'one-card' ? 1 : 2;
  const maxBlocks = ({
    'one-card': 4,
    'daily-fortune': 4,
    'three-card': 4,
    'choice-a-b': 5,
    'relationship-recovery': 5,
    'celtic-cross': 5
  } as Record<string, number>)[spreadId] ?? 4;

  const grouped: string[] = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    grouped.push(sentences.slice(i, i + chunkSize).join(' ').trim());
  }
  return dedupeBlocks(grouped).slice(0, maxBlocks);
}

function dedupeBlocks(blocks: string[]) {
  const seen = new Set<string>();
  return blocks.filter((line) => {
    const key = String(line || '').replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function NaturalFlowView({
  blocks,
  keywords,
  keyBase,
  compact = false
}: {
  blocks: string[];
  keywords: string[];
  keyBase: string;
  compact?: boolean;
}) {
  const normalized = (blocks || []).map((block) => String(block || '').trim()).filter(Boolean);
  if (!normalized.length) return null;
  const [lead, ...rest] = normalized;

  return (
    <div className={`natural-flow-wrap ${compact ? 'natural-flow-compact' : ''}`}>
      <section className="natural-flow-lead">
        {toParagraphBlocks(lead).map((line, idx) => (
          <p key={`${keyBase}-lead-${idx}`} className="reading-prose">
            {renderHighlightedText(line, keywords, `${keyBase}-lead-${idx}`, { tierLimits: { high: 1, mid: 1, low: 0 } })}
          </p>
        ))}
      </section>
      {rest.length > 0 && (
        <div className="natural-flow-grid">
          {rest.map((block, idx) => (
            <article key={`${keyBase}-card-${idx}`} className="natural-flow-card">
              {toParagraphBlocks(block).map((line, lineIdx) => (
                <p key={`${keyBase}-line-${idx}-${lineIdx}`} className="reading-prose">
                  {renderHighlightedText(line, keywords, `${keyBase}-line-${idx}-${lineIdx}`, { tierLimits: { high: 1, mid: 1, low: 0 } })}
                </p>
              ))}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function summarizeText(text: string, max: number) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trimEnd()}...`;
}

export function toOutcomeLabel(outcome?: 'matched' | 'partial' | 'different') {
  if (outcome === 'matched') return '대체로 맞음';
  if (outcome === 'partial') return '부분적으로 맞음';
  if (outcome === 'different') return '다름';
  return '미복기';
}

export function SummaryView({
  spreadId,
  summary,
  keywords
}: {
  spreadId: string;
  summary: string;
  keywords: string[];
}) {
  if (spreadId === 'yearly-fortune') {
    return <YearlySummaryView summary={summary} />;
  }
  if (spreadId === 'weekly-fortune') {
    return <WeeklySummaryView summary={summary} />;
  }
  if (spreadId === 'monthly-fortune') {
    return <MonthlySummaryView summary={summary} keywords={keywords} />;
  }
  return <UnifiedSummaryView spreadId={spreadId} summary={summary} keywords={keywords} />;
}
