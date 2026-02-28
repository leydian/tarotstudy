# Release Notes v6.3.39

## 개요
운세 리딩 품질을 유지하면서 후처리 개입을 더 줄였습니다.  
핵심은 후처리에서 문장을 다시 쓰는 대신, deterministic 생성 단계에서 문장 자연스러움을 확보하는 방식입니다.

## 주요 변경

### 1) 기간 조사 비문 방지
- `apps/api/src/domains/reading/hybrid.js`
  - `withTopicParticle()`를 추가해 `은/는` 조사 선택을 자동화했습니다.
  - `buildFortuneSummary()`에 적용해 `올해은` 같은 비문이 구조적으로 발생하지 않도록 수정했습니다.

### 2) evidence 생성 품질 개선 (생성 단계 보정)
- `apps/api/src/domains/reading/hybrid.js`
  - `buildEvidenceClaim()` 추가.
  - 기존 역방향 고정 suffix(`지연·재정비`)를 제거하고,
    - 역방향: 점검/완충 톤
    - 정방향(긍정): 실행/추진 톤
    - 정방향(경고): 조건 점검 톤
    - 중립: 단계적 판단 톤
    으로 claim을 직접 생성하도록 정리했습니다.

### 3) fortune 후처리 축소
- `apps/api/src/domains/reading/hybrid.js`
  - `postProcessReport()`에서 fortune 섹션 재작성은 구조적 문제/오염이 있을 때만 수행하도록 제한했습니다.
  - 정상 출력에 대한 스타일성 재작성은 수행하지 않아 후처리 충돌 가능성을 낮췄습니다.
  - 보조 헬퍼 추가:
    - `hasFortuneContamination()`
    - `isFortuneStructurallyInvalid()`

### 4) overall_fortune 카드 매핑 fallback 안정화
- `apps/api/src/domains/reading/hybrid.js`
  - `pickDominantFact()`에서 대상 카드군이 없을 때 fallback 인덱스를 우선 적용하도록 수정했습니다.
  - 섹션별 카드 선택 일관성을 높였습니다.

### 5) 회귀 테스트 보강
- `apps/api/tests/hybrid-resilience.js`
  - 역방향 deterministic claim 어조 검증을 새 규칙(점검·완충 톤) 기준으로 갱신했습니다.
- `apps/api/tests/overall-fortune-regression.js`
  - summary에 `올해은` 비문이 없는지 검증을 추가했습니다.

## 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과

## 영향 요약
- 후처리 개입 범위가 줄어 출력 충돌 리스크가 감소합니다.
- 종합운세 문장 품질(자연스러움/일관성)이 개선됩니다.
- 안전/계약 가드레일(오염 제거, health guardrail)은 그대로 유지됩니다.
