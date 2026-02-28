# Release Notes v6.3.47

## 개요
리딩 속도 저하와 fallback 빈도를 동시에 줄이기 위한 안정화 릴리즈입니다.  
핵심은 **모델 호출 시간 단축**, **치명 이슈 중심 fallback 판단**, **partial salvage 적용**, **웹 v1 폴백 조건 축소 및 캐시**입니다.

## 주요 변경

### 1) API 호출 지연 단축
- `apps/api/src/domains/reading/hybrid.js`
  - 기본 타임아웃 조정:
    - `ANTHROPIC_TIMEOUT_MS`: `60000 -> 12000`
    - `ANTHROPIC_RETRY_TIMEOUT_MS`: `25000 -> 7000`
    - `ANTHROPIC_REPAIR_TIMEOUT_MS`: `12000 -> 5000`
  - 네트워크/파싱 복구 경로는 유지하되 총 대기 상한을 축소

### 2) fallback 최소화 로직 적용
- `apps/api/src/domains/reading/hybrid.js`
  - `hasCriticalQualityIssue()` 도입
  - fallback 조건을 `모델 미수신 OR 치명 이슈`로 제한
    - 치명 이슈: `summary_missing`, `verdict_missing`, `evidence_length_mismatch`
  - 비치명 이슈(예: 중복/스타일)는 fallback 없이 통과

### 3) Partial Salvage 경로 가시화
- `apps/api/src/domains/reading/hybrid.js`
  - `detectPartialSalvageApplied()` 추가
  - 모델 출력 불완전 시 normalize/postprocess 보강 경로를 fallback 대신 사용
  - `qualityFlags`에 `partial_salvage_applied` 기록
  - `analysis.safety.reasons`에 런타임 사유 추가:
    - `model_timeout_retry`
    - `parse_repair_used`
    - `partial_salvage_applied`
    - `critical_contract_fix`

### 4) 웹 API 폴백 조건 최적화 + 캐시
- `apps/web/src/services/tarotService.ts`
  - v2 실패 시 v1 재호출 조건을 `5xx 또는 네트워크 오류`로 제한
  - 4xx 응답은 즉시 오류 처리해 불필요한 2차 호출 방지
  - `cards`, `spreads` 메모리 캐시 추가로 반복 요청 제거

## 테스트 추가/갱신
- 신규 테스트:
  - `apps/api/tests/fallback-minimization.js`
    - 비치명 품질 이슈에서 fallback 미발생 검증
    - partial salvage 플래그 기록 검증
- 기존 회귀 유지:
  - `apps/api/tests/hybrid-resilience.js`
  - `apps/api/tests/overall-fortune-regression.js`
  - `apps/api/tests/question-profile-v2.js`
  - `apps/api/tests/reading-v2-contract.js`
  - `apps/web/tests/validate-reading-flow-contract.js`

## 검증 결과
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/hybrid-resilience.js` 통과
- `node apps/api/tests/overall-fortune-regression.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run test:ui-flow --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 평균 대기 시간이 줄고, 실패 시에도 fallback으로 내려가기 전에 salvage 경로를 우선 활용합니다.
- 비치명 품질 이슈로 인한 과도한 fallback이 줄어 리딩 일관성이 개선됩니다.
- 웹의 중복 API 호출이 줄어 체감 지연이 완화됩니다.
