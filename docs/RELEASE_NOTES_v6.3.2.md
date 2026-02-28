# Release Notes v6.3.2 (2026-02-28)

## 목적
Anthropic 엔진의 기본 모델과 토큰 상한을 상향해, 긴 문맥의 리딩에서도 응답 완결성과 표현 품질을 개선합니다.

## 변경 요약
- Anthropic 기본 모델 업데이트
- Anthropic `max_tokens` 상향

## 변경 상세
- 파일: `apps/api/src/domains/reading/hybrid.js`

### 1) 기본 Anthropic 모델 변경
- 이전: `claude-3-5-haiku-20241022`
- 변경: `claude-haiku-4-5-20251001`

### 2) 토큰 상한 조정
- 이전: `max_tokens: 2500`
- 변경: `max_tokens: 4096`

## 기대 효과
- 다카드 스프레드(5장/7장) + 풍부한 내러티브 요청 시 응답 중간 절단 가능성 감소
- 카드별 근거와 결론 연결이 더 안정적으로 유지

## 호환성
- API 계약(JSON 스키마) 변경 없음
- `.env`에서 `ANTHROPIC_MODEL`을 명시하면 기존처럼 명시 모델 우선 사용

## 검증
- `npm run test:persona --prefix apps/api` 통과
- fallback 및 응답 계약 필드 무결성 유지 확인
