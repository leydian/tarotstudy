# Release Notes v6.3.54

## 개요
reading 도메인 분할 2단계의 마무리 릴리즈입니다. `report-builder` 내부 책임을 `shared`와 `deterministic`로 분리해 모듈 경계를 명확히 하고, 기존 외부 import 계약은 그대로 유지했습니다.

## 주요 변경

### 1) report 계층 분할 완료
- `apps/api/src/domains/reading/report-builder.js`
- `apps/api/src/domains/reading/report/shared.js` (신규)
- `apps/api/src/domains/reading/report/deterministic.js` (신규)

변경 내용:
- `report-builder.js`를 엔트리 재수출 파일로 축소.
- 공통 상수/유틸/정규화/후처리 로직을 `shared.js`로 이동.
- `buildDeterministicReport` 구현을 `deterministic.js`로 분리.

### 2) export/import 계약 복구 및 안정화
- `apps/api/src/domains/reading/report/deterministic.js`

변경 내용:
- 분할 과정에서 남아 있던 불완전 export 조각을 제거.
- `buildDeterministicReport` 단일 export 경계로 정리.
- 상위 레이어(`report-builder.js`)에서 기존 호출 경로를 그대로 유지하도록 연결.

### 3) 유지보수성 개선 포인트
변경 내용:
- 공통 정책 변경 시 `shared.js`만 수정하면 되도록 책임 축소.
- 리포트 합성 로직은 `deterministic.js`에 집중시켜 테스트 포인트를 단순화.
- 파일 크기/역할 분리가 명확해져 코드 탐색 및 회귀 분석 효율 개선.

## 검증 결과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 외부 API/호출 계약 변경 없이 내부 구조만 분리되었습니다.
- 향후 정책 튜닝(중복 제거, 안전 가드, 문장 품질 보정)의 변경 단위가 작아져 배포 리스크를 낮춥니다.
