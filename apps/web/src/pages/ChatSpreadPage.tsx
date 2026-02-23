import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Spread, SpreadDrawResult } from '../types';
import { TarotImage } from '../components/TarotImage';
import { UnifiedSummaryView, normalizeDisplayText, renderHighlightedText } from './spreads-presenters';

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
  '오늘 재물운, 지출 중심으로 봐줘',
  '이번 주 관계 흐름을 보고 싶어',
  '올해 커리어 타이밍을 분기별로 알려줘'
];

export function ChatSpreadPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const spreadsQuery = useQuery({ queryKey: ['spreads'], queryFn: api.getSpreads });
  const spreads = spreadsQuery.data ?? [];

  const selectedSpreadIdFromQuery = searchParams.get('spreadId') || '';
  const selectedVariantFromQuery = searchParams.get('variantId') || '';
  const levelFromQuery = searchParams.get('level') === 'intermediate' ? 'intermediate' : 'beginner';
  const contextFromQuery = searchParams.get('context') || '';

  const [selectedSpreadId, setSelectedSpreadId] = useState<string>(selectedSpreadIdFromQuery);
  const [variantId, setVariantId] = useState<string>(selectedVariantFromQuery);
  const [readingLevel, setReadingLevel] = useState<'beginner' | 'intermediate'>(levelFromQuery);
  const [input, setInput] = useState<string>(contextFromQuery);
  const [showEvidence, setShowEvidence] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const logRef = useRef<HTMLDivElement | null>(null);

  const selectedSpread = useMemo(() => {
    if (!spreads.length) return null;
    return spreads.find((item) => item.id === selectedSpreadId) ?? spreads[0] ?? null;
  }, [spreads, selectedSpreadId]);

  const activeVariant = useMemo(() => {
    if (!selectedSpread?.variants?.length) return null;
    return selectedSpread.variants.find((item) => item.id === variantId) ?? selectedSpread.variants[0] ?? null;
  }, [selectedSpread, variantId]);

  useEffect(() => {
    if (!selectedSpreadId && spreads.length > 0) {
      setSelectedSpreadId(spreads[0].id);
      setVariantId(spreads[0].variants?.[0]?.id ?? '');
    }
  }, [spreads, selectedSpreadId]);

  useEffect(() => {
    if (!selectedSpread) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('spreadId', selectedSpread.id);
      if (activeVariant?.id) next.set('variantId', activeVariant.id);
      else next.delete('variantId');
      next.set('level', readingLevel);
      if (input.trim()) next.set('context', input.trim());
      else next.delete('context');
      return next;
    });
  }, [activeVariant?.id, input, readingLevel, selectedSpread, setSearchParams]);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const drawMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!selectedSpread) throw new Error('No spread selected');
      return api.drawSpread({
        spreadId: selectedSpread.id,
        variantId: activeVariant?.id ?? null,
        level: readingLevel,
        context: question
      });
    },
    onSuccess: (payload, question) => {
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
      <article className="panel">
        <div className="chat-page-header">
          <div>
            <p className="badge">대화형 스프레드</p>
            <h2>타로 챗 리딩</h2>
            <p>질문을 입력하면 기존 스프레드 리딩을 말풍선 방식으로 보여줍니다.</p>
          </div>
          <div className="chip-wrap">
            <Link
              className="chip-link"
              to={`/spreads?spreadId=${encodeURIComponent(selectedSpread.id)}&variantId=${encodeURIComponent(activeVariant?.id || '')}&level=${readingLevel}&context=${encodeURIComponent(input)}`}
            >
              카드뷰로 보기
            </Link>
          </div>
        </div>

        <div className="filters spread-draw-controls">
          <select
            value={selectedSpread.id}
            onChange={(e) => {
              const next = spreads.find((item) => item.id === e.target.value);
              if (!next) return;
              setSelectedSpreadId(next.id);
              setVariantId(next.variants?.[0]?.id ?? '');
            }}
          >
            {spreads.map((spread) => (
              <option key={spread.id} value={spread.id}>{spread.name}</option>
            ))}
          </select>

          {selectedSpread.variants && selectedSpread.variants.length > 0 && (
            <select
              value={activeVariant?.id ?? ''}
              onChange={(e) => setVariantId(e.target.value)}
            >
              {selectedSpread.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>{variant.name}</option>
              ))}
            </select>
          )}

          <select value={readingLevel} onChange={(e) => setReadingLevel(e.target.value as 'beginner' | 'intermediate')}>
            <option value="beginner">입문 리딩</option>
            <option value="intermediate">중급 리딩</option>
          </select>
          <button className="btn" onClick={() => setShowEvidence((prev) => !prev)}>
            {showEvidence ? '근거 접기' : '근거 보기'}
          </button>
        </div>
      </article>

      <article className="panel chat-shell">
        <div className="chat-log" ref={logRef}>
          {messages.length === 0 && (
            <div className="chat-empty">
              <p>아직 대화가 없습니다. 아래 추천 질문을 눌러 시작해보세요.</p>
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
              showEvidence={showEvidence}
            />
          ))}
        </div>

        <div className="chat-composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="질문을 입력하세요 (예: 이번 주 재정 흐름 알려줘)"
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

function ChatBubble({ message, showEvidence }: { message: ChatMessage; showEvidence: boolean }) {
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
  const keywords = Array.from(new Set(reading.items.flatMap((item) => item.card.keywords || []))).filter(Boolean);
  const summaryCardTitle = reading.context?.trim()
    ? `요약 카드 · ${reading.context.trim()}`
    : `요약 카드 · ${reading.spreadName}`;

  return (
    <div className="chat-row chat-row-assistant">
      <article className="chat-bubble chat-bubble-assistant">
        <p className="chat-meta">{reading.spreadName} · {reading.level === 'beginner' ? '입문' : '중급'} 리딩</p>
        <p>{pickLeadLine(reading.summary)}</p>

        <section className="chat-summary-card">
          <h5>{summaryCardTitle}</h5>
          <UnifiedSummaryView spreadId={reading.spreadId} summary={reading.summary} keywords={keywords} />
        </section>

        {showEvidence && (
          <section className="chat-evidence-block">
            <h5>근거 보기</h5>
            <div className="chat-evidence-grid">
              {reading.items.map((item) => {
                const orientationLabel = item.orientation === 'reversed' ? '역방향' : '정방향';
                return (
                  <article key={`${item.position.name}-${item.card.id}`} className="chat-evidence-card">
                    <div className="chat-evidence-head">
                      <TarotImage
                        src={item.card.imageUrl}
                        sources={item.card.imageSources}
                        cardId={item.card.id}
                        alt={item.card.nameKo}
                        className={`chat-evidence-thumb ${item.orientation === 'reversed' ? 'card-reversed' : ''}`}
                        loading="lazy"
                      />
                      <div>
                        <p><strong>{item.position.name}</strong></p>
                        <p className="sub">{item.card.nameKo} · {orientationLabel}</p>
                        <p className="sub">키워드: {item.card.keywords.join(' · ')}</p>
                      </div>
                    </div>
                    <p className="chat-evidence-text">
                      {renderHighlightedText(normalizeDisplayText(item.interpretation), item.card.keywords || [], `chat-evidence-${item.card.id}`)}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}

function pickLeadLine(summary: string) {
  const lines = String(summary || '')
    .split(/\n\n+|\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0]?.replace(/^[^:]{1,20}:\s*/g, '') || '이번 흐름을 대화형으로 정리해드릴게요.';
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
