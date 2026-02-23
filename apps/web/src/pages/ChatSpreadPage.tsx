import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Spread, SpreadDrawResult } from '../types';
import { TarotImage } from '../components/TarotImage';
import { normalizeDisplayText } from './spreads-presenters';
import { recommendSpreadForQuestion } from '../lib/spread-recommendation';
import { buildDisplaySpreads, resolveDisplaySpreadId } from '../lib/spread-display';
import { findDrawnItemForSlot, toParagraphBlocks } from './spreads-helpers';

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
  const narrativeParagraph = buildNaturalNarrativeParagraph(reading);
  const narrativeBubbles = buildNarrativeBubbles(narrativeParagraph);
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

        <section className="chat-summary-bubbles">
          {narrativeBubbles.map((line, idx) => (
            <p key={`summary-bubble-${idx}`} className="chat-natural-paragraph chat-natural-bubble">{line}</p>
          ))}
        </section>

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
