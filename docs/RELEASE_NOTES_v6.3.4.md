# Release Notes v6.3.4 (2026-02-28)

## 목적
"API를 왜 못 불렀는지"를 실제 운영 관점에서 확정하고, Anthropic 호출 성공률을 회복합니다.
이번 릴리스는 네트워크/DNS 및 모델 가용성/타임아웃 이슈를 분리 진단한 뒤 코드 기본값을 안정화하는 데 초점을 맞췄습니다.

## 문제 요약
- 사용자 질문 처리 시 `fallback(v3)`로 빈번히 하향되어 API 리딩 체감이 약화됨
- 로그상 `fetch failed`만으로는 원인 분리가 어려웠음

## 원인 분석 (확정)
1. 환경에 따라 DNS 해석 실패 발생 (`EAI_AGAIN`)
   - 증상: `Could not resolve host`, `fetch failed cause=EAI_AGAIN`
2. DNS가 되는 환경에서도 기본 모델 ID 불일치로 404
   - `model: claude-3-5-haiku-20241022` not found
3. 하이브리드 긴 프롬프트는 20초 제한에서 abort 발생
   - 최소 요청은 1초 내 성공, 실제 하이브리드는 ~25초 소요

## 변경 사항
- 파일: `apps/api/src/domains/reading/hybrid.js`
  - 기본 Anthropic 모델 기본값을 계정 가용 모델로 조정
    - `claude-haiku-4-5-20251001`
  - 타임아웃 상수 환경변수화
    - `ANTHROPIC_TIMEOUT_MS` (기본 `60000`)
  - 타임아웃 로그 강화
    - `timed_out=true/false`, `timeout_ms`, `cause` 출력

- 파일: `docs/SETUP_SECURITY.md`
  - 기본 `ANTHROPIC_MODEL` 값 최신화
  - `ANTHROPIC_TIMEOUT_MS` 환경변수 항목 추가

## 검증 결과
- `npm run test:persona --prefix apps/api` 통과
- 샘플 하이브리드 호출 결과:
  - `apiUsed: anthropic`
  - `fallbackUsed: false`
  - `hasFullNarrative: true`
  - `elapsedMs: 25509`

## 운영 가이드
- DNS 불안정 환경에서는 `EAI_AGAIN`이 재발할 수 있으므로 네트워크 인프라 점검 필요
- 서비스 안정성 관점에서 `ANTHROPIC_TIMEOUT_MS=60000` 이상 유지 권장
- 모델 교체 시 `/v1/models` 가용 목록으로 선검증 권장
