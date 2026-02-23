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
    { id: 'all', label: '전체' },
    { id: 'decision', label: '결단 (V자형)' },
    { id: 'goal', label: '목표 (화살표형)' },
    { id: 'relationship', label: '관계 (다이아몬드형)' },
    { id: 'recovery', label: '치유 (역삼각형)' },
    { id: 'strategy', label: '전략 (십자형)' }
  ];

  const groupedSpreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = spreads.filter((s) => {
      const text = `${s.name} ${s.purpose} ${s.whenToUse.join(' ')}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (filter === 'all') return true;
      return (s as any).category === filter;
    });

    // Group by category if 'all' is selected
    if (filter === 'all') {
      const groups: Record<string, typeof spreads> = {};
      filtered.forEach((s: any) => {
        const cat = s.category || 'general';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(s);
      });
      return groups;
    }
    return { [filter]: filtered };
  }, [spreads, filter, query]);

  return (
    <div className="spread-library">
      <div className="filters library-filters">
        <div className="chip-wrap" style={{ flex: '1 1 100%', marginBottom: '1rem' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`chip-link ${filter === cat.id ? 'chip-on' : ''}`}
              onClick={() => setFilter(cat.id as any)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="스프레드 이름 또는 실생활 고민 검색 (예: 이직, 구매)"
          className="search-input"
          style={{ width: '100%' }}
        />
      </div>

      <div className="spread-library-content">
        {Object.entries(groupedSpreads).map(([catId, list]) => (
          <div key={catId} className="spread-category-group">
            <h4 className="category-title">{categories.find(c => c.id === catId)?.label || '기타'}</h4>
            <div className="spread-grid-list">
              {list.map((spread) => (
                <button
                  key={spread.id}
                  className="spread-catalog-card"
                  onClick={() => onSelect(spread.id)}
                >
                  <div className="spread-catalog-header">
                    <strong>{spread.name}</strong>
                    <span className="badge">{spread.cardCount}장</span>
                  </div>
                  <p className="sub spread-catalog-desc">{spread.purpose}</p>
                  <div className="spread-tag-wrap">
                    {spread.whenToUse.slice(0, 2).map((use, idx) => (
                      <span key={idx} className="evidence-chip" style={{ fontSize: '0.7rem' }}>{use}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(groupedSpreads).length === 0 && <p className="empty-state">검색 결과가 없습니다.</p>}
      </div>
    </div>
  );
}
