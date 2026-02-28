# Release Notes v6.3.7 (2026-02-28)

## 목적
배포 환경에서 `fallbackUsed=true`인데 `fallbackReason=none`처럼 보이는 불일치 문제를 해결하고,
요청 단위로 API 응답 출처를 추적할 수 있도록 진단 메타를 강화합니다.

## 핵심 변경
- `/api/reading` 응답 메타 표준화
  - `meta.requestId`
  - `meta.serverRevision`
  - `meta.serverTimestamp`
  - `meta.questionType`
  - `meta.fallbackReason`
- 하이브리드 실패 사유 코드 정규화
  - `anthropic_http_error`
  - `anthropic_fetch_error`
  - `anthropic_timeout`
  - `model_not_found`
  - `openai_http_error`
  - `validation_failed`
  - `engine_fatal_error`
  - `model_unavailable`
- 프론트 진단 표시 보강
  - `fallbackReason`는 `meta -> top-level -> unavailable` 순으로 표시
  - `serverRevision`, `requestId`를 결과 화면에 노출

## 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/api/src/index.js`
- `apps/web/src/types/tarot.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/QUALITY_GATE.md`
- `docs/CHANGELOG.md`

## 상세 구현
1. 하이브리드 응답 강화
- Anthropic 기본 모델을 `claude-haiku-4-5-20251001`로 사용
- `ANTHROPIC_TIMEOUT_MS`(기본 60000) 적용
- fallback 시 사유를 구체 코드로 반환
- 응답 `meta`에 요청/배포 진단 필드 포함

2. API 라우트 응답 일관화
- `legacy`, `hybrid`, `catch fallback` 경로 모두 공통 메타 구조 반환
- 요청마다 `requestId` 생성 및 로그 연동

3. 프론트 표시 일관화
- `fallbackReason: none` 고정 표시 제거
- 응답 메타가 빠진 구버전 서버에도 최소한 `fallbackReason` 표시 가능

## 검증
- `npm run test:persona --prefix apps/api`
- `npm run build --prefix apps/web`
- 수동 확인
  - 결과 화면에 `apiUsed/fallbackUsed/fallbackReason/serverRevision/requestId` 표시
  - fallback 발생 시 reason 값이 `none` 대신 구체 코드 또는 `unavailable`로 출력

## 운영 참고
- `serverRevision`과 `requestId`로 프론트 화면/서버 로그를 직접 매칭해 버전 불일치를 빠르게 탐지할 수 있습니다.
