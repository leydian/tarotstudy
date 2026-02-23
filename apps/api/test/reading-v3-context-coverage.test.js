import test from 'node:test';
import assert from 'node:assert/strict';
import { cards } from '../src/data/cards.js';
import { spreads } from '../src/data/spreads.js';

process.env.START_API_SERVER = 'false';

const { buildReadingV3ForQa } = await import('../src/index.js');

const byId = new Map(spreads.map((spread) => [spread.id, spread]));

const categories = {
  study: [
    '시험 합격할 수 있을까?', '이번 모의고사 점수 오를까?', '이번 주 공부 루틴 어떻게 잡지?', '실수 줄일 수 있을까?', '암기 과목 점수 올릴 수 있을까?',
    '기출 회독 순서 이렇게 해도 될까?', '이번 달 자격증 붙을 가능성 있어?', '오답 정리 방식 바꿔야 할까?', '벼락치기 해도 될까?', '집중력 회복될까?'
  ],
  career: [
    '이직 타이밍 언제가 좋을까?', '지금 퇴사해도 괜찮을까?', '면접 합격 가능성 있을까?', '연봉 협상 이번에 해도 될까?', '직무 전환 성공할 수 있을까?',
    '이번 주 지원서 몇 건 넣는 게 좋을까?', '오퍼 기다려도 될까?', '지금 회사에 남는 게 맞을까?', '포트폴리오 방향 수정해야 할까?', '내일 면접에서 실수 안 할 수 있을까?'
  ],
  relationship: [
    '연락 끊긴 사람에게 먼저 연락해도 될까?', '재회 가능성 있을까?', '지금 고백하면 될까?', '관계를 정리하는 게 맞을까?', '상대 마음이 돌아올까?',
    '이번 주 대화 시도해도 될까?', '사과 메시지 보내는 게 좋을까?', '거리 두는 게 맞을까?', '이 관계를 계속 이어가도 될까?', '다음 만남 잡아도 될까?'
  ],
  finance: [
    '이번 달 지출 줄일 수 있을까?', '지금 이거 결제해도 될까?', '저축 비율 늘려도 괜찮을까?', '투자 시작해도 될까?', '대출 상환 먼저 하는 게 맞을까?',
    'A카드 vs B카드 뭐가 유리할까?', '이번 주 돈 흐름 괜찮을까?', '구독 서비스 정리할까?', '비상금부터 만들까?', '지금 환불 요청하는 게 맞을까?'
  ],
  health: [
    '오늘 커피 마셔도 될까?', '지금 자도 될까?', '운동 지금 시작해도 될까?', '식단 조절 다시 시작할까?', '병원 가야 할까?',
    '오늘 야식 먹어도 될까?', '술 약속 가도 될까?', '수면 리듬 회복될까?', '스트레스 관리 어떻게 해야 할까?', '오늘은 휴식이 맞을까?'
  ],
  general: [
    '오늘 결정 미뤄도 될까?', '이번 주 흐름 어때?', '지금 시작하면 괜찮을까?', '당장 실행해도 될까?', '한 번 더 확인해야 할까?',
    'A안 vs B안 뭐가 나을까?', '이번 달 방향성 맞아?', '지금 속도 줄여야 할까?', '계획 바꿔야 할까?', '오늘은 멈추는 게 맞을까?'
  ],
  timing: [
    '언제 지원하는 게 좋을까?', '언제 연락하는 게 맞을까?', '언제 공부 강도를 올려야 할까?', '언제 이직하는 게 유리할까?', '언제 결제하는 게 좋아?',
    '언제 고백하는 게 좋을까?', '언제 쉬어야 할까?', '언제 다시 시작해야 할까?', '언제 결정 확정하는 게 맞을까?', '언제 움직이는 게 안전할까?'
  ],
  compare: [
    'A학원 vs B학원 어디가 합격에 유리할까?', '서울 vs 부산 어디가 커리어에 나을까?', '현재 회사 vs 이직 어디가 좋을까?', '온라인 강의 vs 오프라인 강의 뭐가 맞을까?', '저축 vs 투자 어디에 먼저 집중할까?',
    '아침 공부 vs 밤 공부 뭐가 효율적일까?', '공부 계속 vs 휴식 먼저 뭐가 맞을까?', '연락 먼저 vs 기다리기 뭐가 나을까?', '지금 구매 vs 다음 달 구매 뭐가 유리할까?', 'A플랜 vs B플랜 어떤 선택이 안전할까?'
  ],
  predictive: [
    '이번 주 결과가 좋아질까?', '다음 달 분위기 어떨까?', '올해 하반기 흐름 어때?', '앞으로 3개월 괜찮을까?', '이번 프로젝트 마무리 잘 될까?',
    '시험 당일 컨디션 괜찮을까?', '면접 결과 긍정적일까?', '관계 회복 흐름 살아날까?', '재정 상황 나아질까?', '지금 선택이 맞았을까?'
  ],
  action: [
    '오늘 당장 뭘 해야 할까?', '지금 10분 안에 할 행동 추천해줘', '이번 주 실행 우선순위 1개만 알려줘', '실패 확률 줄이려면 뭘 해야 해?', '지금 당장 멈춰야 할 게 뭐야?',
    '오늘 체크포인트 하나만 정해줘', '내일을 위해 지금 할 일 한 가지는?', '리스크 줄이는 행동 1개만 알려줘', '지금 결과 올리려면 뭘 먼저 하지?', '오늘 마무리 행동 추천해줘'
  ]
};

