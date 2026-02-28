# Release Notes v6.3.35

## 개요
종합운세 리딩에서 보이던 어색함 중, 정/역방향 해석 충돌과 반복 문구 문제를 줄이고 한국어 표기 일관성(`이번 달`)을 정리했습니다.

## 주요 변경

### 1) 정/역방향 해석 충돌 완화
- `apps/api/src/domains/reading/hybrid.js`
  - evidence 생성 시 rationale 분기를 역방향 우선으로 재정렬.
  - 역방향 카드 claim에 `지연·재정비` 보완 문구를 추가해 방향성과 문맥 불일치 완화.

### 2) 반복 문장 패턴 축소
- `apps/api/src/domains/reading/hybrid.js`
  - evidence rationale를 고정 문장 대신 템플릿 풀(`positive/caution/reversed/neutral`)로 분산.
  - 운세 섹션(`energy/workFinance/love/healthMind`)에서 중복 접두를 정규화:
    - `전체 에너지 흐름을 보면,`
    - `일·재물운은`
    - `애정운은`
    - `건강·마음 영역은`
  - 반복 문구 재작성이 발생하면 `meta.qualityFlags`에 `phrase_repetition_rewritten` 기록.

### 3) 표기 일관성 정리
- `apps/web/src/pages/TarotMastery.tsx`
  - 빠른 운세 preset 질문:
    - `이번달 종합 운세는?` → `이번 달 종합 운세는?`
  - 운세 타이틀:
    - `이번달 타로 종합운세` → `이번 달 타로 종합운세`

### 4) 회귀 테스트 보강
- `apps/api/tests/hybrid-resilience.js`
  - 역방향 카드 deterministic 리딩에서 낙관 고정 문구가 남지 않는지 검증 케이스 추가.
- `apps/api/tests/overall-fortune-regression.js`
  - 운세 섹션 문자열에서 중복 접두가 남지 않는지 검증 추가.
- `apps/web/tests/validate-ui-contract.js`
  - `이번 달` 표기 존재 및 `이번달` 레거시 문구 제거 검증 추가.

## 검증
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/web/tests/validate-ui-contract.js` 통과
- `node apps/web/tests/validate-reading-flow-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 역방향 카드인데 정방향 톤이 섞여 보이던 어색함이 줄어듭니다.
- 카드/운세 섹션 문장이 기계적으로 반복되는 인상이 완화됩니다.
- 월간 운세 관련 UI 문구가 `이번 달` 표기로 통일됩니다.
