import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { TarotImage } from '../components/TarotImage';
import { useProgressStore } from '../state/progress';
import type { SpreadDrawResult } from '../types';

export function SpreadsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [readingLevel, setReadingLevel] = useState<'beginner' | 'intermediate'>('beginner');
  const [reviewDraft, setReviewDraft] = useState<Record<string, string>>({});
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
          className="spread-layout"
          style={{
            gridTemplateColumns: `repeat(${selected.layout.cols}, minmax(64px, 1fr))`,
            gridTemplateRows: `repeat(${selected.layout.rows}, 92px)`
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
        {drawMutation.data && (
          <>
            <h4>리딩 메시지</h4>
            <div className="reading-dual-panel">
              <article className="result-item reading-summary">
                <p><strong>타로 리더 종합 리딩</strong></p>
                {selected.id === 'yearly-fortune'
                  ? <YearlySummaryView summary={drawMutation.data.summary} />
                  : (
                    <div className="reading-prose-wrap">
                      {toParagraphBlocks(drawMutation.data.summary).map((block, idx) => (
                        <p key={`summary-block-${idx}`} className="reading-prose">{block}</p>
                      ))}
                    </div>
                  )}
              </article>
              <article className="result-item">
                <p><strong>학습 리더 코치 내역</strong></p>
                <ul className="reading-lines">
                  {drawMutation.data.items.map((item) => (
                    <li key={`learning-${item.position.name}`}>
                      <strong>{item.position.name}</strong>
                      <ul className="reading-lines reading-lines-compact">
                        {toCoachBlocks(item.learningPoint || '복기 시 카드-포지션 연결 근거를 1문장으로 기록하세요.').map((line, idx) => (
                          <li key={`learning-line-${item.position.name}-${idx}`}>
                            <span className={`line-tag ${lineTagClass(line)}`}>{lineTagLabel(line)}</span> {cleanCoachPrefix(line)}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </article>
            </div>

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

        <h4>언제 쓰면 좋은가</h4>
        <ul className="clean-list">
          {selected.whenToUse.map((item) => <li key={item}>{item}</li>)}
        </ul>

        <h4>포지션 의미</h4>
        <div className="stack">
          {positions.map((pos) => (
            <div key={pos.name} className="result-item">
              <p><strong>{pos.name}</strong></p>
              <p>{pos.meaning}</p>
            </div>
          ))}
        </div>

        <h4>학습 루틴</h4>
        <ol className="clean-list">
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
                    reviewSpreadReading(
                      record.id,
                      nextOutcome,
                      reviewDraft[record.id] ?? record.reviewNote ?? ''
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
                  value={reviewDraft[record.id] ?? record.reviewNote ?? ''}
                  onChange={(e) => setReviewDraft((prev) => ({ ...prev, [record.id]: e.target.value }))}
                  placeholder="실제 결과 메모"
                />
                <button
                  className="btn"
                  onClick={() => {
                    reviewSpreadReading(
                      record.id,
                      record.outcome,
                      reviewDraft[record.id] ?? record.reviewNote ?? ''
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

function cleanCoachPrefix(text: string) {
  return text.replace(/^\[학습 리더\]\s*/g, '');
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
