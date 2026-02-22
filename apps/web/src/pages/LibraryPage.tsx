import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ImageAttributionNotice, TarotImage } from '../components/TarotImage';

export function LibraryPage() {
  const [q, setQ] = useState('');
  const [arcana, setArcana] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [viewLevel, setViewLevel] = useState<'beginner' | 'intermediate'>('beginner');

  const cardsQuery = useQuery({
    queryKey: ['cards', arcana, difficulty, q],
    queryFn: () => api.getCards({ arcana, difficulty, q })
  });

  const cards = useMemo(() => cardsQuery.data ?? [], [cardsQuery.data]);

  return (
    <section className="stack">
      <article className="panel">
        <h2>카드 도감</h2>
        <p>카드별 이미지와 3줄 이상 학습 설명을 제공합니다. 관점을 바꿔 차이를 비교하세요.</p>
        <ImageAttributionNotice attribution={cards[0]?.imageAttribution} />
        <div className="filters">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="카드명/키워드 검색" />
          <select value={arcana} onChange={(e) => setArcana(e.target.value)}>
            <option value="">아르카나 전체</option>
            <option value="major">메이저</option>
            <option value="minor">마이너</option>
          </select>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">난이도 전체</option>
            <option value="beginner">입문</option>
            <option value="intermediate">중급</option>
          </select>
          <select value={viewLevel} onChange={(e) => setViewLevel(e.target.value as 'beginner' | 'intermediate')}>
            <option value="beginner">입문 관점 설명</option>
            <option value="intermediate">중급 관점 설명</option>
          </select>
        </div>
      </article>

      {cardsQuery.isLoading && <p>카드 로딩 중...</p>}
      {cardsQuery.isError && <p>카드를 불러오지 못했습니다.</p>}

      <div className="card-grid">
        {cards.map((card) => {
          const lines = (card.descriptions[viewLevel] || '').split('\n').filter(Boolean);
          return (
            <article key={card.id} className="panel tarot-card-item">
              <div className="tarot-row">
                <TarotImage
                  src={card.imageUrl}
                  sources={card.imageSources}
                  cardId={card.id}
                  alt={card.nameKo}
                  className="tarot-thumb"
                  loading="lazy"
                />
                <div>
                  <p className="badge">{card.arcana === 'major' ? '메이저' : card.suitKo}</p>
                  <h3>{card.nameKo}</h3>
                  <p className="sub">{card.name}</p>
                  <p>키워드: {card.keywords.join(' · ')}</p>
                </div>
              </div>

              <div className="description-box">
                {lines.slice(0, 4).map((line, idx) => (
                  <p key={`${card.id}-line-${idx}`}>{line}</p>
                ))}
              </div>

              <div className="hero-actions">
                <Link className="btn" to={`/cards/${card.id}`}>상세 해설 보기</Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
