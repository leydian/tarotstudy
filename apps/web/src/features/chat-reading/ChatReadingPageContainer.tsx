import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import type { Spread, SpreadDrawResult } from '../../types';
import { TarotImage } from '../../components/TarotImage';
import { recommendSpreadForQuestion } from '../../lib/spread-recommendation';
import { recommendRandomQuestions } from '../../lib/question-recommendations';
import { buildDisplaySpreads, resolveDisplaySpreadId } from '../../lib/spread-display';
import { loadChatDrawCache, saveChatDrawCache } from '../../lib/chat-draw-cache';
import { exportReadingPdf, exportReadingTxt } from '../../lib/reading-export';
import { toCanonicalChecklist, toCanonicalReadingLines, toDisplayLine } from '../../lib/tone-render';
import { PageHero } from '../../components/PageHero';
import { shouldShowExportActions, shouldShowPromptBank } from '../shared/reading-visibility';
import {
  findDrawnItemForSlot,
  toParagraphBlocks
} from '../../pages/spreads-helpers';

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

export function ChatReadingPageContainer() {
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
  const starterPrompts = useMemo(
    () => recommendRandomQuestions({
      count: 6,
      poolSize: 3000,
      spreadName: selectedSpread?.name || '',
      context: latestReading?.context || '',
      seedKey: selectedSpread?.id || 'chat-starter'
    }),
    [latestReading?.drawnAt, latestReading?.context, selectedSpread?.id, selectedSpread?.name]
  );
  const sidebarStarterPrompts = useMemo(() => {
    const picked: string[] = [];
    const used = new Set(starterPrompts);

    for (let i = 0; i < 5 && picked.length < 6; i += 1) {
      const batch = recommendRandomQuestions({
        count: 12,
        poolSize: 3000,
        spreadName: selectedSpread?.name || '',
        context: latestReading?.context || '',
        seedKey: `${selectedSpread?.id || 'chat-starter'}:side:${i}`
      });
      for (const item of batch) {
        if (used.has(item)) continue;
        if (picked.includes(item)) continue;
        picked.push(item);
        if (picked.length >= 6) break;
      }
    }

    return picked;
  }, [starterPrompts, latestReading?.context, selectedSpread?.id, selectedSpread?.name]);
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
    <section className="page-shell">
      <PageHero
        eyebrow="대화형 스프레드"
        title="타로 챗 리딩"
        description="질문을 분석해 스프레드를 자동 추천하고 바로 리딩합니다."
        actions={(
          <>
            <Link className="btn" to={cardViewHref}>카드뷰로 보기</Link>
            {shouldShowExportActions(Boolean(latestReading)) && latestReading && (
              <>
                <button className="btn" onClick={() => exportReadingTxt(latestReading, '챗봇 모드')}>TXT 내보내기</button>
                <button className="btn" onClick={() => exportReadingPdf(latestReading, '챗봇 모드')}>PDF 내보내기</button>
              </>
            )}
          </>
        )}
      />

      <article className="panel chat-top-panel">
        {recommendedHint && <p className="sub">최근 추천: {recommendedHint}</p>}
        <div className="filters spread-draw-controls">
          <select value={readingLevel} onChange={(e) => setReadingLevel(e.target.value as 'beginner' | 'intermediate')}>
            <option value="beginner">입문 리딩</option>
            <option value="intermediate">중급 리딩</option>
          </select>
          <span className="badge">자동 추천 스프레드: {selectedSpread.name}</span>
        </div>
      </article>

      <article className="panel chat-shell chat-shell-dark">
        <div className="chat-workbench">
          <section className="chat-column chat-column-dialog" aria-live="polite">
            <div className="chat-log" ref={logRef}>
              {messages.length === 0 && (
                <div className="chat-empty">
                  <p>아직 대화가 없습니다. 질문을 입력해 리딩을 시작해보세요.</p>
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
                disabled={drawMutation.isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!input.trim() || drawMutation.isPending) return;
                    drawMutation.mutate(input.trim());
                  }
                }}
                aria-label="질문 입력창"
              />
              <button
                className="btn primary"
                disabled={!input.trim() || drawMutation.isPending}
                onClick={() => drawMutation.mutate(input.trim())}
                aria-label="질문 보내기"
              >
                {drawMutation.isPending ? '리딩 생성 중...' : '보내기'}
              </button>
            </div>

            {drawMutation.isError && <p className="sub chat-error" role="alert">리딩 생성에 실패했습니다. 잠시 후 다시 시도해주세요.</p>}
          </section>

          <aside className="chat-column chat-column-sidebar">
            <article className="chat-side-card">
              <p className="eyebrow">현재 컨텍스트</p>
              <h4>현재 컨텍스트</h4>
              <p className="chat-side-main">
                {latestReading?.context?.trim() || input.trim() || '질문을 입력하면 분석 컨텍스트가 여기에 표시됩니다.'}
              </p>
              <p className="sub">자동 추천 스프레드: {selectedSpread.name}</p>
              {recommendedHint && <p className="sub">추천 근거: {recommendedHint}</p>}
            </article>

            {latestReading && (
              <article className="chat-side-card">
                <p className="eyebrow">실행 체크리스트</p>
                <h4>실행 체크리스트</h4>
                <ul className="clean-list">
                  {toCanonicalChecklist(latestReading).filter(Boolean).slice(0, 3).map((line, idx) => (
                    <li key={`side-check-${idx}`}>{line}</li>
                  ))}
                </ul>
              </article>
            )}

            {shouldShowPromptBank(Boolean(latestReading)) && (
              <>
                <article className="chat-side-card">
                  <p className="eyebrow">추천 질문</p>
                  <h4>바로 시작 질문</h4>
                  <div className="chip-wrap">
                    {sidebarStarterPrompts.map((prompt) => (
                      <button key={`side-${prompt}`} className="chip-link" onClick={() => setInput(prompt)}>{prompt}</button>
                    ))}
                  </div>
                </article>
                <article className="chat-side-card">
                  <p className="eyebrow">추가 추천 질문</p>
                  <h4>추가 추천 질문</h4>
                  <div className="chip-wrap">
                    {suggestionQuestions.map((question) => (
                      <button key={`follow-${question}`} className="chip-link" onClick={() => setInput(question)}>{question}</button>
                    ))}
                  </div>
                </article>
              </>
            )}
          </aside>
        </div>
      </article>
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
  const verdict = inferVerdict(reading);
  const keyQuestion = reading.context?.trim() || '질문';
  const mainItem = reading.items[0];

  return (
    <div className="chat-row chat-row-assistant">
      <div className="chat-reading-flow">
        {mainItem && (
          <div className="chat-spotlight-card">
            <TarotImage
              src={mainItem.card.imageUrl}
              sources={mainItem.card.imageSources}
              cardId={mainItem.card.id}
              alt={mainItem.card.nameKo}
              className={`chat-spotlight-thumb ${mainItem.orientation === 'reversed' ? 'card-reversed' : ''}`}
            />
            <span className="chat-spotlight-name">
              {mainItem.card.nameKo} ({mainItem.orientation === 'reversed' ? '역방향' : '정방향'})
            </span>
          </div>
        )}

        <div className="verdict-banner">
          <span className={`verdict-pill verdict-${verdict.kind}`}>
            {verdict.label}
          </span>
        </div>

        <ChatSummaryView reading={reading} />

        <div className="chat-reading-actions">
          <button
            className="btn redraw-btn"
            disabled={isPending}
            onClick={() => onRedraw(keyQuestion)}
            aria-label="이 질문으로 카드 다시 뽑기"
          >
            ↺ 이 질문으로 다시 뽑기
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatSummaryView({ reading }: { reading: SpreadDrawResult }) {
  const modelDetail = buildDetailDialogFromReadingModel(reading);
  const turns = modelDetail.length > 0 
    ? modelDetail 
    : reading.readingV3 
      ? buildExpandedCardDialog(reading) 
      : buildExpandedNarrativeDialogFromLines(reading, toCanonicalReadingLines(reading, { includeCheckin: true }), '상세 대화');

  return (
    <section className="chat-summary-shell">
      <div className="chat-dialog-stream">
        {turns.map((turn, idx) => (
          <article key={`turn-${idx}`} className={`chat-row chat-dialog-${turn.speaker}`}>
            <p className={`chat-speaker-label ${turn.speaker === 'learning' ? 'chat-speaker-learning' : ''}`}>
              {turn.speaker === 'tarot' ? '✦ 타로리더' : '🛡️ 학습리더'}
            </p>
            <div className="chat-bubble chat-bubble-assistant">
              <p className="chat-natural-paragraph">{turn.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildDetailDialogFromReadingModel(reading: SpreadDrawResult) {
  const turns = Array.isArray(reading.readingModel?.channel?.chatDetail?.turns)
    ? reading.readingModel.channel.chatDetail.turns
    : [];
  return turns.filter((t) => Boolean(t.text));
}

function buildExpandedCardDialog(reading: SpreadDrawResult) {
  const items = reading.items.slice(0, 6);
  if (!items.length) return [];
  const turns: DialogueTurn[] = [];
  items.forEach((item) => {
    const orientation = item.orientation === 'reversed' ? '역방향' : '정방향';
    turns.push({
      speaker: 'tarot',
      purpose: 'detail',
      text: `${item.position.name} 자리에서 ${item.card.nameKo} ${orientation} 카드가 나왔어요.`,
      dedupeKey: `card-${item.position.name}`
    });
    if (item.coreMessage) {
      turns.push({ speaker: 'tarot', purpose: 'detail', text: item.coreMessage, dedupeKey: `msg-${item.position.name}` });
    }
  });
  return turns;
}

function buildExpandedNarrativeDialogFromLines(reading: SpreadDrawResult, lines: string[], title: string) {
  return lines.map((line, idx) => ({
    speaker: 'tarot' as DialogueSpeaker,
    purpose: 'detail' as DialoguePurpose,
    text: line,
    dedupeKey: `fallback-${idx}`
  }));
}

function inferVerdict(reading: SpreadDrawResult): { kind: 'yes' | 'no' | 'maybe'; label: string } {
  const label = reading.readingModel?.verdict?.label || reading.readingV3?.verdict?.label || 'maybe';
  if (label === 'yes') return { kind: 'yes', label: 'YES' };
  if (label === 'hold') return { kind: 'maybe', label: 'HOLD' };
  return { kind: 'maybe', label: 'CONDITIONAL YES' };
}

function buildFollowupQuestions({ reading, spread }: { reading: SpreadDrawResult | null; spread: Spread | null; }) {
  if (!reading || !spread) return [];
  return [
    `이 카드가 암시하는 주의사항은?`,
    `합격 확률을 높이는 구체적 팁은?`,
    `이 결과를 어떻게 실천할까?`
  ];
}
