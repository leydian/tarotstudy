import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, Send, RefreshCw } from 'lucide-react';
import { Card, Spread, Message, ReadingResponse } from '../types/tarot';
import { tarotApi } from '../services/tarotService';
import { getAnalyticsSessionId, trackEvent } from '../services/analytics';
import { TarotCard } from '../components/common/TarotCard';
import { MessageBubble } from '../components/reading/MessageBubble';
import styles from './TarotMastery.module.css';

const makeMsg = (role: 'user' | 'bot', text: string, isAction?: boolean): Message => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  role, text, isAction
});

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let next = t;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleWithRandom = <T,>(items: T[], randomFn: () => number): T[] => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomFn() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const shouldUseSeededDraw = (readingKind?: string) => readingKind === 'overall_fortune';

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const orientationLabel = (orientation?: 'upright' | 'reversed') =>
  orientation === 'reversed' ? '역방향' : '정방향';

const RE_VERDICT_STRIP = /\[운명의 판정\][\s\S]*$/g;
const RE_NON_WORD = /[^\p{L}\p{N}\s]/gu;
const RE_WHITESPACE = /\s+/g;
const normalizeForCompare = (text?: string) =>
  String(text || '')
    .replace(RE_VERDICT_STRIP, '')
    .replace(RE_NON_WORD, '')
    .replace(RE_WHITESPACE, '')
    .toLowerCase();

