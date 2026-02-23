import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Spread, SpreadDrawResult } from '../types';
import { TarotImage } from '../components/TarotImage';
import { normalizeDisplayText } from './spreads-presenters';
import { recommendSpreadForQuestion } from '../lib/spread-recommendation';
import { buildDisplaySpreads, resolveDisplaySpreadId } from '../lib/spread-display';
import { loadChatDrawCache, saveChatDrawCache } from '../lib/chat-draw-cache';
import { exportReadingPdf, exportReadingTxt } from '../lib/reading-export';
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

type DialogueSpeaker = 'tarot' | 'learning';
type DialoguePurpose = 'bridge' | 'verdict' | 'evidence' | 'caution' | 'action' | 'coach' | 'detail';
type DialogueTurn = {
  speaker: DialogueSpeaker;
  purpose: DialoguePurpose;
  text: string;
  dedupeKey: string;
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

  useEffect(() => {
    if (!spreads.length) return;
    if (messages.length > 0) return;
    const fromCard = searchParams.get('fromCard') === '1';
    if (!fromCard) return;
    const chatDrawAt = searchParams.get('chatDrawAt') || '';
    const rawSpreadId = searchParams.get('rawSpreadId') || '';
    const cached = loadChatDrawCache({
      drawnAt: chatDrawAt || undefined,
      spreadId: rawSpreadId || undefined
    });
    if (!cached) return;
    setSelectedSpreadId(resolveDisplaySpreadId(cached.spreadId, spreads));
    setReadingLevel(cached.level);
    setInput(cached.context || '');
    setMessages([
      { id: `u-restore-${cached.drawnAt}`, role: 'user', type: 'text', text: cached.context || '이전 질문' },
      { id: `a-restore-${cached.drawnAt}`, role: 'assistant', type: 'reading', payload: cached }
    ]);
  }, [messages.length, searchParams, spreads]);

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
      saveChatDrawCache(payload);
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
  const cardViewHref = useMemo(() => {
    const fallbackSpreadId = selectedSpread?.id || '';
    const displaySpreadId = latestReading
      ? resolveDisplaySpreadId(latestReading.spreadId, spreads)
      : fallbackSpreadId;
    const level = latestReading?.level ?? readingLevel;
    const drawContext = latestReading?.context ?? input;
    const extra = latestReading
      ? `&fromChat=1&chatDrawAt=${encodeURIComponent(latestReading.drawnAt)}&rawSpreadId=${encodeURIComponent(latestReading.spreadId)}`
      : '';
    return `/spreads?spreadId=${encodeURIComponent(displaySpreadId)}&level=${level}&context=${encodeURIComponent(drawContext)}${extra}`;
  }, [input, latestReading, readingLevel, selectedSpread?.id, spreads]);

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
              to={cardViewHref}
            >
              카드뷰로 보기
            </Link>
            <button
              className="chip-link"
              disabled={!latestReading}
              onClick={() => latestReading && exportReadingTxt(latestReading, '챗봇 모드')}
            >
              TXT 내보내기
            </button>
            <button
              className="chip-link"
              disabled={!latestReading}
              onClick={() => latestReading && exportReadingPdf(latestReading, '챗봇 모드')}
            >
              PDF 내보내기
            </button>
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
  const verdict = inferVerdict(reading);
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
  if (reading.readingV3) {
    const quickDialog = buildQuickDialogFromReadingV3(reading);
    const evidenceLines = reading.readingV3.evidence.map((item) => item.narrativeLine);
    return (
      <section className="chat-summary-shell">
        <div className="chat-dialog-stream">
          {quickDialog.map((turn, idx) => (
            <article key={`v3-quick-${idx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
              <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
              <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
            </article>
          ))}
        </div>
        <section className="chat-summary-accordion chat-summary-section">
          <h6 className="chat-summary-section-title">상세 대화</h6>
          <div className="chat-summary-accordion-body">
            <div className="chat-dialog-stream">
              {buildDialogFromLines(evidenceLines, '상세 리딩').map((turn, idx) => (
                <article key={`v3-summary-bubble-${idx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
                  <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
                  <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    );
  }

  const structured = buildStructuredSummary(reading);
  if (structured) {
    const quickDialog = buildQuickDialog(structured.highlights, structured.actionPlan, reading);
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
            <section key={`${section.title}-${idx}`} className="chat-summary-accordion chat-summary-section">
              <h6 className="chat-summary-section-title">{section.title}</h6>
              <div className="chat-summary-accordion-body">
                {section.monthItems?.length ? (
                  <div className="chat-month-accordion-list">
                    {section.monthItems.map((item, monthIdx) => (
                      <article key={`${item.title}-${monthIdx}`} className="chat-month-accordion">
                        <h6 className="chat-month-title">{item.title}</h6>
                        <div className="chat-month-accordion-body">
                          <div className="chat-dialog-stream">
                            {buildSectionDialog(item.body, section.title, monthIdx).map((turn, turnIdx) => (
                              <article key={`${item.title}-${turnIdx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
                                <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
                                <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
                              </article>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="chat-dialog-stream">
                    {buildDialogFromLines(section.lines, section.title).map((turn, lineIdx) => (
                      <article key={`${section.title}-${lineIdx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
                        <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
                        <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>
    );
  }

  const narrativeParagraph = buildNaturalNarrativeParagraph(reading);
  const narrativeBubbles = buildNarrativeBubbles(narrativeParagraph);
  const highlights = buildGenericHighlights(narrativeBubbles);
  const actionPlan = buildActionPlan(narrativeBubbles.join(' '));
  const quickDialog = buildQuickDialog(highlights, actionPlan, reading);
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
      <section className="chat-summary-accordion chat-summary-section">
        <h6 className="chat-summary-section-title">상세 대화</h6>
        <div className="chat-summary-accordion-body">
          <div className="chat-dialog-stream">
            {buildDialogFromLines(narrativeBubbles, '상세 리딩').map((turn, idx) => (
              <article key={`summary-bubble-${idx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
                <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
                <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

function buildQuickDialogFromReadingV3(reading: SpreadDrawResult) {
  const v3 = reading.readingV3;
  if (!v3) return [];
  const evidenceLine = v3.evidence[0]
    ? `근거 카드는 ${v3.evidence[0].cardName} ${v3.evidence[0].orientation === 'reversed' ? '역방향' : '정방향'} (${v3.evidence[0].position})이고, 상징 키워드는 ${v3.evidence[0].keyword}입니다`
    : '';
  const turns: DialogueTurn[] = [
    buildTurn('tarot', 'bridge', v3.bridge),
    buildTurn('tarot', 'verdict', `핵심 흐름은 ${v3.verdict.sentence}`),
    ...(evidenceLine ? [buildTurn('tarot', 'evidence', evidenceLine)] : []),
    buildTurn('tarot', 'caution', `주의 포인트는 ${v3.caution}`),
    buildTurn('tarot', 'action', `지금 실행 기준은 ${v3.action.now}`),
    buildTurn('learning', 'coach', `학습리더 팁: ${v3.action.checkin}`)
  ];
  return dedupeTurns(turns);
}

function buildStructuredSummary(reading: SpreadDrawResult) {
  const summary = sanitizeSummaryForChat(reading.summary);
  const yearly = parseYearlySummary(summary);
  if (yearly) {
    const quarterLines = toParagraphBlocks(yearly.quarterly);
    const monthlyLines = yearly.monthly.map((line) => compactLine(line));
    const monthItems = toMonthlyItems(monthlyLines);
    const highlights = ensureDistinctHighlights([
      { title: '핵심 결론', body: firstMeaningfulLine(yearly.overall) },
      { title: '지금 할 일', body: firstMeaningfulLine(yearly.closing || quarterLines[0] || yearly.overall) },
      { title: '주의 포인트', body: findCautionLine([...quarterLines, ...monthlyLines]) }
    ], [yearly.overall, yearly.closing, ...quarterLines, ...monthlyLines]);
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
    const highlights = ensureDistinctHighlights([
      { title: '핵심 결론', body: firstMeaningfulLine(monthly.overall) },
      { title: '이번 달 실행', body: firstMeaningfulLine(monthly.actionGuide || monthly.bridge) },
      { title: '주의 포인트', body: findCautionLine([...weekLines, monthly.bridge, monthly.actionGuide]) }
    ], [monthly.overall, monthly.actionGuide, monthly.bridge, ...weekLines]);
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
    const highlights = ensureDistinctHighlights([
      { title: '핵심 결론', body: firstMeaningfulLine(weekly.overall) },
      { title: '이번 주 실행', body: firstMeaningfulLine(weekly.actionGuide || dailyLines[0] || weekly.overall) },
      { title: '주의 포인트', body: findCautionLine([...dailyLines, weekly.actionGuide]) }
    ], [weekly.overall, weekly.actionGuide, weekly.theme, ...dailyLines]);
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
  const conclusion = pickDistinctLine(lines, [/결론|총평|핵심|테마/], []);
  const action = pickDistinctLine(lines, [/실행|행동|할 일|추천|진행/], [conclusion]);
  const cautionRaw = findCautionLine(lines);
  const caution = isSameMeaning(cautionRaw, conclusion) || isSameMeaning(cautionRaw, action)
    ? pickDistinctLine(lines, [/주의|리스크|소모|충돌|지연|과속|불안|피해야|조절/], [conclusion, action])
    : cautionRaw;
  return [
    { title: '핵심 결론', body: compactLine(conclusion) || '핵심 흐름을 기준으로 속도부터 조절해보세요.' },
    { title: '지금 할 일', body: compactLine(action) || '행동 1개만 정해 짧게 실행하고 기록해보세요.' },
    { title: '주의 포인트', body: caution }
  ];
}

function ensureDistinctHighlights(
  highlights: Array<{ title: string; body: string }>,
  fallbackPool: string[]
) {
  const used = new Set<string>();
  return highlights.map((item) => {
    let body = compactLine(item.body);
    let key = normalizeDialogKey(body);
    if (!key || used.has(key)) {
      const replacement = fallbackPool
        .map((line) => compactLine(line))
        .find((line) => {
          const candidateKey = normalizeDialogKey(line);
          return Boolean(candidateKey) && !used.has(candidateKey);
        }) || body;
      body = replacement;
      key = normalizeDialogKey(body);
    }
    if (key) used.add(key);
    return { ...item, body };
  });
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
  if (scope === 'today') return base ? `오늘은 ${base}` : '오늘은 기준 1개를 정하고 행동 1개만 실행하세요.';
  if (scope === 'week') return base ? `이번 주에는 ${base}` : '이번 주는 실행 기록을 남기며 속도를 조절하세요.';
  return base ? `이번 달은 ${base}` : '이번 달은 무리한 확장보다 루틴 고정을 우선하세요.';
}

function buildQuickDialog(
  highlights: Array<{ title: string; body: string }>,
  actionPlan: { today: string; thisWeek: string; thisMonth: string },
  reading: SpreadDrawResult
) {
  const core = highlights.find((item) => item.title.includes('결론'))?.body || highlights[0]?.body || '';
  const actionRaw = highlights.find((item) => item.title.includes('할 일') || item.title.includes('실행'))?.body || actionPlan.today;
  const cautionRaw = highlights.find((item) => item.title.includes('주의'))?.body || '속도를 줄이고 핵심 기준부터 고정해볼게요.';
  const action = isSameMeaning(actionRaw, cautionRaw) ? actionPlan.today : actionRaw;
  const caution = isSameMeaning(cautionRaw, action)
    ? '핵심은 과속을 줄이고 반응을 확인하면서 강도를 조절하는 흐름이에요'
    : cautionRaw;
  const bridge = buildTarotBridge(reading.context);
  const evidence = buildCardEvidenceLead(reading.items);
  const learningGuide = buildLearningGuide(reading);
  const turns: DialogueTurn[] = [
    buildTurn('tarot', 'bridge', bridge),
    buildTurn('tarot', 'verdict', `핵심 흐름은 ${core}`),
    buildTurn('tarot', 'evidence', `근거 카드는 ${evidence}이고, 상징 단서는 첫 카드 키워드를 중심으로 읽습니다`),
    buildTurn('tarot', 'caution', `주의 포인트는 ${caution}`),
    buildTurn('tarot', 'action', `지금 실행 기준은 ${action}`),
    buildTurn('learning', 'coach', learningGuide)
  ];
  return dedupeTurns(turns);
}

function buildSectionDialog(line: string, sectionTitle: string, index = 0) {
  const chunks = toParagraphBlocks(line);
  if (!chunks.length) return [buildTurn('tarot', 'detail', line)];

  return chunks.flatMap((chunk, chunkIdx) => {
    const tarotTurn = buildTurn('tarot', 'detail', chunk);
    const learningHint = maybeBuildLearningHint(chunk, sectionTitle, index, chunkIdx);
    return learningHint ? [tarotTurn, learningHint] : [tarotTurn];
  });
}

function buildDialogFromLines(lines: string[], sectionTitle: string) {
  const turns: DialogueTurn[] = [];
  let learningCount = 0;
  let tarotCount = 0;
  lines.forEach((line, lineIdx) => {
    buildSectionDialog(line, sectionTitle, lineIdx).forEach((turn) => {
      if (!turn.dedupeKey) return;
      if (turn.speaker === 'learning' && learningCount >= 2) return;
      if (turn.speaker === 'learning' && tarotCount < 4) return;
      turns.push(turn);
      if (turn.speaker === 'learning') learningCount += 1;
      if (turn.speaker === 'tarot') tarotCount += 1;
    });
  });
  return rebalanceDialogueMix(dedupeTurns(turns));
}

function maybeBuildLearningHint(text: string, sectionTitle: string, lineIndex: number, chunkIndex: number) {
  const joined = `${sectionTitle} ${text}`;
  const isActionBlock = /실행|행동|루틴|체크|점검|복기|우선순위|가이드|정리/.test(joined);
  const isRiskBlock = /주의|리스크|소모|충돌|지연|불안|조절|과열|경계/.test(joined);
  const shouldShow = isActionBlock ? lineIndex % 2 === 0 && chunkIndex === 0 : lineIndex % 4 === 0 && chunkIndex === 0;
  if (!shouldShow) return null;
  const noun = extractPrimaryNoun(joined);
  if (isRiskBlock) {
    return buildTurn('learning', 'coach', `${noun}는 오늘 15분 점검 후 '맞음/어긋남'을 1줄로 기록하고 내일 같은 기준으로 다시 비교해요`);
  }
  if (isActionBlock) {
    return buildTurn('learning', 'coach', `${noun}는 25분 실행 + 5분 기록 1세트로 진행하고, 완료율(%) 숫자 1개를 남겨요`);
  }
  return null;
}

function buildTurn(speaker: DialogueSpeaker, purpose: DialoguePurpose, text: string): DialogueTurn {
  const voiceApplied = speaker === 'tarot'
    ? applyTarotStoryVoice(compactLine(text), purpose)
    : compactLine(text);
  const normalized = softenLine(voiceApplied);
  return {
    speaker,
    purpose,
    text: normalized,
    dedupeKey: `${speaker}:${purpose}:${normalizeDialogKey(normalized)}`
  };
}

function dedupeTurns(turns: DialogueTurn[]) {
  const seen = new Set<string>();
  return turns.filter((turn) => {
    if (!turn.dedupeKey) return false;
    if (seen.has(turn.dedupeKey)) return false;
    seen.add(turn.dedupeKey);
    return true;
  });
}

function rebalanceDialogueMix(turns: DialogueTurn[]) {
  const tarotCount = turns.filter((turn) => turn.speaker === 'tarot').length;
  const learningCap = Math.min(2, Math.max(1, Math.floor(tarotCount / 4)));
  let learningCount = 0;
  return turns.filter((turn) => {
    if (turn.speaker !== 'learning') return true;
    if (learningCount >= learningCap) return false;
    learningCount += 1;
    return true;
  });
}

function softenLine(text: string) {
  const line = sanitizeDialogLine(compactLine(text));
  if (!line) return '지금 흐름에서 핵심 포인트를 같이 정리해볼게요.';
  const trimmed = line.replace(/\s+/g, ' ').trim();
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function extractPrimaryNoun(text: string) {
  const token = String(text || '')
    .split(/\s+/)
    .find((word) => /[가-힣A-Za-z]/.test(word) && word.length >= 2);
  return token || '핵심 포인트';
}

function buildTarotBridge(context: string) {
  const q = String(context || '').trim();
  if (!q) return '지금 마음이 머무는 장면부터 천천히 비춰보겠습니다. 서두르지 않고 흐름의 결을 함께 읽어볼게요.';
  return `질문("${q}")이 마음 한가운데에 걸려 있는 장면이 보입니다. 감정의 결을 먼저 정리한 뒤, 지금 흐름이 어디로 기우는지 차분히 짚어보겠습니다.`;
}

function sanitizeDialogLine(text: string) {
  return String(text || '')
    .replace(/^\s*정리하면\s*/g, '')
    .replace(/^\s*결론은\s*/g, '')
    .replace(/^\s*실행 가이드:\s*/g, '')
    .replace(/^\s*한 줄 테마:\s*/g, '')
    .replace(/핵심부터 말씀드리면[, ]*/g, '')
    .replace(/이번 주\s*이번 주에는/g, '이번 주에는')
    .replace(/근거 카드는 핵심 메시지의\s*/g, '근거 카드는 ')
    .replace(/핵심 메시지의\s*/g, '')
    .replace(/\.?\s*으로 읽힙니다\.?/g, '으로 읽힙니다.')
    .replace(/지금은 흐름을 살려 실행해보실 수 있는 구간입니다\.?/g, '지금은 실행 여지가 열려 있는 구간입니다')
    .replace(/지금은 속도를 낮추고 정비를 먼저 두시는 편이 안정적입니다\.?/g, '지금은 속도를 낮추고 정비를 먼저 두는 편이 안정적입니다')
    .replace(/이 장면에서 보면\s*이 장면에서 보면/g, '이 장면에서 보면')
    .replace(/차분히 보면\s*차분히 보면/g, '차분히 보면')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyTarotStoryVoice(text: string, purpose: DialoguePurpose) {
  const line = String(text || '').trim();
  if (!line) return line;
  if (purpose === 'bridge') {
    return /장면|흐름/.test(line)
      ? line
      : `지금 펼쳐진 장면을 먼저 비춰보면, ${line}`;
  }
  if (purpose === 'verdict') {
    return /흐름|전개/.test(line)
      ? `차분히 보면 ${line}`
      : `차분히 보면 핵심 흐름은 ${line}`;
  }
  if (purpose === 'evidence') {
    return /상징/.test(line)
      ? `카드 상징을 기준으로 근거를 묶으면 ${line}`
      : `카드 상징을 기준으로 근거를 묶으면 ${line}, 이 신호가 해석의 축이 됩니다`;
  }
  if (purpose === 'caution') {
    return /주의 포인트/.test(line)
      ? `${line} 이 구간에서는 해석 단정을 늦추는 편이 안전합니다`
      : `주의 포인트는 ${line}`;
  }
  if (purpose === 'action') {
    return /실행 기준/.test(line)
      ? `${line} 오늘은 행동 1개와 관찰 1개만 남겨 다음 장면으로 넘겨보세요`
      : `지금 실행 기준은 ${line}`;
  }
  if (purpose === 'detail') {
    return /장면|상징|흐름|실행/.test(line)
      ? line
      : `이 장면에서 보면 ${line}`;
  }
  return line;
}

function normalizeDialogKey(text: string) {
  return sanitizeDialogLine(text)
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/[.,!?]/g, '')
    .trim();
}

function pickDistinctLine(lines: string[], patterns: RegExp[], exclude: string[]) {
  const excluded = exclude.map((item) => normalizeDialogKey(item)).filter(Boolean);
  for (const line of lines) {
    if (!patterns.some((pattern) => pattern.test(line))) continue;
    const key = normalizeDialogKey(line);
    if (!key || excluded.includes(key)) continue;
    return line;
  }
  for (const line of lines) {
    const key = normalizeDialogKey(line);
    if (!key || excluded.includes(key)) continue;
    return line;
  }
  return '';
}

function isSameMeaning(a: string, b: string) {
  return normalizeDialogKey(a) !== '' && normalizeDialogKey(a) === normalizeDialogKey(b);
}

function buildCardEvidenceLead(items: SpreadDrawResult['items']) {
  const primary = items[0];
  if (!primary) return '첫 번째 포지션 카드입니다';
  const orientation = primary.orientation === 'reversed' ? '역방향' : '정방향';
  return `${primary.card.nameKo} ${orientation} (${primary.position.name})입니다`;
}

function buildLearningGuide(reading: SpreadDrawResult) {
  const primary = reading.items[0];
  if (!primary) return '학습리더 팁: 오늘 25분 실행 + 5분 기록 1세트만 진행하고, 실행 후 맞음/어긋남을 1줄로 남겨요.';
  const focus = primary.card.keywords?.[0] || '핵심';
  return softenLine(
    `학습리더 팁: 오늘은 ${primary.position.name} 기준으로 25분 실행 + 5분 기록 1세트만 진행하고, ${focus} 관련 체감 점수와 맞음/어긋남을 1줄로 남겨요`
  );
}

function inferVerdict(reading: SpreadDrawResult): { kind: 'yes' | 'no' | 'maybe'; label: string } {
  const v3Label = reading.readingV3?.verdict?.label;
  if (v3Label === 'yes') return { kind: 'yes', label: 'YES' };
  if (v3Label === 'hold') return { kind: 'maybe', label: 'HOLD' };
  if (v3Label === 'conditional') return { kind: 'maybe', label: 'CONDITIONAL YES' };
  const summary = reading.summary;
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
  const summary = sanitizeDialogLine(sanitizeSummaryForChat(reading.summary))
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const evidence = reading.items
    .slice(0, 6)
    .map((item, idx) => buildPositionEvidenceLine(item, idx))
    .join(' ');

  return [summary, evidence]
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function buildPositionEvidenceLine(item: SpreadDrawResult['items'][number], idx = 0) {
  const orientation = item.orientation === 'reversed' ? '역방향' : '정방향';
  const keyword = item.card.keywords?.[0] || '흐름';
  const position = item.position.name;
  const lead = `${position}의 ${item.card.nameKo} ${orientation} 카드(${keyword})`;
  if (/과거|가까운 과거/.test(position)) {
    return `${lead}는 지금 판단에 남아 있는 배경 패턴을 보여줍니다.`;
  }
  if (/현재|문제|상황/.test(position)) {
    return `${lead}는 지금 당장 조절해야 할 핵심 변수로 읽힙니다.`;
  }
  if (/미래|결과|가까운 미래/.test(position)) {
    return `${lead}는 현재 선택을 유지했을 때 이어질 가능성이 큰 전개를 보여줍니다.`;
  }
  return idx % 2 === 0
    ? `${lead}는 이번 질문의 핵심 축을 잡아주는 카드입니다.`
    : `${lead}는 실행 타이밍과 강도를 조절하라는 신호로 읽힙니다.`;
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
