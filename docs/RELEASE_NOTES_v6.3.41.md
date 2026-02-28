# Release Notes v6.3.41

## 개요
리딩 품질 정상화의 마지막 미세 조정으로, 아래 3가지를 동시에 보완했습니다.
- evidence 문장 반복감 완화
- 강한 카드(특히 탑) 표현 강도 완충
- 카드 해설 영역과 종합운세 영역의 문장 밀도 균형화

## 주요 변경

### 1) evidence 반복감 완화
- `apps/api/src/domains/reading/hybrid.js`
  - `EVIDENCE_RATIONALE_TEMPLATES` 각 버킷(`positive/caution/reversed/neutral`)에 템플릿을 확장해 패턴 다양도를 높였습니다.
  - `selectTemplateWithDiversity()`를 추가해 같은 리딩 내부에서 동일 템플릿이 연속 반복되지 않도록 선택 로직을 개선했습니다.
  - 같은 suit 연속 카드 구간에서 rationale 선택군을 회전시켜 유사 문장 반복을 줄였습니다.

### 2) 강도 완충 (탑 포함)
- `apps/api/src/domains/reading/hybrid.js`
  - `CARD_INTENSITY_LEVELS`/`getCardIntensity()`를 도입해 카드별 문장 강도 레벨을 분리했습니다.
  - 고강도 카드(`m16` 등)의 caution/reversed claim에서는
    - 경고 의미는 유지하되
    - 과도한 직설 표현 대신 “변동 관리/점검 중심” 문장을 후행하도록 조정했습니다.

### 3) 섹션 밀도 균형화
- `apps/api/src/domains/reading/hybrid.js`
  - `clampEvidenceClaim()` 추가: evidence claim 길이 상한(150자)을 적용해 과도한 길이 편차를 방지했습니다.
  - `ensureFortuneDensity()` 추가: `fortune.energy/workFinance/love/healthMind/message`가 너무 짧을 경우 보조 문장을 붙여 밀도를 보강했습니다.
  - 결과적으로 evidence 구간과 종합운세 구간의 텍스트 밀도 차이를 완화했습니다.

### 4) 회귀 테스트 보강
- `apps/api/tests/hybrid-resilience.js`
  - evidence rationale 최소 다양성(고유 패턴 3개 이상) 검증 추가
  - 탑(`m16`) 어조 완충(리스크 관리 문구 포함) 검증 추가
  - evidence claim 길이 상한 검증 추가
- `apps/api/tests/overall-fortune-regression.js`
  - fortune 섹션 필드 최소 길이(밀도 하한) 검증 추가

## 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과

## 영향 요약
- 카드별 의미 정합성과 구조 안정성은 유지한 채, 출력의 읽기 체감 품질을 개선했습니다.
- “같은 톤 반복”과 “강도 과잉”을 줄이면서도 경고/주의 신호는 보존했습니다.
- 운세 요약 섹션이 지나치게 짧아지는 문제를 완화해 전체 리딩의 균형감을 높였습니다.
