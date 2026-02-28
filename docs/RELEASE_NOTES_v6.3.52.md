# Release Notes v6.3.52

## 개요
reading 도메인 풀 리팩터 단계로, 대형 helper 파일을 책임 모듈로 분리하고 question profile 로직의 경로를 정리했습니다.

## 주요 변경

### 1) reading 엔진 모듈 세분화
- `apps/api/src/domains/reading/report-builder.js`
- `apps/api/src/domains/reading/prompt-builder.js`
- `apps/api/src/domains/reading/model-client.js`
- `apps/api/src/domains/reading/engine-helpers.js`
- `apps/api/src/domains/reading/orchestrator.js`

변경 내용:
- deterministic 리포트/품질 보정/fortune 조립 계열 로직을 `report-builder`로 분리
- response mode 및 prompt 생성 로직을 `prompt-builder`로 분리
- Anthropic 호출/재시도/timeout 처리 로직을 `model-client`로 분리
- `engine-helpers`는 각 모듈을 집약 재수출하는 호환 레이어로 축소
- `orchestrator`는 엔진 제어 흐름 위주로 정리

### 2) profile 경로 분리
- `apps/api/src/domains/reading/profile/question-type.js`
- `apps/api/src/domains/reading/questionType.js`

변경 내용:
- question profile 구현 파일을 `profile/question-type.js`로 이동
- 기존 경로 `questionType.js`는 재수출만 담당해 기존 import와 테스트 호환 유지

## 호환성
- 공개 API 계약 유지
  - `generateReadingHybrid` 시그니처 유지
  - `/api/reading`, `/api/v2/reading` 응답 필드 유지
- 테스트 호출 경로 유지
  - `domains/reading/hybrid.js`, `domains/reading/questionType.js` 기반 테스트 영향 없음

## 검증 결과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과
