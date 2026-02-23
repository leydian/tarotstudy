export const spreads = [
  {
    "id": "one-card",
    "name": "운명의 한 장 (원카드)",
    "category": "daily",
    "level": "beginner",
    "cardCount": 1,
    "purpose": "복잡한 생각은 버리고, 지금 이 순간 가장 필요한 메시지 하나에 집중합니다.",
    "whenToUse": ["오늘의 컨디션 점검", "빠른 결단이 필요할 때", "중심을 잡고 싶을 때"],
    "positions": [{ "name": "핵심 메시지", "meaning": "지금 당신이 가장 먼저 마주해야 할 진실" }],
    "layout": { "cols": 3, "rows": 1, "slots": [{ "position": "핵심 메시지", "col": 2, "row": 1 }] },
    "variants": [
      { "id": "one-yesno", "name": "명쾌한 예/아니오", "positions": [{ "name": "결정 신호", "meaning": "진행 시의 긍정/부정 여부" }] },
      { "id": "one-action", "name": "당장 할 일", "positions": [{ "name": "우선 행동", "meaning": "지금 즉시 실행할 한 가지" }] }
    ]
  },
  {
    "id": "three-card",
    "name": "흐름의 통찰 (3카드)",
    "category": "strategy",
    "level": "beginner",
    "cardCount": 3,
    "purpose": "상황의 원인과 전개를 수평적인 흐름으로 읽어 인과관계를 파악합니다.",
    "whenToUse": ["과거의 영향과 미래 전망", "문제의 원인과 돌파구", "나와 상대의 관계 균형"],
    "layout": {
      "cols": 3, "rows": 1,
      "slots": [
        { "position": "1번", "col": 1, "row": 1 },
        { "position": "2번", "col": 2, "row": 1 },
        { "position": "3번", "col": 3, "row": 1 }
      ]
    },
    "variants": [
      { 
        "id": "past-present-future", 
        "name": "시간의 흐름 (과-현-미)", 
        "positions": [
          { "name": "과거", "meaning": "이 상황의 뿌리가 된 배경" },
          { "name": "현재", "meaning": "지금 작동하는 핵심 에너지" },
          { "name": "미래", "meaning": "조만간 마주할 결과" }
        ] 
      },
      { 
        "id": "problem-cause-solution", 
        "name": "문제 해결 (문-원-해)", 
        "positions": [
          { "name": "현상", "meaning": "드러나 있는 불편함" },
          { "name": "원인", "meaning": "보이지 않는 진짜 병목" },
          { "name": "해결", "meaning": "상황을 바꿀 마스터키" }
        ] 
      }
    ]
  },
  {
    "id": "choice-a-b",
    "name": "선택의 저울 (V자형)",
    "category": "decision",
    "level": "beginner",
    "cardCount": 5,
    "purpose": "두 가지 갈림길 사이에서 소모와 이득을 시각적으로 비교합니다.",
    "whenToUse": ["이직 오퍼 비교", "구매 고민", "거주지 이동 선택"],
    "layout": {
      "cols": 3, "rows": 3,
      "slots": [
        { "position": "현재 상황", "col": 2, "row": 1 },
        { "position": "A 시나리오", "col": 1, "row": 2 },
        { "position": "B 시나리오", "col": 3, "row": 2 },
        { "position": "A 최종 결과", "col": 1, "row": 3 },
        { "position": "B 최종 결과", "col": 3, "row": 3 }
      ]
    },
    "variants": [
      {
        "id": "purchase-logic",
        "name": "실속 구매 결정",
        "positions": [
          { "name": "현재 욕구", "meaning": "사고 싶은 마음의 온도" },
          { "name": "기능적 만족", "meaning": "물건이 주는 실용적 가치" },
          { "name": "금전적 대가", "meaning": "지출 후의 재정적 여파" },
          { "name": "장기 활용도", "meaning": "3개월 뒤에도 잘 쓸 확률" },
          { "name": "최종 결론", "meaning": "지금 결제할 신호" }
        ]
      }
    ]
  },
  {
    "id": "rel-diamond",
    "name": "소울 다이아몬드 (관계)",
    "category": "relationship",
    "level": "intermediate",
    "cardCount": 5,
    "purpose": "나와 상대의 속마음, 그리고 두 사람을 잇는 에너지를 입체적으로 분석합니다.",
    "whenToUse": ["썸/연애 중 속마음이 궁금할 때", "재회 가능성을 보고 싶을 때", "갈등의 실마리를 찾을 때"],
    "layout": {
      "cols": 3, "rows": 3,
      "slots": [
        { "position": "상대의 속마음", "col": 2, "row": 1 },
        { "position": "방해 요소", "col": 1, "row": 2 },
        { "position": "연결 고리", "col": 3, "row": 2 },
        { "position": "나의 속마음", "col": 2, "row": 3 },
        { "position": "관계의 결과", "col": 2, "row": 2, "rotate": 45 }
      ]
    }
  },
  {
    "id": "goal-stair",
    "name": "승리 가도 (화살표형)",
    "category": "goal",
    "level": "beginner",
    "cardCount": 4,
    "purpose": "목표 달성을 위한 단계를 계단식으로 밟아 올라가며 성취 전략을 짭니다.",
    "whenToUse": ["시험 합격 전략", "프로젝트 마감", "승진 및 성과 달성"],
    "layout": {
      "cols": 4, "rows": 4,
      "slots": [
        { "position": "현재 실력", "col": 1, "row": 4 },
        { "position": "첫 번째 고비", "col": 2, "row": 3 },
        { "position": "도약의 열쇠", "col": 3, "row": 2 },
        { "position": "최종 성취", "col": 4, "row": 1 }
      ]
    }
  },
  {
    "id": "yearly-circle",
    "name": "시간의 바퀴 (원형)",
    "category": "fortune",
    "level": "intermediate",
    "cardCount": 13,
    "purpose": "한 해의 흐름을 시계 방향 원형으로 조망하여 시기별 완급을 조절합니다.",
    "whenToUse": ["신년 계획", "생일 기념 리딩", "장기적 삶의 방향성"],
    "layout": {
      "cols": 5, "rows": 5,
      "slots": [
        { "position": "1월", "col": 3, "row": 1 },
        { "position": "2월", "col": 4, "row": 1 },
        { "position": "3월", "col": 5, "row": 2 },
        { "position": "4월", "col": 5, "row": 3 },
        { "position": "5월", "col": 4, "row": 5 },
        { "position": "6월", "col": 3, "row": 5 },
        { "position": "7월", "col": 2, "row": 5 },
        { "position": "8월", "col": 1, "row": 4 },
        { "position": "9월", "col": 1, "row": 3 },
        { "position": "10월", "col": 1, "row": 2 },
        { "position": "11월", "col": 2, "row": 1 },
        { "position": "12월", "col": 2.5, "row": 1 },
        { "position": "올해의 테마", "col": 3, "row": 3 }
      ]
    }
  }
];
