import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { TarotImage } from '../components/TarotImage';
import { useProgressStore } from '../state/progress';
import type { SpreadDrawResult } from '../types';

type ReviewChecklist = {
  routine: boolean;
  time: boolean;
  mistakes: boolean;
  condition: boolean;
};

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
    SPREAD_VISUAL_PRESETS[selected.id] ??
    (selected.cardCount <= 5
      ? { scale: 'xl', rowHeight: 132, minColWidth: 94 }
      : selected.cardCount <= 8
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
  const sendSpreadEvent = (payload: {
    type: 'spread_drawn' | 'spread_review_saved';
    spreadId: string;
    level: 'beginner' | 'intermediate';
    context?: string;
  }) => {
    if (payload.spreadId !== 'relationship-recovery') return;
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
            {recentSpreadHistory.length === 0 && <p>아직 복기 기록이 없습니다.</p>}
            <div className="stack">
              {recentSpreadHistory.map((record) => (
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

function toParagraphBlocks(text: string) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function toCoachBlocks(text: string) {
  const cleaned = String(text || '').trim();
  if (!cleaned) return [];
  const tagged = cleaned
    .split(/\s*(?=\[학습 리더\])/g)
    .map((part) => part.trim())
    .filter(Boolean);
  if (tagged.length > 0) return tagged;
  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildLearningDigest(items: SpreadDrawResult['items']) {
  if (!items.length) {
    return ['학습 포인트가 아직 없습니다. 카드 근거-행동-검증 1줄씩 먼저 남겨보세요.'];
  }
  const positionCount = items.length;
  const coachLines = items
    .flatMap((item) => toCoachBlocks(item.learningPoint || ''))
    .map((line) => cleanCoachPrefix(line))
    .filter(Boolean);

  const frameLine = coachLines.find((line) => /학습 기준|훈련 프레임|학습 프레임|학습 루틴|복기 기준/.test(line))
    || '카드/포지션/정역방향을 먼저 분리해 근거 해석 순서를 고정하세요.';
  const questionLine = coachLines.find((line) => /복기 질문|체크 질문|점검 질문|검증 질문|질문/.test(line))
    || '각 포지션에서 카드 근거가 질문 의도와 실제로 맞는지 1문장으로 확인하세요.';
  const verifyLine = coachLines.find((line) => /리딩 검증|실행 후 검증|검증 단계|검증/.test(line))
    || '24시간 뒤 맞음/부분맞음/다름으로 점검하고 이유를 1줄로 남겨 다음 리딩 기준으로 사용하세요.';

  return [
    `이번 리딩은 총 ${positionCount}개 포지션 기준으로 해석-복기 루틴을 정리했습니다.`,
    `프레임: ${frameLine}`,
    `핵심 질문: ${questionLine}`,
    `검증: ${verifyLine}`
  ];
}

function cleanCoachPrefix(text: string) {
  return text
    .replace(/^\[학습 리더\]\s*/g, '')
    .replace(/^(복기 질문|점검 질문|체크 질문|검증 질문):\s*/g, '')
    .replace(/^리딩 검증:\s*/g, '');
}

function lineTagLabel(text: string) {
  if (/복기 질문|체크 질문|점검 질문|검증 질문|질문:/.test(text)) return '질문';
  if (/리딩 검증|실행 후 검증|검증 단계|검증:/.test(text)) return '검증';
  if (/학습 기준|훈련 프레임|학습 프레임|학습 루틴|복기 기준/.test(text)) return '프레임';
  return '코칭';
}

function lineTagClass(text: string) {
  if (/복기 질문|체크 질문|점검 질문|검증 질문|질문:/.test(text)) return 'line-tag-question';
  if (/리딩 검증|실행 후 검증|검증 단계|검증:/.test(text)) return 'line-tag-check';
  return 'line-tag-coach';
}

function mergeTarotMessage(coreMessage: string, interpretation: string) {
  const core = (coreMessage || '').trim();
  const detail = (interpretation || '').trim();
  if (!core) return detail;
  if (!detail) return core;
  if (detail.includes(core)) return detail;
  return `${core} ${detail}`.trim();
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

function parseYearlySummary(text: string) {
  const raw = String(text || '').trim();
  if (!raw.includes('총평:') || !raw.includes('분기별 운세:') || !raw.includes('월별 운세:')) return null;

  const overall = extractSection(raw, '총평:', '분기별 운세:');
  const quarterly = extractSection(raw, '분기별 운세:', '월별 운세:');
  const monthlyAndClose = extractSection(raw, '월별 운세:', null);
  if (!overall || !quarterly || !monthlyAndClose) return null;

  const monthlyLines = splitMonthlyLines(monthlyAndClose);
  const closeStart = monthlyLines.length > 0
    ? monthlyAndClose.indexOf(monthlyLines[monthlyLines.length - 1]) + monthlyLines[monthlyLines.length - 1].length
    : 0;
  const closing = monthlyAndClose.slice(closeStart).trim();

  return {
    overall,
    quarterly,
    monthly: monthlyLines.length > 0 ? monthlyLines : [monthlyAndClose],
    closing
  };
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

function parseWeeklySummary(text: string) {
  const raw = String(text || '').trim();
  if (!raw.includes('총평:') || !raw.includes('일별 흐름:') || !raw.includes('실행 가이드:')) return null;

  const overall = extractSection(raw, '총평:', '일별 흐름:');
  const dailyBlock = extractSection(raw, '일별 흐름:', '실행 가이드:');
  const actionAndTheme = extractSection(raw, '실행 가이드:', null);
  if (!overall || !dailyBlock || !actionAndTheme) return null;

  const daily = dailyBlock
    .split(/(?=(?:월요일|화요일|수요일|목요일|금요일|토요일|일요일)\()/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const themeIndex = actionAndTheme.indexOf('한 줄 테마:');
  const actionGuide = (themeIndex >= 0 ? actionAndTheme.slice(0, themeIndex) : actionAndTheme).trim();
  const theme = (themeIndex >= 0 ? actionAndTheme.slice(themeIndex + '한 줄 테마:'.length) : '').trim();

  return {
    overall,
    daily: daily.length > 0 ? daily : [dailyBlock],
    actionGuide,
    theme
  };
}

function extractSection(text: string, startLabel: string, endLabel: string | null) {
  const start = text.indexOf(startLabel);
  if (start < 0) return '';
  const from = start + startLabel.length;
  const to = endLabel ? text.indexOf(endLabel, from) : text.length;
  return text.slice(from, to < 0 ? text.length : to).trim();
}

function splitMonthlyLines(monthlyText: string) {
  const segments = monthlyText
    .split(/(?=(?:[1-9]|1[0-2])월\([^)]*\)은)/g)
    .map((seg) => seg.trim())
    .filter(Boolean);

  const monthlyOnly = segments.filter((seg) => /^(?:[1-9]|1[0-2])월\([^)]*\)은/.test(seg));
  return monthlyOnly;
}

function buildChoiceComparison(result: SpreadDrawResult) {
  const get = (name: string) => result.items.find((item) => item.position.name === name);
  const current = get('현재 상황');
  const aNear = get('A 선택 시 가까운 미래');
  const aResult = get('A 선택 시 결과');
  const bNear = get('B 선택 시 가까운 미래');
  const bResult = get('B 선택 시 결과');

  const score = (
    item: SpreadDrawResult['items'][number] | undefined,
    weight: number
  ) => (!item ? 0 : (item.orientation === 'upright' ? 1 : -1) * weight);
  const currentWeight = 1.2;
  const nearWeight = 1.6;
  const resultWeight = 2.2;
  const baseFromCurrent = score(current, currentWeight);
  const aScore = baseFromCurrent + score(aNear, nearWeight) + score(aResult, resultWeight);
  const bScore = baseFromCurrent + score(bNear, nearWeight) + score(bResult, resultWeight);
  const gap = Math.abs(aScore - bScore);
  const confidenceLabel = gap >= 2.6 ? '높음' : gap >= 1.2 ? '중간' : '낮음';
  const recommendation = aScore === bScore
    ? 'A/B 흐름이 비슷하므로 현재 상황 카드 기준으로 현실 조건(시간/비용)을 먼저 고정하세요.'
    : aScore > bScore
      ? '현재 리딩 기준으로는 A 시나리오가 단기-결과 흐름이 더 안정적입니다.'
      : '현재 리딩 기준으로는 B 시나리오가 단기-결과 흐름이 더 안정적입니다.';

  return { current, aNear, aResult, bNear, bResult, recommendation, confidenceLabel };
}

function inferQuestionDomain(context: string) {
  const text = String(context || '').toLowerCase();
  if (/(한능검|시험|공부|학습|자격증|합격|준비|기출)/.test(text)) return 'study';
  if (/(이직|취업|면접|업무|프로젝트|커리어)/.test(text)) return 'career';
  if (/(연애|관계|재회|갈등|화해|상대)/.test(text)) return 'relationship';
  if (/(돈|재정|지출|저축|투자|수입)/.test(text)) return 'finance';
  return 'general';
}

function scoreItemRisk(item: SpreadDrawResult['items'][number] | undefined) {
  if (!item) return 0;
  const text = `${item.card.nameKo} ${(item.card.keywords || []).join(' ')}`.toLowerCase();
  let score = item.orientation === 'reversed' ? 1 : 0;
  if (/(불안|갈등|소모|병목|손실|지연|권태|혼란|압박)/.test(text)) score += 1;
  return score;
}

function buildReadingInsights({
  spreadId,
  context,
  items
}: {
  spreadId: string;
  context: string;
  items: SpreadDrawResult['items'];
}) {
  const first = items[0];
  const middle = items[1];
  const last = items[items.length - 1];
  const domain = inferQuestionDomain(context);
  const openCount = items.filter((item) => item.orientation === 'upright').length;
  const riskTotal = items.reduce((acc, item) => acc + scoreItemRisk(item), 0);
  const verdict: 'go' | 'conditional' | 'hold' =
    openCount >= 2 && riskTotal <= 2 ? 'go' : openCount >= 1 ? 'conditional' : 'hold';
  const verdictLabel = verdict === 'go' ? '진행 권장' : verdict === 'conditional' ? '조건부 진행' : '보류 후 정비';
  const verdictReason = verdict === 'go'
    ? '결과 카드가 열려 있어 실행 가능성이 있습니다. 다만 과속보다 루틴 유지가 핵심입니다.'
    : verdict === 'conditional'
      ? '가능성은 있으나 병목 신호가 있어 실행 조건을 좁혀야 결과가 안정됩니다.'
      : '지금은 확장보다 정비가 우선입니다. 병목을 먼저 줄인 뒤 재시도하는 편이 안전합니다.';
  const conflictWarning = first?.orientation === 'reversed' && verdict === 'go'
    ? '초반 카드 경고와 결론이 충돌할 수 있습니다. 즉시 확장 대신 리스크 관리형 실행으로 조정하세요.'
    : '';
  const actions = domain === 'study'
    ? [
      { title: '오늘 할 일 1개', body: '취약 파트 1개 + 기출 1세트 + 오답 20분만 고정하고 분량 확장은 멈추세요.' },
      { title: '이번 주 운영', body: '동일 시간대 학습 루틴을 3일 이상 유지하고, 주 1회 시간 배분 리허설을 넣으세요.' },
      { title: '지금 피할 것', body: '새 교재/새 범위 확장보다 기존 오답 유형 재정리에 집중하세요.' }
    ]
    : [
      { title: '오늘 실행', body: `${middle?.position.name || '중앙'} 카드 기준으로 실행 항목 1개만 고정하세요.` },
      { title: '중간 점검', body: `${last?.position.name || '결과'} 카드 기준으로 검증 지표 1개를 정해 오늘 기록하세요.` },
      { title: '주의점', body: `${first?.position.name || '시작'} 카드의 경고 신호를 무시하지 말고 속도를 조절하세요.` }
    ];

  if (spreadId !== 'three-card') {
    actions[0].title = '핵심 실행';
  }

  return { verdict, verdictLabel, verdictReason, conflictWarning, actions };
}

function parseChecklistFromNote(note: string): ReviewChecklist {
  const text = String(note || '');
  return {
    routine: text.includes('[루틴준수]'),
    time: text.includes('[시간관리]'),
    mistakes: text.includes('[오답관리]'),
    condition: text.includes('[컨디션관리]')
  };
}

function stripChecklistTags(note: string) {
  return String(note || '')
    .replace(/\s*\[(루틴준수|시간관리|오답관리|컨디션관리)\]/g, '')
    .trim();
}

function mergeReviewNoteAndChecklist(note: string, checklist: ReviewChecklist) {
  const tags = [
    checklist.routine ? '[루틴준수]' : '',
    checklist.time ? '[시간관리]' : '',
    checklist.mistakes ? '[오답관리]' : '',
    checklist.condition ? '[컨디션관리]' : ''
  ].filter(Boolean).join(' ');
  const cleanNote = stripChecklistTags(note);
  return `${cleanNote}${tags ? ` ${tags}` : ''}`.trim();
}
