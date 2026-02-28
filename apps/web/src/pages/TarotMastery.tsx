import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, Send, RefreshCw } from 'lucide-react';
import { Card, Spread, Message, ReadingResponse } from '../types/tarot';
import { tarotApi } from '../services/tarotService';
import { trackEvent } from '../services/analytics';
import { TarotCard } from '../components/common/TarotCard';
import { MessageBubble } from '../components/reading/MessageBubble';
import styles from './TarotMastery.module.css';

export function TarotMastery() {
  const [step, setStep] = useState<'input' | 'reading' | 'result'>('input');
  const [resultTab, setResultTab] = useState<'report' | 'study'>('report');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "어서 오세요. 이곳은 운명과 지혜가 만나는 '아르카나 성소'입니다. 오늘 당신의 영혼이 찾고 있는 답은 무엇인가요? 질문을 들려주시면 운명의 지도를 그려드릴게요." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);
  const [spreadLayout, setSpreadLayout] = useState<Spread | null>(null);
  const [revealedIdx, setRevealedIdx] = useState<number[]>([]);
  const [reading, setReading] = useState<ReadingResponse | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const revealTimersRef = useRef<number[]>([]);
  const debugMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('debug') === '1';
  }, []);
  const showDiagnostics = debugMode || import.meta.env.DEV;

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages, step, resultTab]);
  useEffect(() => () => {
    revealTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    revealTimersRef.current = [];
  }, []);

  const queueTimer = (cb: () => void, ms: number) => {
    const timerId = window.setTimeout(cb, ms);
    revealTimersRef.current.push(timerId);
  };

  const clearRevealTimers = () => {
    revealTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    revealTimersRef.current = [];
  };

  const positionDefinitions: { [key: string]: string } = {
    // ... 기존 정의 ...
  };

  const handleStartRitual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuestion = input.trim();
    clearRevealTimers();
    setRevealedIdx([]);
    setDrawnCards([]);
    setSpreadLayout(null);
    setReading(null);
    setMessages(prev => [...prev, { role: 'user', text: userQuestion }]);
    setLoading(true);
    setInput('');

    try {
      const profile = await tarotApi.getQuestionProfile(userQuestion);
      const targetCardCount = profile.targetCardCount;
      const trackedQuestionType = profile.questionType;
      trackEvent('question_submitted', { questionType: trackedQuestionType, mode: 'hybrid' });

      const [allSpreads, allCards] = await Promise.all([
        tarotApi.getSpreads(),
        tarotApi.getCards()
      ]);

      const currentSpread = (targetCardCount === 7 ? allSpreads.find(s => s.id === 'relationship') :
                            targetCardCount === 5 ? allSpreads.find(s => s.id === 'career-path') :
                            targetCardCount === 2 ? allSpreads.find(s => s.id === 'choice') : null)
                            || allSpreads.find(s => s.positions.length === targetCardCount)
                            || allSpreads[0];

      setSpreadLayout(currentSpread);

      const shuffled = [...allCards].sort(() => 0.5 - Math.random());
      const selectedCards = shuffled.slice(0, currentSpread.positions.length);
      setDrawnCards(selectedCards);

      const recentQuestions = messages
        .filter(m => m.role === 'user')
        .slice(-3)
        .map(m => m.text);

      const readingData = await tarotApi.getReading(selectedCards.map(c => c.id), userQuestion, {
        mode: 'hybrid',
        structure: 'evidence_report',
        spreadId: currentSpread.id,
        sessionContext: { recentQuestions },
        debug: showDiagnostics
      });
      setReading(readingData);
      trackEvent('reading_result_shown', {
        questionType: readingData.meta?.questionType || trackedQuestionType,
        mode: readingData.mode || 'hybrid',
        fallbackUsed: !!readingData.fallbackUsed,
        spreadId: currentSpread.id
      });

      queueTimer(() => {
        setMessages(prev => [...prev, { role: 'bot', text: `질문에 맞춰 [${currentSpread.name}] 스프레드를 구성했습니다. 운명의 지도가 펼쳐집니다...` }]);
        setStep('reading');
        setLoading(false);

        selectedCards.forEach((_, i) => {
          queueTimer(() => {
            internalReveal(i, readingData, currentSpread, selectedCards);
          }, 1000 * (i + 1));
        });
      }, 1000);

    } catch (err) {
      trackEvent('reading_result_shown', { mode: 'hybrid', fallbackUsed: true, errorCode: 'ritual_start_failed' });
      setMessages(prev => [...prev, { role: 'bot', text: '운명의 실타래가 엉켰습니다. 잠시 후 다시 시도해 주세요.' }]);
      setLoading(false);
    }
  };

  const internalReveal = (idx: number, data: ReadingResponse, spread: Spread, cards: Card[]) => {
    setRevealedIdx(prev => {
      if (prev.includes(idx)) return prev;
      const next = [...prev, idx];
      if (next.length === cards.length) {
        queueTimer(() => setStep('result'), 1500);
      }
      return next;
    });

    const posLabel = spread.positions[idx].label;
    const reportEvidence = data.report?.evidence?.[idx];
    const reportInterpretation = reportEvidence
      ? [reportEvidence.claim, reportEvidence.rationale].filter(Boolean).join('\n')
      : '';
    const fallbackInterpretation = (data.evidence[idx] || '').split(']').slice(1).join(']').trim();
    const interpretation = reportInterpretation || fallbackInterpretation;

    setMessages(prev => [...prev, {
      role: 'bot',
      text: `[${posLabel}: ${cards[idx].nameKo}]\n${interpretation.trim().replace(/\.\.$/, '.') || '카드의 상징을 차분히 읽어보세요.'}`
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

  const verdictLabelKo = (label?: 'YES' | 'NO' | 'MAYBE') => {
    if (label === 'YES') return '긍정';
    if (label === 'NO') return '신중';
    return '유보';
  };

  const apiUsedLabel = (apiUsed?: 'anthropic' | 'openai' | 'fallback' | 'none') => {
    if (apiUsed === 'anthropic') return 'Anthropic';
    if (apiUsed === 'openai') return 'OpenAI(legacy)';
    if (apiUsed === 'fallback') return 'Fallback';
    return 'Unknown';
  };

  const responseModeLabel = (mode?: 'concise' | 'balanced' | 'creative') => {
    if (mode === 'concise') return 'Concise';
    if (mode === 'creative') return 'Creative';
    if (mode === 'balanced') return 'Balanced';
    return 'Unknown';
  };

  const normalizeForCompare = (text?: string) => String(text || '')
    .replace(/\[운명의 판정\][\s\S]*$/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();

  const getDistinctReportCopy = (data: ReadingResponse) => {
    const summary = data.report?.summary || '';
    const rationale = data.report?.verdict?.rationale || '';
    const conclusionNorm = normalizeForCompare(data.conclusion);
    const summaryDup = summary && conclusionNorm.includes(normalizeForCompare(summary));
    const rationaleDup = rationale && conclusionNorm.includes(normalizeForCompare(rationale));

    const firstEvidence = data.evidence?.[0]?.split('\n').pop()?.trim() || '';
    const firstAction = (data.action?.[0] || '').replace(/^\[운명의 지침 \d+\]\s*/, '').trim();

    const insightText = summaryDup
      ? (firstEvidence ? `핵심 카드 흐름으로 보면, ${firstEvidence}` : summary)
      : summary;

    const energyText = rationaleDup
      ? (firstAction ? `실천 에너지는 "${firstAction}" 쪽에 맞춰 두시면 좋습니다.` : rationale)
      : rationale;

    return {
      insightText: insightText || summary,
      energyText: energyText || rationale
    };
  };

  const getSpreadRenderConfig = (spread: Spread) => {
    const maxAbsX = Math.max(...spread.positions.map((p) => Math.abs(p.x)), 1);
    const maxAbsY = Math.max(...spread.positions.map((p) => Math.abs(p.y)), 1);
    const maxAbs = Math.max(maxAbsX, maxAbsY);

    // Keep large spreads visible without pushing the result panel out of view.
    const scale = Math.min(0.5, Math.max(0.28, 240 / maxAbs));
    const areaHeight = Math.min(420, Math.max(280, (maxAbsY * 2 * scale) + 120));
    return { scale, areaHeight };
  };

  const handleTabSwitch = (tab: 'report' | 'study') => {
    setResultTab(tab);
    if (!reading) return;
    trackEvent('result_tab_switched', {
      tab,
      questionType: reading.meta?.questionType,
      mode: reading.mode || 'hybrid',
      fallbackUsed: !!reading.fallbackUsed,
      spreadId: spreadLayout?.id
    });
  };

  const handleReset = () => {
    clearRevealTimers();
    if (reading) {
      trackEvent('new_question_clicked', {
        questionType: reading.meta?.questionType,
        mode: reading.mode || 'hybrid',
        fallbackUsed: !!reading.fallbackUsed,
        spreadId: spreadLayout?.id
      });
    }
    setStep('input');
    setReading(null);
    setResultTab('report');
    setMessages([{ role: 'bot', text: '새로운 의식을 시작할 준비가 되었습니다. 무엇이 궁금하신가요?' }]);
    setRevealedIdx([]);
    setDrawnCards([]);
    setSpreadLayout(null);
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
            {/* 상단 버튼 제거 (탭 시스템으로 대체) */}
          </div>
        </div>

        <div className={styles.mainContent}>
          <div className={styles.workspaceGrid}>
            <div className={styles.leftPane}>
              {(step === 'reading' || step === 'result') && spreadLayout ? (
                (() => {
                  const renderConfig = getSpreadRenderConfig(spreadLayout);
                  return (
                    <div
                      className={styles.topSpreadArea}
                      style={{
                        minHeight: `${renderConfig.areaHeight}px`,
                        maxHeight: '56vh'
                      }}
                    >
                      <div className={styles.spreadCenter}>
                        {spreadLayout.positions.map((pos, idx) => (
                          <div
                            key={pos.id}
                            className={styles.cardPosition}
                            style={{
                              position: 'absolute',
                              left: `${pos.x * renderConfig.scale}px`,
                              top: `${pos.y * renderConfig.scale}px`,
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
                  );
                })()
              ) : (
                <div className={styles.topSpreadArea}>
                  <p className={styles.leftPanePlaceholder}>질문을 입력하면 이곳에 카드 스프레드가 펼쳐집니다.</p>
                </div>
              )}

              <div className={styles.cardBasicsPanel}>
                <h4 className={styles.cardBasicsTitle}>아르카나 탐구</h4>
                {drawnCards.length === 0 ? (
                  <p className={styles.cardBasicsEmpty}>카드를 펼치면 포지션별 아르카나 탐구가 표시됩니다.</p>
                ) : (
                  <div className={styles.cardBasicsList}>
                    {drawnCards.map((card, i) => {
                      const info = getPositionInfo(i);
                      return (
                        <div key={card.id} className={styles.studyCard}>
                          <div className={styles.studyCardHeader}>
                            <span className={styles.studyCardPos}>{info.posLabel}</span>
                            <h4 className={styles.studyCardName}>{card.nameKo}</h4>
                          </div>
                          <p className={styles.cardBasicsContext}>{info.posDesc}</p>
                          <p className={styles.studyCardDesc}>{card.description || card.summary}</p>
                          {card.keywords && card.keywords.length > 0 && (
                            <div className={styles.studyKeywords}>
                              {card.keywords.slice(0, 5).map((k) => (
                                <span key={k} className={styles.studyTag}>#{k}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.rightPane}>
              <div className={styles.messagesContainer}>
                <div className={styles.messages}>
                  {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
                  <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
                    {loading ? '리딩을 준비하고 있습니다.' : step === 'result' ? '리딩 결과가 준비되었습니다.' : '질문을 기다리는 중입니다.'}
                  </div>

                  {loading && (
                    <div className={styles.typingWrapper}>
                      <div className={styles.typingBubble}>
                        <div className={styles.typingDots}>
                          <span /> <span /> <span />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 'result' && reading && (
                    <div className={styles.tabContainer}>
                      <div className={styles.tabHeader}>
                        <button
                          onClick={() => handleTabSwitch('report')}
                          className={`${styles.tabBtn} ${resultTab === 'report' ? styles.tabBtnActive : ''}`}
                        >
                          운명의 리포트
                        </button>
                        <button
                          onClick={() => handleTabSwitch('study')}
                          className={`${styles.tabBtn} ${resultTab === 'study' ? styles.tabBtnActive : ''}`}
                        >
                          아르카나 탐구
                        </button>
                      </div>

                      <div className={styles.tabBody}>
                        {resultTab === 'report' ? (
                          <div className={styles.resultSection}>
                            <div className={styles.diagnosticBox}>
                              {showDiagnostics && (
                                <>
                              <span className={styles.diagnosticPill}>
                                apiUsed: {apiUsedLabel(reading.apiUsed)}
                              </span>
                              <span className={styles.diagnosticPill}>
                                fallbackUsed: {reading.fallbackUsed ? 'true' : 'false'}
                              </span>
                              <span className={styles.diagnosticPill}>
                                fallbackReason: {reading.meta?.fallbackReason ?? reading.fallbackReason ?? 'unavailable'}
                              </span>
                              <span className={styles.diagnosticPill}>
                                responseMode: {responseModeLabel(reading.meta?.responseMode)}
                              </span>
                              <span className={styles.diagnosticPill}>
                                path: {reading.meta?.path || 'unknown'}
                              </span>
                              <span className={styles.diagnosticPill}>
                                totalMs: {reading.meta?.timings?.totalMs ?? 'unknown'}
                              </span>
                              <span className={styles.diagnosticPill}>
                                serverRevision: {reading.meta?.serverRevision || 'unknown'}
                              </span>
                              <span className={styles.diagnosticPill}>
                                requestId: {reading.meta?.requestId || 'unknown'}
                              </span>
                                </>
                              )}
                            </div>

                            <div className={styles.masterReport}>
                              <h3 className={styles.masterReportTitle}>운명의 마스터 리포트</h3>
                              <div className={styles.masterReportText}>
                                {reading.conclusion.split('\n\n').map((para, i) => (
                                  <p key={i} style={{ marginBottom: '1rem' }}>{para}</p>
                                ))}
                              </div>

                              {reading.report && (
                                <div className={styles.reportSummaryBox}>
                                  {(() => {
                                    const distinctCopy = getDistinctReportCopy(reading);
                                    return (
                                      <>
                                        <p className={styles.reportSummaryText}>
                                          <strong>사서의 통찰:</strong> {distinctCopy.insightText}
                                        </p>
                                        <div className={styles.verdictBadge}>
                                          <Sparkles size={14} />
                                          <span>{verdictLabelKo(reading.report.verdict.label)}의 기운: {distinctCopy.energyText}</span>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>

                            <div className={styles.arcanaGuidance}>
                              <h4 className={styles.arcanaTitle}>운명의 지침</h4>
                              <div className={styles.arcanaList}>
                                {reading.action.map((act, i) => (
                                  <div key={i} className={styles.arcanaItem}>
                                    <span className={styles.arcanaItemBullet}>●</span>
                                    <p className={styles.arcanaItemText}>{act}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {reading.report && reading.report.counterpoints.length > 0 && (
                              <div className={styles.counterpointBox}>
                                <h4 className={styles.counterpointTitle}>함께 고려할 변수</h4>
                                <ul className={styles.counterpointList}>
                                  {reading.report.counterpoints.map((cp, i) => (
                                    <li key={i}>{cp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={styles.studySection}>
                            <div className={styles.studyGrid}>
                              {drawnCards.map((card, i) => {
                                const info = getPositionInfo(i);
                                return (
                                  <div key={i} className={styles.studyCard}>
                                    <div className={styles.studyCardHeader}>
                                      <span className={styles.studyCardPos}>{info.posLabel}</span>
                                      <h4 className={styles.studyCardName}>{card.nameKo}</h4>
                                    </div>
                                    <p className={styles.studyCardDesc}>{card.description || card.summary}</p>
                                    <div className={styles.studyKeywords}>
                                      {card.keywords?.map(k => <span key={k} className={styles.studyTag}>#{k}</span>)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={styles.newQuestionRow}>
                        <button onClick={handleReset} className={styles.newQuestionBtn}>
                          <RefreshCw size={18} /> 새로운 질문하기
                        </button>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>
          </div>
        </div>

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
              <Send size={16} /> 의식 시작
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
