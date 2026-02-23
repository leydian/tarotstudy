import { useState, useMemo } from 'react';

type Spread = {
  id: string;
  name: string;
  cardCount: number;
  purpose: string;
  whenToUse: string[];
  variants?: any[];
  layout?: { cols: number; rows: number };
};

interface Props {
  spreads: Spread[];
  onSelect: (id: string) => void;
}

export function SpreadLibrary({ spreads, onSelect }: Props) {
  const [filter, setFilter] = useState<'all' | 'daily' | 'strategy' | 'decision' | 'relationship' | 'goal' | 'fortune'>('all');
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
    if (!spreads || spreads.length === 0) return {};
    
    const q = query.trim().toLowerCase();
    
    const filtered = spreads.filter((s) => {
      const text = `${s.name} ${s.purpose} ${s.whenToUse?.join(' ') || ''}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (filter === 'all') return true;
      return (s as any).category === filter;
    });

    const groups: Record<string, typeof spreads> = {};
    filtered.forEach((s: any) => {
      const cat = s.category || 'daily';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    
    if (filter !== 'all') {
      return { [filter]: groups[filter] || [] };
    }

    const sortedGroups: Record<string, typeof spreads> = {};
    categories.forEach(cat => {
      if (cat.id !== 'all' && groups[cat.id] && groups[cat.id].length > 0) {
        sortedGroups[cat.id] = groups[cat.id];
      }
    });

    Object.keys(groups).forEach(key => {
      if (!sortedGroups[key] && groups[key].length > 0) {
        sortedGroups[key] = groups[key];
      }
    });

    return sortedGroups;
  }, [spreads, filter, query]);

  return (
    <div className="spread-library">
      <div className="filters library-filters">
        <div className="chip-wrap view-mode-tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`chip-link ${filter === cat.id ? 'chip-on' : ''}`}
              onClick={() => setFilter(cat.id as any)}
            >
              <span className="cat-icon" aria-hidden="true">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
        <div className="spread-library-search-container">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="어떤 고민이 있으신가요? (예: 재회, 이직, 합격...)"
            className="search-input"
            aria-label="스프레드 검색"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="spread-library-clear-btn"
              aria-label="검색어 지우기"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="spread-library-content">
        {Object.entries(groupedSpreads).map(([catId, list]) => (
          list.length > 0 && (
            <div key={catId} className="spread-category-group">
              <h4 className="category-title">
                {categories.find(c => c.id === catId)?.icon || '✦'} {categories.find(c => c.id === catId)?.label || catId}
              </h4>
              <div className="spread-grid-list">
                {list.map((spread) => (
                  <button
                    key={spread.id}
                    className="spread-catalog-card"
                    onClick={() => onSelect(spread.id)}
                  >
                    <div className="spread-catalog-header">
                      <div className="spread-library-header-meta">
                        <strong>{spread.name}</strong>
                        <span className="spread-variant-highlight">
                          {spread.variants?.length ? `⚡︎ ${spread.variants.length + 1}개의 해석 모드` : '기본 모드'}
                        </span>
                      </div>
                      <span className="badge spread-catalog-badge">{spread.cardCount}장</span>
                    </div>
                    <p className="sub spread-catalog-desc">{spread.purpose}</p>
                    <div className="spread-tag-wrap">
                      {spread.whenToUse?.slice(0, 3).map((use, idx) => (
                        <span key={idx} className="evidence-chip">
                          #{use}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        ))}
        {Object.keys(groupedSpreads).length === 0 && (
          <div className="empty-state">
            <p className="empty-title">검색 결과가 없습니다.</p>
            <p className="sub">다른 키워드로 검색하거나 카테고리를 변경해 보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
