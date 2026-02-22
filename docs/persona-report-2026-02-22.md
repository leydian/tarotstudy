# 타로/학습 페르소나 지정 현황 보고서

작성일: 2026-02-22  
대상: `/home/eunok/studycodex`

## 1) 결론 요약
- 현재 시스템은 `타로 리더`와 `학습 리더`를 **생성 단계와 UI 단계 모두에서 분리**하고 있습니다.
- `타로 리더`는 `coreMessage + interpretation` 중심으로 내담자 상담형 문장을 생성합니다.
- `학습 리더`는 `learningPoint` 전용으로 생성되며, 태그(`[학습 리더]`)와 QA 규칙까지 별도로 운용됩니다.
- 이번 2차 패치에서 타로 리더 문장에 섞이던 학습형 표현(프레임/기록/메트릭 톤)을 추가로 제거했습니다.

## 2) 페르소나 지정(코드 기준)

### 2.1 타로 리더 페르소나
- 생성 진입점: `apps/api/src/content.js:112`
  - `buildSpreadReading()`에서 `coreMessage`, `interpretation` 생성.
- 핵심 메시지(내담자 말투):
  - `apps/api/src/content.js:334` `buildNaturalCoreMessage()`
  - 구성: 공감 시작 → 카드 선언 → 방향 해석 → 제안 문장.
- 상세 상담형 메시지:
  - `apps/api/src/content.js:357` `buildTarotConsultingInterpretation()`
  - 구성: 스프레드 안내 → 정/역방향 의미 → 키워드 해석 → 맥락 적용 → 실행 제안.
- 타로 리더 톤 자원:
  - `apps/api/src/content.js:558` 이후 `SPREAD_READING_TEMPLATES`
  - 스프레드별 `uprightLine`, `reversedLine`, `defaultPrompt`, `positionPrompts`, `positionFocus`.
- 종합 리딩 톤(상담형):
  - `apps/api/src/index.js:307` `summarizeSpread()`
  - `apps/api/src/index.js:403` `buildSummaryLead()`
  - `apps/api/src/index.js:415` `buildSummaryFocus()`
  - `apps/api/src/index.js:441` `buildSummaryAction()`

### 2.2 학습 리더 페르소나
- 생성 진입점: `apps/api/src/content.js:150`
  - `learningPoint`만 학습 리더 전용으로 생성.
- 학습 리더 문장 빌더:
  - `apps/api/src/content.js:478` `buildLearningCoachOpening()`
  - `apps/api/src/content.js:489` `buildLearningCoachFrame()`
  - `apps/api/src/content.js:499` `buildLearningCoachReview()`
- 학습 리더 스타일(A/B):
  - `apps/api/src/content.js:526` `READING_STYLE_AB`
  - `learningFrame`, `reviewStep`, `actionHint` 등 학습 루틴 중심.
- QA에서 학습 리더 태그 강제:
  - `scripts/learning-leader-quality-check.mjs:48`
  - `scripts/learning-leader-quality-check.mjs:63`
  - `[학습 리더]` 태그 유무로 persona 점수 부여.

## 3) UI 노출 분리(프론트 기준)
- 종합 리딩: `apps/web/src/pages/SpreadsPage.tsx:175`
- 타로 리더 블록: `apps/web/src/pages/SpreadsPage.tsx:250`
  - `mergeTarotMessage(coreMessage, interpretation)`로 단일 흐름 렌더링.
- 학습 리더 블록: `apps/web/src/pages/SpreadsPage.tsx:258`
  - 태그(`코칭/질문/검증`) 표시 유지.

## 4) 이번 2차 패치 반영 사항
- 타로 메시지에서 학습형 문장 혼입 제거:
  - `apps/api/src/content.js:366` `buildTarotActionLine()`에서 학습 스타일 의존 제거.
  - `apps/api/src/content.js:304` `buildTarotAdviceLine()`에서 client-friendly 힌트 사용.
- 타로 상담 품질 강화:
  - 정/역방향 문장을 카드명 중심 상담형으로 보정(`buildOrientationCounselLine`).
- 레거시(미사용) 생성 함수 정리:
  - 기존 기술적 문장 생성기(미사용 함수들) 제거로 페르소나 혼선 감소.

## 5) 현재 리스크/주의점
- `inferContextProfile` 내부 텍스트는 일부 도메인별로 다소 구조적 표현이 남아 있어, 추가 자연화 여지가 있습니다.
- 학습 리더는 의도적으로 규칙적/훈련형 문장을 유지하므로, 타로 리더와 톤 차이가 크게 보이는 것은 현재 설계상 정상입니다.
