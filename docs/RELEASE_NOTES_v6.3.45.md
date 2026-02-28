# Release Notes v6.3.45

## 개요
리딩 품질 파이프라인의 남은 중복 개입 지점을 정리했습니다.
- API 품질 플래그의 중복 기록 제거
- overall fortune의 UI 중복 보정 책임 축소
- 테스트 기준을 새 정책에 맞춰 동기화

## 주요 변경

### 1) `summary_verdict_overlap_high` 플래그 단일화 (API)
- `apps/api/src/domains/reading/hybrid.js`
  - `postProcessReport()`에서 `summary_verdict_overlap_high` 플래그 push 제거
  - overlap 상황에서 실제 재작성이 필요할 때만 `auto_rewritten` 유지
  - 품질 판정 플래그는 `verifyReport()` 경로만 사용하도록 정리

### 2) overall fortune UI 보정 축소 (Web)
- `apps/web/src/pages/TarotMastery.tsx`
  - `getDistinctReportCopy()`의 overall fortune 분기에서
    `isTextOverlapHigh()` 기반 다단계 텍스트 치환 제거
  - UI는 API 출력 우선순위(`verdict.rationale -> message -> workFinance -> love -> healthMind`)만 적용
  - 완전 빈값 방지를 위한 최소 fallback 문구만 유지

### 3) 회귀 테스트 갱신
- `apps/api/tests/hybrid-resilience.js`
  - summary/rationale 중복 재작성 케이스에서
    `summary_verdict_overlap_high` 플래그가 남지 않는지 검증 추가

## 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:ui-flow --prefix apps/web` 통과

## 영향 요약
- `qualityFlags` 해석이 단순해져 운영 관측/디버깅 부담이 줄어듭니다.
- UI와 API의 텍스트 재가공 책임이 겹치지 않아 리딩 문구 보존성이 좋아집니다.
