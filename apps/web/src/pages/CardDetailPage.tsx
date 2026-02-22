import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ImageAttributionNotice, TarotImage } from '../components/TarotImage';

export function CardDetailPage() {
  const { cardId } = useParams();
  const [level, setLevel] = useState<'beginner' | 'intermediate'>('beginner');
  const [context, setContext] = useState('');

  const cardQuery = useQuery({
    queryKey: ['card', cardId, context],
    queryFn: () => api.getCard(cardId as string, context),
    enabled: Boolean(cardId),
    placeholderData: (previousData) => previousData
  });

  const explainMutation = useMutation({
    mutationFn: (input: { level: 'beginner' | 'intermediate'; context: string }) =>
      api.explainCard(cardId as string, input.level, input.context)
  });

  if (cardQuery.isLoading && !cardQuery.data) return <p>카드 정보를 불러오는 중...</p>;
  if (cardQuery.isError || !cardQuery.data) return <p>카드를 찾을 수 없습니다.</p>;

  const card = cardQuery.data;
  const explanation = explainMutation.data;
  const renderMultiline = (value: string, keyPrefix: string) =>
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, idx) => <p key={`${keyPrefix}-${idx}`}>{line}</p>);

  return (
    <section className="stack">
      <article className="panel">
        <p className="eyebrow">카드 상세</p>
        <div className="tarot-row">
          <TarotImage src={card.imageUrl} sources={card.imageSources} cardId={card.id} alt={card.nameKo} className="tarot-thumb" />
          <div>
            <h2>{card.nameKo}</h2>
            <p className="sub">{card.name}</p>
            <p>{card.summary}</p>
            <p>키워드: {card.keywords.join(' · ')}</p>
            <ImageAttributionNotice attribution={card.imageAttribution} />
          </div>
        </div>
        <div className="description-box">
          {card.descriptions[level].split('\n').map((line, idx) => (
            <p key={`${card.id}-desc-${idx}`}>{line}</p>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3>심화 설명 생성</h3>
        <div className="filters">
          <select value={level} onChange={(e) => setLevel(e.target.value as 'beginner' | 'intermediate')}>
            <option value="beginner">입문 관점</option>
            <option value="intermediate">중급 관점</option>
          </select>
          <input
            value={context}
            onChange={(e) => {
              setContext(e.target.value);
              explainMutation.reset();
            }}
            placeholder="질문 맥락(예: 이직, 관계 회복)"
          />
          <button
            className="btn primary"
            onClick={() => explainMutation.mutate({ level, context })}
            disabled={explainMutation.isPending}
          >
            {explainMutation.isPending ? '생성 중...' : '설명 생성'}
          </button>
        </div>

        {explanation && (
          <div className="stack">
            <p className="badge">source: {explanation.source}</p>
            <section><h4>핵심 의미</h4>{renderMultiline(explanation.sections.coreMeaning, 'core')}</section>
            <section><h4>상징 해석</h4>{renderMultiline(explanation.sections.symbolism, 'symbol')}</section>
            <section><h4>정방향</h4>{renderMultiline(explanation.sections.upright, 'upright')}</section>
            <section><h4>역방향</h4>{renderMultiline(explanation.sections.reversed, 'reversed')}</section>
            <section><h4>연애/관계</h4>{renderMultiline(explanation.sections.love, 'love')}</section>
            <section><h4>일/학업</h4>{renderMultiline(explanation.sections.career, 'career')}</section>
            <section><h4>실전 조언</h4>{renderMultiline(explanation.sections.advice, 'advice')}</section>
          </div>
        )}
      </article>
    </section>
  );
}
