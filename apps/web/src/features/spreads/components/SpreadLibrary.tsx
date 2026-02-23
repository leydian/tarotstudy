import { useState, useMemo } from 'react';

type Spread = {
  id: string;
  name: string;
  cardCount: number;
  purpose: string;
  whenToUse: string[];
  layout?: { cols: number; rows: number };
};

interface Props {
  spreads: Spread[];
  onSelect: (id: string) => void;
}

export function SpreadLibrary({ spreads, onSelect }: Props) {
  const [filter, setFilter] = useState<'all' | 'relationship' | 'career' | 'finance' | 'general'>('all');
  const [query, setQuery] = useState('');

  const categories = [
    { id: 'all', label: '전체', icon: '✦' },
    { id: 'daily', label: '오늘/메시지', icon: '🎴' },
    { id: 'strategy', label: '흐름/전략 (3카드)', icon: '➞' },
    { id: 'decision', label: '선택/구매 (V자형)', icon: '∨' },
    { id: 'relationship', label: '연애/재회 (다이아몬드)', icon: '⬥' },
    { id: 'goal', label: '합격/성공 (계단형)', icon: '⤍' },
    { id: 'fortune', label: '운세/순환 (원형)', icon: '○' }
  ];

  const groupedSpreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = spreads.filter((s) => {
      const text = `${s.name} ${s.purpose} ${s.whenToUse.join(' ')}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (filter === 'all') return true;
      return (s as any).category === filter;
    });

    const groups: Record<string, typeof spreads> = {};
    filtered.forEach((s: any) => {
      const cat = s.category || 'general';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    
    // Sort groups based on category list order
    const sortedGroups: Record<string, typeof spreads> = {};
    categories.forEach(cat => {
      if (groups[cat.id]) sortedGroups[cat.id] = groups[cat.id];
    });
    return sortedGroups;
  }, [spreads, filter, query]);

  return (
    <div className="spread-library">
      <div className="filters library-filters">
        <div className="chip-wrap" style={{ flex: '1 1 100%', marginBottom: '1.5rem', justifyContent: 'center' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`chip-link ${filter === cat.id ? 'chip-on' : ''}`}
              onClick={() => setFilter(cat.id as any)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span style={{ opacity: 0.7 }}>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="고민 내용으로 찾기 (예: 재회, 합격, 퇴사 고민...)"
          className="search-input"
          style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}
        />
      </div>

      <div className="spread-library-content">
        {Object.entries(groupedSpreads).map(([catId, list]) => (
          <div key={catId} className="spread-category-group">
            <h4 className="category-title">
              {categories.find(c => c.id === catId)?.icon} {categories.find(c => c.id === catId)?.label}
            </h4>
            <div className="spread-grid-list">
              {list.map((spread) => (
                <button
                  key={spread.id}
                  className="spread-catalog-card"
                  onClick={() => onSelect(spread.id)}
                >
                  <div className="spread-catalog-header">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{spread.name}</strong>
                      <span className="sub" style={{ fontSize: '0.75rem', color: 'var(--brand-1)' }}>
                        {spread.variants?.length ? `⚡︎ ${spread.variants.length + 1}개의 해석 모드 지원` : '기본 모드'}
                      </span>
                    </div>
                    <span className="badge" style={{ alignSelf: 'flex-start' }}>{spread.cardCount}장</span>
                  </div>
                  <p className="sub spread-catalog-desc">{spread.purpose}</p>
                  <div className="spread-tag-wrap">
                    {spread.whenToUse.map((use, idx) => (
                      <span key={idx} className="evidence-chip" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                        #{use}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(groupedSpreads).length === 0 && (
          <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
            <p>검색 결과가 없습니다. 다른 키워드로 검색해 보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
