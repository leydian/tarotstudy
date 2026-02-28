# Operations Metrics Guide

리딩 엔진의 체감 품질을 수치로 추적하기 위한 운영 가이드입니다.

## 1) 메트릭 수집

API 서버에 아래 환경변수를 지정하면 `/api/reading` 호출마다 JSONL 메트릭이 저장됩니다.

```bash
TAROT_METRIC_LOG_PATH=apps/api/tmp/metrics.log
```

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

## 3) 운영 기준(권장)

- fallback rate > 15%: 네트워크/API 상태 우선 점검
- p95 totalMs > 3500ms: 모델 타임아웃/재시도 정책 점검
- `anthropic_parse_error` 급증: 응답 파싱/repair 경로 점검

## 4) 주간 리뷰 체크리스트

1. 이번 주 fallback rate 추세는 증가/감소 중 무엇인가?
2. 느린 요청의 질문 유형/도메인 편향이 존재하는가?
3. 종합운세(`overall_fortune`)에서 특정 기간(`today/week/month/year`) 편향이 있는가?
