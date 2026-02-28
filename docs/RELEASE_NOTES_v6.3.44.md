# Release Notes v6.3.44

## 개요
리딩 품질을 유지하면서 후처리 개입 단계를 줄였습니다.
- evidence 품질 보정을 postprocess가 아닌 normalize 단계로 이동
- postprocess는 안전/계약 복구 중심으로 축소
- overall fortune 중복 완화 로직의 과도한 고정 fallback 제거
- 회귀 테스트를 새 정책에 맞게 정렬

## 주요 변경

### 1) 후처리 책임 축소 (API)
- `apps/api/src/domains/reading/hybrid.js`
  - `postProcessReport()`에서 `enforceEvidenceQuality` 기반 evidence 전면 재작성 경로 제거
  - fortune 보정은 구조 위반/오염(`needsStructuralFix`)일 때만 수행
  - 결과적으로 postprocess는 오염 제거, summary/verdict 중복 완화, 리스트 정리, 구조 복구에 집중

### 2) normalize 단계 1차 품질 보정 강화 (API)
- `apps/api/src/domains/reading/hybrid.js`
  - `normalizeReport()` evidence 정규화 확장:
    - `claim/rationale/caution` 오염 문자열 감지 시 fallback 기반 안전 문장으로 교체
    - 역방향 claim + 과도 낙관 rationale 충돌 시 rationale을 fallback으로 교정
    - `caution`은 리스트 prefix 제거(`stripListPrefix`) 후 유효성 재검증
  - “후처리에서 다시 고치는” 다단계 개입을 줄이고, 입력 정규화에서 1차 수습

### 3) overall fortune 중복 회피 단순화 (Web)
- `apps/web/src/pages/TarotMastery.tsx`
  - `getDistinctReportCopy()`의 overall fortune 분기 조정
  - summary와 중복될 때 고정 상수 문구로 덮는 대신
    - `energy -> workFinance -> love/healthMind` 순으로만 대체
  - UI 보정이 API 결과를 과도하게 재해석하지 않도록 축소

### 4) 테스트 기준 동기화
- `apps/api/tests/hybrid-resilience.js`
  - evidence 품질 보정이 normalize 단계에서 처리되는 정책에 맞게
    `evidence_quality_rewritten` 플래그 기대를 제거
  - 품질 결과(오염 제거/역방향 충돌 교정)는 기존처럼 검증 유지

## 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:ui-flow --prefix apps/web` 통과

## 영향 요약
- 후처리 체인 단순화로 개입 충돌 리스크가 낮아집니다.
- 리딩 품질 보정 시점이 normalize로 앞당겨져 일관성이 높아집니다.
- 웹 레이어의 과도한 문구 대체가 줄어 API 생성 결과 보존성이 개선됩니다.
