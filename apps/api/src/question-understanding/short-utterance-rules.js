function normalize(text = '') {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?？!！.,]+$/g, '')
    .trim();
}

function buildTypeBank() {
  const seeds = [
    {
      intent: 'daily',
      questionType: 'yes_no',
      subIntent: 'sleep',
      riskClass: 'medium',
      utterances: [
        '지금 잘까', '이제 잘까', '오늘 일찍 잘까', '자도 될까', '지금 자도 돼',
        '지금 잠들까', '잠들어도 될까', '지금 눕는 게 맞나', 'sleep now', 'should i sleep now',
        'go to bed now', 'should i go to bed', '지금 자는 게 나을까', '지금 자는 게 맞아', '오늘 그냥 잘까'
      ]
    },
    {
      intent: 'daily',
      questionType: 'forecast',
      subIntent: 'energy',
      riskClass: 'low',
      utterances: [
        '오늘 운세', '오늘 흐름', 'today luck', 'daily luck', 'today fortune',
        '오늘 컨디션 운세', '오늘 분위기 어때', '오늘 전체 흐름', '오늘 기운 어때', '오늘 에너지 어때'
      ]
    },
    {
      intent: 'daily',
      questionType: 'yes_no',
      subIntent: 'schedule',
      riskClass: 'low',
      utterances: [
        '지금 시작할까', '오늘 시작해도 돼', '지금 움직일까', '바로 할까', '오늘 미룰까',
        '오늘 그냥 쉴까', '지금 멈출까', '오늘 강행할까', 'should i start now', 'do it now'
      ]
    },
    {
      intent: 'relationship',
      questionType: 'yes_no',
      subIntent: 'pace',
      riskClass: 'medium',
      utterances: [
        '연락', '연락할까', '지금 연락해도 돼', '먼저 연락할까', '답장할까', '지금 톡 보낼까',
        '문자 보낼까', 'message now', 'text now', 'should i text', 'reply now',
        '지금 전화할까', '콜할까', 'dm 보낼까', '읽씹 유지할까', '연락 멈출까'
      ]
    },
    {
      intent: 'relationship-repair',
      questionType: 'yes_no',
      subIntent: 'reconnect',
      riskClass: 'medium',
      utterances: [
        '재회 가능할까', '화해 시도할까', '다시 다가가도 돼', '사과 먼저 할까', '관계 회복 될까',
        '재접촉 해볼까', 'reconnect now', 'should i apologize', '화해 연락할까', '다시 연락해볼까'
      ]
    },
    {
      intent: 'relationship',
      questionType: 'yes_no',
      subIntent: 'conflict',
      riskClass: 'medium',
      utterances: [
        '지금 따질까', '지금 말 꺼낼까', '갈등 얘기할까', '직접 말할까', '거리둘까',
        '선 긋는 게 맞을까', 'confront now', 'talk about conflict', '지금 풀자고 할까', '논쟁 멈출까'
      ]
    },
    {
      intent: 'career',
      questionType: 'yes_no',
      subIntent: 'interview',
      riskClass: 'medium',
      utterances: [
        '면접 가도 될까', '지원할까', '오늘 지원해도 돼', '이력서 낼까', '오퍼 받을까',
        'apply now', 'should i apply', 'interview now', '면접 일정 잡을까', '지원 미룰까'
      ]
    },
    {
      intent: 'career',
      questionType: 'yes_no',
      subIntent: 'job-change',
      riskClass: 'medium',
      utterances: [
        '이직할까', '지금 옮길까', '퇴사할까', '회사 바꿀까', '오퍼 수락할까',
        'job change now', 'should i switch jobs', 'resign now', '이직 타도 될까', '지금 남을까'
      ]
    },
    {
      intent: 'career',
      questionType: 'yes_no',
      subIntent: 'project',
      riskClass: 'low',
      utterances: [
        '프로젝트 밀어붙일까', '오늘 마감 강행할까', '일정 줄일까', '우선순위 바꿀까', '오늘 보고할까',
        'ship today', 'push now', 'delay task', '오늘 끝낼까', '내일로 미룰까'
      ]
    },
    {
      intent: 'finance',
      questionType: 'yes_no',
      subIntent: 'purchase',
      riskClass: 'medium',
      utterances: [
        '사도 돼', '지금 살까', '결제할까', '구매 진행할까', '카드 긁어도 돼',
        'buy now', 'should i buy', 'checkout now', '결제 미룰까', '오늘 주문할까'
      ]
    },
    {
      intent: 'finance',
      questionType: 'yes_no',
      subIntent: 'liquidity',
      riskClass: 'high',
      utterances: [
        '큰 금액 써도 돼', '대출 받을까', '투자 들어갈까', '현금 묶어도 될까', '올인해도 될까',
        'loan now', 'invest now', 'all in now', '현금 보존할까', '지금 지출 줄일까'
      ]
    },
    {
      intent: 'study',
      questionType: 'yes_no',
      subIntent: 'default',
      riskClass: 'low',
      utterances: [
        '공부할까', '지금 공부 시작할까', '복습할까', '오늘 회독할까', '문제풀까',
        'study now', 'review now', 'solve now', '오늘 쉬는 게 나을까', '시험 준비 방향 맞아'
      ]
    },
    {
      intent: 'health',
      questionType: 'yes_no',
      subIntent: 'default',
      riskClass: 'medium',
      utterances: [
        '운동할까', '지금 운동해도 돼', '무리해도 될까', '오늘 쉴까', '수면 먼저 챙길까',
        'workout now', 'rest now', 'push workout', '회복 우선할까', '스트레칭만 할까'
      ]
    },
    {
      intent: 'general',
      questionType: 'choice_ab',
      subIntent: 'default',
      riskClass: 'medium',
      utterances: [
        'a안 b안 뭐가 나아', 'a안 b안 추천', '둘 중 뭐가 나아', '뭐가 더 나아', '어느 쪽이 좋아',
        'option a or b', 'a vs b', 'which side', '둘 중 선택', '비교해줘'
      ]
    },
    {
      intent: 'general',
      questionType: 'yes_no',
      subIntent: 'pace',
      riskClass: 'low',
      utterances: [
        '가도 돼', '갈까', '지금 해도 돼', '할까 말까', '진행할까',
        'go now', 'do now', 'should i go', 'hold or go', '멈출까'
      ]
    }
  ];

  const bank = [];
  let seq = 0;
  for (const seed of seeds) {
    for (const phrase of seed.utterances) {
      seq += 1;
      bank.push({
        id: `su-${String(seq).padStart(3, '0')}`,
        phrase,
        intent: seed.intent,
        questionType: seed.questionType,
        subIntent: seed.subIntent,
        riskClass: seed.riskClass
      });
    }
  }
  return bank;
}

