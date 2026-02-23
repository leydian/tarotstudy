import {
  inferSummaryContextTone,
  inferYearlyIntent,
  hashText,
  pickByNumber,
  scoreCardRisk
} from '../common/utils.js';

export function summarizeRelationshipRecovery({ items, context = '', level = 'beginner' }) {
  const pick = (name) => items.find((item) => item.position?.name === name) || null;
  const current = pick('현재 관계 상태');
  const friction = pick('거리/갈등의 핵심');
  const signal = pick('상대 관점 신호');
  const action = pick('회복 행동');
  const week = pick('다음 7일 흐름');
  const tone = inferSummaryContextTone(context);
  const levelHint = level === 'intermediate' ? tone.intermediateHint : tone.beginnerHint;
  const intent = inferYearlyIntent(context);
  const contextText = String(context || '').toLowerCase();
  const repairMode = (() => {
    if (/(재회|다시 만나|헤어|연락 재개|재접촉)/.test(contextText)) return 'reconnect';
    if (/(사과|갈등|싸움|다툼|오해|서운|충돌)/.test(contextText)) return 'conflict';
    if (/(거리|경계|빈도|장거리|부담|속도)/.test(contextText)) return 'distance';
    return intent === 'relationship-repair' ? 'conflict' : 'general';
  })();

  const cautionCardIds = new Set([
    'minor-swords-three', 'minor-swords-five', 'minor-swords-six', 'minor-swords-nine', 'minor-swords-ten',
    'minor-cups-five', 'minor-wands-five', 'minor-wands-seven',
    'major-15', 'major-16', 'major-18'
  ]);
  const orientationLabel = (item) => {
    if (!item) return '신호 확인 필요';
    const cautious = cautionCardIds.has(item?.card?.id || '');
    if (item.orientation === 'upright') return cautious ? '회복 여지는 있으나 경계 신호' : '열림 신호';
    return cautious ? '긴장 조정 신호' : '조정 신호';
  };
  const keyword = (item) => item?.card?.keywords?.[0] || '관계 흐름';
  const combinedKeywords = [
    ...(friction?.card?.keywords || []),
    ...(week?.card?.keywords || []),
    ...(action?.card?.keywords || [])
  ].map((word) => String(word || '').toLowerCase());
  const hasKeyword = (list) => list.some((word) => combinedKeywords.some((kw) => kw.includes(word)));
  const riskTheme = (() => {
    if (hasKeyword(['오해', '의심', '집착', '불안', '혼란', '달', '검', '소드'])) return 'misread';
    if (hasKeyword(['속도', '충동', '지연', '멈춤', '정체', '기사', '전차'])) return 'timing';
    if (hasKeyword(['거리', '경계', '방어', '권태', '서먹', '은둔'])) return 'distance';
    if (hasKeyword(['실망', '후회', '상처', '탑', '악마'])) return 'hurt';
    return 'general';
  })();
  const variationSeed = hashText([
    context,
    current?.card?.id || '',
    friction?.card?.id || '',
    signal?.card?.id || '',
    action?.card?.id || '',
    week?.card?.id || ''
  ].join(':'));

  const signalLine = pickByNumber([
    `상대 관점 신호(${signal?.card?.nameKo || '-'})는 ${orientationLabel(signal)}이므로 마음 추측보다 확인 질문으로 반응 단서를 모으는 접근이 유리합니다.`,
    `상대 관점 신호(${signal?.card?.nameKo || '-'})는 ${orientationLabel(signal)}로 읽혀, 해석 확정 대신 실제 반응 기록을 먼저 쌓는 편이 안전합니다.`,
    `상대 관점 신호(${signal?.card?.nameKo || '-'})는 ${orientationLabel(signal)}이어서, 결론을 서두르기보다 짧은 확인 대화부터 두는 편이 좋겠습니다.`
  ], variationSeed);
  const empathyLine = pickByNumber([
    '먼저, 재회를 바라는 마음이 큰 질문일수록 결론을 서두르기보다 서로의 속도를 맞추는 과정이 중요합니다.',
    '이 질문은 마음이 크게 흔들릴 수 있는 주제라서, 카드도 정답 단정보다 대화 리듬 조절을 먼저 권하고 있습니다.',
    '재회 질문에서는 가능성보다 타이밍과 대화 방식이 더 크게 작동하니, 오늘은 감정 소모를 줄이는 쪽으로 읽어보겠습니다.'
  ], variationSeed + 40);

  const diagnosis = [
    `핵심 진단: 현재 관계 상태(${current?.card?.nameKo || '-'})는 ${orientationLabel(current)}로 읽힙니다.`,
    `거리/갈등의 핵심(${friction?.card?.nameKo || '-'})에서는 "${keyword(friction)}" 테마가 반복 포인트로 보입니다.`,
    signalLine
  ].join(' ');

  const weekCautious = cautionCardIds.has(week?.card?.id || '');
  const riskActionLine = week?.orientation === 'upright' && !weekCautious
    ? pickByNumber([
      '대화를 열 수 있는 창은 있으니 표현 강도만 낮추면 오해를 줄일 수 있습니다.',
      '반응 창이 비교적 열려 있어, 짧은 확인 문장으로 접점을 만드는 방식이 유효합니다.',
      '감정 설명보다 사실 확인 대화를 우선하면 다음 흐름을 안정적으로 이어가기 좋겠습니다.'
    ], variationSeed + 1)
    : pickByNumber([
      '지금은 결론을 서두르면 오해가 커질 수 있어, 확인 대화와 속도 조절을 먼저 두는 편이 좋습니다.',
      '감정 해석이 과열되기 쉬운 구간이라, 단정 대신 확인 질문 1개로 속도를 낮추는 편이 좋겠습니다.',
      '빠른 정리보다 오해 요인을 하나씩 줄이는 대화 설계가 먼저 필요해 보입니다.'
    ], variationSeed + 1);
  const riskThemeLine = (() => {
    if (riskTheme === 'misread') {
      return pickByNumber([
        '이번 주에는 마음 해석을 줄이고 사실 확인 질문을 늘리지 않으면 엇갈림이 커지기 쉽습니다.',
        '감정 단정이 먼저 나오면 작은 문장도 공격처럼 들릴 수 있어 확인 루틴을 먼저 두는 편이 안전합니다.',
        '추측 대화가 길어질수록 피로가 누적되는 구간이라, 관찰 가능한 사실 중심으로 대화를 정리하세요.'
      ], variationSeed + 11);
    }
    if (riskTheme === 'timing') {
      return pickByNumber([
        '접촉 타이밍을 급히 당기면 반응이 닫힐 수 있어, 간격을 정해 두고 천천히 접근하는 편이 유리합니다.',
        '지금은 속도 불일치가 갈등을 키우기 쉬워 먼저 대화 간격과 길이를 합의하는 단계가 필요합니다.',
        '빠른 결론을 내리기보다 리듬을 맞추는 데 집중해야 다음 대화의 안정성이 올라갑니다.'
      ], variationSeed + 12);
    }
    if (riskTheme === 'distance') {
      return pickByNumber([
        '거리감 자체보다 경계선이 불명확한 상태가 더 큰 리스크라, 허용 범위를 먼저 말로 확인하세요.',
        '관계 온도차를 방치하면 침묵이 오해로 번지기 쉬우니 연락 규칙을 짧게라도 맞춰두는 게 좋습니다.',
        '지금 구간은 접근보다 경계 조율이 우선이라, 불편 기준을 먼저 공유해야 소모를 줄일 수 있습니다.'
      ], variationSeed + 13);
    }
    if (riskTheme === 'hurt') {
      return pickByNumber([
        '상처 기억이 활성화된 흐름이라 해명부터 길게 하면 방어가 커질 수 있어 짧은 인정부터 시작하세요.',
        '후폭풍이 남아 있는 상태라 결론 대화보다 감정 안정 단계를 먼저 두는 편이 회복 확률을 높입니다.',
        '미해결 감정이 다시 올라오기 쉬운 구간이므로 잘잘못 정리보다 진정 루틴이 먼저 필요합니다.'
      ], variationSeed + 14);
    }
    return pickByNumber([
      '핵심은 속도와 톤을 함께 조절하는 것이며, 하나만 밀어붙이면 반작용이 커질 수 있습니다.',
      '관계 회복 신호가 있어도 단계 설계를 건너뛰면 오해가 다시 누적될 수 있습니다.',
      '지금은 감정 표현과 사실 확인의 균형이 무너지지 않도록 대화 구조를 단순하게 유지하세요.'
    ], variationSeed + 15);
  })();

  const risk = [
    `관계 리스크: 다음 7일 흐름(${week?.card?.nameKo || '-'}) 기준으로 "${keyword(week)}" 구간에서 대화 오해가 커질 수 있는 타이밍이 보입니다.`,
    riskActionLine,
    riskThemeLine
  ].join(' ');

  const planOpening = pickByNumber([
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'})의 "${keyword(action)}" 신호를 기준으로 오늘 먼저 보낼 1문장을 정하세요.`,
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'})에서 읽힌 ${orientationLabel(action)} 흐름을 따라 이번 주 대화 목표 1문장을 고정하세요.`,
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'})을 바탕으로 오늘 시도할 행동 1개와 멈출 행동 1개를 같이 정하고 바로 실행하세요.`,
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'}) 기준으로 연락 시간대 1개와 대화 길이 기준 1개를 먼저 정하세요.`,
    `7일 행동 계획: 회복 행동(${action?.card?.nameKo || '-'})의 카드 근거를 살려, 감정 설명보다 확인 질문 1개를 먼저 준비하세요.`
  ], variationSeed + 2);
  const planRoutine = (() => {
    if (riskTheme === 'misread') {
      return pickByNumber([
        '대화 전에는 추측 문장을 지우고 사실 질문 1개만 남기고, 대화 후에는 확인된 사실 2가지만 기록하세요.',
        '연락 전에 해석 대신 관찰 문장 1개를 적고, 대화 후에는 들은 표현을 그대로 한 줄로 남기세요.',
        '오해 구간에서는 질문 1개와 요청 1개만 준비하고, 통화가 끝나면 사실/해석을 분리해 점검하세요.'
      ], variationSeed + 31);
    }
    if (riskTheme === 'timing') {
      return pickByNumber([
        '이번 주는 대화 간격을 먼저 정하고 그 간격을 지키며, 매 대화 뒤 반응 속도를 짧게 기록하세요.',
        '속도 불일치가 핵심이니 연락 주기 1개를 먼저 합의하고, 대화 후에는 과속 징후를 점검하세요.',
        '첫 메시지 이후 바로 추가 설명을 붙이지 말고 1회 대기 규칙을 두고, 반응 시간을 기준으로 조정하세요.'
      ], variationSeed + 32);
    }
    if (riskTheme === 'distance') {
      return pickByNumber([
        '관계 온도차 구간이라 경계선 1개를 먼저 공유하고, 대화 뒤에는 부담 신호가 있었는지 확인하세요.',
        '거리감이 커지는 주간에는 접촉 횟수보다 허용 범위 문장을 먼저 정하고, 반응을 기록하세요.',
        '접근보다 조율이 우선이니 요청 가능한 범위 1개와 보류할 범위 1개를 분리해 대화 전에 준비하세요.'
      ], variationSeed + 33);
    }
    if (riskTheme === 'hurt') {
      return pickByNumber([
        '상처 반응이 쉽게 올라오니 길게 해명하지 말고 인정 문장 1개를 먼저 말한 뒤 반응을 기록하세요.',
        '후폭풍 구간에서는 잘잘못 정리보다 감정 안정 문장을 먼저 준비하고, 대화 뒤 에너지 소모를 점검하세요.',
        '방어를 낮추기 위해 사과 표현 1개와 재발 방지 문장 1개를 분리해 준비하고 실행하세요.'
      ], variationSeed + 34);
    }
    return pickByNumber([
      '대화 전에는 사실 1개/요청 1개만 준비하고, 대화 후에는 상대 반응을 한 줄 복기로 남기세요.',
      '대화 전에는 확인 질문 1개만 정하고, 대화 후에는 상대 반응과 내 감정 변화를 각각 한 줄씩 남기세요.',
      '연락 전에는 전달할 핵심 문장 1개만 적고, 이후에는 결과를 사실/해석으로 분리해 짧게 기록하세요.'
    ], variationSeed + 35);
  })();
  const modePlan = (() => {
    if (repairMode === 'reconnect') {
      return pickByNumber([
        '재접촉은 강도보다 예측 가능성이 중요하니, 연락 빈도와 응답 기대치를 먼저 짧게 합의하세요.',
        '재회 시도 단계에서는 감정 호소보다 일정 제안이 효과적이므로 만남 시간과 주제를 미리 정리하세요.',
        '다시 연결하는 주간에는 긴 설명보다 짧은 안부-확인-마무리 구조로 대화를 닫는 연습을 하세요.'
      ], variationSeed + 21);
    }
    if (repairMode === 'conflict') {
      return pickByNumber([
        '갈등 회복은 사과 문장과 재발 방지 문장을 분리할 때 효과가 커지니 둘을 따로 준비하세요.',
        '충돌 직후에는 주장보다 인정 문장이 우선이므로, 내 책임 1개를 먼저 명확히 말하는 순서를 고정하세요.',
        '화해 시도에서는 설명 길이를 줄이고 확인 질문을 늘리는 쪽이 방어를 낮추니 대화 비율을 점검하세요.'
      ], variationSeed + 22);
    }
    if (repairMode === 'distance') {
      return pickByNumber([
        '거리 조정 단계에서는 접촉 횟수보다 기준 합의가 중요하니, 부담되는 패턴 1개를 먼저 공유하세요.',
        '관계 온도차를 줄이려면 기대치 문장을 먼저 맞춰야 하므로 연락 규칙을 짧게 문장으로 고정하세요.',
        '경계 설정이 필요한 흐름이라 요청 가능한 범위와 보류할 범위를 나눠 기록하고 대화에 반영하세요.'
      ], variationSeed + 23);
    }
    return pickByNumber([
      '이번 주는 감정 표현과 사실 확인의 순서를 섞지 말고, 먼저 확인 후 요청하는 패턴으로 고정하세요.',
      '관계 조율의 초점은 한 번의 긴 대화가 아니라 짧은 대화를 꾸준히 이어가는 리듬에 두세요.',
      '회복 구간에서는 결론보다 관찰이 우선이므로, 반응 로그를 남기고 다음 문장을 조정해 실행하세요.'
    ], variationSeed + 24);
  })();
  const planCheckpoint = pickByNumber([
    `점검 기준은 다음 7일 흐름(${week?.card?.nameKo || '-'})의 "${keyword(week)}" 신호가 완화되는지로 잡고, 48시간 간격으로 기록하세요.`,
    `중간 점검은 거리/갈등의 핵심(${friction?.card?.nameKo || '-'}) 키워드 "${keyword(friction)}"가 대화에서 줄어드는지 확인하는 방식이 좋습니다.`,
    `주간 마무리에서는 상대 관점 신호(${signal?.card?.nameKo || '-'}) 반응을 기준으로 다음 주 문장 톤을 조정하세요.`
  ], variationSeed + 4);

  const reconnectTrack = pickByNumber([
    '재회를 시도하고 싶다면: 안부 1문장 + 확인 질문 1문장으로 시작하고, 답을 재촉하지 않는 템포를 유지하세요.',
    '재회를 열어보려면: 긴 설명 대신 짧은 연락 1회로 접점을 만들고, 상대 반응을 본 뒤 다음 대화를 여세요.',
    '연결을 다시 만들고 싶다면: 하루 감정 정리 후 저강도 메시지 1개만 보내고, 반응 기록을 기준으로 다음 행동을 정하세요.'
  ], variationSeed + 41);
  const recoveryTrack = pickByNumber([
    '지금은 나를 먼저 회복하고 싶다면: 연락 시도 횟수를 줄이고 수면/루틴/일상 리듬을 먼저 안정화하세요.',
    '마음 회복을 우선한다면: 상대 해석을 멈추고 하루 1회 감정 기록으로 생각 과열을 낮추는 편이 좋습니다.',
    '감정 소모가 크다면: 관계 결론을 잠시 보류하고, 내 생활 리듬을 되찾는 행동 1개를 매일 고정하세요.'
  ], variationSeed + 42);
  const plan = [
    planOpening,
    planRoutine,
    modePlan,
    `선택지: ${reconnectTrack} ${recoveryTrack}`,
    planCheckpoint,
    levelHint
  ].join(' ');
  const closingLine = pickByNumber([
    '마무리: 이번 주는 큰 결론보다, 오해를 줄이는 한 번의 대화 성공을 목표로 두면 훨씬 안정적입니다.',
    '마무리: 재회 가능성은 속도보다 리듬에서 갈리니, 오늘은 짧고 안전한 대화 1회만 목표로 잡아보세요.',
    '마무리: 관계의 방향을 당장 확정하기보다, 서로 덜 다치게 대화를 이어갈 기반을 먼저 만드는 것이 핵심입니다.'
  ], variationSeed + 43);

  return [empathyLine, diagnosis, risk, plan, closingLine].join('\n\n');
}
