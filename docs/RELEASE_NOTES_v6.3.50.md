# Release Notes v6.3.50

## 개요
리딩 도메인의 대형 파일을 엔트리/오케스트레이터로 분리하고, API에서 남아 있던 `legacy(v3)` 실행 경로를 제거한 정리 릴리즈입니다.

## 주요 변경

### 1) 도메인 엔트리 분리
- `apps/api/src/domains/reading/orchestrator.js`
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/src/domains/reading/index.js`

변경 내용:
- 기존 `hybrid.js`의 전체 구현을 `orchestrator.js`로 이동.
- `hybrid.js`는 `generateReadingHybrid` 재수출 전용 파일로 축소.
- reading 도메인 집약 진입점 `index.js`를 추가해 엔진/프로파일링 export를 단일 경로로 통합.

### 2) API legacy 모드 제거
- `apps/api/src/index.js`

변경 내용:
- `/api/reading`, `/api/v2/reading`에서 `mode=legacy` 요청 시 `400` 반환:
  - `error: mode=legacy is no longer supported. Use mode=hybrid.`
  - `code: legacy_mode_removed`
- 라우트 레벨 `generateReadingV3` import 및 fallback 응답 경로 제거.
- 라우트 내부 예외는 legacy 대체 대신 `500`(`hybrid_reading_failed`)로 반환.

### 3) fallback 메타 표준화
- `apps/api/src/domains/reading/orchestrator.js`

변경 내용:
- fallback 사용 시 `apiUsed: deterministic`로 통일.
- 응답 `mode`를 `hybrid` 또는 `deterministic_fallback`으로 명확히 구분.

## 검증 결과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## 영향
- 서버 라우트에서 legacy 실행 흐름이 제거되어 경로가 단순해졌습니다.
- 리딩 도메인 import 경로가 정리되어 후속 모듈 분해 작업의 기반이 마련되었습니다.
