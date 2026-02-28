# Release Notes v6.3.40

## 개요
리딩 품질의 남은 어색함(카드 의미-어조 불일치, 반복 템플릿)을 줄이기 위해
evidence 톤 판단 로직을 verdict 점수 로직에서 분리했습니다.

## 주요 변경

### 1) verdict 점수와 evidence 톤 분리
- `apps/api/src/domains/reading/hybrid.js`
  - 기존 `getYesNoScore()`는 verdict 계산 전용으로 유지.
  - `getEvidenceToneScore()`를 추가해 evidence 문장 톤을 별도로 계산.
  - 카드군 기본값(`SUIT_TONE_DEFAULTS`) + 카드별 오버라이드(`EVIDENCE_TONE_OVERRIDES`) 구조 도입.

### 2) evidence 톤 버킷 기반 문장 생성
- `apps/api/src/domains/reading/hybrid.js`
  - `resolveEvidenceToneBucket()` 도입:
    - upright: `positive/caution/neutral`
    - reversed: `reversed` 우선
  - `EVIDENCE_CLAIM_TEMPLATES` 추가:
    - tone 버킷 × suit(major/cups/pentacles/wands/swords) 별 claim 템플릿 분리
  - `buildEvidenceClaim()`를 toneBucket 기반으로 변경.
  - `pickTemplateBySeed()` + 해시 선택으로 카드/포지션별 문장 반복도 완화.

### 3) 카드 매핑 보정
- `apps/api/src/domains/reading/hybrid.js`
  - 오버라이드 반영:
    - `s01`, `s06`, `s07`
    - `c11~c14`, `p11~p14`, `w11~w14`, `s11~s14`
    - `m06`, `m13`, `m14`, `m15`, `m16`, `m17`
  - 정방향 강카드가 중립 문장으로 떨어지는 케이스를 줄이도록 조정.

### 4) 회귀 테스트 보강
- `apps/api/tests/hybrid-resilience.js`
  - `s01` 정방향 톤 검증 추가
  - `p14` 정방향 톤 검증 추가
  - evidence claim 반복도 최소 다양성 검증 추가
- `apps/api/tests/overall-fortune-regression.js`
  - `s01`, `p14`가 있을 때 neutral 고정 문구가 나오지 않는지 검증 추가

## 검증
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과

## 영향 요약
- 리딩 형식 안정성은 유지하면서 의미 정합성이 개선됩니다.
- 정방향 카드의 어조 선택이 카드 의미와 더 잘 맞도록 보정됩니다.
- 역방향의 점검/완충 톤은 유지됩니다.
