# Release Notes v6.3.36

## 개요
리딩 후처리 파이프라인을 경량화해 복잡도를 줄이면서, 계약 정합성과 안전 가드레일은 유지했습니다. 핵심은 **과한 스타일 재작성 축소**와 **fallback 경로 중복 후처리 제거**입니다.

## 주요 변경

### 1) 후처리 경량화 (중간 축소)
- `apps/api/src/domains/reading/hybrid.js`
  - fallback 경로에서 `postProcessReport(deterministic)` 재실행 제거.
  - `rewriteRepetitiveEvidenceRationale` 제거.
  - `enforceFortuneSectionDiversity`를 축소:
    - 접두 중복(`전체 에너지 흐름을 보면`, `일·재물운은` 등) 제거는 유지
    - fortune 4개 섹션이 완전히 동일하게 붕괴한 경우에만 최소 보정
  - 즉, 계약/안전 중심 보정은 유지하고 스타일 재작성 폭을 줄임.

### 2) 프롬프트 지시 강화 (후처리 대체)
- `apps/api/src/domains/reading/hybrid.js`
  - `overall_fortune` 스타일 가이드에 다음을 명시:
    - 섹션 접두 반복 금지
    - evidence rationale 반복 패턴 금지
  - `concise/creative/balanced` 가이드에 역방향 카드 어조(점검/완충 우선) 지시 추가.

### 3) 회귀 테스트 보강
- `apps/api/tests/hybrid-resilience.js`
  - 신규 케이스: fallback deterministic 경로에서 과한 스타일 재작성 플래그(`phrase_repetition_rewritten`)에 의존하지 않는지 검증.

## 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/web/tests/validate-ui-contract.js` 통과
- `node apps/web/tests/validate-reading-flow-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 후처리 체인이 단순해져 유지보수 난이도와 “엉킴” 가능성이 감소합니다.
- health guardrail, contamination 제거, 계약 필드 정합성은 그대로 유지됩니다.
- 문장 미세 교정보다는 프롬프트 품질 유도로 품질을 확보하는 방향으로 전환됩니다.
