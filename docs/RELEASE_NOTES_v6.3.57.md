# Release Notes v6.3.57

## 개요
운영/유지보수 최적화 릴리즈입니다. 메트릭 저장/집계/임계치 체계를 품질 중심으로 확장하고, 피드백 데이터 기반 운영 루프를 자동화했습니다.

## 주요 변경

### 1) 메트릭 저장/보존 정책 개선
- `apps/api/src/ops/metrics.js`

변경 내용:
- 로그 파일을 일자별(`metrics-YYYY-MM-DD.log`)로 저장.
- 용량 초과 시 일자 파일 단위 회전(`.1`) 유지.
- `TAROT_METRIC_RETENTION_DAYS` 기반 자동 정리 추가.

### 2) 품질/피드백 집계 파이프라인 추가
- `apps/api/scripts/aggregate-quality-feedback.js` (신규)
- `apps/api/scripts/check-quality-thresholds.js` (신규)
- `apps/api/package.json`
- `apps/api/src/ops/metrics.js`

변경 내용:
- `readEventsFromFile`로 `reading_metric` + `feedback_metric` 통합 파싱.
- `aggregateQualityFeedback`, `evaluateQualityThresholds` 추가.
- 신규 명령:
  - `npm run metrics:quality-report --prefix apps/api`
  - `npm run metrics:quality-check --prefix apps/api`

### 3) 임계치 게이트 확장
- `.github/workflows/nightly-metrics-check.yml`
- `.github/workflows/quality-gate.yml`

변경 내용:
- nightly에서 품질 리포트/품질 임계치 점검 추가.
- quality gate에서 로그가 있을 경우 품질 임계치 점검 수행.

### 4) feedback API 확장
- `apps/api/src/index.js`
- `apps/web/src/services/tarotService.ts`

변경 내용:
- `POST /api/reading/feedback`에 `reasonCode` 지원:
  - `repetition | too_long | not_relevant | tone_issue | other`
- reading metric에 `qualityFlags` 포함 기록.

### 5) 테스트/문서/런북 고도화
- `apps/api/tests/metrics-aggregation.js`
- `docs/OPERATIONS_METRICS.md`
- `docs/QUALITY_GATE.md`
- `docs/INCIDENT_RUNBOOK_READING.md` (신규)

변경 내용:
- 품질 집계/임계치 테스트 케이스 추가.
- 운영 가이드에 품질 지표/명령/임계치 반영.
- 장애 대응 표준 런북 신규 문서화.

## 품질 임계치 기본값
- avgQualityScore warn/critical: `72 / 65`
- feedbackDownRate warn/critical: `30% / 40%`
- overlapFlagRate warn/critical: `15% / 25%`

## 검증 결과
- `npm run test:metrics --prefix apps/api` 통과
- `npm run metrics:report --prefix apps/api` 통과
- `npm run metrics:check --prefix apps/api` 통과
- `npm run metrics:quality-report --prefix apps/api` 통과
- `npm run metrics:quality-check --prefix apps/api` 통과
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:persona --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `node apps/api/tests/fallback-minimization.js` 통과
- `node apps/api/tests/question-profile-v2.js` 통과
- `node apps/api/tests/reading-v2-contract.js` 통과
- `npm run build --prefix apps/web` 통과

## 영향 요약
- 기존 API 계약은 유지되며, 운영 관측/경보/대응 체계가 품질 중심으로 확장됩니다.
- 피드백 기반 품질 개선 루프를 자동화할 수 있는 기반이 완성되었습니다.
