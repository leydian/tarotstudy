# Release Notes v6.3.43

## 개요
리딩 품질의 잔여 이슈를 정리했습니다.
- 문장 결합 오류(마침표 누락) 제거
- 마스터 리포트의 중복 문구 완화
- evidence 반복감 추가 완화
- 카드 의미-어조 미세 정합 보정(절제 포함)
- 종합운세(전체 에너지/일·재물운/애정운/건강·마음) 상세화

## 주요 변경

### 1) 문장 결합 안정화
- `apps/api/src/domains/reading/hybrid.js`
  - `ensureTerminalPunctuation()`, `joinSentencesKorean()` 도입
  - claim 후행 문장 결합 시 마침표/공백 결합 규칙을 강제
  - `...우선입니다 결론...` 형태의 런온 문장 방지

### 2) 마스터 리포트 중복 완화
- `apps/web/src/pages/TarotMastery.tsx`
  - `getDistinctReportCopy()`의 overall_fortune 분기 조정
  - summary와 energyText 고중복 시
    - `fortune.message` 대신 `workFinance`/대체 문구로 fallback
  - "기조 문장 + 동일 의미 문장 재출력" 현상 완화

### 3) evidence 반복감 완화 강화
- `apps/api/src/domains/reading/hybrid.js`
  - `selectTemplateWithDiversity()`에 normalized 중복 회피 추가
  - claim/rationale 각각 중복 회피 집합을 분리 운영
  - same-suit 연속 카드 구간의 템플릿 회전 유지

### 4) 카드 의미-어조 미세 보정
- `apps/api/src/domains/reading/hybrid.js`
  - `m14(절제)` tone score를 `0.40 -> 0.32`로 조정
  - `CARD_STYLE_HINTS` 도입(`m14/m16/m13`)
  - 절제 카드가 비역방향일 때 균형/완급 문장이 우선 반영되도록 보정

### 5) 종합운세 섹션 상세화
- `apps/api/src/domains/reading/hybrid.js`
  - `energy/workFinance/love/healthMind`를 2문장 구조로 확장
  - 기간별 실행 힌트(`today/week/month/year`)를 후행 문장으로 추가
  - `ensureFortuneDensity()`는 길이뿐 아니라 문장 수(2문장 미만)도 보강
  - `fortune.message` 문구도 summary 중복을 줄이는 방향으로 조정

### 6) 회귀 테스트 보강
- `apps/api/tests/hybrid-resilience.js`
  - 탑 claim의 런온 문장 미발생 검증 추가
  - 절제 카드 균형 어휘 포함 검증 추가
- `apps/api/tests/overall-fortune-regression.js`
  - fortune 각 필드 최소 2문장 검증 추가
  - summary와 fortune.message 완전 중복 방지 검증 추가

## 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `npm run test:ui-flow --prefix apps/web` 통과

## 영향 요약
- 사용자 체감 어색함(문장 이어붙임/중복 출력)이 감소합니다.
- 카드 의미와 문장 어조의 정합성이 개선됩니다.
- 종합운세 4개 핵심 섹션이 더 구체적이고 실행 가능한 정보로 강화됩니다.
