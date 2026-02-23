import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Spread, SpreadDrawResult } from '../types';
import { TarotImage } from '../components/TarotImage';
import { recommendSpreadForQuestion } from '../lib/spread-recommendation';
import { recommendRandomQuestions } from '../lib/question-recommendations';
import { buildDisplaySpreads, resolveDisplaySpreadId } from '../lib/spread-display';
import { loadChatDrawCache, saveChatDrawCache } from '../lib/chat-draw-cache';
import { exportReadingPdf, exportReadingTxt } from '../lib/reading-export';
import { toCanonicalChecklist, toCanonicalReadingLines, toDisplayLine } from '../lib/tone-render';
import { PageHero } from '../components/PageHero';
import {
  findDrawnItemForSlot,
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
            {latestReading && (
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
          <section className="chat-column chat-column-dialog">
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

            {drawMutation.isError && <p className="sub chat-error">리딩 생성에 실패했습니다. 잠시 후 다시 시도해주세요.</p>}
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

            {!latestReading && (
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
  const modelDetail = buildDetailDialogFromReadingModel(reading);
  if (modelDetail.length > 0) {
    return (
      <section className="chat-summary-shell">
        <div className="chat-dialog-stream">
          {modelDetail.map((turn, idx) => (
            <article key={`model-detail-${idx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
              <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
              <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (reading.readingV3) {
    const detailedDialog = buildExpandedCardDialog(reading);
    return (
      <section className="chat-summary-shell">
        <div className="chat-dialog-stream">
          {detailedDialog.map((turn, idx) => (
            <article key={`v3-detail-${idx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
              <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
              <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const canonicalLines = toCanonicalReadingLines(reading, { includeCheckin: true });
  const detailedDialog = buildExpandedNarrativeDialogFromLines(reading, canonicalLines, '상세 대화');
  return (
    <section className="chat-summary-shell">
      <div className="chat-dialog-stream">
        {detailedDialog.map((turn, idx) => (
          <article key={`fallback-detail-${idx}`} className={`chat-dialog-turn chat-dialog-${turn.speaker}`}>
            <h6 className="chat-dialog-speaker">{turn.speaker === 'tarot' ? '타로리더' : '학습리더'}</h6>
            <p className="chat-natural-paragraph chat-dialog-bubble">{turn.text}</p>
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
  return rebalanceDialogueMix(
    dedupeTurns(
      turns
        .map((turn) => buildTurn(turn.speaker, turn.purpose, turn.text))
        .filter((turn) => Boolean(turn.text))
    )
  );
}

function buildExpandedCardDialog(reading: SpreadDrawResult) {
  const items = reading.items.slice(0, 6);
  if (!items.length) return [];

  const turns: DialogueTurn[] = [];
  turns.push(buildTurn('tarot', 'detail', `질문("${reading.context || '현재 질문'}") 기준으로 카드 흐름을 순서대로 볼게요`));

  items.forEach((item, idx) => {
    const orientation = item.orientation === 'reversed' ? '역방향' : '정방향';
    const keyword = item.card.keywords?.[0] || '핵심 신호';
    const lead = `${item.position.name}에서는 ${item.card.nameKo} ${orientation} 카드가 나왔고 키워드는 "${keyword}"이에요`;
    const core = compactLine(item.coreMessage || '');
    const interpretation = compactLine(item.interpretation || '');
    const next = items[idx + 1];

    turns.push(buildTurn('tarot', 'detail', lead));
    if (core) {
      const coreTemplates = [
        `핵심만 말하면 ${core}`,
        `이 카드의 중심 뜻은 ${core}`,
        `지금 제일 중요한 건 ${core}`
      ];
      turns.push(buildTurn('tarot', 'detail', coreTemplates[idx % coreTemplates.length]));
    }
    if (interpretation) {
      const interpretationTemplates = [
        `쉽게 말하면 ${interpretation}`,
        `일상말로 풀면 ${interpretation}`,
        `짧게 정리하면 ${interpretation}`
      ];
      turns.push(buildTurn('tarot', 'detail', interpretationTemplates[idx % interpretationTemplates.length]));
    }
    if (next) {
      turns.push(buildTurn('tarot', 'detail', `${item.position.name} 다음은 ${next.position.name} 흐름이에요. 여기서 결정 세기가 갈려요`));
    }

    const learningHint = maybeBuildLearningHint(`${core} ${interpretation}`, item.position.name, idx, 0);
    if (learningHint) turns.push(learningHint);
  });

  const closing = reading.readingV3
    ? reading.readingV3.closing
    : '한번 모아보면 이번 주는 세기를 낮추고 반응을 확인하는 게 가장 안전해요';
  turns.push(buildTurn('tarot', 'detail', closing));

  return rebalanceDialogueMix(dedupeTurns(turns));
}

function buildExpandedNarrativeDialogFromLines(reading: SpreadDrawResult, lines: string[], sectionTitle = '상세 리딩') {
  const cards = reading.items.slice(0, 6);
  if (!cards.length) return buildDialogFromLines(lines, sectionTitle);
  const turns: DialogueTurn[] = [];
  const normalizedLines = lines.map((line) => compactLine(line)).filter(Boolean);

  normalizedLines.forEach((line, idx) => {
    const card = cards[idx % cards.length];
    const orientation = card.orientation === 'reversed' ? '역방향' : '정방향';
    const keyword = card.card.keywords?.[0] || '핵심 신호';
    const sectionTemplates = [
      `${sectionTitle}에서는 ${card.position.name}의 ${card.card.nameKo} ${orientation} 카드(${keyword})를 기준으로 보면 ${line}`,
      `${sectionTitle} 흐름을 ${card.position.name} 카드로 풀면 ${line}`,
      `${sectionTitle} 장면을 ${card.card.nameKo} 중심으로 보면 ${line}`
    ];
    turns.push(buildTurn('tarot', 'detail', sectionTemplates[idx % sectionTemplates.length]));
    if (idx < normalizedLines.length - 1) {
      const nextCard = cards[(idx + 1) % cards.length];
      turns.push(buildTurn('tarot', 'detail', `다음은 ${nextCard.position.name} 흐름으로 넘어가요. 속도와 세기를 같이 맞춰보면 좋아요`));
    }
    const learning = maybeBuildLearningHint(line, sectionTitle, idx, 0);
    if (learning) turns.push(learning);
  });

  return rebalanceDialogueMix(dedupeTurns(turns));
}

function compactLine(text: string) {
  const blocks = toParagraphBlocks(text);
  return blocks.join(' ');
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
    return buildTurn('learning', 'coach', `${noun}는 오늘 15분 확인하고, 맞았는지 달랐는지 1줄만 적어봐요`);
  }
  if (isActionBlock) {
    return buildTurn('learning', 'coach', `${noun}는 25분 하고 5분 정리해요. 끝나면 완료율 숫자 1개만 남겨요`);
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
  return compactTarotTurn(line, purpose);
}

function compactTarotTurn(text: string, purpose: DialoguePurpose) {
  return toDisplayLine(String(text || ''), purpose === 'detail' ? 'detail' : 'quick');
}

function normalizeDialogKey(text: string) {
  return sanitizeDialogLine(text)
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/[.,!?]/g, '')
    .trim();
}

function inferVerdict(reading: SpreadDrawResult): { kind: 'yes' | 'no' | 'maybe'; label: string } {
  const modelLabel = reading.readingModel?.verdict?.label;
  if (modelLabel === 'yes') return { kind: 'yes', label: 'YES' };
  if (modelLabel === 'hold') return { kind: 'maybe', label: 'HOLD' };
  if (modelLabel === 'conditional') return { kind: 'maybe', label: 'CONDITIONAL YES' };
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

function buildFollowupQuestions({
  reading,
  spread
}: {
  reading: SpreadDrawResult | null;
  spread: Spread | null;
}) {
  if (!reading || !spread) {
    return recommendRandomQuestions({
      count: 3,
      poolSize: 3000,
      spreadName: spread?.name || '',
      context: reading?.context || '',
      seedKey: 'chat-followup-empty'
    });
  }

  const keyword = reading.items.flatMap((item) => item.card.keywords || []).find(Boolean) || '흐름';
  const orientationBias = reading.items.filter((item) => item.orientation === 'upright').length >= Math.ceil(reading.items.length / 2)
    ? '정방향 우세'
    : '역방향 주의';

  const contextual = [
    `${keyword} 기준으로 오늘 행동 1개만 더 구체화해줘`,
    `${orientationBias}일 때 피해야 할 실수 2가지만 알려줘`,
    `${spread.name} 결과를 내 일정표에 넣는 방법을 말해줘`
  ];
  const randoms = recommendRandomQuestions({
    count: 4,
    poolSize: 3000,
    spreadName: spread.name,
    context: reading.context,
    seedKey: `${spread.id}:${reading.drawnAt}`
  });
  return [...contextual, ...randoms].slice(0, 6);
}
