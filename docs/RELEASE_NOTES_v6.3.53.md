# Release Notes v6.3.53

## 개요
reading 도메인 2단계 분할 릴리즈입니다. 오케스트레이터가 직접 세부 모듈을 참조하도록 재배선하고, profile 로직을 목적별 파일로 분해했습니다. 동시에 경량 질문/역방향 판정의 보수성을 강화하는 정책 보정을 적용했습니다.

## 주요 변경

### 1) 엔진 경계 재배선
- `apps/api/src/domains/reading/orchestrator.js`
- `apps/api/src/domains/reading/engine-helpers.js` (삭제)

변경 내용:
- `orchestrator`가 `report-builder/prompt-builder/model-client/quality-guard/renderer`를 직접 import
- 중간 집약 레이어(`engine-helpers`) 제거로 책임 경로 단순화

### 2) 신규 모듈 분리
- `apps/api/src/domains/reading/json-extractor.js`
- `apps/api/src/domains/reading/quality-guard.js`
- `apps/api/src/domains/reading/renderer.js`

변경 내용:
- JSON 추출/복구 로직을 `json-extractor`로 분리
- 리포트 검증/정규화/최종 품질판정을 `quality-guard`로 분리
- 레거시 텍스트 조립/실패 단계 매핑을 `renderer`로 분리

### 3) profile 로직 세분화
- `apps/api/src/domains/reading/profile/keywords.js`
- `apps/api/src/domains/reading/profile/intent-scoring.js`
- `apps/api/src/domains/reading/profile/core.js`
- `apps/api/src/domains/reading/profile/decision-policy.js`
- `apps/api/src/domains/reading/profile/question-type.js`
- `apps/api/src/domains/reading/questionType.js`

변경 내용:
- 키워드/의도점수/핵심 분류/의사결정 정책을 분리
- 루트 `questionType.js`는 기존 호출자 호환을 위해 re-export 유지

### 4) 공격적 품질 정책 보정
- `apps/api/src/domains/reading/report-builder.js`
- `apps/api/src/domains/reading/quality-guard.js`

변경 내용:
- light/binary 액션 가이드를 2개로 고정
- summary/verdict 중복 판정 기준 강화
- 역방향 카드 비중이 높은 경우 verdict 임계치 상향(보수 판정)
- 역방향에서 낙관 문구 감지 시 기본 점검 문구로 치환 범위 확대
- v2 profile low-confidence 강등 임계를 강화(`0.55 / 0.12`)

## 검증 결과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 엔진 모듈 경계가 명확해져 이후 유지보수/회귀 분석이 쉬워졌습니다.
- 경량 질문/역방향 케이스에서 과도한 낙관/장문 안내가 줄어 보다 보수적이고 일관된 출력이 가능합니다.
