import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { TarotImage } from '../components/TarotImage';
import { getProgressUserId, useProgressStore } from '../state/progress';
import type { SpreadDrawResult } from '../types';
import {
  buildChoiceComparison,
  buildLearningDigest,
  buildReadingInsights,
  cleanCoachPrefix,
  mergeReviewNoteAndChecklist,
  mergeTarotMessage,
  parseMonthlySummary,
  parseChecklistFromNote,
  parseWeeklySummary,
  parseYearlySummary,
  scoreItemRisk,
  splitDigestLine,
  stripChecklistTags,
  toCoachBlocks,
  toParagraphBlocks
} from './spreads-helpers';
import type { ReviewChecklist } from './spreads-helpers';

type SpreadVisualPreset = {
  scale: 'md' | 'lg' | 'xl';
  rowHeight: number;
  minColWidth: number;
};

type CoachSummarySections = {
  core: string[];
  action: string[];
  caution: string[];
  question: string[];
};

type CoachSummaryContext = {
  positionName: string;
  cardName: string;
  orientation: 'upright' | 'reversed';
  keywords: string[];
  questionContext: string;
  tarotNarrative: string;
};

const SPREAD_VISUAL_PRESETS: Record<string, SpreadVisualPreset> = {
  'one-card': { scale: 'xl', rowHeight: 246, minColWidth: 196 },
  'three-card': { scale: 'xl', rowHeight: 222, minColWidth: 162 },
  'daily-fortune': { scale: 'xl', rowHeight: 220, minColWidth: 160 },
  'choice-a-b': { scale: 'xl', rowHeight: 212, minColWidth: 154 },
  'monthly-fortune': { scale: 'lg', rowHeight: 198, minColWidth: 144 },
  'relationship-recovery': { scale: 'lg', rowHeight: 198, minColWidth: 144 },
  'weekly-fortune': { scale: 'md', rowHeight: 184, minColWidth: 130 },
  'yearly-fortune': { scale: 'md', rowHeight: 178, minColWidth: 124 },
  'celtic-cross': { scale: 'md', rowHeight: 184, minColWidth: 128 }
};

