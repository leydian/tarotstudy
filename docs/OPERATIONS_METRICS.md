# Operations Metrics Guide

리딩 엔진의 체감 품질을 수치로 추적하기 위한 운영 가이드입니다.

## 1) 메트릭 수집

API 서버에 아래 환경변수를 지정하면 `/api/reading` 호출마다 JSONL 메트릭이 저장됩니다.

```bash
TAROT_METRIC_LOG_PATH=apps/api/tmp/metrics.log
TAROT_METRIC_MAX_BYTES=5242880
TAROT_METRIC_RETENTION_DAYS=14
```

- 저장 파일은 일자별로 기록됩니다. 예: `metrics-2026-02-28.log`
- `TAROT_METRIC_MAX_BYTES`를 넘기면 해당 일자 파일에 `.1` 회전 파일이 생성됩니다.
- `TAROT_METRIC_RETENTION_DAYS`를 넘긴 과거 로그는 자동 정리됩니다.

기록 필드:
- `requestId`
- `fallbackUsed`
- `fallbackReason`
- `failureStage`
- `questionType`
- `domainTag`
- `readingKind`
- `fortunePeriod`
- `totalMs`
- `qualityScore`
- `qualityFlags`

feedback 필드(`feedback_metric`):
- `requestId`
- `rating` (`up`/`down`)
- `reasonCode` (`repetition|too_long|not_relevant|tone_issue|other|none`)
- `reason`
- `questionType`
- `responseMode`

## 2) 집계 리포트 생성

```bash
npm run metrics:report --prefix apps/api
```

또는 파일 경로 지정:

```bash
npm run metrics:report --prefix apps/api -- apps/api/tmp/metrics.log
```

산출 지표:
- `fallbackRatePct`
- latency `p50`, `p95`
- `byFailureStage`, `byFallbackReason`
- `byQuestionType`, `byReadingKind`, `byFortunePeriod`

## 3) 임계치 자동 점검

```bash
npm run metrics:check --prefix apps/api
npm run metrics:quality-check --prefix apps/api
```

- WARN: 로그로만 알림
- CRITICAL: 프로세스 exit code 1
- 기본 임계치:
  - fallbackRate warn/critical: 15% / 25%
  - p95 warn/critical: 3500ms / 5000ms
  - avgQualityScore warn/critical: 72 / 65
  - feedbackDownRate warn/critical: 30% / 40%
  - overlapFlagRate warn/critical: 15% / 25%

## 4) 품질/피드백 집계 리포트

```bash
npm run metrics:quality-report --prefix apps/api
```

산출 지표:
- `avgQualityScore`
- `feedbackDownRatePct`
- `overlapFlagRatePct`
- `feedbackByRating`
- `feedbackByReasonCode`

## 5) 내부 대시보드

- API: `GET /api/admin/metrics`
- 필터 파라미터:
  - `window=1h|24h|7d`
  - `limit=50..5000`
- 운영(`NODE_ENV=production`)에서는 `ADMIN_METRICS_KEY` 미설정 시 endpoint가 503으로 비활성화됩니다.
- `ADMIN_METRICS_KEY` 설정 시 `x-admin-key` 헤더가 필요합니다.
- 웹: `/ops` 페이지에서 기간/건수 필터, KPI, 임계치 상태, Top fallback reason, 분포를 확인

## 6) 운영 기준(권장)

- fallback rate > 15%: 네트워크/API 상태 우선 점검
- p95 totalMs > 3500ms: 모델 타임아웃/재시도 정책 점검
- `anthropic_parse_error` 급증: 응답 파싱/repair 경로 점검
- feedback down rate > 30%: 질문 맞춤도/중복 억제 규칙 우선 점검
- overlapFlagRate > 15%: summary/verdict/지침 중복 정책 완화/보정 필요

## 7) 주간 리뷰 체크리스트

1. 이번 주 fallback rate 추세는 증가/감소 중 무엇인가?
2. 느린 요청의 질문 유형/도메인 편향이 존재하는가?
3. 종합운세(`overall_fortune`)에서 특정 기간(`today/week/month/year`) 편향이 있는가?
4. down 피드백의 상위 reasonCode는 무엇이며, 지난주 대비 증가/감소 추세는 어떤가?
