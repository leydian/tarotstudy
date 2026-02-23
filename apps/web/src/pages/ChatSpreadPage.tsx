import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Spread, SpreadDrawResult } from '../types';
import { TarotImage } from '../components/TarotImage';
import { normalizeDisplayText } from './spreads-presenters';
import { recommendSpreadForQuestion } from '../lib/spread-recommendation';
import { buildDisplaySpreads, resolveDisplaySpreadId } from '../lib/spread-display';
import {
  findDrawnItemForSlot,
  parseMonthlySummary,
  parseWeeklySummary,
  parseYearlySummary,
  toParagraphBlocks
} from './spreads-helpers';

type ChatMessage =
  | {
    id: string;
    role: 'assistant' | 'user';
    type: 'text';
    text: string;
  }
  | {
    id: string;
    role: 'assistant';
    type: 'reading';
    payload: SpreadDrawResult;
  };

const STARTER_PROMPTS = [
  '시험 합격할 수 있을까?',
  '이번 주 관계 흐름을 보고 싶어',
  '올해 커리어 타이밍을 분기별로 알려줘'
];

export function ChatSpreadPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const spreadsQuery = useQuery({ queryKey: ['spreads'], queryFn: api.getSpreads });
  const rawSpreads = spreadsQuery.data ?? [];
  const spreads = useMemo(() => buildDisplaySpreads(rawSpreads), [rawSpreads]);

  const selectedSpreadIdFromQuery = searchParams.get('spreadId') || '';
  const levelFromQuery = searchParams.get('level') === 'intermediate' ? 'intermediate' : 'beginner';
  const contextFromQuery = searchParams.get('context') || '';

  const [selectedSpreadId, setSelectedSpreadId] = useState<string>(selectedSpreadIdFromQuery);
  const [readingLevel, setReadingLevel] = useState<'beginner' | 'intermediate'>(levelFromQuery);
  const [input, setInput] = useState<string>(contextFromQuery);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recommendedHint, setRecommendedHint] = useState<string>('');
  const logRef = useRef<HTMLDivElement | null>(null);

  const selectedSpread = useMemo(() => {
    if (!spreads.length) return null;
    return spreads.find((item) => item.id === selectedSpreadId) ?? spreads[0] ?? null;
  }, [spreads, selectedSpreadId]);

  useEffect(() => {
    if (!selectedSpreadId && spreads.length > 0) {
      setSelectedSpreadId(spreads[0].id);
    }
  }, [spreads, selectedSpreadId]);

  useEffect(() => {
    if (!selectedSpread) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('spreadId', selectedSpread.id);
      next.set('level', readingLevel);
      if (input.trim()) next.set('context', input.trim());
      else next.delete('context');
      return next;
    });
  }, [input, readingLevel, selectedSpread, setSearchParams]);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const drawMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!rawSpreads.length) throw new Error('No spread available');
      const recommendation = await recommendSpreadForQuestion({
        question,
        spreads: rawSpreads,
        analyze: async (text) => {
          const result = await api.analyzeQuestionV2({ text, mode: 'hybrid' });
          return {
            intent: result.analysis.intent,
            questionType: result.analysis.questionType,
            timeHorizon: result.analysis.timeHorizon
          };
        }
      });
      setRecommendedHint(recommendation.reason);
      return api.drawSpread({
        spreadId: recommendation.spreadId,
        variantId: null,
        level: readingLevel,
        context: question
      });
    },
    onSuccess: (payload, question) => {
      setSelectedSpreadId(resolveDisplaySpreadId(payload.spreadId, spreads));
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}-${prev.length}`, role: 'user', type: 'text', text: question },
        {
          id: `a-${Date.now()}-${prev.length + 1}`,
          role: 'assistant',
          type: 'reading',
          payload
        }
      ]);
    }
  });

  const latestReading = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.type === 'reading') return msg.payload;
    }
    return null;
  }, [messages]);

  const suggestionQuestions = useMemo(
    () => buildFollowupQuestions({ reading: latestReading, spread: selectedSpread }),
    [latestReading, selectedSpread]
  );

  if (spreadsQuery.isLoading) return <p>챗봇 스프레드를 불러오는 중...</p>;
  if (spreadsQuery.isError || !selectedSpread) return <p>챗봇 스프레드 데이터를 불러오지 못했습니다.</p>;

  return (
    <section className="stack">
      <article className="panel chat-top-panel">
        <div className="chat-page-header">
          <div>
            <p className="badge">대화형 스프레드</p>
            <h2>타로 챗 리딩</h2>
            <p>질문을 분석해 스프레드를 자동 추천하고 바로 리딩합니다.</p>
            {recommendedHint && <p className="sub">최근 추천: {recommendedHint}</p>}
          </div>
          <div className="chip-wrap">
            <Link
              className="chip-link"
              to={`/spreads?spreadId=${encodeURIComponent(selectedSpread.id)}&level=${readingLevel}&context=${encodeURIComponent(input)}`}
            >
              카드뷰로 보기
            </Link>
          </div>
        </div>

        <div className="filters spread-draw-controls">
          <select value={readingLevel} onChange={(e) => setReadingLevel(e.target.value as 'beginner' | 'intermediate')}>
            <option value="beginner">입문 리딩</option>
            <option value="intermediate">중급 리딩</option>
          </select>
          <span className="badge">자동 추천 스프레드: {selectedSpread.name}</span>
        </div>
      </article>

      <article className="panel chat-shell chat-shell-dark">
        <div className="chat-log" ref={logRef}>
          {messages.length === 0 && (
            <div className="chat-empty">
              <p>아직 대화가 없습니다. 아래 추천 질문으로 시작해보세요.</p>
              <div className="chip-wrap">
                {STARTER_PROMPTS.map((prompt) => (
                  <button key={prompt} className="chip-link" onClick={() => setInput(prompt)}>{prompt}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              spreads={spreads}
              isPending={drawMutation.isPending}
              onRedraw={(question) => {
                if (!question.trim() || drawMutation.isPending) return;
                setInput(question);
                drawMutation.mutate(question);
              }}
            />
          ))}
        </div>

        <div className="chat-composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="무엇이든 물어보세요"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!input.trim() || drawMutation.isPending) return;
                drawMutation.mutate(input.trim());
              }
            }}
          />
          <button
            className="btn primary"
            disabled={!input.trim() || drawMutation.isPending}
            onClick={() => drawMutation.mutate(input.trim())}
          >
            {drawMutation.isPending ? '리딩 생성 중...' : '보내기'}
          </button>
        </div>

        {drawMutation.isError && <p className="sub">리딩 생성에 실패했습니다. 잠시 후 다시 시도해주세요.</p>}
      </article>

      {latestReading && (
        <article className="panel">
          <h4>다음 질문 추천</h4>
          <div className="chip-wrap">
            {suggestionQuestions.map((question) => (
              <button key={question} className="chip-link" onClick={() => setInput(question)}>{question}</button>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}

function ChatBubble({
  message,
  spreads,
  onRedraw,
  isPending
}: {
  message: ChatMessage;
  spreads: Spread[];
  onRedraw: (question: string) => void;
  isPending: boolean;
}) {
  if (message.type === 'text') {
    return (
      <div className="chat-row chat-row-user">
        <article className="chat-bubble chat-bubble-user">
          <p>{message.text}</p>
        </article>
      </div>
    );
  }

  const reading = message.payload;
  const spreadMeta = spreads.find((item) => item.id === reading.spreadId) || null;
  const effectiveSpreadMeta = spreadMeta
    || spreads.find((item) => (item.variants || []).some((variant) => variant.sourceSpreadId === reading.spreadId))
    || null;
  const verdict = inferVerdict(reading.summary);
  const keyQuestion = reading.context?.trim() || '질문';

  return (
    <div className="chat-row chat-row-assistant">
      <article className="chat-bubble chat-bubble-assistant chat-reading-bubble">
        {effectiveSpreadMeta && (
          <section className="chat-spread-layout-wrap">
            <h5 className="chat-layout-title">{effectiveSpreadMeta.name} 배열</h5>
            <div
              className="chat-spread-layout"
              style={{
                gridTemplateColumns: `repeat(${effectiveSpreadMeta.layout.cols}, minmax(86px, 1fr))`,
                gridTemplateRows: `repeat(${effectiveSpreadMeta.layout.rows}, auto)`
              }}
            >
              {effectiveSpreadMeta.layout.slots.map((slot, idx) => {
                const drawn = findDrawnItemForSlot(reading.items, slot);
                if (!drawn) return null;
                return (
                  <div
                    key={`chat-slot-${idx}-${slot.position}`}
                    className="chat-spread-slot"
                    style={{
                      gridColumn: String(slot.col),
                      gridRow: String(slot.row),
                      transform: slot.rotate ? `rotate(${slot.rotate}deg)` : 'none'
                    }}
                  >
                    <TarotImage
                      src={drawn.card.imageUrl}
                      sources={drawn.card.imageSources}
                      cardId={drawn.card.id}
                      alt={drawn.card.nameKo}
                      className={`chat-spread-slot-thumb ${drawn.orientation === 'reversed' ? 'card-reversed' : ''}`}
                      loading="lazy"
                    />
                    <p className="chat-spread-slot-label">{drawn.card.nameKo}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="chat-verdict-wrap">
          <span className={`chat-verdict-pill chat-verdict-${verdict.kind}`}>{verdict.label}</span>
        </div>

        <ChatSummaryView reading={reading} />

        <div className="chat-reading-actions">
          <button
            className="btn primary"
            disabled={isPending}
            onClick={() => onRedraw(keyQuestion)}
          >
            다시 뽑기
          </button>
        </div>
      </article>
    </div>
  );
}

function ChatSummaryView({ reading }: { reading: SpreadDrawResult }) {
  const structured = buildStructuredSummary(reading);
  if (structured) {
    const quickDialog = buildQuickDialog(structured.highlights, structured.actionPlan);
    return (
      <section className="chat-summary-shell">
        <div className="chat-dialog-stream">
          {quickDialog.map((turn, idx) => (
            <article key={`quick-${idx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
              <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
              <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
            </article>
          ))}
        </div>
        <div className="chat-summary-accordion-wrap">
          {structured.sections.map((section, idx) => (
            <details key={`${section.title}-${idx}`} className="chat-summary-accordion" open={section.open}>
              <summary>{section.title}</summary>
              <div className="chat-summary-accordion-body">
                {section.monthItems?.length ? (
                  <div className="chat-month-accordion-list">
                    {section.monthItems.map((item, monthIdx) => (
                      <details key={`${item.title}-${monthIdx}`} className="chat-month-accordion" open={monthIdx < 2}>
                        <summary>{item.title}</summary>
                        <div className="chat-month-accordion-body">
                          <div className="chat-dialog-stream">
                            {buildSectionDialog(item.body, section.title).map((turn, turnIdx) => (
                              <article key={`${item.title}-${turnIdx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
                                <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
                                <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
                              </article>
                            ))}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                ) : (
                  <div className="chat-dialog-stream">
                    {section.lines.flatMap((line) => buildSectionDialog(line, section.title)).map((turn, lineIdx) => (
                      <article key={`${section.title}-${lineIdx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
                        <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
                        <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
    );
  }

  const narrativeParagraph = buildNaturalNarrativeParagraph(reading);
  const narrativeBubbles = buildNarrativeBubbles(narrativeParagraph);
  const highlights = buildGenericHighlights(narrativeBubbles);
  const actionPlan = buildActionPlan(narrativeBubbles.join(' '));
  const quickDialog = buildQuickDialog(highlights, actionPlan);
  return (
    <section className="chat-summary-shell">
      <div className="chat-dialog-stream">
        {quickDialog.map((turn, idx) => (
          <article key={`fallback-quick-${idx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
            <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
            <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
          </article>
        ))}
      </div>
      <details className="chat-summary-accordion" open>
        <summary>상세 대화</summary>
        <div className="chat-summary-accordion-body">
          <div className="chat-dialog-stream">
            {narrativeBubbles.flatMap((line) => buildSectionDialog(line, '상세 리딩')).map((turn, idx) => (
              <article key={`summary-bubble-${idx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
                <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
                <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
              </article>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

function buildStructuredSummary(reading: SpreadDrawResult) {
  const summary = sanitizeSummaryForChat(reading.summary);
  const yearly = parseYearlySummary(summary);
  if (yearly) {
    const quarterLines = toParagraphBlocks(yearly.quarterly);
    const monthlyLines = yearly.monthly.map((line) => compactLine(line));
    const monthItems = toMonthlyItems(monthlyLines);
    const highlights = [
      { title: '핵심 결론', body: firstMeaningfulLine(yearly.overall) },
      { title: '지금 할 일', body: firstMeaningfulLine(yearly.closing || quarterLines[0] || yearly.overall) },
      { title: '주의 포인트', body: findCautionLine([...quarterLines, ...monthlyLines]) }
    ];
    const actionPlan = buildActionPlan([yearly.closing, ...quarterLines, yearly.overall].join(' '));
    return {
      highlights,
      actionPlan,
      sections: [
        { title: '총평', lines: toParagraphBlocks(yearly.overall), open: true },
        { title: '분기별 운세', lines: quarterLines, open: true },
        { title: '월별 운세 (12개월)', lines: [], monthItems, open: false },
        { title: '실행 정리', lines: toParagraphBlocks(yearly.closing), open: false }
      ]
    };
  }

  const monthly = parseMonthlySummary(summary);
  if (monthly) {
    const weekLines = monthly.weekly.map((line) => compactLine(line));
    const highlights = [
      { title: '핵심 결론', body: firstMeaningfulLine(monthly.overall) },
      { title: '이번 달 실행', body: firstMeaningfulLine(monthly.actionGuide || monthly.bridge) },
      { title: '주의 포인트', body: findCautionLine([...weekLines, monthly.bridge, monthly.actionGuide]) }
    ];
    const actionPlan = buildActionPlan([monthly.actionGuide, monthly.bridge, monthly.overall].join(' '));
    return {
      highlights,
      actionPlan,
      sections: [
        { title: '총평', lines: toParagraphBlocks(monthly.overall), open: true },
        { title: '주차 흐름', lines: weekLines, open: true },
        { title: '월-주 연결', lines: toParagraphBlocks(monthly.bridge), open: false },
        { title: '실행 가이드', lines: toParagraphBlocks(monthly.actionGuide), open: false }
      ]
    };
  }

  const weekly = parseWeeklySummary(summary);
  if (weekly) {
    const dailyLines = weekly.daily.map((line) => compactLine(line));
    const highlights = [
      { title: '핵심 결론', body: firstMeaningfulLine(weekly.overall) },
      { title: '이번 주 실행', body: firstMeaningfulLine(weekly.actionGuide || dailyLines[0] || weekly.overall) },
      { title: '주의 포인트', body: findCautionLine([...dailyLines, weekly.actionGuide]) }
    ];
    const actionPlan = buildActionPlan([weekly.actionGuide, weekly.theme, weekly.overall].join(' '));
    return {
      highlights,
      actionPlan,
      sections: [
        { title: '총평', lines: toParagraphBlocks(weekly.overall), open: true },
        { title: '일별 흐름', lines: dailyLines, open: true },
        { title: '실행 가이드', lines: toParagraphBlocks(weekly.actionGuide), open: false },
        { title: '한 줄 테마', lines: toParagraphBlocks(weekly.theme), open: false }
      ]
    };
  }

  return null;
}

function compactLine(text: string) {
  const blocks = toParagraphBlocks(text);
  return blocks.join(' ');
}

function toMonthlyItems(lines: string[]) {
  return lines.map((line, index) => {
    const m = line.match(/^((?:[1-9]|1[0-2])월\([^)]*\))은?\s*(.*)$/);
    if (m) {
      return { title: m[1], body: m[2] || line };
    }
    return { title: `${index + 1}월`, body: line };
  });
}

function firstMeaningfulLine(text: string) {
  const blocks = toParagraphBlocks(text);
  return blocks[0] || '핵심 흐름을 기준으로 작은 실행부터 시작하세요.';
}

function findCautionLine(lines: string[]) {
  const picked = lines.find((line) => /주의|리스크|소모|충돌|지연|과속|불안|피해야|조절/.test(line));
  return compactLine(picked || lines[0] || '속도를 줄이고 기준을 먼저 고정하세요.');
}

function buildGenericHighlights(lines: string[]) {
  const conclusion = lines.find((line) => /결론|총평|핵심|테마/.test(line)) || lines[0] || '';
  const action = lines.find((line) => /실행|행동|할 일|추천|진행/.test(line)) || lines[1] || conclusion;
  const caution = findCautionLine(lines);
  return [
    { title: '핵심 결론', body: compactLine(conclusion) },
    { title: '지금 할 일', body: compactLine(action) },
    { title: '주의 포인트', body: caution }
  ];
}

function buildActionPlan(text: string) {
  const blocks = toParagraphBlocks(text);
  const joined = blocks.join(' ');
  const today = selectActionLine(blocks, ['오늘', '지금', '즉시', '당장'])
    || fallbackAction(joined, 'today');
  const thisWeek = selectActionLine(blocks, ['이번 주', '주간', '이번주'])
    || fallbackAction(joined, 'week');
  const thisMonth = selectActionLine(blocks, ['이번 달', '월간', '한 달', '이번달'])
    || fallbackAction(joined, 'month');
  return { today, thisWeek, thisMonth };
}

function selectActionLine(lines: string[], hints: string[]) {
  const found = lines.find((line) => hints.some((hint) => line.includes(hint)));
  if (!found) return '';
  return compactLine(found);
}

function fallbackAction(joined: string, scope: 'today' | 'week' | 'month') {
  const base = compactLine(joined || '핵심 흐름을 기준으로 작은 실행부터 시작하세요.');
  if (scope === 'today') return base || '오늘은 기준 1개를 정하고 행동 1개만 실행하세요.';
  if (scope === 'week') return base || '이번 주는 실행 기록을 남기며 속도를 조절하세요.';
  return base || '이번 달은 무리한 확장보다 루틴 고정을 우선하세요.';
}

function buildQuickDialog(
  highlights: Array<{ title: string; body: string }>,
  actionPlan: { today: string; thisWeek: string; thisMonth: string }
) {
  const core = highlights.find((item) => item.title.includes('결론'))?.body || highlights[0]?.body || '';
  const action = highlights.find((item) => item.title.includes('할 일') || item.title.includes('실행'))?.body || actionPlan.today;
  const caution = highlights.find((item) => item.title.includes('주의'))?.body || '속도를 줄이고 핵심 기준부터 고정해볼게요.';
  return [
    { speaker: 'tarot' as const, text: softenLine(`핵심 흐름부터 보면 ${core}`) },
    { speaker: 'learning' as const, text: softenLine(`좋아요, 바로 행동으로 옮기면 ${action}`) },
    { speaker: 'tarot' as const, text: softenLine(`주의할 부분은 ${caution}`) },
    { speaker: 'learning' as const, text: softenLine(`오늘은 ${actionPlan.today}`) },
    { speaker: 'learning' as const, text: softenLine(`이번 주에는 ${actionPlan.thisWeek}`) },
    { speaker: 'learning' as const, text: softenLine(`이번 달은 ${actionPlan.thisMonth}`) }
  ];
}

function buildSectionDialog(line: string, sectionTitle: string) {
  const chunks = toParagraphBlocks(line);
  const turns = chunks.map((chunk) => {
    const speaker = pickSpeaker(chunk, sectionTitle);
    return {
      speaker,
      text: softenLine(chunk)
    };
  });
  return turns.length ? turns : [{ speaker: 'tarot' as const, text: softenLine(line) }];
}

function pickSpeaker(text: string, sectionTitle = ''): 'tarot' | 'learning' {
  const joined = `${sectionTitle} ${text}`;
  if (/실행|행동|루틴|체크|점검|복기|우선순위|오늘|이번 주|이번 달|가이드/.test(joined)) return 'learning';
  return 'tarot';
}

function softenLine(text: string) {
  const line = compactLine(text);
  if (!line) return '지금 흐름에서 핵심 포인트를 같이 정리해볼게요.';
  const trimmed = line.replace(/\s+/g, ' ').trim();
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function inferVerdict(summary: string): { kind: 'yes' | 'no' | 'maybe'; label: string } {
  const raw = String(summary || '').replace(/\s+/g, ' ').trim();
  if (!raw) return { kind: 'maybe', label: 'MAYBE' };

  const lower = raw.toLowerCase();
  const conclusionWindow = (raw.match(/결론[^.!\n]{0,48}/g) || []).join(' ');
  const conclusionLower = conclusionWindow.toLowerCase();

  if (/조건부\s*예/.test(conclusionWindow) || /조건부\s*예/.test(lower)) {
    return { kind: 'maybe', label: 'CONDITIONAL YES' };
  }
  if (/결론[^.!\n]{0,24}(아니오|보류)/.test(conclusionWindow) || /결론[^.!\n]{0,24}(아니오|보류)/.test(lower)) {
    return { kind: 'no', label: 'NO' };
  }
  if (/결론[^.!\n]{0,24}예/.test(conclusionWindow) || /결론[^.!\n]{0,24}예/.test(lower)) {
    return { kind: 'yes', label: 'YES' };
  }

  if (/1차 판정은 우세|판정은 우세|우세/.test(raw)) return { kind: 'yes', label: 'YES' };
  if (/1차 판정은 조건부|판정은 조건부|박빙/.test(raw)) return { kind: 'maybe', label: 'MAYBE' };

  if (/\byes\b/.test(conclusionLower)) return { kind: 'yes', label: 'YES' };
  if (/\bno\b/.test(conclusionLower)) return { kind: 'no', label: 'NO' };
  return { kind: 'maybe', label: 'MAYBE' };
}

function sanitizeSummaryForChat(summary = '') {
  const raw = String(summary || '').trim();
  if (!raw) return raw;
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line !== '오늘의 테마');

  return lines
    .join('\n')
    .replace(/(^|\s)오늘의 테마는\s*/g, '$1')
    .replace(/(^|\n)오늘의 테마:\s*/g, '$1')
    .trim();
}

function buildNaturalNarrativeParagraph(reading: SpreadDrawResult) {
  const summary = sanitizeSummaryForChat(reading.summary)
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const evidence = reading.items
    .slice(0, 5)
    .map((item) => {
      const orientation = item.orientation === 'reversed' ? '역방향' : '정방향';
      const keyword = item.card.keywords?.[0] || '흐름';
      const interpretationSnippet = firstSentence(item.interpretation);
      const detail = interpretationSnippet ? ` ${interpretationSnippet}` : '';
      return `${item.position.name}에서 ${item.card.nameKo} ${orientation} 카드(${keyword})가 나와${detail}`;
    })
    .join(' ');

  return [summary, evidence]
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function buildNarrativeBubbles(text: string) {
  const blocks = toParagraphBlocks(String(text || ''));
  if (blocks.length > 0) return blocks;
  const fallback = String(text || '').trim();
  return fallback ? [fallback] : ['리딩 메시지를 준비 중입니다.'];
}

function firstSentence(text = '') {
  const cleaned = normalizeDisplayText(String(text || '').replace(/\n+/g, ' ').trim());
  if (!cleaned) return '';
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  return sentence.replace(/\s{2,}/g, ' ').trim();
}

function buildFollowupQuestions({
  reading,
  spread
}: {
  reading: SpreadDrawResult | null;
  spread: Spread | null;
}) {
  if (!reading || !spread) {
    return [
      '오늘 내 질문에서 가장 중요한 기준은 뭐야?',
      '지금 바로 실행할 한 가지를 정해줘',
      '이번 주 체크포인트 2개만 뽑아줘'
    ];
  }

  const keyword = reading.items.flatMap((item) => item.card.keywords || []).find(Boolean) || '흐름';
  const orientationBias = reading.items.filter((item) => item.orientation === 'upright').length >= Math.ceil(reading.items.length / 2)
    ? '정방향 우세'
    : '역방향 주의';

  return [
    `${keyword} 기준으로 오늘 행동 1개만 더 구체화해줘`,
    `${orientationBias}일 때 피해야 할 실수 2가지만 알려줘`,
    `${spread.name} 결과를 내 일정표에 넣는 방법을 말해줘`
  ];
}
