# Release Notes v6.3.65

## 개요
이번 릴리스는 리딩 API의 LLM 호출 안정성을 강화해 fallback 빈도를 줄이고,
fallback 발생 시 원인을 운영 지표에서 즉시 분류할 수 있도록 개선한 버전입니다.

핵심은 다음 5가지입니다.
- 타임아웃 정책 상향 및 하한 보장
- 재시도 1회에 짧은 백오프 추가
- `overall_fortune` 전용 타임아웃 정책 분리
- fallback 사유 카테고리 분류(`timeout`, `rate_limit`, `provider_5xx` 등)
- 2순위 Anthropic 모델 failover 경로 추가

## 변경 파일
- `apps/api/src/domains/reading/prompt-builder.js`
- `apps/api/src/domains/reading/model-client.js`
- `apps/api/src/domains/reading/orchestrator.js`
- `apps/api/src/domains/reading/renderer.js`
- `apps/api/src/index.js`
- `apps/api/.env.example`
- `apps/web/src/services/analytics.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `apps/web/src/types/tarot.ts`
- `docs/RELEASE_NOTES_v6.3.65.md`
- `docs/CHANGELOG.md`

## 주요 변경 사항

### 1) 타임아웃 상향 + 하한 강제
- `getAnthropicConfig()`에서 timeout을 유형별로 계산하고 최소값을 강제합니다.
- 일반 리딩
  - primary: 최소 10초
  - retry: 최소 8초
- 종합운세(`overall_fortune`)
  - primary: 최소 12초
  - retry: 최소 10초
- 운영 환경에 5초 등 과도하게 낮은 값이 들어와도 하한 미만으로 떨어지지 않게 방어합니다.

### 2) 재시도 1회 + 백오프
- 기존 1회 재시도 구조는 유지하되, 즉시 재호출 대신 짧은 백오프 후 재시도합니다.
- timeout 계열은 상대적으로 긴 백오프(약 450ms), 기타는 짧은 백오프(약 220ms)를 적용해 성공 확률을 높였습니다.

### 3) `overall_fortune` 전용 정책 분리
- 종합운세 질문은 응답 길이와 구조가 큰 편이라 별도 timeout 정책을 적용합니다.
- 신규 env:
  - `ANTHROPIC_TIMEOUT_OVERALL_MS`
  - `ANTHROPIC_RETRY_TIMEOUT_OVERALL_MS`

### 4) fallback 원인 분류 강화
- 기존 `fallbackReason` 유지 + 신규 `fallbackCategory`를 추가했습니다.
- 분류값:
  - `timeout`, `rate_limit`, `provider_5xx`, `network`, `auth`, `model`, `parse`, `validation`, `engine`, `other`
- 서버 metric 로그와 프런트 analytics 이벤트에 카테고리를 함께 기록해 장애 원인 추적 속도를 높였습니다.

### 5) 2순위 모델 failover 추가
- `ANTHROPIC_FALLBACK_MODEL`이 설정된 경우, primary/retry 실패 시 failover 모델을 1회 시도합니다.
- 성공 시 `meta.path = anthropic_failover`로 기록합니다.
- 시도 결과는 `meta.attempts.failover` 및 `meta.timings.anthropicFailoverMs`에 남깁니다.

### 6) 상태/타입/지표 정합성 보강
- `renderer`에 `anthropic_provider_5xx`를 HTTP 실패 단계로 매핑했습니다.
- 프런트 타입(`ReadingResponse.meta`)에 failover 경로/타이밍/카테고리 필드를 반영했습니다.
- `TarotMastery`의 `reading_result_shown` 이벤트 payload에 fallback 세부 원인을 포함했습니다.

### 7) 운영 설정 템플릿 업데이트
- `apps/api/.env.example`에 신규/권장 설정을 반영했습니다.
  - `ANTHROPIC_FALLBACK_MODEL=claude-3-5-haiku-latest`
  - `ANTHROPIC_TIMEOUT_MS=12000`
  - `ANTHROPIC_RETRY_TIMEOUT_MS=9000`
  - `ANTHROPIC_TIMEOUT_OVERALL_MS=15000`
  - `ANTHROPIC_RETRY_TIMEOUT_OVERALL_MS=12000`
  - `ANTHROPIC_REPAIR_TIMEOUT_MS=5000`

## 검증
- `npm run test:hybrid --prefix apps/api` 통과
- `npm run test:metrics --prefix apps/api` 통과
- `npm run test:fortune --prefix apps/api` 통과
- `npm run test:unit --prefix apps/web` 통과
- `npm run build --prefix apps/web` 통과

## 기대 효과
- 종합운세에서 5초 타임아웃으로 즉시 fallback되는 비율 완화
- 장애 유형(타임아웃/레이트리밋/5xx) 분리 관측으로 운영 대응 속도 개선
- 모델 일시 장애 시 failover 경로로 hybrid 성공률 개선