const spreadByCategory = {
  study: 'one-card',
  career: 'celtic-cross',
  relationship: 'relationship-recovery',
  finance: 'three-card',
  health: 'one-card',
  general: 'three-card',
  timing: 'yearly-fortune',
  compare: 'choice-a-b',
  predictive: 'weekly-fortune',
  action: 'three-card'
};

function cloneCard(base) {
  return {
    id: base.id,
    name: base.name,
    nameKo: base.nameKo,
    arcana: base.arcana,
    suit: base.suit,
    suitKo: base.suitKo,
    rank: base.rank,
    rankKo: base.rankKo,
    keywords: Array.isArray(base.keywords) ? [...base.keywords] : []
  };
}

function buildItems(spreadId, seed = 0) {
  const spread = byId.get(spreadId);
  assert.ok(spread, `missing spread ${spreadId}`);
  return spread.positions.map((position, idx) => ({
    position: { name: position.name, meaning: position.meaning || '' },
    orientation: (idx + seed) % 3 === 0 ? 'reversed' : 'upright',
    card: cloneCard(cards[(seed + idx * 5) % cards.length])
  }));
}

function hasTimeCue(text = '') {
  return /(오늘|내일|이번 주|이번달|이번 달|다음 달|올해|분기|월|요일|3개월|시기|타이밍)/.test(String(text));
}

const domainActionPatterns = {
  study: /(기출|오답|문항|회독|취약유형|공부|학습|모의고사)/,
  career: /(지원|면접|이력서|포트폴리오|오퍼|퇴사|이직|직무)/,
  relationship: /(연락|메시지|대화|사과|거리|재회|관계|질문)/,
  finance: /(지출|예산|고정비|변동비|결제|저축|투자|환불|구독|비용|한도)/,
  health: /(수면|휴식|커피|카페인|운동|식사|술|컨디션|회복)/
};

test('reading v3 context coverage meets quality thresholds on 100 prompts', () => {
  const cases = [];
  for (const [category, list] of Object.entries(categories)) {
    for (const question of list) {
      cases.push({
        category,
        question,
        spreadId: spreadByCategory[category]
      });
    }
  }
  assert.equal(cases.length, 100);

  let genericActionUsed = 0;
  let genericCautionUsed = 0;
  let domainActionMiss = 0;
  let timingMismatch = 0;

  for (let i = 0; i < cases.length; i += 1) {
    const item = cases[i];
    const spread = byId.get(item.spreadId);
    const reading = buildReadingV3ForQa({
      spreadId: item.spreadId,
      spreadName: spread?.name || item.spreadId,
      items: buildItems(item.spreadId, i + 19),
      context: item.question,
      level: 'beginner'
    });
    const action = String(reading?.action?.now || '');
    const caution = String(reading?.caution || '');
    const merged = [reading.verdict?.sentence || '', action, caution, reading.evidence?.[0]?.narrativeLine || ''].join(' ');

    if (/^(지금 10분 안에 끝낼 수 있는 행동 1개만 실행하세요\.?|지금 가장 작은 행동 1개만 실행하고 반응을 확인하세요\.?)$/.test(action)) {
      genericActionUsed += 1;
    }
    if (/^(지금은 결론을 밀어붙이기보다 소모를 줄이고 안정부터 확보하는 편이 맞습니다\.?|과열 신호가 보이면 즉시 강도를 낮추는 쪽이 좋습니다\.?)$/.test(caution)) {
      genericCautionUsed += 1;
    }

    const pattern = domainActionPatterns[item.category];
    if (pattern && !pattern.test(action)) domainActionMiss += 1;

    if (item.category === 'timing' && !hasTimeCue(merged)) timingMismatch += 1;
  }

  assert.ok(genericActionUsed <= 25, `genericActionUsed must be <=25, got ${genericActionUsed}`);
  assert.ok(genericCautionUsed <= 30, `genericCautionUsed must be <=30, got ${genericCautionUsed}`);
  assert.ok(domainActionMiss <= 10, `domainActionMiss must be <=10, got ${domainActionMiss}`);
  assert.equal(timingMismatch, 0, `timingMismatch must be 0, got ${timingMismatch}`);
});

