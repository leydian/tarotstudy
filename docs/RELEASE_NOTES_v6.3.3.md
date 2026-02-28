# Release Notes v6.3.3 (2026-02-28)

## 목적
하이브리드 리딩에서 외부 Anthropic 호출 실패 원인을 운영 로그만으로 즉시 식별할 수 있도록 진단성을 강화하고,
기본 모델을 안정 기본값으로 되돌려 실패 확률을 낮춥니다.

## 변경 요약
- Anthropic 호출 실패 로그 상세화
- Anthropic 요청 타임아웃 제어(20초) 추가
- Anthropic 기본 모델 롤백

## 변경 상세
- 파일: `apps/api/src/domains/reading/hybrid.js`

### 1) 기본 모델 롤백
- 이전 기본값: `claude-haiku-4-5-20251001`
- 변경 기본값: `claude-3-5-haiku-20241022`
- 의도: 계정/권한/가용성 이슈 가능성이 낮은 안정 기본값으로 복귀

### 2) Anthropic 실패 로그 강화
- HTTP 비정상 응답 시 로그에 아래 정보를 함께 출력:
  - `status`
  - `model`
  - `response body`
- fetch 예외 시 로그에 아래 정보를 함께 출력:
  - `model`
  - `error message`
  - `cause code/message` (예: `EAI_AGAIN`)

### 3) 요청 타임아웃 제어 추가
- `AbortController` 도입
- 20초 타임아웃 초과 시 요청 취소
- `finally`에서 타이머 정리로 누수 방지

## 운영 관점 효과
- fallback 발생 시 원인 분류 속도 개선
  - 인증/권한 문제(401/403)
  - 한도 문제(429)
  - 네트워크/DNS 문제(`EAI_AGAIN` 등)
- "API를 왜 못 불렀는지"를 서버 로그에서 즉시 판단 가능

## API 계약 영향
- 응답 스키마 변경 없음
- 기존 `fallbackUsed`, `apiUsed`, `meta.fallbackReason` 동작 유지

## 검증
- `npm run test:persona --prefix apps/api` 통과
- 샘플 실행에서 네트워크 예외 시 상세 로그 노출 확인