export function TarotMastery() {
  const quickFortuneQuestions = [
    { id: 'today', label: '오늘', question: '오늘의 종합 운세는?' },
    { id: 'week', label: '이번주', question: '이번주 종합 운세는?' },
    { id: 'month', label: '이번달', question: '이번달 종합 운세는?' },
    { id: 'year', label: '올해', question: '올해 종합 운세는?' }
  ] as const;
  const [step, setStep] = useState<'input' | 'reading' | 'result'>('input');
  const [leftPaneTab, setLeftPaneTab] = useState<'spread' | 'study'>('spread');
  const [messages, setMessages] = useState<Message[]>([
    makeMsg('bot', "어서 오세요. 이곳은 운명과 지혜가 만나는 '아르카나 성소'입니다. 오늘 당신의 영혼이 찾고 있는 답은 무엇인가요? 질문을 들려주시면 운명의 지도를 그려드릴게요.")
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [drawnCards, setDrawnCards] = useState<Card[]>([]);
  const [spreadLayout, setSpreadLayout] = useState<Spread | null>(null);
  const [revealedIdx, setRevealedIdx] = useState<number[]>([]);
  const [reading, setReading] = useState<ReadingResponse | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const spreadViewportRef = useRef<HTMLDivElement>(null);
  const revealTimersRef = useRef<number[]>([]);
  const [spreadViewportSize, setSpreadViewportSize] = useState({ width: 0, height: 0 });
  const debugMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('debug') === '1';
  }, []);
  const showDiagnostics = debugMode || import.meta.env.DEV;

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages, step]);
  useEffect(() => () => {
    revealTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    revealTimersRef.current = [];
  }, []);
  useEffect(() => {
    const node = spreadViewportRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setSpreadViewportSize({
        width: Math.max(0, rect.width),
        height: Math.max(0, rect.height)
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [leftPaneTab, step]);

  const queueTimer = (cb: () => void, ms: number) => {
    const timerId = window.setTimeout(cb, ms);
    revealTimersRef.current.push(timerId);
  };

  const clearRevealTimers = () => {
    revealTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    revealTimersRef.current = [];
  };

  const positionDefinitions: { [key: string]: string } = {
    '오늘의 조언': '오늘의 흐름을 가장 효율적으로 활용하기 위한 핵심 힌트입니다.',
    '선택 A': '첫 번째 선택지가 현재 흐름에서 가지는 가능성과 리스크를 보여줍니다.',
    '선택 B': '두 번째 선택지가 현재 흐름에서 가지는 가능성과 리스크를 보여줍니다.',
    '과거/기반': '현재 고민이 만들어진 배경과 이미 형성된 토대를 설명합니다.',
    '현재/중심': '지금 가장 큰 영향을 미치는 핵심 이슈와 에너지를 보여줍니다.',
    '미래/흐름': '가까운 시점에서 전개될 가능성이 높은 흐름을 가리킵니다.',
    '현재 상태': '지금 당신이 서 있는 출발점과 컨디션을 드러냅니다.',
    '과거의 영향': '이미 지나갔지만 여전히 현재 결정에 작용하는 요인을 뜻합니다.',
    '잠재적 미래': '현재 선택이 이어질 때 펼쳐질 수 있는 다음 국면을 보여줍니다.',
    '내면의 빛': '당신 안에서 이미 작동 중인 강점과 회복 자원을 나타냅니다.',
    '외부의 환경': '주변 사람, 조직, 시장처럼 통제하기 어려운 외부 변수를 설명합니다.',
    '나의 현재': '당신이 관계 안에서 실제로 느끼고 있는 현재 감정 상태입니다.',
    '상대의 현재': '상대가 관계 안에서 체감하고 있는 현재 심리 상태입니다.',
    '나의 속마음': '겉으로 표현되지 않았지만 내면에 쌓인 진짜 욕구를 보여줍니다.',
    '상대의 속마음': '상대가 말하지 않았던 의도와 감정의 결을 드러냅니다.',
    '관계의 장애물': '관계 진전을 지연시키는 구조적 패턴이나 오해 요소입니다.',
    '가까운 변화': '단기간 안에 체감될 가능성이 높은 관계 흐름의 변화입니다.',
    '최종적 유대': '관계가 장기적으로 수렴할 가능성이 높은 결말 방향입니다.',
    '현재의 실력': '지금 시점에서 실제로 시장에 제시할 수 있는 역량 수준입니다.',
    '잠재적 재능': '아직 충분히 활용되지 않았지만 경쟁력이 될 잠재 자원입니다.',
    '숨겨진 기회': '겉으로는 잘 보이지 않지만 성과로 연결될 수 있는 기회 신호입니다.',
    '현실적 장애': '일정, 역량, 조건 등 실행 단계에서 부딪히는 구체적 제약입니다.',
    '성공의 열쇠': '현재 질문을 해결할 때 우선순위로 잡아야 할 핵심 행동 지점입니다.',
    '과거의 상황': '지금 이 국면으로 이어지게 만든 과거의 주요 사건과 맥락입니다.',
    '현재의 위치': '현재 당신이 서 있는 객관적 좌표와 우선순위를 보여줍니다.',
    '숨겨진 영향': '표면 아래에서 의사결정에 간접적으로 작용하는 보이지 않는 변수입니다.',
    '문제의 핵심': '지금 질문의 본질을 이루는 중심 갈등 또는 과제입니다.',
    '타인의 시선': '주변이 당신의 선택을 어떻게 해석하는지 보여주는 사회적 관점입니다.',
    '해야 할 행동': '상황을 전환하기 위해 즉시 실행 가능한 행동 지침입니다.',
    '최종 결과': '현재 흐름이 유지될 때 도달할 가능성이 높은 결과입니다.',
    '현재 상황': '지금 국면의 핵심 상태를 가장 압축적으로 보여주는 자리입니다.',
    '장애물': '진행 속도를 늦추거나 판단을 흐리는 현실적 저항 요소입니다.',
    '잠재의식': '무의식적으로 반복되는 신념과 감정 패턴을 드러냅니다.',
    '과거': '현재 문제를 만든 이전 선택과 경험의 잔여 영향을 뜻합니다.',
    '현재 의식': '지금 스스로 분명하게 인식하고 있는 생각과 우선순위입니다.',
    '가까운 미래': '단기적으로 가장 먼저 체감될 변화의 방향입니다.',
    '당신의 태도': '상황에 대응하는 당신의 접근 방식과 의사결정 습관입니다.',
    '주변 환경': '외부 인물/조직/조건이 현재 흐름에 주는 영향입니다.',
    '희망과 공포': '같은 이슈에 공존하는 기대와 불안의 양면성을 보여줍니다.',
    '1월': '연초의 출발 흐름과 기본 방향을 점검하는 시기입니다.',
    '2월': '초기 계획을 현실에 맞게 조정하며 리듬을 만드는 시기입니다.',
    '3월': '변화 가능성이 커지는 구간으로 선택의 분기점이 형성되는 시기입니다.',
    '4월': '실행 강도를 높이며 성과 기반을 다지는 시기입니다.',
    '5월': '협업과 조율이 중요한 전환기로 대인 변수 관리가 필요한 시기입니다.',
    '6월': '중간 점검을 통해 우선순위를 재정렬하는 시기입니다.',
    '7월': '상반기 누적 결과가 드러나며 다음 전략이 구체화되는 시기입니다.',
    '8월': '속도 조절과 컨디션 관리가 성과를 좌우하는 시기입니다.',
    '9월': '새 기회와 기존 과제가 교차하며 선택의 정밀도가 필요한 시기입니다.',
    '10월': '정리와 확장이 동시에 진행되어 자원 배분이 중요한 시기입니다.',
    '11월': '연말 목표 달성을 위해 집중력과 마무리 품질이 필요한 시기입니다.',
    '12월': '한 해 흐름을 결산하고 다음 사이클의 방향을 확정하는 시기입니다.'
  };

  const startRitual = async (questionText: string) => {
    const userQuestion = questionText.trim();
    if (!userQuestion || loading) return;

    clearRevealTimers();
    setLeftPaneTab('spread');
    setRevealedIdx([]);
    setDrawnCards([]);
    setSpreadLayout(null);
    setReading(null);
    setMessages(prev => [...prev, makeMsg('user', userQuestion)]);
    setLoading(true);
    setInput('');

    try {
      const profile = await tarotApi.getQuestionProfile(userQuestion);
      const targetCardCount = profile.targetCardCount;
      const trackedQuestionType = profile.questionType;
      trackEvent('question_submitted', {
        questionType: trackedQuestionType,
        domainTag: profile.domainTag,
        riskLevel: profile.riskLevel,
        readingKind: profile.readingKind,
        fortunePeriod: profile.fortunePeriod,
        mode: 'hybrid'
      });

      const [allSpreads, allCards] = await Promise.all([
        tarotApi.getSpreads(),
        tarotApi.getCards()
      ]);

      const currentSpread = allSpreads.find((s) => s.id === profile.recommendedSpreadId)
        || allSpreads.find((s) => s.positions.length === targetCardCount)
        || allSpreads[0];

      if (!currentSpread) {
        setMessages(prev => [...prev, makeMsg('bot', '스프레드를 불러올 수 없습니다. 다시 시도해 주세요.')]);
        setLoading(false);
        return;
      }

      setSpreadLayout(currentSpread);

      const rng = shouldUseSeededDraw(profile.readingKind)
        ? (() => {
            const seedInput = [
              getAnalyticsSessionId(),
              getLocalDateKey(),
              profile.readingKind,
              profile.fortunePeriod || 'none',
              currentSpread.id
            ].join('|');
            return createSeededRandom(hashString(seedInput));
          })()
        : Math.random;
      const shuffled = shuffleWithRandom(allCards, rng);
      const selectedCards = shuffled
        .slice(0, currentSpread.positions.length)
        .map((card) => ({
          ...card,
          orientation: rng() < 0.34 ? 'reversed' : 'upright'
        } as Card));
      setDrawnCards(selectedCards);
      const cardDraws = selectedCards.map((card) => ({
        id: card.id,
        orientation: card.orientation || 'upright'
      }));

      const recentQuestions = messages
        .filter(m => m.role === 'user')
        .slice(-3)
        .map(m => m.text);

      const readingData = await tarotApi.getReading(selectedCards.map(c => c.id), userQuestion, {
        mode: 'hybrid',
        structure: 'evidence_report',
        spreadId: currentSpread.id,
        cardDraws,
        sessionContext: {
          recentQuestions,
          questionProfile: {
            questionType: profile.questionType,
            domainTag: profile.domainTag,
            riskLevel: profile.riskLevel,
            readingKind: profile.readingKind,
            fortunePeriod: profile.fortunePeriod,
            recommendedSpreadId: profile.recommendedSpreadId
          }
        },
        debug: showDiagnostics
      });
      setReading(readingData);
      trackEvent('reading_result_shown', {
        questionType: readingData.meta?.questionType || trackedQuestionType,
        domainTag: readingData.meta?.domainTag || profile.domainTag,
        riskLevel: readingData.meta?.riskLevel || profile.riskLevel,
        readingKind: readingData.meta?.readingKind || profile.readingKind,
        fortunePeriod: readingData.meta?.fortunePeriod || profile.fortunePeriod,
        mode: readingData.mode || 'hybrid',
        fallbackUsed: !!readingData.fallbackUsed,
        spreadId: currentSpread.id
      });

      queueTimer(() => {
        setMessages(prev => [...prev, makeMsg('bot', `질문에 맞춰 [${currentSpread.name}] 스프레드를 구성했습니다. 운명의 지도가 펼쳐집니다...`)]);
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
      setMessages(prev => [...prev, makeMsg('bot', '운명의 실타래가 엉켰습니다. 잠시 후 다시 시도해 주세요.')]);
      setLoading(false);
    }
  };

  const handleStartRitual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    await startRitual(input);
  };

  const handleQuickFortune = async (question: string) => {
    if (loading) return;
    await startRitual(question);
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
    const isCompactBinary = data.meta?.questionType === 'binary' && data.meta?.responseMode === 'concise';
    const reportInterpretation = reportEvidence
      ? (
          isCompactBinary
            ? reportEvidence.claim
            : [reportEvidence.claim, reportEvidence.rationale].filter(Boolean).join('\n')
        )
      : '';
    const fallbackInterpretation = (data.evidence[idx] || '').split(']').slice(1).join(']').trim();
    const interpretation = reportInterpretation || fallbackInterpretation;
    const cardOrientation = orientationLabel(cards[idx].orientation);

    setMessages(prev => [...prev, makeMsg('bot',
      `[${posLabel}: ${cards[idx].nameKo} (${cardOrientation})]\n${interpretation.trim().replace(/\.\.$/, '.') || '카드의 상징을 차분히 읽어보세요.'}`
    )]);
  };

  const revealCard = (idx: number) => {
    if (!revealedIdx.includes(idx) && reading && spreadLayout && drawnCards) {
      internalReveal(idx, reading, spreadLayout, drawnCards);
    }
  };

  const getPositionInfo = (idx: number) => {
    const posLabel = spreadLayout?.positions[idx].label || "";
    const posDesc = positionDefinitions[posLabel] || `${posLabel || '이 포지션'}에서 읽히는 핵심 흐름입니다.`;
    const card = drawnCards[idx] ?? null;
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

  const isTextOverlapHigh = (a?: string, b?: string) => {
    const left = normalizeForCompare(a);
    const right = normalizeForCompare(b);
    if (!left || !right) return false;
    if (left === right) return true;
    if (left.length >= 14 && right.length >= 14 && (left.includes(right) || right.includes(left))) return true;
    return false;
  };

  const getDistinctReportCopy = (data: ReadingResponse, isHealthContext: boolean, isOverallFortune: boolean) => {
    if (isOverallFortune && data.report?.fortune) {
      return {
        insightText: data.report.summary || data.report.fortune.energy || '',
        energyText: data.report.fortune.message || data.report.verdict?.rationale || ''
      };
    }
    const summary = data.report?.summary || '';
    const rationale = data.report?.verdict?.rationale || '';
    const conclusionNorm = normalizeForCompare(data.conclusion);
    const summaryDup = summary && conclusionNorm.includes(normalizeForCompare(summary));
    const rationaleDup = rationale && conclusionNorm.includes(normalizeForCompare(rationale));
    const summaryRationaleDup = isTextOverlapHigh(summary, rationale);

    const isCompactBinary = data.meta?.questionType === 'binary' && data.meta?.responseMode === 'concise';
    const firstEvidence = data.report?.evidence?.[0]?.claim || data.evidence?.[0]?.split('\n').pop()?.trim() || '';
    const firstAction = (data.action?.[0] || '').replace(/^\[운명의 지침 \d+\]\s*/, '').trim();

    let insightText = isCompactBinary
      ? (summaryDup || summaryRationaleDup ? (firstEvidence || summary) : summary)
      : (summaryDup || summaryRationaleDup ? (firstEvidence ? `핵심 카드 흐름으로 보면, ${firstEvidence}` : summary) : summary);

    let energyText = isCompactBinary
      ? (rationaleDup || summaryRationaleDup ? (firstAction || rationale) : rationale)
      : (rationaleDup || summaryRationaleDup ? (firstAction ? `실천 에너지는 "${firstAction}" 쪽에 맞춰 두시면 좋습니다.` : rationale) : rationale);

    if (isTextOverlapHigh(insightText, energyText)) {
      energyText = firstAction || '이번 주에는 속도를 조절하며 조건을 점검하는 접근이 안전합니다.';
    }
    if (isTextOverlapHigh(insightText, energyText)) {
      insightText = firstEvidence || summary;
    }

    if (isHealthContext) {
      return {
        insightText: summary || '건강 관련 질문은 상태 확인과 안전 관리가 우선입니다.',
        energyText: rationale || '의료 판단이 필요한 경우에는 전문가 상담을 우선하세요.'
      };
    }

    return {
      insightText: insightText || summary,
      energyText: energyText || rationale
    };
  };

  const getSpreadRenderConfig = (spread: Spread, viewport: { width: number; height: number }) => {
    const cardWidth = 100;
    const cardHeight = 180;
    const labelHeight = 56;
    const padding = 28;

    const isMobileViewport = viewport.width > 0 && viewport.width <= 768;
    const minScale = isMobileViewport ? 0.12 : 0.16;
    const maxScale = 0.52;

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    spread.positions.forEach((pos) => {
      minX = Math.min(minX, pos.x - cardWidth / 2);
      maxX = Math.max(maxX, pos.x + cardWidth / 2);
      minY = Math.min(minY, pos.y - cardHeight / 2);
      maxY = Math.max(maxY, pos.y + cardHeight / 2 + labelHeight);
    });

    const contentWidth = Math.max(1, (maxX - minX) + padding * 2);
    const contentHeight = Math.max(1, (maxY - minY) + padding * 2);

    const availableWidth = Math.max(220, viewport.width - 24);
    const availableHeight = Math.max(220, viewport.height - 24);

    const fitScaleX = availableWidth / contentWidth;
    const fitScaleY = availableHeight / contentHeight;
    const fitScale = Math.min(fitScaleX, fitScaleY);
    const scale = Math.min(maxScale, Math.max(minScale, fitScale));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const offsetX = -centerX * scale;
    const offsetY = -centerY * scale;
    const areaHeight = Math.max(280, Math.min(640, Math.round(contentHeight * scale + padding)));

    return { scale, offsetX, offsetY, areaHeight };
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
    setLeftPaneTab('spread');
    setReading(null);
    setMessages([makeMsg('bot', '새로운 의식을 시작할 준비가 되었습니다. 무엇이 궁금하신가요?')]);
    setRevealedIdx([]);
    setDrawnCards([]);
    setSpreadLayout(null);
  };

  const isCompactBinaryReading = reading?.meta?.questionType === 'binary' && reading?.meta?.responseMode === 'concise';
  const isHealthContext = reading?.meta?.domainTag === 'health';
  const isOverallFortune = reading?.meta?.readingKind === 'overall_fortune';
  const trendLabelKo = (label?: 'UP' | 'BALANCED' | 'CAUTION') => {
    if (label === 'UP') return '상승';
    if (label === 'CAUTION') return '주의';
    return '균형';
  };
  const fortuneTitleKo = (period?: 'today' | 'week' | 'month' | 'year' | null) => {
    if (period === 'today') return '오늘의 타로 종합운세';
    if (period === 'week') return '이번주 타로 종합운세';
    if (period === 'month') return '이번달 타로 종합운세';
    if (period === 'year') return '올해 타로 종합운세';
    return '타로 종합운세';
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
              <div className={styles.leftPaneTabs} role="tablist" aria-label="리딩 보기 선택">
                <button
                  type="button"
                  id="tab-spread"
                  role="tab"
                  aria-selected={leftPaneTab === 'spread'}
                  aria-controls="panel-spread"
                  onClick={() => setLeftPaneTab('spread')}
                  className={`${styles.leftPaneTabBtn} ${leftPaneTab === 'spread' ? styles.leftPaneTabBtnActive : ''}`}
                >
                  카드 스프레드
                </button>
                <button
                  type="button"
                  id="tab-study"
                  role="tab"
                  aria-selected={leftPaneTab === 'study'}
                  aria-controls="panel-study"
                  onClick={() => setLeftPaneTab('study')}
                  className={`${styles.leftPaneTabBtn} ${leftPaneTab === 'study' ? styles.leftPaneTabBtnActive : ''}`}
                >
                  아르카나 탐구
                </button>
              </div>

              <div
                className={styles.leftPaneViewport}
                id={leftPaneTab === 'spread' ? 'panel-spread' : 'panel-study'}
                role="tabpanel"
                aria-labelledby={leftPaneTab === 'spread' ? 'tab-spread' : 'tab-study'}
              >
                {leftPaneTab === 'spread' ? (
                  (step === 'reading' || step === 'result') && spreadLayout ? (
                    (() => {
                      const renderConfig = getSpreadRenderConfig(spreadLayout, spreadViewportSize);
                      return (
                        <div
                          ref={spreadViewportRef}
                          className={styles.topSpreadArea}
                          style={{ minHeight: `${renderConfig.areaHeight}px` }}
                        >
                          <div className={styles.spreadCenter}>
                            {spreadLayout.positions.map((pos, idx) => (
                              <div
                                key={pos.id}
                                className={styles.cardPosition}
                                style={{
                                  position: 'absolute',
                                  left: `${(pos.x * renderConfig.scale) + renderConfig.offsetX}px`,
                                  top: `${(pos.y * renderConfig.scale) + renderConfig.offsetY}px`,
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
                    <div ref={spreadViewportRef} className={styles.topSpreadArea}>
                      <p className={styles.leftPanePlaceholder}>질문을 입력하면 이곳에 카드 스프레드가 펼쳐집니다.</p>
                    </div>
                  )
                ) : (
                  <div className={`${styles.cardBasicsPanel} ${styles.leftStudyPanel}`}>
                    <h4 className={styles.cardBasicsTitle}>아르카나 탐구</h4>
                    {drawnCards.length === 0 ? (
                      <p className={styles.cardBasicsEmpty}>카드를 펼치면 포지션별 아르카나 탐구가 표시됩니다.</p>
                    ) : (
                      <div className={styles.cardBasicsList}>
                        {drawnCards.map((card, i) => {
                          const info = getPositionInfo(i);
                          if (!info.card) return null;
                          return (
                            <div key={info.card.id} className={styles.studyCard}>
                              <div className={styles.studyCardHeader}>
                                <span className={styles.studyCardPos}>{info.posLabel}</span>
                                <h4 className={styles.studyCardName}>{info.card.nameKo}</h4>
                              </div>
                              <p className={styles.cardBasicsContext}>{info.posDesc}</p>
                              <p className={styles.studyCardDesc}>{info.card.description || info.card.summary}</p>
                              {info.card.keywords && info.card.keywords.length > 0 && (
                                <div className={styles.studyKeywords}>
                                  {info.card.keywords.slice(0, 5).map((k) => (
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
                )}
              </div>
            </div>

            <div className={styles.rightPane}>
              <div className={styles.messagesContainer}>
                <div className={styles.messages}>
                  {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
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
                      <div className={styles.tabBody}>
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
                                    const distinctCopy = getDistinctReportCopy(reading, !!isHealthContext, !!isOverallFortune);
                                    const trendKo = trendLabelKo(reading.meta?.trendLabel || reading.report?.fortune?.trendLabel);
                                    return (
                                      <>
                                        {!isOverallFortune && (
                                          <p className={styles.reportSummaryText}>
                                            <strong>사서의 통찰:</strong> {distinctCopy.insightText}
                                          </p>
                                        )}
                                        <div className={styles.verdictBadge}>
                                          <Sparkles size={14} />
                                          <span>
                                            {isHealthContext
                                              ? '안전 안내'
                                              : isOverallFortune
                                                ? `${trendKo} 기조`
                                                : `${verdictLabelKo(reading.report.verdict.label)}의 기운`}: {distinctCopy.energyText}
                                          </span>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>

                            {isOverallFortune && reading.report?.fortune && (
                              <div className={styles.counterpointBox}>
                                <h4 className={styles.counterpointTitle}>
                                  {fortuneTitleKo(reading.report.fortune.period || reading.meta?.fortunePeriod || null)}
                                </h4>
                                <ul className={styles.counterpointList}>
                                  <li><strong>전체 에너지:</strong> {reading.report.fortune.energy}</li>
                                  <li><strong>일·재물운:</strong> {reading.report.fortune.workFinance}</li>
                                  <li><strong>애정운:</strong> {reading.report.fortune.love}</li>
                                  <li><strong>건강·마음:</strong> {reading.report.fortune.healthMind}</li>
                                </ul>
                              </div>
                            )}

                            {isHealthContext && (
                              <div className={styles.counterpointBox}>
                                <h4 className={styles.counterpointTitle}>안전 우선 안내</h4>
                                <ul className={styles.counterpointList}>
                                  <li>이 리딩은 의료 진단이나 처방을 대체하지 않습니다.</li>
                                  <li>증상이 지속되거나 악화되면 진료를 우선하세요.</li>
                                </ul>
                              </div>
                            )}

                            <div className={styles.arcanaGuidance}>
                              <h4 className={styles.arcanaTitle}>운명의 지침</h4>
                              <div className={styles.arcanaList}>
                                {reading.action.map((act, i) => (
                                  <div key={i} className={styles.arcanaItem}>
                                    <span className={styles.arcanaItemBullet}>●</span>
                                    <p className={styles.arcanaItemText}>
                                      {showDiagnostics ? act : act.replace(/^\[운명의 지침 \d+\]\s*/, '')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {reading.report && reading.report.counterpoints.length > 0 && (!isCompactBinaryReading || !!reading.fallbackUsed) && (
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
          <>
            <div className={styles.quickFortuneRow}>
              {quickFortuneQuestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.quickFortuneBtn}
                  onClick={() => handleQuickFortune(item.question)}
                  disabled={loading}
                >
                  {item.label} 종합운세
                </button>
              ))}
            </div>
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
          </>
        )}
      </div>
    </div>
  );
}
