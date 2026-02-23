import { analyzeQuestionContextSync } from '../../question-understanding/index.js';
import {
  inferSummaryContextTone,
  normalizeContextText,
  hashText,
  pickByNumber,
  withKoreanParticle
} from '../common/utils.js';

export function summarizeCelticCross({ items, context = '', level = 'beginner' }) {
  const pick = (name) => items.find((item) => item.position?.name === name) || null;
  const current = pick('현재');
  const obstacle = pick('교차/장애');
  const root = pick('기반');
  const recentPast = pick('가까운 과거');
  const potential = pick('가능성');
  const nearFuture = pick('가까운 미래');
  const selfView = pick('자기 인식');
  const outer = pick('외부 환경');
  const fearHope = pick('희망·두려움');
  const outcome = pick('결과');
  const contextLabel = normalizeContextText(context);
  const tone = inferSummaryContextTone(context);
  const intent = inferCelticIntent(contextLabel);
  const levelHint = level === 'intermediate' ? tone.intermediateHint : tone.beginnerHint;
  const seed = hashText([
    contextLabel,
    current?.card?.id || '',
    obstacle?.card?.id || '',
    outcome?.card?.id || ''
  ].join(':'));

  const intro = contextLabel
    ? `질문 "${contextLabel}"로 켈틱 크로스를 펼쳐보면, 지금은 마음 정리와 행동 결단을 함께 맞춰야 흐름이 풀리는 국면입니다.`
    : '켈틱 크로스를 펼쳐보면, 지금은 중심 갈등을 정확히 짚고 행동 순서를 정하면 흐름이 빠르게 정리되는 국면입니다.';

  const lines = [
    intro,
    buildCelticPositionLine({ name: '현재', item: current, intent, seed: seed + 1 }),
    buildCelticPositionLine({ name: '교차/장애', item: obstacle, intent, seed: seed + 2 }),
    buildCelticPositionLine({ name: '기반', item: root, intent, seed: seed + 3 }),
    buildCelticPositionLine({ name: '가까운 과거', item: recentPast, intent, seed: seed + 4 }),
    buildCelticPositionLine({ name: '가능성', item: potential, intent, seed: seed + 5 }),
    buildCelticPositionLine({ name: '가까운 미래', item: nearFuture, intent, seed: seed + 6 }),
    buildCelticPositionLine({ name: '자기 인식', item: selfView, intent, seed: seed + 7 }),
    buildCelticPositionLine({ name: '외부 환경', item: outer, intent, seed: seed + 8 }),
    buildCelticPositionLine({ name: '희망·두려움', item: fearHope, intent, seed: seed + 9 }),
    buildCelticPositionLine({ name: '결과', item: outcome, intent, seed: seed + 10 }),
    buildCelticConclusion({
      current,
      obstacle,
      nearFuture,
      outcome,
      intent,
      levelHint,
      seed: seed + 11
    })
  ];

  return lines.filter(Boolean).join('\n\n');
}

function inferCelticIntent(context = '') {
  const inferred = analyzeQuestionContextSync(context).intent;
  if (['relationship-repair', 'relationship', 'career', 'finance'].includes(inferred)) return inferred;
  return 'general';
}

function formatCelticCard(item) {
  if (!item?.card) return '카드 신호 확인 필요';
  return `${item.card.nameKo} ${item.orientation === 'upright' ? '정방향' : '역방향'}`;
}

