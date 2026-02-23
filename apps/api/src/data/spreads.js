export const spreads = [
  // 1. [V자형] 결단 & 선택 (Decision V)
  {
    "id": "dec-purchase",
    "name": "실속 구매 결정 (V자형)",
    "category": "decision",
    "level": "beginner",
    "cardCount": 5,
    "purpose": "사고 싶은 물건이 있을 때 '충동'과 '필요'를 구분해 결론을 내립니다.",
    "whenToUse": [
      "고가의 장비를 구매하기 직전 고민될 때",
      "이 소비가 나에게 실질적인 가치를 줄지 궁금할 때",
      "비슷한 두 제품 사이에서 결정을 못 하겠을 때"
    ],
    "positions": [
      { "name": "현재 욕망", "meaning": "이 물건을 갖고 싶은 솔직한 심리" },
      { "name": "현실적 필요", "meaning": "내 삶에서 이 물건이 차지할 실용적 비중" },
      { "name": "금전적 부담", "meaning": "구매 후 가계 경제에 미칠 여파" },
      { "name": "사용 시 만족도", "meaning": "3개월 후에도 꾸준히 쓸 확률" },
      { "name": "최종 결정", "meaning": "구매 여부에 대한 명확한 신호" }
    ],
    "layout": {
      "cols": 5, "rows": 3,
      "slots": [
        { "position": "현재 욕망", "col": 1, "row": 1 },
        { "position": "현실적 필요", "col": 5, "row": 1 },
        { "position": "금전적 부담", "col": 2, "row": 2 },
        { "position": "사용 시 만족도", "col": 4, "row": 2 },
        { "position": "최종 결정", "col": 3, "row": 3 }
      ]
    },
    "studyGuide": [
      "양쪽 끝(욕망 vs 필요)의 대비를 먼저 확인하세요.",
      "중앙의 '최종 결정'이 역방향이면 일단 장바구니에 두고 3일 기다리세요."
    ]
  },
  {
    "id": "dec-offer",
    "name": "이직/오퍼 비교 (V자형)",
    "category": "decision",
    "level": "intermediate",
    "cardCount": 5,
    "purpose": "두 가지 제안이나 오퍼 중 커리어에 더 유리한 쪽을 선별합니다.",
    "whenToUse": [
      "합격 통보를 받은 두 회사 사이에서 고민될 때",
      "현재 직장 잔류 vs 새로운 제안 수락 사이의 갈등",
      "중요한 프로젝트 A안과 B안 중 선택해야 할 때"
    ],
    "positions": [
      { "name": "현재 커리어 상태", "meaning": "지금 내가 서 있는 기반과 위치" },
      { "name": "A 선택 시 성장성", "meaning": "첫 번째 오퍼의 확장 가능성" },
      { "name": "B 선택 시 성장성", "meaning": "두 번째 오퍼의 확장 가능성" },
      { "name": "A 선택 시 피로도", "meaning": "적응 과정에서의 소모 요소" },
      { "name": "B 선택 시 피로도", "meaning": "적응 과정에서의 소모 요소" }
    ],
    "layout": {
      "cols": 3, "rows": 3,
      "slots": [
        { "position": "현재 커리어 상태", "col": 2, "row": 1 },
        { "position": "A 선택 시 성장성", "col": 1, "row": 2 },
        { "position": "B 선택 시 성장성", "col": 3, "row": 2 },
        { "position": "A 선택 시 피로도", "col": 1, "row": 3 },
        { "position": "B 선택 시 피로도", "col": 3, "row": 3 }
      ]
    },
    "studyGuide": [
      "성장성(위)과 피로도(아래)를 세로 축으로 비교해 '가성비'가 좋은 오퍼를 찾으세요."
    ]
  },

  // 2. [화살표형] 목표 & 성취 (Arrow Flow)
  {
    "id": "goal-exam",
    "name": "합격 가도 (화살표형)",
    "category": "goal",
    "level": "beginner",
    "cardCount": 5,
    "purpose": "시험이나 자격증 취득을 위한 학습 전략을 화살표 흐름으로 분석합니다.",
    "whenToUse": [
      "시험이 한 달 앞으로 다가와 집중력이 필요할 때",
      "공부한 만큼 점수가 안 나와 돌파구가 필요할 때",
      "합격 가능성을 높이는 핵심 행동을 정하고 싶을 때"
    ],
    "positions": [
      { "name": "학습 기반", "meaning": "현재까지 쌓인 실력과 베이스" },
      { "name": "추진 동력", "meaning": "앞으로 나아가게 하는 의지와 자원" },
      { "name": "핵심 장애", "meaning": "진도를 방해하는 병목 지점" },
      { "name": "전략적 승부수", "meaning": "합격 확률을 높일 비장의 한 수" },
      { "name": "최종 성적", "meaning": "목표 달성 여부와 체감 결과" }
    ],
    "layout": {
      "cols": 5, "rows": 1,
      "slots": [
        { "position": "학습 기반", "col": 1, "row": 1 },
        { "position": "추진 동력", "col": 2, "row": 1 },
        { "position": "핵심 장애", "col": 3, "row": 1 },
        { "position": "전략적 승부수", "col": 4, "row": 1 },
        { "position": "최종 성적", "col": 5, "row": 1 }
      ]
    },
    "studyGuide": [
      "왼쪽에서 오른쪽으로 읽으며 기운이 막히는 곳(장애)을 집중 점검하세요."
    ]
  },

  // 3. [다이아몬드형] 관계 & 갈등 (Relationship Diamond)
  {
    "id": "rel-first-meeting",
    "name": "첫 만남 인상 (다이아몬드형)",
    "category": "relationship",
    "level": "beginner",
    "cardCount": 4,
    "purpose": "소개팅이나 첫 미팅 후 서로의 인상과 관계의 방향성을 확인합니다.",
    "whenToUse": [
      "소개팅 후 상대방의 속마음이 궁금할 때",
      "새로운 팀원이나 파트너와 첫 인사를 나눴을 때",
      "애프터를 신청할지 말지 결정이 필요할 때"
    ],
    "positions": [
      { "name": "나의 인상", "meaning": "내가 비춰진 톤과 분위기" },
      { "name": "상대의 인상", "meaning": "상대방이 나에게 느낀 매력/경계" },
      { "name": "공통 분모", "meaning": "대화가 잘 통했거나 엮일 수 있는 지점" },
      { "name": "다음 접점", "meaning": "두 번째 만남으로 이어질 가능성" }
    ],
    "layout": {
      "cols": 3, "rows": 3,
      "slots": [
        { "position": "나의 인상", "col": 2, "row": 1 },
        { "position": "상대의 인상", "col": 1, "row": 2 },
        { "position": "공통 분모", "col": 3, "row": 2 },
        { "position": "다음 접점", "col": 2, "row": 3 }
      ]
    },
    "studyGuide": [
      "좌우(인상)의 밸런스를 보고 누가 더 적극적이었는지 확인하세요."
    ]
  },
  {
    "id": "rel-conflict",
    "name": "갈등 실마리 (다이아몬드형)",
    "category": "relationship",
    "level": "intermediate",
    "cardCount": 5,
    "purpose": "반복되는 다툼의 원인을 찾고 화해를 위한 접점을 도출합니다.",
    "whenToUse": [
      "연인이나 친구와 냉전 중일 때",
      "직장 동료와 업무적으로 부딪혀서 소통이 막막할 때",
      "상대방이 왜 화가 났는지 도저히 이해되지 않을 때"
    ],
    "positions": [
      { "name": "표면적 이슈", "meaning": "말다툼의 직접적인 계기" },
      { "name": "나의 숨은 욕구", "meaning": "내가 정말 원했던 보상/감정" },
      { "name": "상대의 숨은 욕구", "meaning": "상대가 원했던 인정/배려" },
      { "name": "오해의 핵심", "meaning": "두 사람 사이의 해석 차이" },
      { "name": "화해의 열쇠", "meaning": "대화를 다시 여는 유효한 문장" }
    ],
    "layout": {
      "cols": 3, "rows": 3,
      "slots": [
        { "position": "표면적 이슈", "col": 2, "row": 1 },
        { "position": "나의 숨은 욕구", "col": 1, "row": 2 },
        { "position": "상대의 숨은 욕구", "col": 3, "row": 2 },
        { "position": "오해의 핵심", "col": 2, "row": 2 },
        { "position": "화해의 열쇠", "col": 2, "row": 3 }
      ]
    },
    "studyGuide": [
      "중앙의 '오해의 핵심'을 먼저 읽고 좌우의 '숨은 욕구'를 대조하세요."
    ]
  },

  // 4. [역삼각형] 치유 & 정비 (Recovery Triangle)
  {
    "id": "rec-burnout",
    "name": "번아웃 구조대 (역삼각형)",
    "category": "recovery",
    "level": "beginner",
    "cardCount": 4,
    "purpose": "무기력함의 원인을 짚고 에너지를 회복할 최소한의 실천을 제안합니다.",
    "whenToUse": [
      "아무것도 하기 싫고 무기력할 때",
      "열심히 사는데 마음이 텅 빈 느낌이 들 때",
      "휴식이 절실하지만 쉴 수 없는 상황일 때"
    ],
    "positions": [
      { "name": "현재 피로도", "meaning": "몸과 마음의 소진 상태" },
      { "name": "외부 압박", "meaning": "나를 억누르는 상황적 요인" },
      { "name": "내면의 저항", "meaning": "스스로를 갉아먹는 생각 패턴" },
      { "name": "회복의 첫걸음", "meaning": "오늘 바로 할 수 있는 작은 쉼" }
    ],
    "layout": {
      "cols": 3, "rows": 2,
      "slots": [
        { "position": "현재 피로도", "col": 1, "row": 1 },
        { "position": "외부 압박", "col": 2, "row": 1 },
        { "position": "내면의 저항", "col": 3, "row": 1 },
        { "position": "회복의 첫걸음", "col": 2, "row": 2 }
      ]
    },
    "studyGuide": [
      "위쪽의 복잡한 원인들을 잊고 맨 아래의 '첫걸음' 카드에만 집중하세요."
    ]
  },

  // 5. [십자형] 전략 & 운세 (Strategic Cross)
  {
    "id": "str-weekly",
    "name": "주간 밸런스 (십자형)",
    "category": "strategy",
    "level": "beginner",
    "cardCount": 5,
    "purpose": "한 주의 핵심 과제와 삶의 균형을 십자 형태로 점검합니다.",
    "whenToUse": [
      "월요일 아침, 이번 주의 톤을 설정하고 싶을 때",
      "일과 삶의 균형이 깨진 것 같아 조율이 필요할 때",
      "이번 주 가장 운이 좋은 지점이 어디인지 궁금할 때"
    ],
    "positions": [
      { "name": "이번 주 테마", "meaning": "한 주를 지배하는 핵심 기운" },
      { "name": "커리어/학업", "meaning": "일적인 성과와 과제" },
      { "name": "관계/휴식", "meaning": "사람과의 소통과 개인적 여유" },
      { "name": "주의점", "meaning": "갑작스러운 소모나 실수 지점" },
      { "name": "주간 결실", "meaning": "금요일 저녁에 마주할 성과" }
    ],
    "layout": {
      "cols": 3, "rows": 3,
      "slots": [
        { "position": "커리어/학업", "col": 2, "row": 1 },
        { "position": "이번 주 테마", "col": 2, "row": 2 },
        { "position": "주의점", "col": 1, "row": 2 },
        { "position": "관계/휴식", "col": 3, "row": 2 },
        { "position": "주간 결실", "col": 2, "row": 3 }
      ]
    },
    "studyGuide": [
      "테마(중앙)를 기준으로 상(일)과 우(관계)의 조화를 읽으세요."
    ]
  }
];
