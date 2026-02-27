import React, { useEffect, useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import styles from './Cards.module.css';

type Card = {
  id: string;
  name: string;
  nameKo: string;
  keywords: string[];
  summary: string;
  image: string;
  description: string;
  symbolism?: string;
  meanings: {
    love: string;
    career: string;
    finance: string;
    advice: string;
  };
  reversed: {
    summary: string;
    love: string;
    career: string;
    finance: string;
    advice: string;
  };
};

type FilterKey = 'all' | 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'major', label: '메이저 아르카나' },
  { key: 'wands', label: '완드' },
  { key: 'cups', label: '컵' },
  { key: 'swords', label: '소드' },
  { key: 'pentacles', label: '펜타클' },
];

function matchFilter(card: Card, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  const id = card.id.toLowerCase();
  if (filter === 'major') return id.startsWith('m') || /^(major|fool|magician|high|empress|emperor|hierophant|lovers|chariot|strength|hermit|wheel|justice|hanged|death|temperance|devil|tower|star|moon|sun|judgement|world)/.test(id);
  if (filter === 'wands') return id.startsWith('w') || id.includes('wand');
  if (filter === 'cups') return id.startsWith('c') || id.includes('cup');
  if (filter === 'swords') return id.startsWith('s') || id.includes('sword');
  if (filter === 'pentacles') return id.startsWith('p') || id.includes('pentacle') || id.includes('coin');
  return true;
}

export function Cards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    fetch('/api/cards')
      .then(res => res.json())
      .then(data => setCards(data));
  }, []);

  // ESC key to close modal
  useEffect(() => {
    if (!selectedCard) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCard(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedCard]);

  const filtered = cards.filter(card => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      card.nameKo.toLowerCase().includes(q) ||
      card.name.toLowerCase().includes(q) ||
      card.keywords.some(k => k.toLowerCase().includes(q));
    return matchSearch && matchFilter(card, filter);
  });

  const skeletonCount = 12;

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>신비의 카드 도서관</h2>
      <p className={styles.pageSubtitle}>78장 타로 카드의 깊은 상징과 역방향의 지혜를 탐구하세요.</p>

      {/* 검색 */}
      <div className={styles.searchBar}>
        <div className={styles.searchInputWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="카드 이름, 키워드로 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 필터 탭 */}
      <div className={styles.filterTabs}>
        {FILTER_LABELS.map(({ key, label }) => (
          <button
            key={key}
            className={`${styles.filterTab} ${filter === key ? styles.filterTabActive : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 그리드 */}
      <div className={styles.grid}>
        {cards.length === 0
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))
          : filtered.length === 0
          ? (
            <div className={styles.emptyState}>
              <p>검색 결과가 없습니다.</p>
            </div>
          )
          : filtered.map(card => (
            <div
              key={card.id}
              className={styles.cardItem}
              onClick={() => setSelectedCard(card)}
            >
              <div className={styles.cardImageWrapper}>
                <img
                  src={card.image}
                  alt={card.nameKo}
                  className={styles.cardImage}
                  loading="lazy"
                />
              </div>
              <div className={styles.cardInfo}>
                <h3 className={styles.cardNameKo}>{card.nameKo}</h3>
                <p className={styles.cardKeywords}>{card.keywords.slice(0, 3).join(' · ')}</p>
              </div>
            </div>
          ))
        }
      </div>

      {/* 라이선스 */}
      <div className={styles.licenseFooter}>
        <p className={styles.licenseText}>
          <strong>이미지 라이선스 정보</strong><br />
          본 서비스에서 사용된 타로 카드 이미지는 1909년 아서 에드워드 웨이트와 파멜라 콜먼 스미스가 제작한{' '}
          <strong>Rider-Waite-Smith Tarot</strong> 덱입니다.<br />
          이 이미지는 저작권 보호 기간이 만료된 <strong>퍼블릭 도메인(Public Domain)</strong> 저작물입니다.<br />
          이미지 출처:{' '}
          <a href="https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot" target="_blank" rel="noreferrer">
            Wikimedia Commons
          </a>
        </p>
      </div>

      {/* 모달 */}
      {selectedCard && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCard(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>

            {/* 닫기 버튼 */}
            <button className={styles.closeBtn} onClick={() => setSelectedCard(null)}>
              <X size={16} />
            </button>

            {/* 왼쪽: 이미지 */}
            <div className={styles.modalImagePanel}>
              <img src={selectedCard.image} alt={selectedCard.nameKo} className={styles.modalImage} />
              <div className={styles.modalCardMeta}>
                <h1 className={styles.modalCardNameKo}>{selectedCard.nameKo}</h1>
                <p className={styles.modalCardName}>{selectedCard.name.toUpperCase()}</p>
                <div className={styles.modalKeywords}>
                  {selectedCard.keywords.map(k => (
                    <span key={k} className={styles.modalKeywordTag}>#{k}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* 오른쪽: 텍스트 */}
            <div className={styles.modalTextPanel}>
              <section className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>카드의 서사</h3>
                <p className={styles.modalSectionText}>{selectedCard.description}</p>
              </section>

              {selectedCard.symbolism && (
                <section className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>주요 상징 분석</h3>
                  <p className={styles.symbolismBox}>{selectedCard.symbolism}</p>
                </section>
              )}

              <div className={styles.meaningsGrid}>
                {/* 정방향 */}
                <div className={styles.uprightBox}>
                  <h3 className={styles.uprightTitle}>↑ 정방향 (Upright)</h3>
                  <div className={styles.meaningRow}>
                    <span className={`${styles.meaningLabel} ${styles.labelLove}`}>[연애]</span>{' '}
                    {selectedCard.meanings.love}
                  </div>
                  <div className={styles.meaningRow}>
                    <span className={`${styles.meaningLabel} ${styles.labelCareer}`}>[직업]</span>{' '}
                    {selectedCard.meanings.career}
                  </div>
                  <div className={styles.meaningRow}>
                    <span className={`${styles.meaningLabel} ${styles.labelFinance}`}>[금전]</span>{' '}
                    {selectedCard.meanings.finance}
                  </div>
                  <div className={`${styles.adviceBox} ${styles.adviceBoxUpright}`}>
                    <span className={styles.adviceLabelUpright}>💡 조언:</span><br />
                    {selectedCard.meanings.advice}
                  </div>
                </div>

                {/* 역방향 */}
                <div className={styles.reversedBox}>
                  <h3 className={styles.reversedTitle}>↓ 역방향 (Reversed)</h3>
                  <p className={styles.reversedSummary}>"{selectedCard.reversed.summary}"</p>
                  <div className={styles.meaningRow}>
                    <span className={`${styles.meaningLabel} ${styles.labelLove}`}>[연애]</span>{' '}
                    {selectedCard.reversed.love}
                  </div>
                  <div className={styles.meaningRow}>
                    <span className={`${styles.meaningLabel} ${styles.labelCareer}`}>[직업]</span>{' '}
                    {selectedCard.reversed.career}
                  </div>
                  <div className={styles.meaningRow}>
                    <span className={`${styles.meaningLabel} ${styles.labelFinance}`}>[금전]</span>{' '}
                    {selectedCard.reversed.finance}
                  </div>
                  <div className={`${styles.adviceBox} ${styles.adviceBoxReversed}`}>
                    <span className={styles.adviceLabelReversed}>💡 조언:</span><br />
                    {selectedCard.reversed.advice}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