function buildCelticPositionLine({ name, item, intent = 'general', seed = 0 }) {
  const cardLabel = formatCelticCard(item);
  const keyword = item?.card?.keywords?.[0] || '흐름';
  const orientation = item?.orientation === 'reversed' ? 'reversed' : 'upright';

  const relationLines = {
    현재: {
      upright: [
        `현재 상황은 ${cardLabel}입니다. 지금 두 사람 사이에는 아직 대화를 다시 열 수 있는 여지가 남아 있고, 감정을 정리하면 화해의 문이 열릴 수 있습니다.`,
        `현재 상황 카드가 ${cardLabel}로 나왔습니다. 마음이 복잡해도 관계를 완전히 끊고 싶은 마음보다는 정리하고 풀고 싶은 의지가 더 크게 보입니다.`
      ],
      reversed: [
        `현재 상황은 ${cardLabel}입니다. 지금은 감정이 겉으로 표현되기보다 안에서 꼬여 있어, 말 한마디가 더 크게 상처로 번질 수 있는 시기입니다.`,
        `현재 상황 카드가 ${cardLabel}로 보입니다. 화해 의지는 있지만 감정 피로가 쌓여 있어 바로 해결하려고 밀면 오히려 경직될 가능성이 큽니다.`
      ]
    },
    '교차/장애': {
      upright: [
        `현재의 장애물은 ${cardLabel}입니다. "${keyword}" 이슈가 두 사람 사이에서 반복되며, 서로의 의도를 추측하는 패턴이 화해를 늦추고 있습니다.`,
        `교차/장애 카드가 ${cardLabel}로 나타났습니다. 갈등 자체보다 "${keyword}"을 둘러싼 해석 차이가 커져 대화가 어긋나는 흐름입니다.`
      ],
      reversed: [
        `현재의 장애물은 ${cardLabel}입니다. 이미 소모된 감정이 남아 있어 사소한 말도 방어적으로 받아들여질 가능성이 높습니다.`,
        `교차/장애 카드가 ${cardLabel}입니다. 문제보다 감정의 잔여 열기가 더 큰 벽이 되어, 화해 시도를 주저하게 만드는 모습입니다.`
      ]
    },
    기반: {
      upright: [
        `이 상황의 기반에는 ${cardLabel}이 있습니다. 겉으로는 다툼이 보여도 바닥에는 관계를 지키고 싶은 마음이 아직 남아 있습니다.`,
        `기반 카드는 ${cardLabel}입니다. 핵심 원인은 사건 하나보다 오래 쌓인 "${keyword}" 패턴에 가까워 보여, 원인 정리가 먼저 필요합니다.`
      ],
      reversed: [
        `이 상황의 기반은 ${cardLabel}입니다. 마음속 불편을 제때 말하지 못한 채 쌓아둔 것이 지금의 거리감으로 번진 흐름입니다.`,
        `기반 카드가 ${cardLabel}로 나왔습니다. 속마음과 겉표현이 어긋난 시간이 길어져 오해가 고착된 흔적이 보입니다.`
      ]
    },
    '가까운 과거': {
      upright: [
        `가까운 과거에는 ${cardLabel}이 보입니다. 원래 관계의 결은 따뜻했지만, 최근 "${keyword}" 사건에서 리듬이 무너진 것으로 읽힙니다.`,
        `가까운 과거 카드가 ${cardLabel}입니다. 이전에는 충분히 회복 가능했던 관계였으나, 최근 한 번의 어긋남이 크게 확대된 흐름입니다.`
      ],
      reversed: [
        `가까운 과거에는 ${cardLabel}이 놓여 있습니다. 최근 대화에서 감정 소통이 막히면서 작은 불편이 갈등으로 커졌을 가능성이 높습니다.`,
        `가까운 과거 카드가 ${cardLabel}입니다. 이미 관계 피로 신호가 있었는데 제때 정리되지 않아 지금의 충돌로 이어진 모습입니다.`
      ]
    },
    가능성: {
      upright: [
        `당신이 바라는 가능성은 ${cardLabel}입니다. 결국 이 관계를 건강한 방식으로 회복하고 싶다는 의지가 분명하게 드러납니다.`,
        `가능성 카드가 ${cardLabel}로 보여요. 지금 마음속 목표는 승패가 아니라 관계의 균형을 되찾는 데 있습니다.`
      ],
      reversed: [
        `당신이 바라는 가능성은 ${cardLabel}입니다. 화해하고 싶지만 자존심이 상할까 두려워 스스로 속도를 늦추는 모습도 함께 보입니다.`,
        `가능성 카드가 ${cardLabel}입니다. 관계를 풀고 싶은 마음과 상처받기 싫은 마음이 동시에 작동해 망설임이 커진 상태입니다.`
      ]
    },
    '가까운 미래': {
      upright: [
        `가까운 미래에는 ${cardLabel}이 나왔습니다. 먼저 짧은 대화를 열 기회가 들어오며, 타이밍을 놓치지 않으면 흐름이 부드럽게 바뀔 수 있습니다.`,
        `가까운 미래 카드가 ${cardLabel}입니다. 곧 감정 충돌 대신 사실 확인 중심으로 대화를 시작할 수 있는 창이 열릴 가능성이 큽니다.`
      ],
      reversed: [
        `가까운 미래는 ${cardLabel}입니다. 서두르면 다시 어긋날 수 있으니, 바로 결론을 내기보다 대화 강도를 낮추는 전략이 필요합니다.`,
        `가까운 미래 카드가 ${cardLabel}로 보여요. 화해 시도는 가능하지만 타이밍을 급히 잡으면 재충돌 위험이 있어 단계적 접근이 필요합니다.`
      ]
    },
    '자기 인식': {
      upright: [
        `당신의 현재 인식은 ${cardLabel}입니다. 관계를 소중히 여기고 있고, 내가 먼저 정리하면 풀릴 수 있다는 감각도 살아 있습니다.`,
        `자기 인식 카드가 ${cardLabel}입니다. 마음속에는 여전히 이 우정을 지키고 싶다는 중심이 분명하게 남아 있습니다.`
      ],
      reversed: [
        `자기 인식은 ${cardLabel}입니다. 상처받은 마음이 커서 먼저 다가가고 싶으면서도 동시에 방어적으로 굳어지는 모습이 보입니다.`,
        `자기 인식 카드가 ${cardLabel}입니다. 진심은 있지만 표현 방식에서 불안이 커져 말을 고르기 어려운 상태입니다.`
      ]
    },
    '외부 환경': {
      upright: [
        `외부 환경은 ${cardLabel}입니다. 주변 조건이 완전히 불리하지는 않아서, 대화 통로만 잘 잡으면 화해를 도울 요소가 있습니다.`,
        `외부 환경 카드가 ${cardLabel}입니다. 상황이 천천히라도 정리될 여지는 있으니, 제3의 변수에 휘둘리지 않는 것이 중요합니다.`
      ],
      reversed: [
        `외부 환경은 ${cardLabel}입니다. 지금은 일정·상황·주변 반응이 대화를 지연시키는 요인으로 작동할 수 있어 답답함이 커질 수 있습니다.`,
        `외부 환경 카드가 ${cardLabel}입니다. 관계 문제 외에도 외부 스트레스가 겹쳐 화해 시도가 자꾸 뒤로 밀리는 흐름입니다.`
      ]
    },
    '희망·두려움': {
      upright: [
        `희망과 두려움 자리에는 ${cardLabel}이 있습니다. 다시 잘 풀고 싶은 기대가 크지만, 또 충돌할까 걱정하는 마음도 함께 존재합니다.`,
        `희망·두려움 카드가 ${cardLabel}입니다. 관계를 살리고 싶은 의지와 다시 상처받을까 두려운 감정이 동시에 올라오는 상태입니다.`
      ],
      reversed: [
        `희망과 두려움은 ${withKoreanParticle(cardLabel, '으로', '로')} 드러납니다. 마음이 예민해져 있어 상대 반응을 과하게 해석할 수 있으니 감정 속도 조절이 필요합니다.`,
        `희망·두려움 카드가 ${cardLabel}입니다. 화해를 바라면서도 실패 장면을 먼저 떠올려 스스로 시도를 멈추게 할 수 있는 흐름입니다.`
      ]
    },
    결과: {
      upright: [
        `결과 카드는 ${cardLabel}입니다. 지금 흐름대로 가면 관계를 다시 맞춰갈 가능성이 충분하며, 먼저 대화의 물꼬를 트는 쪽이 유리합니다.`,
        `마지막 결과는 ${cardLabel}입니다. 결론적으로는 화해 가능성이 살아 있으니, 진심을 짧고 분명하게 전하는 행동이 핵심입니다.`
      ],
      reversed: [
        `결과 카드는 ${cardLabel}입니다. 망설임이 길어지면 관계 피로가 커질 수 있으니, 지나친 계산보다 실행 타이밍을 잡는 결단이 필요합니다.`,
        `마지막 결과가 ${cardLabel}입니다. 균형을 계속 재기만 하면 흐름이 정체되므로, 작은 화해 행동을 먼저 실행해야 결과가 바뀝니다.`
      ]
    }
  };

  const generalLines = {
    upright: `${name} 포지션은 ${cardLabel}입니다. "${keyword}" 신호가 비교적 열려 있어 핵심 포인트를 잡고 실행하면 흐름이 정리될 가능성이 큽니다.`,
    reversed: `${name} 포지션은 ${cardLabel}입니다. "${keyword}" 신호가 조정 구간이라 속도를 낮추고 기준을 재정렬하는 접근이 필요합니다.`
  };

  if (intent === 'relationship-repair' || intent === 'relationship') {
    const bank = relationLines[name];
    if (bank) {
      return pickByNumber(orientation === 'upright' ? bank.upright : bank.reversed, seed);
    }
  }

  return orientation === 'upright' ? generalLines.upright : generalLines.reversed;
}

