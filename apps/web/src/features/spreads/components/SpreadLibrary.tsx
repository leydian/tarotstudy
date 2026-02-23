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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return spreads.filter((s) => {
      const text = `${s.name} ${s.purpose} ${s.whenToUse.join(' ')}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      
      if (filter === 'all') return true;
      if (filter === 'relationship') return /연애|관계|재회|상대|갈등|대화/.test(text);
      if (filter === 'career') return /커리어|취업|이직|직장|면접|시험|합격|공부/.test(text);
      if (filter === 'finance') return /재물|금전|투자|매매|돈|수입|지출/.test(text);
      return true; // general fallback or match nothing if strict
    });
  }, [spreads, filter, query]);

  return (
    <div className="spread-library">
      <div className="filters library-filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="all">전체 주제</option>
          <option value="relationship">관계/연애</option>
          <option value="career">커리어/학업</option>
          <option value="finance">금전/재물</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="스프레드 이름 또는 설명 검색"
          className="search-input"
        />
      </div>

      <div className="spread-grid-list">
        {filtered.map((spread) => (
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
            <div className="spread-mini-layout">
              {/* Simple visual representation if needed */}
              <span className="mini-layout-info">{spread.layout?.rows}x{spread.layout?.cols}</span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <p className="empty-state">검색 결과가 없습니다.</p>}
      </div>
    </div>
  );
}
