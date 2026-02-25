import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen } from 'lucide-react';
import styles from './Home.module.css';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      {/* 히어로 섹션 */}
      <section className={styles.hero}>
        <h2 className={styles.heroTitle}>Arcane Knowledge<br />& Tarot Mastery</h2>
        <p className={styles.heroSub}>
          당신의 운명을 읽고, 타로의 깊은 상징을 배우는 지혜의 성소에 오신 것을 환영합니다.
          무엇을 먼저 시작하시겠습니까?
        </p>
      </section>

      {/* 메인 관문 */}
      <div className={styles.portalGrid}>

        {/* 아르카나 성소 */}
        <div className={styles.portalCard} onClick={() => navigate('/mastery')}>
          <div className={styles.cardIcon}>
            <Sparkles size={56} strokeWidth={1.2} />
          </div>
          <h3 className={styles.cardTitle}>아르카나 성소</h3>
          <p className={styles.cardDesc}>
            AI 사서와 대화하며 당신의 운명을 읽고,<br />
            실시간 상담과 심화 학습을 동시에 경험하세요.
          </p>
          <span className={styles.ctaPrimary}>입장하기</span>
        </div>

        {/* 카드 도서관 */}
        <div className={styles.portalCard} onClick={() => navigate('/cards')}>
          <div className={styles.cardIcon}>
            <BookOpen size={56} strokeWidth={1.2} />
          </div>
          <h3 className={styles.cardTitle}>카드 도서관</h3>
          <p className={styles.cardDesc}>
            78장의 타로 카드에 담긴 고대의 상징과<br />
            깊은 지혜를 체계적으로 탐구해 보세요.
          </p>
          <span className={styles.ctaSecondary}>지식 탐구하기</span>
        </div>

      </div>
    </div>
  );
}
