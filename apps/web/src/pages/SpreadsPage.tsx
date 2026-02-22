import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { TarotImage } from '../components/TarotImage';
import { useProgressStore } from '../state/progress';
import type { SpreadDrawResult } from '../types';
import {
  buildChoiceComparison,
  buildLearningDigest,
  buildReadingInsights,
  cleanCoachPrefix,
  lineTagClass,
  lineTagLabel,
  mergeReviewNoteAndChecklist,
  mergeTarotMessage,
  parseChecklistFromNote,
  parseWeeklySummary,
  parseYearlySummary,
  scoreItemRisk,
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

const SPREAD_VISUAL_PRESETS: Record<string, SpreadVisualPreset> = {
  'one-card': { scale: 'xl', rowHeight: 164, minColWidth: 138 },
  'three-card': { scale: 'xl', rowHeight: 138, minColWidth: 98 },
  'daily-fortune': { scale: 'xl', rowHeight: 136, minColWidth: 96 },
  'choice-a-b': { scale: 'xl', rowHeight: 132, minColWidth: 94 },
  'monthly-fortune': { scale: 'lg', rowHeight: 126, minColWidth: 90 },
  'relationship-recovery': { scale: 'lg', rowHeight: 126, minColWidth: 90 },
  'weekly-fortune': { scale: 'md', rowHeight: 114, minColWidth: 76 },
  'yearly-fortune': { scale: 'md', rowHeight: 108, minColWidth: 72 },
  'celtic-cross': { scale: 'md', rowHeight: 112, minColWidth: 74 }
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
  const [historyQuery, setHistoryQuery] = useState('');
  const spreadsQuery = useQuery({ queryKey: ['spreads'], queryFn: api.getSpreads });
  const spreadHistory = useProgressStore((s) => s.spreadHistory);
  const addSpreadReading = useProgressStore((s) => s.addSpreadReading);
  const reviewSpreadReading = useProgressStore((s) => s.reviewSpreadReading);
  const removeSpreadReading = useProgressStore((s) => s.removeSpreadReading);
  const removeSpreadReadingsBySpreadId = useProgressStore((s) => s.removeSpreadReadingsBySpreadId);
  const spreads = spreadsQuery.data ?? [];
  const selected = spreads.find((spread) => spread.id === selectedId) ?? spreads[0] ?? null;

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
    }
  });

  const drawItems = drawMutation.data?.items ?? [];
  const cardByPosition = new Map(drawItems.map((item) => [item.position.name, item]));
  const spreadVisualPreset =
    (selected ? SPREAD_VISUAL_PRESETS[selected.id] : null) ??
    ((selected?.cardCount ?? 1) <= 5
      ? { scale: 'xl', rowHeight: 132, minColWidth: 94 }
      : (selected?.cardCount ?? 1) <= 8
        ? { scale: 'lg', rowHeight: 120, minColWidth: 86 }
        : { scale: 'md', rowHeight: 110, minColWidth: 74 });
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
      if (!q) return true;
      return `${context} ${summary}`.includes(q);
    });
  }, [historyQuery, historyTag, recentSpreadHistory]);
  const sendSpreadEvent = (payload: {
    type: 'spread_drawn' | 'spread_review_saved';
    spreadId: string;
    level: 'beginner' | 'intermediate';
    context?: string;
  }) => {
    void api.reportSpreadEvent(payload).catch(() => {});
  };

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
        <div className="filters">
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
                  <span>{slot.position}</span>
                  {drawn && (
                    <>
                      <Link to={`/cards/${drawn.card.id}`} className="spread-slot-link" title={`${drawn.card.nameKo} 상세 보기`}>
                        <TarotImage
                          src={drawn.card.imageUrl}
                          sources={drawn.card.imageSources}
                          cardId={drawn.card.id}
                          alt={drawn.card.nameKo}
                          className="spread-slot-thumb"
                          loading="lazy"
                        />
                        <strong className="spread-slot-name">{drawn.card.nameKo}</strong>
                      </Link>
                    </>
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
                <p><strong>타로 리더 종합 리딩</strong></p>
                {selected.id === 'yearly-fortune'
                  ? <YearlySummaryView summary={drawMutation.data.summary} />
                  : selected.id === 'weekly-fortune'
                    ? <WeeklySummaryView summary={drawMutation.data.summary} />
                  : (
                    <div className="reading-prose-wrap">
                      {toParagraphBlocks(drawMutation.data.summary).map((block, idx) => (
                        <p key={`summary-block-${idx}`} className="reading-prose">{block}</p>
                      ))}
                    </div>
                  )}
              </article>
              <article className="result-item reading-coach">
                <p><strong>종합 학습 내역</strong></p>
                <ul className="reading-lines">
                  {buildLearningDigest(drawMutation.data.items).map((line, idx) => (
                    <li key={`learning-digest-${idx}`}>{line}</li>
                  ))}
                </ul>
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
                    <p className="sub">{insights.verdictReason}</p>
                  </div>
                  {insights.conflictWarning && (
                    <p className="conflict-warning">{insights.conflictWarning}</p>
                  )}
                  <div className="action-cards">
                    {insights.actions.map((action, idx) => (
                      <article key={`action-${idx}`} className="action-card">
                        <h5>{action.title}</h5>
                        <p>{action.body}</p>
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
                      className="tarot-thumb"
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
                      <p><strong>타로 리더 리딩</strong></p>
                      <div className="reading-prose-wrap">
                        {toParagraphBlocks(mergeTarotMessage(item.coreMessage, item.interpretation)).map((block, idx) => (
                          <p key={`item-tarot-${item.position.name}-${idx}`} className="reading-prose">{block}</p>
                        ))}
                      </div>
                    </div>
                    <div className="learning-point">
                      <p><strong>학습 리더 코치 내역</strong></p>
                      <ul className="reading-lines">
                        {toCoachBlocks(item.learningPoint || '카드 키워드 1개와 행동 1개를 짝지어 복기하세요.').map((line, idx) => (
                          <li key={`item-learning-${item.position.name}-${idx}`}>
                            <span className={`line-tag ${lineTagClass(line)}`}>{lineTagLabel(line)}</span> {cleanCoachPrefix(line)}
                          </li>
                        ))}
                      </ul>
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
            <div className="filters">
              <select value={historyTag} onChange={(e) => setHistoryTag(e.target.value as typeof historyTag)}>
                <option value="all">전체 태그</option>
                <option value="relationship">관계</option>
                <option value="career">커리어/학업</option>
                <option value="finance">재정</option>
                <option value="general">일반</option>
              </select>
              <input
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="복기 기록 검색"
              />
            </div>
            {filteredSpreadHistory.length === 0 && <p>조건에 맞는 복기 기록이 없습니다.</p>}
            <div className="stack">
              {filteredSpreadHistory.map((record) => (
                <article key={record.id} className="result-item">
                  <div className="history-row">
                    <p><strong>{new Date(record.drawnAt).toLocaleString()}</strong> · {record.variantName ?? record.spreadName}</p>
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
                  {record.readingExperiment && <p className="sub">리딩 템플릿 실험군: {record.readingExperiment}</p>}
                  <p>{record.summary}</p>
                  <ul className="clean-list">
                    {record.items.map((item) => (
                      <li key={`${record.id}:${item.position.name}`}>
                        <strong>{item.position.name}</strong>: {item.learningPoint || '학습 포인트가 없는 기록입니다. 다음 복기부터 카드-행동 연결 문장을 남겨주세요.'}
                      </li>
                    ))}
                  </ul>
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