export const SHORT_QUESTION_TYPE_BANK = buildTypeBank();

const SHORT_INDEX = new Map(
  SHORT_QUESTION_TYPE_BANK.map((entry) => [normalize(entry.phrase), entry])
);

export function inferShortUtterance(context = '') {
  const normalized = normalize(context);
  if (!normalized) return null;

  const tokenCount = normalized.split(' ').filter(Boolean).length;
  const isShort = normalized.length <= 24 || tokenCount <= 5;
  if (!isShort) return null;

  const hit = SHORT_INDEX.get(normalized);
  if (hit) {
    return {
      intent: hit.intent,
      questionType: hit.questionType,
      subIntent: hit.subIntent,
      riskClass: hit.riskClass,
      confidence: 0.84,
      source: 'short_utterance_rules',
      typeId: hit.id
    };
  }

  if (/^a\s*안\s*b\s*안/.test(normalized) || /^a\s*vs\s*b/.test(normalized)) {
    return {
      intent: 'general',
      questionType: 'choice_ab',
      subIntent: 'default',
      riskClass: 'medium',
      confidence: 0.72,
      source: 'short_utterance_rules',
      typeId: 'su-fallback-choice'
    };
  }

  if (/\?$|？$/.test(String(context || '').trim()) && tokenCount <= 2) {
    return {
      intent: 'general',
      questionType: 'yes_no',
      subIntent: 'pace',
      riskClass: 'low',
      confidence: 0.61,
      source: 'short_utterance_rules',
      typeId: 'su-fallback-yn'
    };
  }

  return null;
}
