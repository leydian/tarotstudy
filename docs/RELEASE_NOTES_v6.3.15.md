# Release Notes v6.3.15 (2026-02-28)

## 목적
타로 리딩 결과가 deterministic fallback으로 과도하게 전환되는 문제를 줄이고, fallback 발생 시 원인을 요청 단위로 명확히 추적할 수 있도록 하이브리드 엔진의 안정성과 진단성을 강화합니다.

## 핵심 변경
- Anthropic 호출 안정성 재조정
  - 기본 타임아웃 상향: `ANTHROPIC_TIMEOUT_MS=60000`
  - 재시도 타임아웃 분리: `ANTHROPIC_RETRY_TIMEOUT_MS=25000`
  - 파싱 복구 전용 타임아웃 추가: `ANTHROPIC_REPAIR_TIMEOUT_MS=12000`
- 실패 유형 기반 재시도 정책
  - 재시도 대상: `anthropic_timeout`, `anthropic_fetch_error`, `anthropic_parse_error`, `5xx`
  - 즉시 실패 대상: `model_not_found(404)`, `auth_error(401/403)`, `rate_limited(429)`
- 파싱 복구 단계(Repair Pass) 추가
  - primary/retry에서 JSON 파싱 실패가 감지되면, 간소화된 repair 프롬프트로 1회 추가 호출
- 검증/정규화 강화로 fallback 과민 반응 완화
  - 모델 evidence를 카드 목록 기준으로 정렬/패딩
  - evidence.cardId 불일치 시 카드 기준으로 정규화
  - 치명 이슈(요약/판정/evidence 길이) 중심으로 fallback 여부 판정
- 운영 진단 메타 확장
  - `meta.attempts` (primary/retry/repair 단계별 attempted/success/reason/status/durationMs)
  - `meta.failureStage` (`network | http | parse | validation | ...`)
  - `meta.timings.anthropicRepairMs`

## 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/tests/hybrid-resilience.js`
- `apps/api/package.json`
- `docs/SETUP_SECURITY.md`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.15.md`

## 상세 구현
1. `hybrid.js`
- `callAnthropic()`에서 HTTP 상태 코드별 reason 세분화(`model_not_found`, `anthropic_auth_error`, `anthropic_rate_limited`).
- `shouldRetryAnthropic()`로 재시도 가능 케이스를 명시.
- `extractJsonObject()`가 코드펜스(````json`) 포함 응답도 정규 파싱하도록 보강.
- `buildRepairPrompt()` 추가 후 parse 실패 시 repair 호출 경로 도입.
- `normalizeReport()`를 카드 팩트(`facts`) 중심 정렬로 변경해 evidence 불일치 내구성 강화.
- `verifyReport()`에서 치명 이슈 기반 유효성 판정으로 변경(부분 품질 이슈는 점수만 감점).
- 응답 `meta`에 `attempts`, `failureStage`, `anthropicRepairMs` 추가.

2. `hybrid-resilience.js` (신규 테스트)
- 시나리오 A: parse 실패 2회 후 repair 성공 시 `fallbackUsed=false` 검증.
- 시나리오 B: evidence 불완전/오염 응답을 정규화해 fallback 없이 통과하는지 검증.
- 시나리오 C: API 키 미설정 시 `fallbackUsed=true`, `fallbackReason=model_unavailable` 유지 검증.

3. `apps/api/package.json`
- `test:hybrid` 스크립트 추가.

## 기대 효과
- API 호출 자체는 성공했지만 JSON 구조 불안정으로 fallback되던 비율 감소.
- fallback의 원인 분류가 정교해져 운영 중 장애 대응 시간 단축.
- 안정성 우선 환경에서 fallback 감소와 응답 일관성 동시 개선.

## 검증
- `npm run test:hybrid --prefix apps/api`
- `npm run test:persona --prefix apps/api`