function buildCelticConclusion({
  current,
  obstacle,
  nearFuture,
  outcome,
  intent = 'general',
  levelHint = '',
  seed = 0
}) {
  const currentLabel = formatCelticCard(current);
  const obstacleLabel = formatCelticCard(obstacle);
  const futureLabel = formatCelticCard(nearFuture);
  const outcomeLabel = formatCelticCard(outcome);
  const resultIsOpen = outcome?.orientation === 'upright';

  const relationshipClose = [
    `정리하면, 중심축(${currentLabel})과 장애축(${obstacleLabel})의 긴장을 먼저 풀어야 가까운 미래(${futureLabel})와 결과(${outcomeLabel})가 좋은 쪽으로 이어집니다.`,
    `판정 근거는 현재 카드의 신호가 장애 카드와 어떻게 충돌하는지, 그리고 결과 카드의 흐름으로 어떻게 이어지는지에 있습니다.`,
    resultIsOpen
      ? '결론은 화해 가능성이 충분히 열려 있습니다. 이번에는 누가 맞았는지보다 관계를 다시 안전하게 만드는 대화 방식이 핵심입니다.'
      : '결론은 아직 망설임이 크지만, 지금 행동을 바꾸면 결과 흐름을 충분히 전환할 수 있습니다. 멈춰 있는 시간보다 작은 접촉이 더 중요합니다.',
    pickByNumber([
      '지금 실행할 한 문장: "내가 먼저 감정 정리해서 이야기하고 싶어. 네 입장도 먼저 듣고 싶어."',
      '지금 실행할 한 문장: "서운했던 부분은 천천히 풀고 싶어. 네가 느낀 점을 먼저 들려줄래?"',
      '지금 실행할 한 문장: "다툰 건 마음에 남지만, 관계를 풀고 싶어. 짧게라도 대화할 수 있을까?"'
    ], seed),
    '한 줄 테마: 관계 켈틱은 갈등 원인보다 대화 순서와 속도 조절을 먼저 맞출 때 결과 전환 가능성이 커집니다.',
    levelHint
  ];

  const generalClose = [
    `정리하면, 중심축(${currentLabel})과 장애축(${obstacleLabel})을 먼저 해소할 때 가까운 미래(${futureLabel})에서 결과(${outcomeLabel})로 넘어가는 흐름이 안정됩니다.`,
    `판정 근거는 현재 카드의 신호와 장애 카드의 충돌 지점, 그리고 결과 카드의 전개 흐름을 함께 본 해석입니다.`,
    resultIsOpen
      ? '결론은 실행 가능성이 비교적 열려 있습니다. 우선순위 하나를 정해 작은 실행으로 흐름을 붙여보세요.'
      : '결론은 조정이 필요한 흐름입니다. 무리한 확장보다 핵심 병목 하나를 먼저 줄이는 쪽이 유리합니다.',
    '지금 실행할 한 문장: "이번 이슈에서 가장 먼저 정리할 핵심 한 가지를 지금 바로 결정하겠습니다."',
    '한 줄 테마: 켈틱은 중심축-장애축-결과축을 한 줄로 연결해 읽을 때 실행 기준이 가장 선명해집니다.',
    levelHint
  ];

  const lines = intent === 'relationship-repair' || intent === 'relationship' ? relationshipClose : generalClose;
  return lines.filter(Boolean).join(' ');
}
