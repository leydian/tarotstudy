import React from 'react';
import { Card } from '../../types/tarot';
import styles from './TarotCard.module.css';

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
  size = 'medium',
}) => {
  const sizeClass = {
    small: styles.cardSmall,
    medium: styles.cardMedium,
    large: styles.cardLarge,
  }[size];

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.flipContainer} ${sizeClass} ${isRevealed ? styles.revealed : ''}`}
        onClick={onClick}
      >
        <div className={`${styles.flipInner} ${isRevealed ? styles.flipped : ''}`}>
          {/* 뒷면 */}
          <div className={`${styles.cardFace} ${styles.cardBack}`}>
            <span className={styles.cardBackIcon}>?</span>
          </div>
          {/* 앞면 */}
          <div className={`${styles.cardFace} ${styles.cardFront}`}>
            <img src={card.image} alt={card.nameKo} />
          </div>
        </div>
      </div>

      <div className={styles.labelArea}>
        <div className={styles.posLabel}>{label}</div>
        <div className={`${styles.cardName} ${isRevealed ? styles.revealed : ''}`}>
          {isRevealed ? card.nameKo : '미공개'}
        </div>
      </div>
    </div>
  );
};
