# Release Notes v6.3.37

## 개요
하이브리드 리딩 파이프라인에서 최종 응답(`report`)과 품질 지표(`quality`, `meta.qualityFlags`)의 기준 시점을 일치시켜, 후처리 해석 혼선을 줄였습니다. 후처리 축소 방향은 유지하면서 품질/안전 보장은 유지합니다.

## 주요 변경

### 1) 최종 응답 기준 품질 정렬
- `apps/api/src/domains/reading/hybrid.js`
  - `finalizeOutputReport()` 유틸 추가:
    - 최종 report 선택
    - health guardrail 적용
    - 최종 `verifyReport` 실행
    - 최종 `qualityFlags` 확정
  - 반환 `quality`가 항상 최종 `report` 기준으로 계산되도록 정렬.

### 2) 품질 플래그 해석 분리
- `apps/api/src/domains/reading/hybrid.js`
  - 모델 단계 품질 플래그와 최종 응답 단계 플래그를 분리.
  - 기본 응답의 `meta.qualityFlags`는 최종 응답 기준만 노출.
  - `debug` 모드일 때만 `meta.modelQualityFlags`를 추가 노출해 디버깅 가시성 강화.

### 3) health 가드레일 적용 경로 단순화
- `apps/api/src/domains/reading/hybrid.js`
  - deterministic 생성 단계에서 health 즉시 보정을 제거하고,
  - 최종 finalize 단계에서 단일 적용하도록 통일.

### 4) 회귀 테스트 보강
- `apps/api/tests/hybrid-resilience.js`
  - fallback 경로에서 최종 품질/플래그 기준이 모델 단계 잡음에 오염되지 않는지 검증 케이스 추가.

## 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/web/tests/validate-ui-contract.js` 통과
- `node apps/web/tests/validate-reading-flow-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- `report`와 `quality`의 기준 불일치 가능성이 해소되어 운영/디버깅 해석이 명확해집니다.
- 후처리 축소 기조를 유지하면서도 health 안전 보정은 일관되게 유지됩니다.
- debug 환경에서는 모델 단계 품질 이슈를 분리 추적할 수 있습니다.