export function SpreadsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [detailView, setDetailView] = useState<'reading' | 'guide'>('reading');
  const [readingLevel, setReadingLevel] = useState<'beginner' | 'intermediate'>('beginner');
  const [reviewDraft, setReviewDraft] = useState<Record<string, string>>({});
  const [reviewChecklistDraft, setReviewChecklistDraft] = useState<Record<string, ReviewChecklist>>({});
  const [historyTag, setHistoryTag] = useState<'all' | 'relationship' | 'career' | 'finance' | 'general'>('all');
  const [historyOutcome, setHistoryOutcome] = useState<'all' | 'matched' | 'partial' | 'different' | 'unreviewed'>('all');
  const [historyQuery, setHistoryQuery] = useState('');
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const spreadsQuery = useQuery({ queryKey: ['spreads'], queryFn: api.getSpreads });
  const userId = getProgressUserId();
  const spreadHistory = useProgressStore((s) => s.spreadHistory);
  const addSpreadReading = useProgressStore((s) => s.addSpreadReading);
  const reviewSpreadReading = useProgressStore((s) => s.reviewSpreadReading);
  const removeSpreadReading = useProgressStore((s) => s.removeSpreadReading);
  const removeSpreadReadingsBySpreadId = useProgressStore((s) => s.removeSpreadReadingsBySpreadId);
  const spreads = spreadsQuery.data ?? [];
  const selected = spreads.find((spread) => spread.id === selectedId) ?? spreads[0] ?? null;
  const reviewInboxQuery = useQuery({
    queryKey: ['review-inbox', userId, selected?.id || 'all'],
    queryFn: () => api.getReviewInbox(userId, { spreadId: selected?.id, limit: 10 }),
    enabled: Boolean(userId)
  });

  const activeVariant = useMemo(() => {
    if (!selected?.variants?.length) return null;
    return selected.variants.find((v) => v.id === variantId) ?? selected.variants[0];
  }, [selected, variantId]);

  const positions = activeVariant?.positions ?? selected?.positions ?? [];
  const drawMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('No spread selected');
      return (
      api.drawSpread({
        spreadId: selected.id,
        variantId: activeVariant?.id ?? null,
        level: readingLevel,
        context
      })
      );
    },
    onSuccess: (data) => {
      setDetailView('reading');
      addSpreadReading({
        id: `${data.spreadId}:${data.drawnAt}`,
        spreadId: data.spreadId,
        spreadName: data.spreadName,
        variantId: data.variantId,
        variantName: data.variantName,
        context: data.context,
        level: data.level,
        readingExperiment: data.readingExperiment,
        drawnAt: data.drawnAt,
        summary: data.summary,
        items: data.items
      });
      sendSpreadEvent({
        type: 'spread_drawn',
        spreadId: data.spreadId,
        level: data.level,
        context: data.context
      });
      void api.reportEventsBatch([{
        type: 'spread_drawn',
        path: '/spreads',
        userId,
        spreadId: data.spreadId,
        level: data.level,
        context: data.context
      }]).catch(() => {});
    }
  });

  const drawItems = drawMutation.data?.items ?? [];
  const emphasisKeywords = useMemo(
    () => Array.from(new Set(drawItems.flatMap((item) => item.card.keywords || []).filter(Boolean))),
    [drawItems]
  );
  const cardByPosition = new Map(drawItems.map((item) => [item.position.name, item]));
  const spreadVisualPreset =
    (selected ? SPREAD_VISUAL_PRESETS[selected.id] : null) ??
    ((selected?.cardCount ?? 1) <= 5
      ? { scale: 'xl', rowHeight: 210, minColWidth: 150 }
      : (selected?.cardCount ?? 1) <= 8
        ? { scale: 'lg', rowHeight: 194, minColWidth: 140 }
        : { scale: 'md', rowHeight: 180, minColWidth: 126 });
  const choiceComparison = useMemo(() => {
    if (!drawMutation.data || selected?.id !== 'choice-a-b') return null;
    return buildChoiceComparison(drawMutation.data);
  }, [drawMutation.data, selected?.id]);
  const recentSpreadHistory = useMemo(
    () => spreadHistory.filter((item) => item.spreadId === selected?.id).slice(0, 8),
    [spreadHistory, selected?.id]
  );
  const filteredSpreadHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    return recentSpreadHistory.filter((record) => {
      const context = String(record.context || '').toLowerCase();
      const summary = String(record.summary || '').toLowerCase();
      const inferredTag = /재회|관계|연애|대화|갈등/.test(context) || /재회|관계|연애|대화|갈등/.test(summary)
        ? 'relationship'
        : /이직|업무|커리어|학업|시험|면접|직장/.test(context) || /이직|업무|커리어|학업|시험|면접|직장/.test(summary)
          ? 'career'
          : /지출|수입|돈|재정|저축|투자/.test(context) || /지출|수입|돈|재정|저축|투자/.test(summary)
            ? 'finance'
            : 'general';

      if (historyTag !== 'all' && inferredTag !== historyTag) return false;
      if (historyOutcome === 'unreviewed' && record.outcome) return false;
      if (historyOutcome !== 'all' && historyOutcome !== 'unreviewed' && record.outcome !== historyOutcome) return false;
      if (!q) return true;
      return `${context} ${summary}`.includes(q);
    });
  }, [historyOutcome, historyQuery, historyTag, recentSpreadHistory]);
  const historyCounts = useMemo(() => {
    const reviewed = recentSpreadHistory.filter((item) => item.outcome).length;
    const unreviewed = recentSpreadHistory.length - reviewed;
    return { reviewed, unreviewed };
  }, [recentSpreadHistory]);
  const sendSpreadEvent = (payload: {
    type: 'spread_drawn' | 'spread_review_saved';
    spreadId: string;
    level: 'beginner' | 'intermediate';
    context?: string;
  }) => {
    void api.reportSpreadEvent(payload).catch(() => {});
  };

  useEffect(() => {
    void api.reportEventsBatch([{ type: 'spreads_viewed', path: '/spreads', userId }]).catch(() => {});
  }, [userId]);

  if (spreadsQuery.isLoading) return <p>대표 스프레드를 불러오는 중...</p>;
  if (spreadsQuery.isError || !selected) return <p>스프레드 데이터를 불러오지 못했습니다.</p>;

  return (
    <section className="stack">
      <article className="panel">
        <h2>대표 스프레드 학습</h2>
        <p>양자택일, 관계 회복, 일/주/월/년 운세, 켈틱 크로스까지 목적별로 선택해 학습하세요.</p>
        <div className="chip-wrap">
          {spreads.map((spread) => (
            <button
              key={spread.id}
              className={`chip-link ${selected.id === spread.id ? 'chip-on' : ''}`}
              onClick={() => {
                setSelectedId(spread.id);
                setVariantId(null);
                setDetailView('reading');
                setReadingLevel(spread.level);
                drawMutation.reset();
              }}
            >
              {spread.name}
            </button>
          ))}
        </div>
      </article>

      <article className="panel">
        <p className="badge">{selected.level === 'beginner' ? '입문 권장' : '중급 권장'} · {selected.cardCount}장</p>
        <h3>{selected.name}</h3>
        <p>{selected.purpose}</p>

        {selected.variants && selected.variants.length > 0 && (
          <>
            <h4>핵심 변형</h4>
            <div className="chip-wrap">
              {selected.variants.map((variant) => (
                <button
                  key={variant.id}
                  className={`chip-link ${activeVariant?.id === variant.id ? 'chip-on' : ''}`}
                  onClick={() => {
                    setVariantId(variant.id);
                    setDetailView('reading');
                    drawMutation.reset();
                  }}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          </>
        )}

        <h4>실전 드로우</h4>
        <div className="filters spread-draw-controls">
          <select value={readingLevel} onChange={(e) => setReadingLevel(e.target.value as 'beginner' | 'intermediate')}>
            <option value="beginner">입문 리딩</option>
            <option value="intermediate">중급 리딩</option>
          </select>
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="질문 맥락(예: 이직 시점, 관계 회복)"
          />
          <button className="btn primary" onClick={() => drawMutation.mutate()} disabled={drawMutation.isPending}>
            {drawMutation.isPending ? '카드 뽑는 중...' : '카드 뽑고 리딩 생성'}
          </button>
        </div>

        <h4>스프레드 모양</h4>
        <div
          className={`spread-layout spread-layout-${spreadVisualPreset.scale}`}
          style={{
            gridTemplateColumns: `repeat(${selected.layout.cols}, minmax(${spreadVisualPreset.minColWidth}px, 1fr))`,
            gridTemplateRows: `repeat(${selected.layout.rows}, ${spreadVisualPreset.rowHeight}px)`
          }}
        >
          {selected.layout.slots.map((slot, idx) => (
            (() => {
              const byName = cardByPosition.get(slot.position);
              const index = Number(slot.position) - 1;
              const byIndex = Number.isNaN(index) ? null : drawItems[index];
              const drawn = byName ?? byIndex ?? null;

              return (
                <div
                  key={`${slot.position}-${idx}`}
                  className={`spread-card ${drawn ? 'spread-card-drawn' : ''}`}
                  style={{
                    gridColumn: String(slot.col),
                    gridRow: String(slot.row),
                    transform: slot.rotate ? `rotate(${slot.rotate}deg)` : 'none'
                  }}
                  title={slot.position}
                >
                  <span className="spread-slot-index">{idx + 1}</span>
                  {drawn ? (
                    <Link to={`/cards/${drawn.card.id}`} className="spread-slot-link spread-slot-link-drawn" title={`${drawn.card.nameKo} 상세 보기`}>
                      <TarotImage
                        src={drawn.card.imageUrl}
                        sources={drawn.card.imageSources}
                        cardId={drawn.card.id}
                        alt={drawn.card.nameKo}
                        className={`spread-slot-thumb ${drawn.orientation === 'reversed' ? 'card-reversed' : ''}`}
                        loading="lazy"
                      />
                      <span className="spread-slot-meta">
                        <span className="spread-slot-position">{slot.position}</span>
                        <strong className="spread-slot-name">{drawn.card.nameKo}</strong>
                        <span className="spread-slot-orientation">{drawn.orientation === 'reversed' ? '역방향' : '정방향'}</span>
                      </span>
                    </Link>
                  ) : (
                    <span className="spread-slot-position spread-slot-position-empty">{slot.position}</span>
                  )}
                </div>
              );
            })()
          ))}
        </div>

        {drawMutation.isError && <p>드로우 생성에 실패했습니다. 잠시 후 다시 시도해주세요.</p>}

        <div className="chip-wrap view-toggle">
          <button
            className={`chip-link ${detailView === 'reading' ? 'chip-on' : ''}`}
            onClick={() => setDetailView('reading')}
          >
            스프레드 리딩 결과
          </button>
          <button
            className={`chip-link ${detailView === 'guide' ? 'chip-on' : ''}`}
            onClick={() => setDetailView('guide')}
          >
            스프레드 가이드/복기
          </button>
        </div>

        {detailView === 'reading' && !drawMutation.data && (
          <p className="sub">카드를 뽑으면 이 영역에 리딩 결과가 표시됩니다.</p>
        )}

        {detailView === 'reading' && drawMutation.data && (
          <>
            <h4>리딩 메시지</h4>
            <div className="reading-dual-panel">
              <article className="result-item reading-summary">
                <h5 className="reading-block-title">타로 리더 종합 리딩</h5>
                <UnifiedSummaryView
                  spreadId={selected.id}
                  summary={drawMutation.data.summary}
                  keywords={emphasisKeywords}
                />
              </article>
              <article className="result-item reading-coach">
                <h5 className="reading-block-title">종합 학습 내역</h5>
                <NaturalFlowView
                  blocks={buildLearningDigest(drawMutation.data.items).map((line) => {
                    const digest = splitDigestLine(line);
                    return digest.body || line;
                  })}
                  keywords={emphasisKeywords}
                  keyBase="learning-digest"
                  compact
                />
              </article>
            </div>

            {(() => {
              const insights = buildReadingInsights({
                spreadId: selected.id,
                context: drawMutation.data.context,
                items: drawMutation.data.items
              });
              return (
                <article className="result-item reading-insights">
                  <div className="verdict-row">
                    <span className={`verdict-badge verdict-${insights.verdict}`}>
                      {insights.verdictLabel}
                    </span>
                    <p className="sub">
                      {renderHighlightedText(normalizeDisplayText(insights.verdictReason), emphasisKeywords, 'verdict-reason')}
                    </p>
                  </div>
                  {insights.conflictWarning && (
                    <p className="conflict-warning">
                      {renderHighlightedText(normalizeDisplayText(insights.conflictWarning), emphasisKeywords, 'conflict-warning')}
                    </p>
                  )}
                  <div className="action-cards">
                    {insights.actions.map((action, idx) => (
                      <article key={`action-${idx}`} className="action-card">
                        <h5>{action.title}</h5>
                        <p>{renderHighlightedText(normalizeDisplayText(action.body), emphasisKeywords, `action-body-${idx}`)}</p>
                      </article>
                    ))}
                  </div>
                </article>
              );
            })()}

            {selected.id === 'three-card' && drawMutation.data.items.length === 3 && (
              <article className="result-item timeline-wrap">
                <h5>상황-행동-결과 타임라인</h5>
                <div className="timeline-grid">
                  {drawMutation.data.items.map((item, idx) => (
                    <div key={`timeline-${item.position.name}-${idx}`} className="timeline-step">
                      <p className="sub">{item.position.name}</p>
                      <p><strong>{item.card.nameKo}</strong> · {item.orientation === 'reversed' ? '역방향' : '정방향'}</p>
                      <p className="sub">핵심: {item.card.keywords[0] || '흐름'}</p>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {choiceComparison && (
              <div className="comparison-grid">
                <article className="comparison-card">
                  <h5>현재 상황</h5>
                  <p>{choiceComparison.current?.card.nameKo ?? '-'}</p>
                  <p className="sub">{choiceComparison.current?.orientation === 'reversed' ? '역방향' : '정방향'}</p>
                </article>
                <article className="comparison-card">
                  <h5>A 시나리오</h5>
                  <p>가까운 미래: {choiceComparison.aNear?.card.nameKo ?? '-'}</p>
                  <p>결과: {choiceComparison.aResult?.card.nameKo ?? '-'}</p>
                </article>
                <article className="comparison-card">
                  <h5>B 시나리오</h5>
                  <p>가까운 미래: {choiceComparison.bNear?.card.nameKo ?? '-'}</p>
                  <p>결과: {choiceComparison.bResult?.card.nameKo ?? '-'}</p>
                </article>
                <article className="comparison-card comparison-conclusion">
                  <h5>비교 결론</h5>
                  <p>{choiceComparison.recommendation}</p>
                  <p className="sub">신뢰도: {choiceComparison.confidenceLabel}</p>
                </article>
              </div>
            )}

            <div className="stack">
              {drawMutation.data.items.map((item) => (
                <article key={`${item.position.name}-${item.card.id}`} className="result-item spread-reading-item">
                  <div className="tarot-row">
                    <TarotImage
                      src={item.card.imageUrl}
                      sources={item.card.imageSources}
                      cardId={item.card.id}
                      alt={item.card.nameKo}
                      className={`tarot-thumb ${item.orientation === 'reversed' ? 'card-reversed' : ''}`}
                      loading="lazy"
                    />
                  <div>
                    <p className="badge">{item.orientation === 'upright' ? '정방향' : '역방향'}</p>
                      <p><strong>{item.position.name}</strong></p>
                      <p className="sub">{item.position.meaning}</p>
                      <p>{item.card.nameKo} ({item.card.name})</p>
                      <p>키워드: {item.card.keywords.join(' · ')}</p>
                      <div className="evidence-chips">
                        <span className="evidence-chip">근거키워드: {item.card.keywords[0] || '흐름'}</span>
                        <span className="evidence-chip">리스크: {scoreItemRisk(item) >= 2 ? '주의' : '보통'}</span>
                        <span className="evidence-chip">톤: {item.orientation === 'reversed' ? '조정' : '진행'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="reading-columns">
                    <div className="reader-block">
                      <h5 className="reading-block-title">타로 리더 리딩</h5>
                      <NaturalFlowView
                        blocks={toParagraphBlocks(mergeTarotMessage(item.coreMessage, item.interpretation))}
                        keywords={item.card.keywords || []}
                        keyBase={`tarot-${item.position.name}`}
                        compact
                      />
                    </div>
                    <div className="learning-point">
                      <h5 className="reading-block-title">학습 코치 요약</h5>
                      <CoachSummaryView
                        lines={toCoachBlocks(item.learningPoint || '카드 키워드 1개와 행동 1개를 짝지어 복기하세요.')}
                        context={{
                          positionName: item.position.name,
                          cardName: item.card.nameKo,
                          orientation: item.orientation,
                          keywords: item.card.keywords || [],
                          questionContext: drawMutation.data.context || '',
                          tarotNarrative: mergeTarotMessage(item.coreMessage, item.interpretation)
                        }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {detailView === 'guide' && (
          <>
            <h4>언제 쓰면 좋은가</h4>
            <ul className="clean-list compact-list">
              {selected.whenToUse.map((item) => <li key={item}>{item}</li>)}
            </ul>

            <h4>포지션 의미</h4>
            <div className="position-grid">
              {positions.map((pos) => (
                <article key={pos.name} className="position-card">
                  <p><strong>{pos.name}</strong></p>
                  <p>{pos.meaning}</p>
                </article>
              ))}
            </div>

            <h4>학습 루틴</h4>
            <ol className="clean-list compact-list">
              {selected.studyGuide.map((item) => <li key={item}>{item}</li>)}
            </ol>

            <div className="history-header">
              <h4>리딩 복기 기록</h4>
              <button
                className="btn danger"
                disabled={recentSpreadHistory.length === 0}
                onClick={() => {
                  setReviewDraft((prev) => {
                    const next = { ...prev };
                    for (const record of recentSpreadHistory) delete next[record.id];
                    return next;
                  });
                  removeSpreadReadingsBySpreadId(selected.id);
                }}
              >
                이 스프레드 기록 전체 삭제
              </button>
            </div>
            <article className="result-item">
              <p><strong>서버 복기 인박스</strong></p>
              {reviewInboxQuery.isLoading && <p className="sub">미복기 기록 동기화 중...</p>}
              {!reviewInboxQuery.isLoading && (reviewInboxQuery.data?.items || []).length === 0 && (
                <p className="sub">미복기 인박스가 비어 있습니다.</p>
              )}
              <ul className="clean-list reading-lines reading-lines-compact">
                {(reviewInboxQuery.data?.items || []).slice(0, 3).map((item) => (
                  <li key={`review-inbox-${item.id}`}>
                    <strong>{item.variantName || item.spreadName}</strong> · {new Date(item.drawnAt).toLocaleString()}
                    <p className="sub">{item.summaryPreview}</p>
                  </li>
                ))}
              </ul>
            </article>
            <div className="filters">
              <select value={historyTag} onChange={(e) => setHistoryTag(e.target.value as typeof historyTag)}>
                <option value="all">전체 태그</option>
                <option value="relationship">관계</option>
                <option value="career">커리어/학업</option>
                <option value="finance">재정</option>
                <option value="general">일반</option>
              </select>
              <select value={historyOutcome} onChange={(e) => setHistoryOutcome(e.target.value as typeof historyOutcome)}>
                <option value="all">전체 판정</option>
                <option value="matched">대체로 맞음</option>
                <option value="partial">부분적으로 맞음</option>
                <option value="different">다름</option>
                <option value="unreviewed">미복기</option>
              </select>
              <input
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="복기 기록 검색"
              />
            </div>
            <p className="sub">
              최근 {recentSpreadHistory.length}건 중 복기 완료 {historyCounts.reviewed}건 · 미복기 {historyCounts.unreviewed}건
            </p>
            {filteredSpreadHistory.length === 0 && <p>조건에 맞는 복기 기록이 없습니다.</p>}
            <div className="stack">
              {filteredSpreadHistory.map((record) => (
                <article key={record.id} className="result-item">
                  <div className="history-row">
                    <p>
                      <strong>{new Date(record.drawnAt).toLocaleString()}</strong> · {record.variantName ?? record.spreadName}
                    </p>
                    <div className="history-actions">
                      <button
                        className="btn"
                        onClick={() =>
                          setExpandedHistory((prev) => ({ ...prev, [record.id]: !prev[record.id] }))
                        }
                      >
                        {expandedHistory[record.id] ? '요약으로 보기' : '상세 보기'}
                      </button>
                      <button
                        className="btn danger"
                        onClick={() => {
                          setReviewDraft((prev) => {
                            const next = { ...prev };
                            delete next[record.id];
                            return next;
                          });
                          removeSpreadReading(record.id);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  {record.readingExperiment && <p className="sub">리딩 템플릿 실험군: {record.readingExperiment}</p>}
                  <p className="history-summary">
                    {expandedHistory[record.id] ? record.summary : summarizeText(record.summary, 260)}
                  </p>
                  <div className="history-digest">
                    <p className="badge">판정: {toOutcomeLabel(record.outcome)}</p>
                    <ul className="clean-list reading-lines reading-lines-compact">
                      {buildLearningDigest(record.items).slice(0, expandedHistory[record.id] ? 5 : 2).map((line, idx) => (
                        <li key={`${record.id}:digest:${idx}`} className="reading-digest-item">
                          {(() => {
                            const digest = splitDigestLine(line);
                            const bodyBlocks = toParagraphBlocks(digest.body || line);
                            return (
                              <>
                                {digest.title && <strong className="reading-digest-title">{digest.title}</strong>}
                                {bodyBlocks.map((block, blockIdx) => (
                                  <p key={`${record.id}:digest:${idx}:${blockIdx}`} className="reading-digest-body">
                                    {block}
                                  </p>
                                ))}
                              </>
                            );
                          })()}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {expandedHistory[record.id] && (
                    <ul className="clean-list">
                      {record.items.map((item) => (
                        <li key={`${record.id}:${item.position.name}`}>
                          <strong>{item.position.name}</strong>: {summarizeText(item.learningPoint || '학습 포인트가 없는 기록입니다.', 180)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="filters">
                    <select
                      value={record.outcome ?? ''}
                      onChange={(e) => {
                        const nextOutcome = (e.target.value || undefined) as 'matched' | 'partial' | 'different' | undefined;
                        const noteWithChecklist = mergeReviewNoteAndChecklist(
                          reviewDraft[record.id] ?? stripChecklistTags(record.reviewNote ?? ''),
                          reviewChecklistDraft[record.id] ?? parseChecklistFromNote(record.reviewNote ?? '')
                        );
                        reviewSpreadReading(
                          record.id,
                          nextOutcome,
                          noteWithChecklist
                        );
                        if (nextOutcome) {
                          sendSpreadEvent({
                            type: 'spread_review_saved',
                            spreadId: record.spreadId,
                            level: record.level,
                            context: record.context
                          });
                          void api.reportEventsBatch([{
                            type: 'spread_review_saved',
                            path: '/spreads',
                            userId,
                            spreadId: record.spreadId,
                            level: record.level,
                            context: record.context
                          }]).catch(() => {});
                        }
                      }}
                    >
                      <option value="">결과 체감 선택</option>
                      <option value="matched">대체로 맞음</option>
                      <option value="partial">부분적으로 맞음</option>
                      <option value="different">다름</option>
                    </select>
                  <input
                      value={reviewDraft[record.id] ?? stripChecklistTags(record.reviewNote ?? '')}
                      onChange={(e) => setReviewDraft((prev) => ({ ...prev, [record.id]: e.target.value }))}
                      placeholder="실제 결과 메모"
                    />
                    <div className="review-checks">
                      {([
                        ['routine', '루틴 준수'],
                        ['time', '시간 관리'],
                        ['mistakes', '오답 관리'],
                        ['condition', '컨디션 관리']
                      ] as const).map(([key, label]) => {
                        const current = reviewChecklistDraft[record.id] ?? parseChecklistFromNote(record.reviewNote ?? '');
                        return (
                          <label key={`${record.id}-${key}`} className="review-check-item">
                            <input
                              type="checkbox"
                              checked={Boolean(current[key])}
                              onChange={(e) =>
                                setReviewChecklistDraft((prev) => ({
                                  ...prev,
                                  [record.id]: {
                                    ...current,
                                    [key]: e.target.checked
                                  }
                                }))
                              }
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                    <button
                      className="btn"
                      onClick={() => {
                        const noteWithChecklist = mergeReviewNoteAndChecklist(
                          reviewDraft[record.id] ?? stripChecklistTags(record.reviewNote ?? ''),
                          reviewChecklistDraft[record.id] ?? parseChecklistFromNote(record.reviewNote ?? '')
                        );
                        reviewSpreadReading(
                          record.id,
                          record.outcome,
                          noteWithChecklist
                        );
                        if (record.outcome) {
                          sendSpreadEvent({
                            type: 'spread_review_saved',
                            spreadId: record.spreadId,
                            level: record.level,
                            context: record.context
                          });
                          void api.reportEventsBatch([{
                            type: 'spread_review_saved',
                            path: '/spreads',
                            userId,
                            spreadId: record.spreadId,
                            level: record.level,
                            context: record.context
                          }]).catch(() => {});
                        }
                      }}
                    >
                      복기 저장
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </article>
    </section>
  );
}

function CoachSummaryView({
  lines,
  context
}: {
  lines: string[];
  context: CoachSummaryContext;
}) {
  const sections = groupCoachSummary(lines, context);
  const paragraphs = buildCoachNarrativeParagraphs(sections, context);
  return <NaturalFlowView blocks={paragraphs} keywords={context.keywords} keyBase={`coach-${context.positionName}`} compact />;
}

function splitCoachLineForDisplay(text: string) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const firstPass = normalized
    .split(/(?<=[.!?])\s+|(?<=:)\s+| · /g)
    .flatMap((piece) => piece.split(/,\s+| 그리고 | 하지만 | 다만 | 또한 | 및 /g))
    .map((piece) => piece.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';
  for (const piece of firstPass) {
    const next = current ? `${current} ${piece}` : piece;
    if (next.length > 44 && current) {
      chunks.push(current);
      current = piece;
      continue;
    }
    current = next;
  }
  if (current) chunks.push(current);

  return chunks.length > 0 ? chunks : [normalized];
}

function groupCoachSummary(lines: string[], context: CoachSummaryContext): CoachSummarySections {
  const cleaned = lines.map((line) => String(line || '').trim()).filter(Boolean);
  const sections: CoachSummarySections = {
    core: [],
    action: [],
    caution: [],
    question: []
  };

  for (const line of cleaned) {
    const split = splitQuestionSegment(line);
    if (split.main) {
      if (/주의|리스크|경고|피할|소모|병목|멈추|조절|금지|불안정/.test(split.main)) {
        sections.caution.push(split.main);
      } else if (/행동|실행|시도|적어|기록|루틴|오늘|이번 주|다음/.test(split.main)) {
        sections.action.push(split.main);
      } else {
        sections.core.push(split.main);
      }
    }

    if (split.question) {
      sections.question.push(split.question);
      continue;
    }

    if (/복기 질문|체크 질문|점검 질문|검증 질문|질문/.test(line)) {
      sections.question.push(line);
    }
  }

  if (sections.core.length === 0) sections.core.push(buildCoreSignalGuidance(context));
  if (sections.action.length === 0) sections.action.push('핵심 카드 근거 1개와 바로 할 행동 1개를 1문장으로 적어 실행하세요.');
  if (sections.caution.length === 0) sections.caution.push('해석을 넓히기보다 시간, 감정, 에너지 기준을 먼저 정하고 읽어보세요.');
  if (sections.question.length === 0) sections.question.push('이 포지션 리딩에서 실제 행동으로 바로 옮길 근거 1개는 무엇인가요?');
  sections.core = uniqueCoachLines(sections.core, sections.question);
  sections.action = uniqueCoachLines(sections.action, [...sections.core, ...sections.question]);
  sections.caution = uniqueCoachLines(sections.caution, [...sections.core, ...sections.action, ...sections.question]);
  sections.question = uniqueCoachLines(sections.question, []);
  return sections;
}

function splitQuestionSegment(line: string) {
  const text = String(line || '').trim();
  if (!text) return { main: '', question: '' };
  const match = text.match(/^(.*?)(복기 질문|체크 질문|점검 질문|검증 질문|질문)\s*:?\s*(.*)$/);
  if (!match) return { main: text, question: '' };

  const main = (match[1] || '').trim().replace(/[·,:;\-]+$/, '').trim();
  const questionBody = (match[3] || '').trim();
  const question = questionBody ? `복기 질문: ${questionBody}` : '';
  return { main, question };
}

function uniqueCoachLines(lines: string[], blacklist: string[]) {
  const blocked = new Set(blacklist.map((line) => normalizeCoachLine(line)));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = normalizeCoachLine(line);
    if (!key || blocked.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }
  return result;
}

function normalizeCoachLine(line: string) {
  return cleanCoachPrefix(String(line || ''))
    .replace(/[^0-9a-zA-Z가-힣]+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildCoreSignalGuidance(context: CoachSummaryContext) {
  const keyword = context.keywords[0] || '핵심 흐름';
  const keywordWithParticle = withRoParticle(keyword);
  const direction = context.orientation === 'reversed' ? '역방향' : '정방향';
  const directionHint = context.orientation === 'reversed'
    ? '지연/과잉 가능성'
    : '진행/확장 가능성';
  const questionHint = buildQuestionLinkedHint(context.questionContext, keyword, context);
  return `핵심 신호를 "${keyword}"${keywordWithParticle} 고정하세요. 예시: ${context.positionName}에서 ${context.cardName} ${direction}이면 ${directionHint}을 1차 근거로 두고 해석 범위를 좁혀 읽습니다. ${questionHint}`;
}

function buildQuestionLinkedHint(questionContext: string, keyword: string, context: CoachSummaryContext) {
  const question = String(questionContext || '').trim();
  const preview = question ? summarizeText(question, 34) : '현재 질문';
  const axis = inferQuestionAxis(question);
  const concrete = buildQuestionConcreteGuidance({ axis, context, keyword });
  return `질문 연동: "${preview}" 질문에서는 "${keyword}"를 ${axis} 기준으로 해석하세요. 예시: ${concrete}`;
}

function inferQuestionAxis(questionContext: string) {
  const text = String(questionContext || '');
  if (/재회|연애|관계|상대|대화|갈등|화해/.test(text)) return '관계 반응/대화 순서';
  if (/이직|취업|면접|직장|업무|커리어|학업|시험|공부/.test(text)) return '실행 우선순위/지속 가능성';
  if (/돈|재정|수입|지출|저축|투자|예산/.test(text)) return '손실 통제/현금흐름 안정성';
  if (/건강|수면|컨디션|회복/.test(text)) return '회복 리듬/무리 신호';
  if (/A|B|선택|둘 중|비교/.test(text)) return '판단 기준(시간/비용/감정 소모)';
  return '오늘 바로 검증 가능한 행동 근거';
}

function buildCoachNarrativeParagraphs(sections: CoachSummarySections, context: CoachSummaryContext) {
  const question = String(context.questionContext || '').trim();
  const questionPreview = question ? summarizeText(question, 36) : '현재 질문';
  const axis = inferQuestionAxis(question);
  const keyword = context.keywords[0] || '핵심 흐름';
  const core = selectCoachSentence(
    sections.core,
    /핵심|신호|근거|키워드/,
    buildCoreSignalGuidance(context)
  );
  const action = selectCoachSentence(
    sections.action,
    /실행|행동|기록|루틴|정하고|고르고|번역|연결/,
    '핵심 카드 근거 1개와 실행 행동 1개를 연결해 오늘 바로 실행하세요.'
  );
  const caution = selectCoachSentence(
    sections.caution,
    /시간|감정|에너지|소모|리스크|주의|조절|고정/,
    '해석을 넓히기보다 시간, 감정, 에너지 기준을 먼저 정하세요.'
  );
  const review = selectCoachSentence(
    sections.question,
    /복기|질문|근거|검증|어긋|무엇/,
    '복기에서 가장 잘 맞은 근거 1개와 어긋난 근거 1개를 분리해 적어보세요.'
  );
  const tarotEvidence = extractTarotEvidence(context.tarotNarrative, context);
  const axisConcrete = buildQuestionConcreteGuidance({ axis, context, keyword });
  const cautionConcrete = buildConditionControlGuidance(context);

  return [
    `이번 리딩에서 가장 중요한 포인트는 ${toNarrativeSentence(core)} 카드 근거는 "${tarotEvidence}"입니다.`,
    `"${questionPreview}" 질문은 "${keyword}"을 ${axis} 기준으로 좁혀 보면 더 쉽게 읽힙니다. 실행은 ${toNarrativeSentence(action)} 구체적으로는 ${axisConcrete}`,
    `헷갈릴 때는 ${toNarrativeSentence(caution)} 이번 카드로 보면 ${cautionConcrete}`,
    `마지막으로 복기는 ${toNarrativeSentence(review)}`
  ];
}

function selectCoachSentence(lines: string[], preferredPattern: RegExp, fallback: string) {
  const chunks = lines
    .flatMap((line) => splitCoachLineForDisplay(cleanCoachPrefix(line)))
    .map((line) => stripCoachLabel(line))
    .filter((line) => line.length >= 8);
  if (!chunks.length) return fallback;
  return chunks.find((line) => preferredPattern.test(line)) || chunks[0] || fallback;
}

function toNarrativeSentence(text: string) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';
  const clean = stripCoachLabel(trimmed).trim();
  if (!clean) return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function stripCoachLabel(text: string) {
  return String(text || '')
    .replace(/^(관찰 근거|타로 리더 추론|결론 기준|포지션 기준|학습 코칭|리딩 검증|복기 질문|점검 질문)\s*:\s*/g, '')
    .trim();
}

function extractTarotEvidence(narrative: string, context: CoachSummaryContext) {
  const sentences = String(narrative || '')
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const keyword = context.keywords[0] || '';
  const byKeyword = sentences.find((line) => keyword && line.includes(keyword));
  const byPosition = sentences.find((line) => line.includes(context.positionName));
  const pick = byKeyword || byPosition || sentences[0] || `${context.positionName}에서 ${context.cardName} 카드가 핵심 신호를 보여줍니다`;
  return summarizeText(pick, 92);
}

function buildQuestionConcreteGuidance({
  axis,
  context,
  keyword
}: {
  axis: string;
  context: CoachSummaryContext;
  keyword: string;
}) {
  if (axis === '관계 반응/대화 순서') {
    return `"${keyword}"를 기준으로 오늘 대화에서 사실 1문장-감정 1문장-요청 1문장 순서를 지키고, 상대 반응 변화를 저녁에 기록하세요.`;
  }
  if (axis === '실행 우선순위/지속 가능성') {
    return `"${keyword}"를 기준으로 오늘 완료할 일 1개만 고정하고, 완료 여부와 소요 시간을 바로 체크해 지속 가능성을 판단하세요.`;
  }
  if (axis === '손실 통제/현금흐름 안정성') {
    return `"${keyword}"를 기준으로 오늘 줄일 지출 1개와 유지할 지출 1개를 나눠 적고, 실제 소비와 차이를 밤에 점검하세요.`;
  }
  if (axis === '회복 리듬/무리 신호') {
    return `"${keyword}"를 기준으로 무리 신호(피로/집중저하) 1개를 먼저 체크하고, 회복 행동 1개를 실행한 뒤 컨디션 변화를 기록하세요.`;
  }
  if (axis === '판단 기준(시간/비용/감정 소모)') {
    return `"${keyword}"를 기준으로 A/B를 시간·비용·감정 소모 3항목으로 같은 기준에서 비교한 뒤 1개만 선택하세요.`;
  }
  return `"${keyword}"를 기준으로 오늘 실행 행동 1개를 정하고, 저녁에 체감 변화(맞음/부분맞음/다름)를 1줄로 검증하세요.`;
}

function buildConditionControlGuidance(context: CoachSummaryContext) {
  const keyword = context.keywords[0] || '핵심 흐름';
  if (context.orientation === 'reversed') {
    return `"${keyword}" 역방향이므로 시간은 10~20분 단위로 짧게 끊고, 감정은 과열 반응을 한 템포 늦추며, 에너지는 소모 큰 일정 1개를 줄이는 방식이 안전합니다.`;
  }
  return `"${keyword}" 정방향이므로 시간은 핵심 행동 1개에 먼저 배정하고, 감정은 확신 과속을 막기 위해 중간 점검 1회를 넣고, 에너지는 과투입을 피하며 지속 가능한 강도로 유지하세요.`;
}

function withRoParticle(word: string) {
  const text = String(word || '').trim();
  if (!text) return '으로';
  const ch = text.charCodeAt(text.length - 1);
  const HANGUL_START = 0xac00;
  const HANGUL_END = 0xd7a3;
  if (ch < HANGUL_START || ch > HANGUL_END) return '로';
  const jong = (ch - HANGUL_START) % 28;
  if (jong === 0 || jong === 8) return '로';
  return '으로';
}

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

function renderHighlightedText(text: string, keywords: string[], keyBase: string, options: HighlightOptions = {}): ReactNode[] {
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

function normalizeDisplayText(text: string) {
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

function UnifiedSummaryView({
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
  const sections = String(summary || '')
    .split(/\n\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[가-힣A-Za-z0-9·\-\s()]{1,18}:\s*/g, ''));
  return sections.length ? sections : toParagraphBlocks(summary);
}

function NaturalFlowView({
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

function summarizeText(text: string, max: number) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trimEnd()}...`;
}

function toOutcomeLabel(outcome?: 'matched' | 'partial' | 'different') {
  if (outcome === 'matched') return '대체로 맞음';
  if (outcome === 'partial') return '부분적으로 맞음';
  if (outcome === 'different') return '다름';
  return '미복기';
}
