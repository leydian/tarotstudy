# Release Notes v6.3.9 (2026-02-28)

## 목적
운영 정책을 Claude 단일 엔진으로 고정하고, 질문 무게에 맞는 표현 다양성과 응답 속도를 동시에 개선합니다.

## 핵심 변경
- Claude 전용 경로로 전환
  - OpenAI API 호출 로직 제거
  - Anthropic 1차 실패 시 1회 재시도 후 deterministic fallback
- 속도 튜닝
  - `ANTHROPIC_TIMEOUT_MS` 기본값 `60000 -> 10000`
  - `ANTHROPIC_RETRY_TIMEOUT_MS` 기본값 `7000` 추가
  - 모드별 토큰 상한/temperature 적용
- 응답 다양성 3모드 자동화
  - `responseMode`: `concise | balanced | creative`
  - 질문 유형/길이에 따라 프롬프트 스타일 자동 분기
- 진단 메타 확장
  - `meta.responseMode`
  - `meta.path` (`anthropic_primary | anthropic_retry | fallback`)
  - `meta.timings.totalMs/anthropicPrimaryMs/anthropicRetryMs`

## 변경 파일
- `apps/api/src/domains/reading/hybrid.js`
- `apps/web/src/types/tarot.ts`
- `apps/web/src/pages/TarotMastery.tsx`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v6.3.9.md`

## 상세 구현
1. Claude-only 엔진
- `callOpenAI()` 및 OpenAI 모델 상수 제거.
- 모델 호출 흐름을 `anthropic_primary -> anthropic_retry -> fallback` 3단계로 고정.
- 성공 시 `apiUsed=anthropic`, 최종 fallback 시 `apiUsed=fallback`.

2. 모드 기반 생성 정책
- `detectResponseMode(questionType, questionLength)` 도입.
- `concise`: 짧은 일상/짧은 양자택일 질문 중심, 간결한 결론 강조.
- `balanced`: 일반 질문의 기본 모드.
- `creative`: 감정/관계 질문에서 어휘 다양성 강화.
- 프롬프트에 모드별 스타일 가이드 삽입.

3. 성능/관측성 메타
- 요청 전체 처리시간(`totalMs`)과 단계별 시간(`anthropicPrimaryMs`, `anthropicRetryMs`) 기록.
- 처리 경로를 `meta.path`로 응답에 포함.
- 프론트 진단 박스에 `responseMode/path/totalMs` 추가 표기.

## 기대 효과
- OpenAI API를 사용하지 않는 운영 정책과 실제 런타임 동작 일치.
- 짧은 질문에서 체감 응답속도 개선.
- 결과 톤을 질문 성격에 맞게 자동 조절해 단조로운 출력 완화.
- "느림/fallback" 이슈를 요청 단위 메타로 빠르게 역추적 가능.

## 검증
- `npm run test:persona --prefix apps/api`
- `npm run build --prefix apps/web`

## 운영 참고
- 타임아웃/재시도 값은 환경변수로 재조정 가능:
  - `ANTHROPIC_TIMEOUT_MS`
  - `ANTHROPIC_RETRY_TIMEOUT_MS`
