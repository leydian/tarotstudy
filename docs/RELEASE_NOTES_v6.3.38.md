# Release Notes v6.3.38

## 개요
후처리 3차 경량화를 적용해 스타일 개입을 더 줄이면서 안전/계약 품질은 유지했습니다.  
또한 `qualityFlags`에 분류형 접두를 병행 기록해 운영 해석성을 개선했습니다.

## 주요 변경

### 1) 스타일 과교정 축소
- `apps/api/src/domains/reading/hybrid.js`
  - `enforceEvidenceQuality`에서 “전체 rationale 동일 시 장문 확장” 로직 제거.
  - `summary_verdict_overlap_high` 처리 시 무조건 재작성하지 않고,
    - summary/rationale이 동일하거나 rationale이 비었을 때만 최소 재작성.
  - contamination/역방향-낙관 충돌 같은 안전성 보정은 유지.

### 2) 품질 플래그 분류형 확장
- `apps/api/src/domains/reading/hybrid.js`
  - `qualityFlags`에 기존 플래그를 유지하면서 분류형 플래그를 병행 추가:
    - `safety_*`
    - `style_*`
    - `contract_*`
  - 최종 응답 플래그와 모델 단계 플래그(`debug` 시 `modelQualityFlags`) 모두 분류형으로 확장.

### 3) 프롬프트 유도 강화
- `apps/api/src/domains/reading/hybrid.js`
  - `overall_fortune`/`concise-binary` 지시에 역방향 카드 어조 규칙을 추가해
    후처리 개입 없이도 점검/완충 톤이 유지되도록 보강.

### 4) 회귀 테스트 보강
- `apps/api/tests/hybrid-resilience.js`
  - 분류형 플래그(`safety_evidence_quality_rewritten`) 병행 기록 검증 추가.
  - fallback 최종 플래그가 모델 단계 `report_missing` 잡음으로 오염되지 않는지 검증 유지.

## 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/web/tests/validate-ui-contract.js` 통과
- `node apps/web/tests/validate-reading-flow-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 후처리의 문체 개입이 줄어 모델 출력의 자연스러움을 더 보존합니다.
- 품질 플래그가 분류형으로 확장되어 운영 원인 분석이 쉬워집니다.
- 안전/계약 품질 기준(health guardrail, contamination 제거, 구조 정합성)은 유지됩니다.
