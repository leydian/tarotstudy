# Reading Incident Runbook

리딩 엔진 장애/품질 저하 발생 시 운영자가 빠르게 분류하고 완화하기 위한 표준 절차입니다.

## 1) 분류 기준

### A. 품질 저하
- 증상:
  - `qualityScore` 급락
  - `feedbackDownRatePct` 상승
  - `summary_verdict_overlap_high` 급증
- 우선 점검:
  - 최근 배포 커밋
  - `qualityFlags` 상위 분포
  - `questionType` 편향 여부

### B. fallback 급증
- 증상:
  - `fallbackRatePct` 경고/치명 임계치 초과
- 우선 점검:
  - `byFallbackReason`
  - `byFailureStage`
  - 외부 모델 API 상태

### C. 지연 증가
- 증상:
  - `latency.p95` 임계치 초과
- 우선 점검:
  - `anthropic_timeout`, `retry` 비율
  - 네트워크 상태, 타임아웃 설정

### D. 파싱/검증 오류
- 증상:
  - `anthropic_parse_error`, `validation_failed` 급증
- 우선 점검:
  - repair 경로 사용량
  - normalize/post-process 플래그 증가

## 2) 1차 진단 명령

```bash
npm run metrics:report --prefix apps/api -- apps/api/tmp/metrics.log
npm run metrics:quality-report --prefix apps/api -- apps/api/tmp/metrics.log
npm run metrics:check --prefix apps/api -- apps/api/tmp/metrics.log
npm run metrics:quality-check --prefix apps/api -- apps/api/tmp/metrics.log
```

## 3) 즉시 완화책

1. fallback 급증 시
- 외부 모델 문제로 판단되면 일시적으로 deterministic fallback 안정 경로를 우선.
- 타임아웃/재시도 값을 보수적으로 조정.

2. 품질 저하 시
- 최근 품질 관련 룰(중복 억제/압축/포커스 문장) 변경을 우선 롤백 후보로 확인.
- qualityFlags 상위 원인부터 룰 완화 또는 기본 문구 보정.

3. 지연 급증 시
- responseMode별 토큰/timeout 설정 확인.
- retry/repair 경로 남용 시 임계값 재조정.

## 4) 롤백 기준

아래 중 하나 충족 시 롤백:
- `fallbackRatePct >= 25%`가 2개 윈도우 연속
- `latency.p95 >= 5000ms`가 2개 윈도우 연속
- `feedbackDownRatePct >= 40%`가 1개 윈도우 이상 유지

## 5) 사후 조치

1. 원인 분류 기록
- 계약 회귀 / 모델 외부 요인 / 품질 룰 과민 / 운영 설정 문제

2. 재발 방지
- 테스트 추가(케이스 재현)
- 임계치/알림 기준 보정
- 문서/런북 업데이트
