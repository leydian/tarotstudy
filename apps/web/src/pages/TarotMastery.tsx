import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Send, RefreshCw } from 'lucide-react';
import { Card, Spread, Message, ReadingResponse } from '../types/tarot';
import { tarotApi } from '../services/tarotService';
import { TarotCard } from '../components/common/TarotCard';
import { MessageBubble } from '../components/reading/MessageBubble';
import styles from './TarotMastery.module.css';

export function TarotMastery() {
  const [step, setStep] = useState<'input' | 'reading' | 'result'>('input');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "어서 오세요. 이곳은 운명과 지혜가 만나는 '아르카나 성소'입니다. 오늘 당신의 영혼이 찾고 있는 답은 무엇인가요? 질문을 들려주시면 운명의 지도를 그려드릴게요." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);
  const [spreadLayout, setSpreadLayout] = useState<Spread | null>(null);
  const [revealedIdx, setRevealedIdx] = useState<number[]>([]);
  const [reading, setReading] = useState<ReadingResponse | null>(null);
  const [isStudyMode, setIsStudyMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  const positionDefinitions: { [key: string]: string } = {
    "핵심 조언": "이 자리는 당신의 질문에 대한 가장 본질적이고 근원적인 답을 상징합니다.",
    "현재 상황": "지금 당신이 처한 현실적인 환경과 당신의 표면적인 상태를 보여줍니다.",
    "다가올 변화": "머지않아 당신에게 찾아올 새로운 사건이나 에너지의 흐름을 의미합니다.",
    "과거의 풍경": "이 질문이 시작된 원인, 배경, 그리고 당신이 지나온 길을 상징합니다.",
    "현재의 모습": "지금 당신의 마음가짐과 현실에서 가장 크게 작용하고 있는 힘을 뜻합니다.",
    "미래의 빛": "현재의 흐름이 이어졌을 때 도달하게 될 최종 결과와 운명의 방향입니다.",
    "선택 A의 길": "첫 번째 선택지를 택했을 때 펼쳐질 미래의 시나리오와 기운을 보여줍니다.",
    "선택 B의 길": "두 번째 선택지를 택했을 때 마주하게 될 상황과 결과의 흐름입니다.",
    "과거": "당신이 지나온 여정과 지금의 상황을 만든 뿌리 깊은 원인을 상징합니다.",
    "현재": "지금 이 순간 당신의 에너지가 집중되어 있는 핵심적인 지점입니다.",
    "미래": "현재의 흐름이 계속될 때 마주하게 될 운명적인 결과입니다.",
    "핵심": "전체 리딩을 관통하는 가장 중요한 주제이자 조언의 중심입니다.",
    "기반": "당신이 딛고 서 있는 토대이며, 이번 질문의 근저에 깔린 무의식적 배경입니다.",
    "과거/기반": "당신이 딛고 온 과거의 행적과 이번 질문이 시작된 가장 본질적인 뿌리를 의미합니다.",
    "현재/중심": "지금 당신이 가장 집중해야 할 핵심적인 에너지와 현재 상황의 가장 뜨거운 지점입니다.",
    "미래/흐름": "현재의 기운이 이어졌을 때 당신이 마주하게 될 운명적인 결과와 앞으로의 방향성입니다.",
    "현실적 장애": "당신이 목표를 향해 나아가는 길을 가로막고 있는 실질적인 난관과 심리적 걸림돌입니다.",
    "성공의 열쇠": "모든 문제를 해결하고 원하는 결과를 얻기 위해 당신이 반드시 취해야 할 핵심적인 태도나 방법입니다.",
    "잠재적 재능": "당신이 인지하지 못하고 있거나 아직 충분히 발휘되지 않은, 상황을 반전시킬 수 있는 내면의 힘입니다.",
    "숨겨진 기회": "예상치 못한 곳에서 찾아오는 운명적인 행운이나 당신에게 유리하게 작용할 환경의 변화입니다."
  };

  const handleStartRitual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuestion = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userQuestion }]);
    setLoading(true);
    setInput('');

    try {
      const relationshipKeywords = ['속마음', '그 사람', '연애', '사랑', '재회', '커플', '썸'];
      const careerKeywords = ['이직', '취업', '퇴사', '직장', '승진', '회사', '합격', '공부'];
      const choiceKeywords = ['할까', '말까', 'vs', '또는', '중에서'];
      const timingKeywords = ['언제', '몇월', '시기', '날짜'];

      let targetCardCount = 3;
      if (relationshipKeywords.some(k => userQuestion.includes(k))) targetCardCount = 7;
      else if (careerKeywords.some(k => userQuestion.includes(k))) targetCardCount = 5;
      else if (choiceKeywords.some(k => userQuestion.includes(k))) targetCardCount = 2;
      else if (timingKeywords.some(k => userQuestion.includes(k))) targetCardCount = 3;
      else if (userQuestion.length > 30) targetCardCount = 10;

      const [allSpreads, allCards] = await Promise.all([
        tarotApi.getSpreads(),
        tarotApi.getCards()
      ]);

      const currentSpread = (targetCardCount === 7 ? allSpreads.find(s => s.id === 'relationship') :
                            targetCardCount === 5 ? allSpreads.find(s => s.id === 'career-path') : null)
                            || allSpreads.find(s => s.positions.length === targetCardCount)
                            || allSpreads[0];

      setSpreadLayout(currentSpread);

      const shuffled = [...allCards].sort(() => 0.5 - Math.random());
      const selectedCards = shuffled.slice(0, currentSpread.positions.length);
      setDrawnCards(selectedCards);

      const readingData = await tarotApi.getReading(selectedCards.map(c => c.id), userQuestion);
      setReading(readingData);

      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text: `질문에 맞춰 [${currentSpread.name}] 스프레드를 구성했습니다. 운명의 지도가 펼쳐집니다...` }]);
        setStep('reading');
        setLoading(false);

        selectedCards.forEach((_, i) => {
          setTimeout(() => {
            internalReveal(i, readingData, currentSpread, selectedCards);
          }, 1000 * (i + 1));
        });
      }, 1000);

    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: '운명의 실타래가 엉켰습니다. 잠시 후 다시 시도해 주세요.' }]);
      setLoading(false);
    }
  };

  const internalReveal = (idx: number, data: ReadingResponse, spread: Spread, cards: Card[]) => {
    setRevealedIdx(prev => {
      if (prev.includes(idx)) return prev;
      const next = [...prev, idx];
      if (next.length === cards.length) {
        setTimeout(() => setStep('result'), 1500);
      }
      return next;
    });

    const posLabel = spread.positions[idx].label;
    const interpretation = data.evidence[idx]?.split(']')[1] || '';

    setMessages(prev => [...prev, {
      role: 'bot',
      text: `[${posLabel}: ${cards[idx].nameKo}]\n${interpretation.trim().replace(/\.\.$/, '.')}`
    }]);
  };

  const revealCard = (idx: number) => {
    if (!revealedIdx.includes(idx) && reading && spreadLayout && drawnCards) {
      internalReveal(idx, reading, spreadLayout, drawnCards);
    }
  };

  const getPositionInfo = (idx: number) => {
    const posLabel = spreadLayout?.positions[idx].label || "";
    const posDesc = positionDefinitions[posLabel] || "운명의 중요한 단계입니다.";
    const card = drawnCards[idx];
    return { posLabel, posDesc, card };
  };

  const handleReset = () => {
    setStep('input');
    setReading(null);
    setMessages([{ role: 'bot', text: '새로운 의식을 시작할 준비가 되었습니다. 무엇이 궁금하신가요?' }]);
    setRevealedIdx([]);
    setDrawnCards([]);
    setSpreadLayout(null);
    setIsStudyMode(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.sanctuary}>

        {/* 패널 헤더 */}
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>
            <Sparkles size={18} />
            아르카나 성소
          </h3>
          <div className={styles.headerActions}>
            {step === 'result' && (
              <button
                onClick={() => {
                  const nextMode = !isStudyMode;
                  setIsStudyMode(nextMode);
                  if (nextMode) {
                    setMessages(prev => [...prev, { role: 'bot', text: "✨ 학습 모드가 활성화되었습니다. 이번 리딩에 사용된 카드들의 깊은 상징을 분석해 드릴게요." }]);
                    drawnCards.forEach((card, i) => {
                      setTimeout(() => {
                        const info = getPositionInfo(i);
                        setMessages(prev => [...prev, {
                          role: 'bot',
                          text: `[심화 학습: ${card.nameKo}]\n\n◈ ${info.posLabel}의 의미: ${info.posDesc}\n\n◈ 카드 본질 상징: ${card.description || card.summary}\n\n◈ 핵심 키워드: ${card.keywords?.join(', ') || ''}`
                        }]);
                      }, 600 * (i + 1));
                    });
                  }
                }}
                className={`${styles.studyToggle} ${isStudyMode ? styles.studyToggleOn : styles.studyToggleOff}`}
              >
                학습 모드 {isStudyMode ? 'ON' : 'OFF'}
              </button>
            )}
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className={styles.messages}>
          {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}

          {/* 로딩 도트 */}
          {loading && (
            <div className={styles.typingWrapper}>
              <div className={styles.typingBubble}>
                <div className={styles.typingDots}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          {/* 카드 스프레드 */}
          {(step === 'reading' || step === 'result') && spreadLayout && (
            <div 
              className={styles.spreadCanvas}
              style={{ 
                minHeight: (spreadLayout.positions && spreadLayout.positions.length > 0)
                  ? Math.max(480, (Math.max(...spreadLayout.positions.map(p => Math.abs(p.y))) * 2 * 0.7) + 300) + 'px'
                  : '480px'
              }}
            >
              <div className={styles.spreadCenter}>
                {spreadLayout.positions.map((pos, idx) => (
                  <div
                    key={pos.id}
                    style={{
                      position: 'absolute',
                      left: `${pos.x * 0.7}px`,
                      top: `${pos.y * 0.7}px`,
                      transform: 'translate(-50%, -50%)',
                      transition: 'all 0.5s ease-out'
                    }}
                  >
                    <TarotCard
                      card={drawnCards[idx]}
                      isRevealed={revealedIdx.includes(idx)}
                      label={pos.label}
                      onClick={() => revealCard(idx)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 리딩 결과 */}
          {step === 'result' && reading && (
            <div className={styles.resultSection}>
              <div className={styles.masterReport}>
                <h3 className={styles.masterReportTitle}>
                  운명의 마스터 리포트
                </h3>
                <p className={styles.masterReportText}>{reading.conclusion}</p>
              </div>

              <div className={styles.arcanaGuidance}>
                <h4 className={styles.arcanaTitle}>
                  아르카나의 지침
                </h4>
                <div className={styles.arcanaList}>
                  {reading.action.map((act, i) => (
                    <div key={i} className={styles.arcanaItem}>
                      <span className={styles.arcanaItemBullet}>●</span>
                      <p className={styles.arcanaItemText}>{act}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.newQuestionRow}>
                <button onClick={handleReset} className={styles.newQuestionBtn}>
                  <RefreshCw size={18} />
                  새로운 질문하기
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 */}
        {step === 'input' && (
          <form onSubmit={handleStartRitual} className={styles.inputForm}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="운명의 도서관 사서에게 질문을 던져보세요..."
              className={styles.inputField}
            />
            <button type="submit" disabled={loading} className={styles.submitBtn}>
              <Send size={16} />
              의식 시작
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
