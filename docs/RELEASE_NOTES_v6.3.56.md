# Release Notes v6.3.56

## 개요
리딩 결과의 체감 품질을 높이는 릴리즈입니다. 반복/중복 억제와 질문 맞춤 문장을 추가하고, 품질 점수(`qualityScore`)와 사용자 피드백 수집 API를 도입했습니다.

## 주요 변경

### 1) 리딩 출력 품질 강화
- `apps/api/src/domains/reading/report/deterministic.js`
- `apps/api/src/domains/reading/report/fact-builder.js`

변경 내용:
- concise 모드에서 evidence/rationale/caution 길이 압축, actions/counterpoints를 2개로 제한해 경량 질문 응답을 간결화.
- creative 모드에서 질문 핵심어 기반 포커스 문장을 summary에 결합해 질문 맞춤도를 개선.
- evidence claim 중복 억제 로직 추가.
- summary/verdict/actions/counterpoints 간 교차 중복 필터를 강화.

### 2) 품질 점수 지표 추가
- `apps/api/src/domains/reading/orchestrator.js`
- `apps/api/src/index.js`

변경 내용:
- 응답에 `quality.qualityScore`(0~100) 추가.
- `meta.qualityScore`에도 동일 값 노출.
- reading metric 로그에 `qualityScore`를 포함해 운영 관측성 강화.

### 3) 사용자 피드백 API 도입
- `apps/api/src/index.js`

변경 내용:
- `POST /api/reading/feedback` 신규 추가.
- 입력 스키마:
  - `rating`: `'up' | 'down'` (필수)
  - `requestId`, `reason`, `questionType`, `responseMode` (옵션)
- 로그/파일 메트릭에 `feedback_metric` 이벤트 적재.

### 4) 프론트 타입/서비스 확장
- `apps/web/src/types/tarot.ts`
- `apps/web/src/services/tarotService.ts`

변경 내용:
- `ReadingResponse.quality.qualityScore`, `ReadingResponse.meta.qualityScore` 타입 추가.
- `tarotApi.sendReadingFeedback(...)` 메서드 추가.

## 검증 결과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- API 계약은 확장(추가 필드/신규 엔드포인트)이며 기존 클라이언트 호환은 유지됩니다.
- 사용자 체감 기준으로 반복 문장/과도한 장문 비율이 줄고, 질문 적합도와 사후 피드백 수집성이 개선됩니다.
