import React from 'react';
import { Card } from '../../types/tarot';

interface TarotCardProps {
  card: Card;
  isRevealed: boolean;
  label: string;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  isStudyMode?: boolean;
}

export const TarotCard: React.FC<TarotCardProps> = ({ 
  card, 
  isRevealed, 
  label, 
  onClick, 
  size = 'medium' 
}) => {
  const dimensions = {
    small: { width: '80px', height: '140px' },
    medium: { width: '100px', height: '180px' },
    large: { width: '130px', height: '230px' }
  }[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
      <div 
        onClick={onClick} 
        style={{ 
          ...dimensions,
          perspective: '1000px', 
          cursor: isRevealed ? 'default' : 'pointer'
        }}
      >
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          height: '100%', 
          transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
          transformStyle: 'preserve-3d', 
          transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)' 
        }}>
          {/* 뒷면 */}
          <div style={{ 
            position: 'absolute', width: '100%', height: '100%', 
            backfaceVisibility: 'hidden', 
            backgroundColor: 'rgba(255,255,255,0.03)', 
            borderRadius: '8px', 
            border: '1px solid var(--border-gold)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <span style={{ fontSize: '1.8rem', opacity: 0.4, color: 'var(--accent-gold)' }}>?</span>
          </div>
          {/* 앞면 */}
          <div style={{ 
            position: 'absolute', width: '100%', height: '100%', 
            backfaceVisibility: 'hidden', 
            transform: 'rotateY(180deg)', 
            borderRadius: '8px', 
            overflow: 'hidden', 
            border: '1px solid var(--accent-gold)', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)' 
          }}>
            <img src={card.image} alt={card.nameKo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--accent-gold)', fontWeight: '500', letterSpacing: '1px' }}>{label}</div>
        <div style={{ fontSize: '0.8rem', color: isRevealed ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {isRevealed ? card.nameKo : '미공개'}
        </div>
      </div>
    </div>
  );
};
