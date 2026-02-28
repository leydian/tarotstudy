# Release Notes v6.3.8 (2026-02-28)

## 목적
초간단 일상 질문(예: "커피를 마실까 말까?")에서 결과가 과도하게 장문으로 생성되는 문제를 줄이고,
질문 길이/무게에 맞는 간결한 리딩 결과를 제공하도록 응답 정책을 조정합니다.

## 핵심 변경
- API 간결 모드 도입
  - 조건: `questionType === "light"` 또는 `questionType === "binary" && question.length <= 20`
  - 효과: 결론/근거/지침을 짧고 직접적인 형식으로 재구성
- 프롬프트 스타일 가드 추가
  - `fullNarrative` 길이 제한
  - 과장된 비유/세계관 설명 금지
  - 질문에 대한 직접 결론 1문장 필수
- 프론트 스프레드 선택 최적화
  - 짧은 이진 질문은 5카드 `career-path` 대신 2카드 `choice` 스프레드 사용

## 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.8.md`

## 상세 구현
1. `hybrid.js`
- `buildPrompt()`에 `styleGuard` 추가:
  - light 질문일 때 서사 길이 제한과 직접 결론 지시를 강제
- `generateReadingHybrid()`에 간결 모드 분기 추가:
  - `conclusion`: `summary + verdict` 조합으로 단문 결론 구성
  - `evidence`: 카드별 `claim`만 간결 라인으로 노출
  - `action`: 최대 2개 행동 지침으로 제한
  - `yesNoVerdict`: 정규화 함수 기반으로 일관 표기

2. `TarotMastery.tsx`
- 질문 길이가 20자 이하인 이진 질문은 `targetCardCount = 2` 적용
- 2카드일 때 `choice` 스프레드 우선 선택

## 기대 효과
- 초간단 질문에서 불필요한 장문 생성 억제
- 질문 난이도 대비 응답 밀도 최적화
- 사용자가 핵심 결론을 더 빠르게 인지 가능

## 검증
- `npm run test:persona --prefix apps/api`
- `npm run build --prefix apps/web`

## 리스크 및 대응
- 리스크: 질문 길이만으로 간결 모드를 판단하면 일부 의미 있는 질문이 짧게 요약될 수 있음
- 대응: 현재는 `questionType` + 길이 조건을 함께 적용했고, 운영 피드백 기반으로 임계값(20자) 조정 예정
